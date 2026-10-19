import { RunRecord } from './types';
import { fitnessOf } from './stats';
import { trainingLoad } from './advStats';
import { PB_DISTANCES } from './records';
import { weekStart } from './progress';
import { fmtPace, fmtTime } from './format';

/**
 * Coach reviews (Pacely Plus): a short written review after each run (what went well, what to
 * work on, what to do next) and a weekly report. Plain rules on the run's splits, intervals,
 * heart rate and recent history; no server needed.
 */
export interface Review { headline: string; good: string[]; improve: string[]; next: string }

const DAY = 864e5;
const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

/** Average pace of the first and second halves of a run, from its distance-over-time track or splits. */
function halves(r: RunRecord): [number, number] | null {
  const track = r.track && r.track.length > 4 ? r.track
    : r.splits.length >= 2 ? [{ t: 0, d: 0 }, ...r.splits.reduce<{ t: number; d: number }[]>((a, s) => [...a, { t: (a[a.length - 1]?.t ?? 0) + s.time, d: s.distance }], [])] : null;
  if (!track) return null;
  const half = r.distance / 2;
  const i = track.findIndex((p) => p.d >= half);
  if (i <= 0) return null;
  const a = track[i - 1], b = track[i];
  const tHalf = a.t + ((half - a.d) / Math.max(1, b.d - a.d)) * (b.t - a.t);
  return [tHalf / (half / 1000), (r.duration - tHalf) / (half / 1000)];
}

export function reviewRun(run: RunRecord, all: RunRecord[], maxHr = 190, now = Date.now()): Review {
  const good: string[] = [], improve: string[] = [];
  const earlier = all.filter((r) => r.id !== run.id && !r.simulated && Date.parse(r.startedAt) < Date.parse(run.startedAt));
  const km = run.distance / 1000;

  // Personal bests
  const pbs = PB_DISTANCES.filter((d) => run.pbs?.includes(d.key));
  if (pbs.length) good.push(`New personal best${pbs.length > 1 ? 's' : ''}: ${pbs.map((d) => d.label).join(', ')}. 🏆`);

  // Pacing across the run
  if (run.mode === 'distance' && km >= 2 && !run.treadmill) {
    const h = halves(run);
    if (h) {
      const drift = (h[1] - h[0]) / h[0];
      if (drift <= -0.01) good.push(`Negative split: your second half was ${pct(drift)} faster than your first. That's how the best races are run.`);
      else if (drift < 0.03) good.push('Really even pacing from start to finish.');
      else if (drift >= 0.05) improve.push(`You slowed ${pct(drift)} in the second half (${fmtPace(h[0])} → ${fmtPace(h[1])} per km). Try starting about ${Math.round((h[1] - h[0]) / 2)} seconds per km slower.`);
    }
    const paced = run.splits.filter((s) => s.pace > 0 && s.distance - (run.splits[run.splits.indexOf(s) - 1]?.distance ?? 0) >= 900);
    if (paced.length >= 3) {
      const fastest = paced.reduce((a, s) => (s.pace < a.pace ? s : a));
      const idx = run.splits.indexOf(fastest);
      if (idx === run.splits.length - 1 || idx === run.splits.length - 2) good.push('Your fastest kilometre came at the end. Strong finish!');
    }
  }

  // Intervals: did the reps fade?
  const reps = run.intervals.filter((x) => x.kind === 'run' && x.completed && x.pace > 0);
  if (run.mode === 'intervals' && reps.length >= 3) {
    const first = reps[0].pace, last = reps[reps.length - 1].pace;
    const fade = (last - first) / first;
    if (fade > 0.06) improve.push(`Your reps faded: the last was ${pct(fade)} slower than the first. Start the first couple a little easier.`);
    else if (Math.abs(fade) <= 0.03) good.push('Your reps were really consistent. Well judged.');
    else if (fade < -0.03) good.push('You got faster through the reps. Great control.');
  }

  // Compared with similar recent runs
  const similar = earlier.filter((r) => r.mode === run.mode && !r.treadmill && Math.abs(r.distance - run.distance) <= run.distance * 0.2 && now - Date.parse(r.startedAt) < 60 * DAY && r.avgPace > 0);
  if (similar.length >= 2 && run.avgPace > 0 && !run.treadmill) {
    const avg = similar.reduce((a, r) => a + r.avgPace, 0) / similar.length;
    const d = (avg - run.avgPace) / avg;
    if (d > 0.02) good.push(`${pct(d)} faster than your other runs of this length lately (${fmtPace(run.avgPace)} vs ${fmtPace(avg)} per km).`);
    else if (d < -0.05) improve.push(`A bit slower than your recent runs of this length. Fine if it was meant to be easy; if not, check you're sleeping and eating well.`);
  }

  // Heart rate
  if (run.avgHr && run.duration > 30 * 60) {
    const share = run.avgHr / maxHr;
    if (share > 0.85) improve.push(`Average heart rate ${run.avgHr} is hard work for a run this long. Most of your running should be easy (under ${Math.round(maxHr * 0.75)}).`);
    else if (share < 0.75) good.push(`Nicely controlled effort: average heart rate ${run.avgHr}, in the easy zone.`);
  }

  // Training load
  const load = trainingLoad([...earlier, run], Math.min(now, Date.parse(run.startedAt) + run.duration * 1000 + 1));
  if (load.verdict.tone === 'danger') improve.push('Your training has jumped a lot this week. Take an easy day or a rest day next.');

  // Consistency
  const lastWeek = earlier.filter((r) => Date.parse(run.startedAt) - Date.parse(r.startedAt) < 7 * DAY).length + 1;
  if (lastWeek >= 3) good.push(`${lastWeek} runs in the last 7 days. Consistency is what makes you fitter.`);
  if (!run.completed && run.mode === 'intervals') improve.push('You stopped before the end. No problem, but if it keeps happening the workout may be too hard: try an easier one.');

  // What next
  const hard = run.mode === 'intervals' || (run.avgHr ? run.avgHr / maxHr > 0.82 : false) || pbs.length > 0;
  const next = load.verdict.tone === 'danger' ? 'Next: a rest day, then an easy 20–30 minute run.'
    : hard ? 'Next: an easy run, slow enough to chat. Hard days work best with easy days between them.'
    : km >= 10 ? 'Next: a rest day or a short, easy run to recover from the distance.'
    : 'Next: you could add some speed: try 6 × 1 minute fast with 1 minute easy between.';

  const headline = pbs.length ? 'A personal best day!' : good.length > improve.length ? 'Good run!' : improve.length ? 'Solid work, with something to learn' : 'Run in the bank';
  if (!good.length && !improve.length) good.push(`${km.toFixed(2)} km in ${fmtTime(run.duration)}. Every run counts.`);
  return { headline, good: good.slice(0, 4), improve: improve.slice(0, 3), next };
}

// ----- weekly report -----

export interface WeeklyReport {
  from: number;
  km: number; runs: number; time: number; longest: number; lastKm: number; lastRuns: number;
  bestFitness: number | null; load: ReturnType<typeof trainingLoad>; days: number;
  notes: string[]; nextWeekKm: number;
}

/** The last complete week (Monday to Sunday) compared with the one before, and a target for this week. */
export function weeklyReport(all: RunRecord[], now = Date.now()): WeeklyReport {
  const real = all.filter((r) => !r.simulated);
  const thisMonday = weekStart(new Date(now));
  const from = thisMonday - 7 * DAY, prevFrom = from - 7 * DAY;
  const inWeek = (a: number) => real.filter((r) => { const t = Date.parse(r.startedAt); return t >= a && t < a + 7 * DAY; });
  const week = inWeek(from), prev = inWeek(prevFrom);
  const km = week.reduce((a, r) => a + r.distance / 1000, 0), lastKm = prev.reduce((a, r) => a + r.distance / 1000, 0);
  const days = new Set(week.map((r) => new Date(r.startedAt).getDay())).size;
  const fits = week.map(fitnessOf).filter((x): x is number => x !== null);
  const load = trainingLoad(real, from + 7 * DAY - 1);
  const notes: string[] = [];
  if (!week.length) notes.push('No runs last week. That\'s OK: start this week with something short and easy.');
  else {
    if (lastKm > 0) {
      const ch = (km - lastKm) / lastKm;
      notes.push(ch > 0.3 ? `Distance up ${pct(ch)} on the week before. A big jump: keep this week similar so your body can adapt.`
        : ch >= -0.1 ? 'A steady week, about the same as the one before. Good, sustainable training.'
        : `Distance down ${pct(ch)} on the week before. Great if it was a rest week.`);
    }
    if (days >= 3) notes.push(`You ran on ${days} different days. Spreading runs out like that is ideal.`);
    else if (week.length >= 2 && days < week.length) notes.push('Some runs were on the same day. Spreading them out helps recovery.');
    notes.push(`Training load: ${load.verdict.title.toLowerCase()}. ${load.verdict.text}`);
  }
  // Build gently: no more than about 10% more than last week.
  const base = Math.max(km, lastKm);
  const nextWeekKm = load.verdict.tone === 'danger' ? Math.round(base * 0.8) : Math.max(5, Math.round(base * 1.1));
  return {
    from, km, runs: week.length, time: week.reduce((a, r) => a + r.duration, 0),
    longest: Math.max(0, ...week.map((r) => r.distance / 1000)), lastKm, lastRuns: prev.length,
    bestFitness: fits.length ? Math.min(...fits) : null, load, days, notes, nextWeekKm,
  };
}

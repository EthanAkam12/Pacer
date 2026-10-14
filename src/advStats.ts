import { RunRecord } from './types';
import { fitnessOf } from './stats';
import { runBests } from './records';
import { weekStart } from './progress';

/** Advanced stats (Pacer Plus). Callers pass real runs (no practice runs). */

const DAY = 864e5;

// ----- heart-rate zones -----
export const ZONES = [
  { name: 'Zone 1', label: 'Very easy', from: 0, to: 0.6 },
  { name: 'Zone 2', label: 'Easy', from: 0.6, to: 0.7 },
  { name: 'Zone 3', label: 'Steady', from: 0.7, to: 0.8 },
  { name: 'Zone 4', label: 'Hard', from: 0.8, to: 0.9 },
  { name: 'Zone 5', label: 'Max', from: 0.9, to: 9 },
];

/** Minutes in each zone over the last `days`, from split and interval heart rates. */
export function zoneMinutes(runs: RunRecord[], maxHr: number, days = 28, now = Date.now()): number[] {
  const out = ZONES.map(() => 0);
  for (const r of runs) {
    if (now - Date.parse(r.startedAt) > days * DAY) continue;
    const parts = r.splits.length ? r.splits : r.intervals;
    for (const p of parts) {
      if (!p.hr) continue;
      const share = p.hr / maxHr;
      const z = ZONES.findIndex((x) => share >= x.from && share < x.to);
      out[Math.max(0, z)] += p.time / 60;
    }
  }
  return out;
}

// ----- training load -----
/**
 * Load for one run: minutes × intensity², where intensity compares the run's pace with your easy
 * pace (about 30% slower than your 5K pace). An easy hour scores about 60; a hard 5K about 40.
 */
export function runLoad(r: RunRecord, fitness5k: number | null): number {
  const minutes = r.duration / 60;
  if (!fitness5k || !r.avgPace || !isFinite(r.avgPace)) return minutes * 0.8;
  const easy = (fitness5k / 5) * 1.3;
  const intensity = Math.max(0.5, Math.min(1.6, easy / r.avgPace));
  return minutes * intensity * intensity;
}

export interface LoadSummary {
  weeks: { label: string; value: number }[]; // last 8 weeks, oldest first
  acute: number; // last 7 days
  chronic: number; // average week over the last 28 days
  ratio: number;
  verdict: { title: string; text: string; tone: 'low' | 'good' | 'high' | 'danger' };
}

export function trainingLoad(runs: RunRecord[], now = Date.now()): LoadSummary {
  const fits = runs.filter((r) => now - Date.parse(r.startedAt) < 90 * DAY).map(fitnessOf).filter((x): x is number => x !== null);
  const fit = fits.length ? Math.min(...fits) : null;
  const loadIn = (from: number, to: number) => runs
    .filter((r) => { const t = Date.parse(r.startedAt); return t >= from && t < to; })
    .reduce((a, r) => a + runLoad(r, fit), 0);
  const acute = loadIn(now - 7 * DAY, now + 1);
  const chronic = loadIn(now - 28 * DAY, now + 1) / 4;
  const ratio = chronic > 0 ? acute / chronic : acute > 0 ? 2 : 0;
  const monday = weekStart(new Date(now));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = monday - (7 - i) * 7 * DAY;
    const d = new Date(from);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: Math.round(loadIn(from, from + 7 * DAY)) };
  });
  const verdict: LoadSummary['verdict'] =
    chronic === 0 && acute === 0 ? { title: 'No recent runs', text: 'Run a few times and Pacer will show how your training is balanced.', tone: 'low' }
    : ratio < 0.8 ? { title: 'Taking it easy', text: 'You\'ve done less than usual this week. Fine for a rest week; keep it up for long and fitness slowly drops.', tone: 'low' }
    : ratio <= 1.3 ? { title: 'Good balance', text: 'This week matches what your body is used to. The sweet spot for getting fitter safely.', tone: 'good' }
    : ratio <= 1.5 ? { title: 'Building fast', text: 'More than usual this week. Fine for a week or two, but make sure you get rest days.', tone: 'high' }
    : { title: 'Too much, too soon', text: 'A big jump compared with recent weeks. This is when injuries happen: take an easy day or two.', tone: 'danger' };
  return { weeks, acute: Math.round(acute), chronic: Math.round(chronic), ratio, verdict };
}

// ----- VO2 max estimate -----
/** Jack Daniels' VDOT from a race time, a good estimate of VO2 max for runners. */
export function vdot(meters: number, seconds: number): number {
  const t = seconds / 60, v = meters / t;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}

export function vo2Estimate(runs: RunRecord[], now = Date.now()): { value: number; band: string } | null {
  const fits = runs.filter((r) => now - Date.parse(r.startedAt) < 60 * DAY).map(fitnessOf).filter((x): x is number => x !== null);
  if (!fits.length) return null;
  const value = Math.round(vdot(5000, Math.min(...fits)) * 10) / 10;
  const band = value >= 55 ? 'Excellent' : value >= 47 ? 'Very good' : value >= 40 ? 'Good' : value >= 33 ? 'Fair' : 'Building';
  return { value, band };
}

// ----- year in review -----
export interface YearReview {
  year: number; runs: number; km: number; hours: number; longest: RunRecord | null; fastest5k: number | null;
  bestMonth: { name: string; km: number } | null; favouriteDay: string | null; longestStreak: number; earlyBird: number; pbs: number;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

export function yearReview(all: RunRecord[], year: number): YearReview {
  const runs = all.filter((r) => new Date(r.startedAt).getFullYear() === year);
  const km = runs.reduce((a, r) => a + r.distance / 1000, 0);
  const months = MONTHS.map(() => 0), days = DAYS.map(() => 0);
  for (const r of runs) { const d = new Date(r.startedAt); months[d.getMonth()] += r.distance / 1000; days[d.getDay()]++; }
  const bm = months.indexOf(Math.max(...months)), fd = days.indexOf(Math.max(...days));
  const fives = runs.map((r) => runBests(r)['5000']).filter((x): x is number => !!x);
  // Longest run of consecutive days with a run.
  const dayKeys = [...new Set(runs.map((r) => { const d = new Date(r.startedAt); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }))].sort((a, b) => a - b);
  let longestStreak = 0, cur = 0;
  dayKeys.forEach((k, i) => { cur = i && Math.round((k - dayKeys[i - 1]) / DAY) === 1 ? cur + 1 : 1; longestStreak = Math.max(longestStreak, cur); });
  return {
    year, runs: runs.length, km, hours: runs.reduce((a, r) => a + r.duration, 0) / 3600,
    longest: runs.reduce<RunRecord | null>((a, r) => (!a || r.distance > a.distance ? r : a), null),
    fastest5k: fives.length ? Math.min(...fives) : null,
    bestMonth: runs.length ? { name: MONTHS[bm], km: months[bm] } : null,
    favouriteDay: runs.length ? DAYS[fd] : null,
    longestStreak,
    earlyBird: runs.filter((r) => new Date(r.startedAt).getHours() < 9).length,
    pbs: runs.reduce((a, r) => a + (r.pbs?.length ?? 0), 0),
  };
}

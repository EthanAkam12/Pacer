import { RunRecord } from './types';
import { runBests } from './records';
import { rankFor } from './ranks';
import { PLANS } from './plans';

// ----- weekly goal and streak -----

/** Monday 00:00 of the week containing `d`, as a timestamp. */
export function weekStart(d = new Date()): number {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m.getTime();
}
const WEEK = 7 * 864e5;

/** km per week, keyed by the week's Monday timestamp. Practice runs don't count. */
function kmByWeek(runs: RunRecord[]) {
  const out = new Map<number, number>();
  for (const r of runs) {
    if (r.simulated) continue;
    const w = weekStart(new Date(r.startedAt));
    out.set(w, (out.get(w) ?? 0) + r.distance / 1000);
  }
  return out;
}

export interface WeekStats { km: number; goal: number; runs: number; streak: number; hitThisWeek: boolean }

/** This week's distance against the goal, and how many weeks in a row the goal has been hit. */
export function weekStats(runs: RunRecord[], goalKm: number, now = new Date()): WeekStats {
  const weeks = kmByWeek(runs);
  const thisWeek = weekStart(now);
  const km = weeks.get(thisWeek) ?? 0;
  const hitThisWeek = km >= goalKm;
  let streak = hitThisWeek ? 1 : 0;
  // Count back through finished weeks. An unfinished week that hasn't hit the goal yet doesn't break the streak.
  for (let w = thisWeek - WEEK; (weeks.get(w) ?? 0) >= goalKm; w -= WEEK) streak++;
  const count = runs.filter((r) => !r.simulated && Date.parse(r.startedAt) >= thisWeek).length;
  return { km, goal: goalKm, runs: count, streak, hitThisWeek };
}

/** The longest run of consecutive weeks that hit the goal, ever. */
function bestStreak(runs: RunRecord[], goalKm: number) {
  const hit = [...kmByWeek(runs).entries()].filter(([, km]) => km >= goalKm).map(([w]) => w).sort((a, b) => a - b);
  let best = 0, cur = 0;
  hit.forEach((w, i) => { cur = i && w - hit[i - 1] === WEEK ? cur + 1 : 1; best = Math.max(best, cur); });
  return best;
}

// ----- achievements -----

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string; // Ionicons name
  check: (c: Ctx) => boolean;
}
interface Ctx { runs: RunRecord[]; totalKm: number; goalKm: number; best: Record<string, number> }

const hour = (r: RunRecord) => new Date(r.startedAt).getHours();
const longest = (c: Ctx) => Math.max(0, ...c.runs.map((r) => r.distance));
const maxRunsInWeek = (runs: RunRecord[]) => {
  const n = new Map<number, number>();
  runs.forEach((r) => { const w = weekStart(new Date(r.startedAt)); n.set(w, (n.get(w) ?? 0) + 1); });
  return Math.max(0, ...n.values());
};
const plansFinished = (runs: RunRecord[]) => PLANS.filter((p) => {
  const done = new Set(runs.map((r) => r.planSession).filter(Boolean));
  return p.sessions.every((s) => done.has(`${p.id}:${s.id}`));
}).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First steps', desc: 'Finish your first run', icon: 'footsteps', check: (c) => c.runs.length >= 1 },
  { id: '5k', title: '5K finisher', desc: 'Run 5 km in one go', icon: 'flag', check: (c) => longest(c) >= 5000 },
  { id: '10k', title: 'Double digits', desc: 'Run 10 km in one go', icon: 'flag', check: (c) => longest(c) >= 10000 },
  { id: 'half', title: 'Half marathoner', desc: 'Run 21.1 km in one go', icon: 'medal', check: (c) => longest(c) >= 21097 },
  { id: 'marathon', title: 'Marathoner', desc: 'Run 42.2 km in one go', icon: 'trophy', check: (c) => longest(c) >= 42195 },
  { id: 'hour', title: 'The long haul', desc: 'Run for an hour without stopping', icon: 'time', check: (c) => c.runs.some((r) => r.duration >= 3600) },
  { id: 'km10', title: 'Getting going', desc: 'Run 10 km in total', icon: 'trending-up', check: (c) => c.totalKm >= 10 },
  { id: 'km50', title: 'Fifty up', desc: 'Run 50 km in total', icon: 'trending-up', check: (c) => c.totalKm >= 50 },
  { id: 'km100', title: 'Century', desc: 'Run 100 km in total', icon: 'ribbon', check: (c) => c.totalKm >= 100 },
  { id: 'km500', title: 'Road warrior', desc: 'Run 500 km in total', icon: 'ribbon', check: (c) => c.totalKm >= 500 },
  { id: 'km1000', title: 'Thousand club', desc: 'Run 1,000 km in total', icon: 'planet', check: (c) => c.totalKm >= 1000 },
  { id: 'runs10', title: 'Habit forming', desc: 'Finish 10 runs', icon: 'repeat', check: (c) => c.runs.length >= 10 },
  { id: 'runs50', title: 'Regular', desc: 'Finish 50 runs', icon: 'repeat', check: (c) => c.runs.length >= 50 },
  { id: 'runs100', title: 'Lifer', desc: 'Finish 100 runs', icon: 'infinite', check: (c) => c.runs.length >= 100 },
  { id: 'early', title: 'Early bird', desc: 'Start a run before 7am', icon: 'sunny', check: (c) => c.runs.some((r) => hour(r) < 7) },
  { id: 'night', title: 'Night owl', desc: 'Start a run after 9pm', icon: 'moon', check: (c) => c.runs.some((r) => hour(r) >= 21) },
  { id: 'week4', title: 'Busy week', desc: 'Run 4 times in one week', icon: 'calendar', check: (c) => maxRunsInWeek(c.runs) >= 4 },
  { id: 'goal', title: 'Goal getter', desc: 'Hit your weekly goal', icon: 'checkmark-circle', check: (c) => bestStreak(c.runs, c.goalKm) >= 1 },
  { id: 'streak4', title: 'On a roll', desc: 'Hit your weekly goal 4 weeks in a row', icon: 'flame', check: (c) => bestStreak(c.runs, c.goalKm) >= 4 },
  { id: 'streak12', title: 'Unstoppable', desc: 'Hit your weekly goal 12 weeks in a row', icon: 'flame', check: (c) => bestStreak(c.runs, c.goalKm) >= 12 },
  { id: 'sub30', title: 'Sub-30', desc: 'Run 5 km in under 30 minutes', icon: 'speedometer', check: (c) => (c.best['5000'] ?? Infinity) < 1800 },
  { id: 'sub25', title: 'Sub-25', desc: 'Run 5 km in under 25 minutes', icon: 'speedometer', check: (c) => (c.best['5000'] ?? Infinity) < 1500 },
  { id: 'sub20', title: 'Sub-20', desc: 'Run 5 km in under 20 minutes', icon: 'rocket', check: (c) => (c.best['5000'] ?? Infinity) < 1200 },
  { id: 'intervals10', title: 'Interval ace', desc: 'Finish 10 interval workouts', icon: 'timer', check: (c) => c.runs.filter((r) => r.mode === 'intervals' && r.completed).length >= 10 },
  { id: 'pbs5', title: 'Record breaker', desc: 'Set 5 personal bests', icon: 'star', check: (c) => c.runs.reduce((n, r) => n + (r.pbs?.length ?? 0), 0) >= 5 },
  { id: 'gold', title: 'Golden', desc: 'Reach Gold rank', icon: 'shield', check: (c) => rankFor(c.runs).level >= 7 },
  { id: 'diamond', title: 'Diamond', desc: 'Reach Diamond rank', icon: 'diamond', check: (c) => rankFor(c.runs).level >= 16 },
  { id: 'plan', title: 'Graduate', desc: 'Finish a training plan', icon: 'school', check: (c) => plansFinished(c.runs) >= 1 },
];

/** Ids of the achievements these runs have earned. Practice runs only count towards practice achievements. */
export function earned(runs: RunRecord[], goalKm: number): Set<string> {
  const best: Record<string, number> = {};
  for (const r of runs) for (const [k, t] of Object.entries(runBests(r))) if (!best[k] || t < best[k]) best[k] = t;
  const c: Ctx = { runs, totalKm: runs.reduce((a, r) => a + r.distance, 0) / 1000, goalKm, best };
  return new Set(ACHIEVEMENTS.filter((a) => a.check(c)).map((a) => a.id));
}


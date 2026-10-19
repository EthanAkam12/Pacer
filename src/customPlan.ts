import { PlanProgress, RunRecord } from './types';
import { D, PlanSession, T, TrainingPlan, session, wk } from './plans';
import { fitnessOf } from './stats';
import { raceDistanceName } from './gear';

/**
 * Personal adaptive plans (Pacely Plus). Built from the runner's goal race (distance and date),
 * current fitness (best 5K-equivalent from recent runs, or a time they enter), an optional goal
 * time, and how many days a week they can run. Paces come from the goal, scaled between
 * distances with Riegel's formula, and are nudged each session by how recent runs felt.
 */
export interface CustomGoal {
  km: number;
  raceDate: string; // YYYY-MM-DD
  goalTime: number | null; // seconds; null = a realistic improvement on current fitness
  current5k: number | null; // seconds; null = work it out from runs
  runsPerWeek: number;
}

/** Riegel: time for distance b, given time t over distance a. */
export const riegel = (t: number, a: number, b: number) => t * (b / a) ** 1.06;

/** Best 5K-equivalent time from real runs in the last 90 days, or null. */
export function currentFitness(runs: RunRecord[]): number | null {
  const recent = runs.filter((r) => !r.simulated && !r.treadmill && Date.now() - Date.parse(r.startedAt) < 90 * 864e5);
  const fits = recent.map(fitnessOf).filter((x): x is number => x !== null);
  return fits.length ? Math.min(...fits) : null;
}

/** Longest real run in the last 6 weeks, km. */
const recentLongest = (runs: RunRecord[]) =>
  Math.max(0, ...runs.filter((r) => !r.simulated && Date.now() - Date.parse(r.startedAt) < 42 * 864e5).map((r) => r.distance / 1000));

const PEAK_LONG: [number, number][] = [[5, 8], [10, 14], [21.1, 19], [42.2, 32]];
const peakLong = (km: number) => PEAK_LONG.find(([d]) => km <= d + 0.1)?.[1] ?? 32;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round5 = (s: number) => Math.round(s / 5) * 5;
const halfKm = (km: number) => Math.round(km * 2) / 2;

export function weeksUntil(date: string, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor((new Date(y, m - 1, d).getTime() - now.getTime()) / (7 * 864e5));
}

export interface BuiltPlan { plan: TrainingPlan; fitness5k: number; goalTime: number }

export function buildCustomPlan(goal: CustomGoal, runs: RunRecord[]): BuiltPlan | { error: string } {
  const weeks = weeksUntil(goal.raceDate);
  if (weeks < 4) return { error: 'Your race needs to be at least 4 weeks away to build a plan.' };
  const n = Math.min(20, weeks);
  const fitness5k = goal.current5k ?? currentFitness(runs) ?? 35 * 60;
  const meters = goal.km * 1000;
  // Without a goal time, aim for about 1% faster per 3 weeks of training, up to 6%.
  const goalTime = goal.goalTime ?? riegel(fitness5k, 5000, meters) * (1 - Math.min(0.06, n / 300));
  const fiveKPace = riegel(goalTime, meters, 5000) / 5; // s/km at goal fitness
  const paces = {
    easy: round5(fiveKPace * 1.3),
    tempo: round5(fiveKPace * 1.08),
    reps: round5(fiveKPace * 0.97),
    race: Math.round(goalTime / goal.km),
  };
  const perWeek = clamp(goal.runsPerWeek, 3, 4);
  const peak = Math.max(peakLong(goal.km), goal.km <= 10 ? goal.km + 2 : 0);
  const start = clamp(recentLongest(runs) || goal.km * 0.35, 3, peak * 0.6);
  const taper = goal.km > 21.2 ? 3 : 2; // weeks after the peak long run (incl. race week)
  const peakWeek = n - taper + 1;
  const isLong = goal.km >= 10;
  const easyMin = (w: number) => Math.round(clamp(20 + (w / n) * (isLong ? 25 : 15), 20, isLong ? 50 : 40));

  const sessions: PlanSession[] = [];
  const S = (w: number, d: number, summary: string, body: Omit<PlanSession, 'id' | 'week' | 'day' | 'title' | 'summary'>) =>
    sessions.push(session('custom', w, d, summary, body));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const repLen = goal.km <= 5 ? 400 : goal.km <= 10 ? 800 : 1000;

  for (let w = 1; w <= n; w++) {
    const race = w === n;
    const cutback = !race && w < peakWeek && w % 4 === 0;
    const build = Math.min(1, (w - 1) / Math.max(1, peakWeek - 1));
    let long = start + (peak - start) * build;
    if (cutback) long *= 0.8;
    if (w > peakWeek) long = peak * (w === n - 1 ? 0.6 : 0.75);
    long = halfKm(long);
    let d = 1;
    S(w, d++, `Easy run, ${race ? 20 : easyMin(w)} min`, { kind: 'workout', workout: wk([T('run', race ? 20 : easyMin(w))]) });
    if (w % 2 || race) {
      const reps = race ? 3 : Math.round(clamp(3 + build * 5, 3, repLen === 400 ? 10 : 7) * (cutback ? 0.7 : 1));
      S(w, d++, `${reps} × ${repLen >= 1000 ? '1 km' : `${repLen} m`} at ${fmt(paces.reps)} per km, ${repLen === 400 ? '90 s' : '2 min'} rest`,
        { kind: 'workout', workout: wk([D('run', repLen), T(repLen === 400 ? 'rest' : 'walk', repLen === 400 ? 1.5 : 2)], reps, T('run', 10), T('walk', 5)), targetPace: paces.reps });
    } else {
      const mins = Math.round(clamp(10 + build * (isLong ? 20 : 12), 10, isLong ? 30 : 22) * (cutback ? 0.7 : 1));
      S(w, d++, `Tempo: ${mins} min at ${fmt(paces.tempo)} per km`,
        { kind: 'workout', workout: wk([T('run', mins)], 1, T('run', 10), T('walk', 5)), targetPace: paces.tempo });
    }
    if (perWeek === 4 && !race) S(w, d++, `Easy run, ${Math.max(20, easyMin(w) - 10)} min`, { kind: 'workout', workout: wk([T('run', Math.max(20, easyMin(w) - 10))]) });
    if (race) S(w, d++, `Race day: ${raceDistanceName(goal.km)} at ${fmt(paces.race)} per km!`, { kind: 'distance', km: goal.km, targetPace: paces.race });
    else S(w, d++, `Long run, ${long} km easy`, { kind: 'distance', km: long });
  }

  const plan: TrainingPlan = {
    id: 'custom',
    name: `Your ${raceDistanceName(goal.km)} plan`,
    level: 'Personal',
    blurb: `Built for you: ${n} weeks to your race, ${perWeek} runs a week.`,
    weeks: n,
    perWeek,
    sessions,
    plus: true,
    custom: { km: goal.km, raceDate: goal.raceDate, goalTime: Math.round(goalTime), paces },
  };
  return { plan, fitness5k, goalTime };
}

/**
 * How much to adjust target paces from recent feedback: each of the last four plan sessions that
 * felt easy speeds things up by 1.5%; each one that felt too hard or was stopped early slows them
 * by 2.5%. Between 6% faster and 8% slower.
 */
export function paceFactor(progress: PlanProgress | null): number {
  const last = (progress?.log ?? []).filter((a) => !progress?.adjustedAt || a.at > progress.adjustedAt).slice(-4);
  const f = last.reduce((acc, a) => acc + (!a.done || a.feel === 'hard' ? 0.025 : a.feel === 'easy' ? -0.015 : 0), 1);
  return clamp(f, 0.94, 1.08);
}

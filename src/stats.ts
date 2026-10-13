import { RunRecord } from './types';
import { runBests } from './records';
import { fiveKEquivalent } from './ranks';
import { weekStart } from './progress';

/** Statistics for the Progress section of History. Practice runs are left out by the caller. */

export type Range = '4w' | '3m' | '1y' | 'all';
export const RANGES: { label: string; value: Range }[] = [
  { label: '4 weeks', value: '4w' }, { label: '3 months', value: '3m' }, { label: '1 year', value: '1y' }, { label: 'All', value: 'all' },
];
const DAY = 864e5;
const rangeStart = (r: Range, now = Date.now()) =>
  r === '4w' ? now - 28 * DAY : r === '3m' ? now - 91 * DAY : r === '1y' ? now - 365 * DAY : 0;
export const inRange = (runs: RunRecord[], r: Range) => runs.filter((x) => Date.parse(x.startedAt) >= rangeStart(r));

/**
 * How fit a run shows you are, as the 5 km time it predicts: the best effort of a mile or more inside
 * the run, or the whole run if there's no standard distance in it. Null for runs under a mile.
 */
export function fitnessOf(r: RunRecord): number | null {
  const bests = runBests(r);
  const efforts: [number, number][] = [[1609.34, bests['1609']], [5000, bests['5000']], [10000, bests['10000']], [21097.5, bests['21097']], [42195, bests['42195']]]
    .filter((e): e is [number, number] => !!e[1]);
  if (r.distance >= 1609 && r.duration > 0) efforts.push([r.distance, r.duration]);
  if (!efforts.length) return null;
  return Math.min(...efforts.map(([m, t]) => fiveKEquivalent(m, t)));
}

/** One point per run (oldest first) for the fitness trend. */
export function fitnessTrend(runs: RunRecord[]) {
  return runs.map((r) => ({ at: r.startedAt, five: fitnessOf(r) }))
    .filter((p): p is { at: string; five: number } => p.five !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Predicted race times from your best recent fitness (last 60 days, or your best ever if none). */
export function predictions(runs: RunRecord[]) {
  const recent = runs.filter((r) => Date.now() - Date.parse(r.startedAt) < 60 * DAY);
  const pick = (list: RunRecord[]) => Math.min(...list.map(fitnessOf).filter((x): x is number => x !== null));
  let five = pick(recent);
  if (!isFinite(five)) five = pick(runs);
  if (!isFinite(five)) return null;
  const at = (m: number) => Math.round(five * Math.pow(m / 5000, 1.06));
  return [
    { label: '5K', time: at(5000) }, { label: '10K', time: at(10000) },
    { label: 'Half', time: at(21097.5) }, { label: 'Marathon', time: at(42195) },
  ];
}

export interface MonthTotals { km: number; runs: number; pace: number; longest: number }
const totals = (list: RunRecord[]): MonthTotals => {
  const km = list.reduce((a, r) => a + r.distance, 0) / 1000;
  const sec = list.reduce((a, r) => a + r.duration, 0);
  return { km, runs: list.length, pace: km > 0 ? sec / km : 0, longest: Math.max(0, ...list.map((r) => r.distance)) / 1000 };
};

/** This calendar month so far against the same number of days last month. */
export function monthCompare(runs: RunRecord[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const prevSameDay = Math.min(prevStart + (now.getTime() - start), start);
  const t = (a: number, b: number) => runs.filter((r) => { const d = Date.parse(r.startedAt); return d >= a && d < b; });
  return { now: totals(t(start, now.getTime() + 1)), before: totals(t(prevStart, prevSameDay)) };
}

/** km per calendar month for the last `n` months, oldest first. */
export function monthlyKm(runs: RunRecord[], n = 12, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const s = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1), e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    const km = runs.filter((r) => { const d = Date.parse(r.startedAt); return d >= +s && d < +e; }).reduce((a, r) => a + r.distance, 0) / 1000;
    return { label: s.toLocaleDateString(undefined, { month: 'short' }), km };
  });
}

/** Which days had a run, for the last `weeks` weeks (Monday-first rows of 7). */
export function calendar(runs: RunRecord[], weeks = 12, now = new Date()) {
  const first = weekStart(now) - (weeks - 1) * 7 * DAY;
  const kmByDay = new Map<number, number>();
  for (const r of runs) {
    const d = new Date(r.startedAt); d.setHours(0, 0, 0, 0);
    kmByDay.set(d.getTime(), (kmByDay.get(d.getTime()) ?? 0) + r.distance / 1000);
  }
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const day = first + (w * 7 + d) * DAY;
    // Daylight saving shifts midnight by an hour, so look up the nearest midnight.
    const key = [...[0, 3600e3, -3600e3]].map((o) => day + o).find((k) => kmByDay.has(k));
    return { day, km: key !== undefined ? kmByDay.get(key)! : 0, future: day > now.getTime() };
  }));
}

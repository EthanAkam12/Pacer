import { RunRecord } from './types';
import { runBests } from './records';

/**
 * Speed-based ranks. Each race distance has its own rank from your fastest time over that distance
 * (within any run) in the last year. Your overall rank is the best of them. The thresholds are the
 * same standard at every distance: a 5 km table scaled with Riegel's formula, rounded to tidy times.
 */
export interface Tier {
  id: string;
  name: string;
  colors: [string, string]; // badge gradient, light to dark
}

export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze', colors: ['#F0B27A', '#8C5226'] },
  { id: 'silver', name: 'Silver', colors: ['#F1F4F7', '#8A96A3'] },
  { id: 'gold', name: 'Gold', colors: ['#FFE58A', '#C38A12'] },
  { id: 'emerald', name: 'Emerald', colors: ['#7BEDC0', '#0B7D55'] },
  { id: 'platinum', name: 'Platinum', colors: ['#C9F4F2', '#3A8E9B'] },
  { id: 'diamond', name: 'Diamond', colors: ['#C6DDFF', '#5468E8'] },
  { id: 'elite', name: 'Elite', colors: ['#FFB3C7', '#B0124F'] },
];
export const UNRANKED_COLORS: [string, string] = ['#D5D9E2', '#7D869B'];

export interface RankedDistance { key: string; label: string; long: string; meters: number; step: number }
export const RANKED: RankedDistance[] = [
  { key: '1609', label: 'Mile', long: '1 mile', meters: 1609.34, step: 5 },
  { key: '5000', label: '5K', long: '5 km', meters: 5000, step: 10 },
  { key: '10000', label: '10K', long: '10 km', meters: 10000, step: 15 },
  { key: '21097', label: 'Half', long: 'half marathon', meters: 21097.5, step: 30 },
  { key: '42195', label: 'Marathon', long: 'marathon', meters: 42195, step: 60 },
];
export const distanceOf = (key: string) => RANKED.find((d) => d.key === key) ?? RANKED[1];

export const WINDOW_DAYS = 365;
const ROMAN = ['', 'I', 'II', 'III'];

/** 5 km time (seconds) needed to reach each division, from Bronze III (anyone) up to Elite. */
const FIVE_K = [Infinity, 45, 40, 35, 33 + 1 / 3, 31 + 2 / 3, 30, 28 + 2 / 3, 27 + 1 / 3, 26, 25, 24, 23, 22 + 1 / 6, 21 + 1 / 3, 20.5, 19 + 2 / 3, 18 + 5 / 6, 18].map((m) => m * 60);

export const fiveKEquivalent = (meters: number, seconds: number) => seconds * Math.pow(5000 / meters, 1.06);

export interface Step { label: string; tier: Tier; division: number; level: number; id: string; spoken: string; target: number }

/** Every division at one distance, from Bronze III (level 1) to Elite (level 19), with the time needed to reach it. */
export function ladder(key = '5000'): Step[] {
  const d = distanceOf(key);
  return FIVE_K.map((t5, i) => {
    const tier = TIERS[Math.min(Math.floor(i / 3), TIERS.length - 1)];
    const division = tier.id === 'elite' ? 0 : 3 - (i % 3);
    const raw = t5 * Math.pow(d.meters / 5000, 1.06);
    const target = raw === Infinity ? Infinity : Math.round(raw / d.step) * d.step;
    const label = division ? `${tier.name} ${ROMAN[division]}` : tier.name;
    return { label, tier, division, level: i + 1, id: division ? `${tier.id}-${division}` : tier.id, spoken: division ? `${tier.name} ${division}` : tier.name, target };
  });
}

/** The division a time earns at a distance, or null for no time. */
export function stepFor(key: string, seconds: number | null | undefined): Step | null {
  if (!seconds) return null;
  const steps = ladder(key);
  for (let i = steps.length - 1; i >= 0; i--) if (seconds < steps[i].target || i === 0) return steps[i];
  return steps[0];
}

export interface Rank {
  step: Step | null; // null when unranked
  label: string; // "Gold II" or "Unranked"
  id: string; // "gold-2" or "unranked"; stored on leaderboards
  level: number; // 0 unranked, 1 to 19
  distance: RankedDistance | null; // where this rank comes from
  from: { time: number; date: string } | null;
  next: { label: string; target: number; progress: number } | null;
  score: number | null; // 5 km equivalent of `from`, for ordering the overall leaderboard
}

const UNRANKED = { step: null, label: 'Unranked', id: 'unranked', level: 0, from: null, next: null, score: null };

/** Your rank at one distance from runs in the last year. */
export function distanceRank(runs: RunRecord[], key: string, now = Date.now()): Rank {
  const d = distanceOf(key);
  let best: Rank['from'] = null;
  for (const r of runs) {
    if (now - Date.parse(r.startedAt) > WINDOW_DAYS * 864e5) continue;
    const t = runBests(r)[key];
    if (t && (!best || t < best.time)) best = { time: t, date: r.startedAt };
  }
  if (!best) return { ...UNRANKED, distance: d };
  const step = stepFor(key, best.time)!;
  const steps = ladder(key);
  const up = steps[step.level] ?? null; // the next division, if any
  let next: Rank['next'] = null;
  if (up) {
    const floor = step.target === Infinity ? steps[1].target * 1.15 : step.target;
    next = { label: up.label, target: up.target - 1, progress: Math.max(0, Math.min(1, (floor - best.time) / (floor - up.target))) };
  }
  return { step, label: step.label, id: step.id, level: step.level, distance: d, from: best, next, score: Math.round(fiveKEquivalent(d.meters, best.time)) };
}

export function allRanks(runs: RunRecord[], now = Date.now()): Record<string, Rank> {
  return Object.fromEntries(RANKED.map((d) => [d.key, distanceRank(runs, d.key, now)]));
}

/** Your overall rank: the best of your distance ranks (ties go to the faster equivalent time). */
export function rankFor(runs: RunRecord[], now = Date.now()): Rank {
  let best: Rank = { ...UNRANKED, distance: null };
  for (const r of Object.values(allRanks(runs, now))) {
    if (r.level > best.level || (r.level === best.level && r.level > 0 && r.score! < best.score!)) best = r;
  }
  return best;
}

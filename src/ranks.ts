import { RunRecord } from './types';
import { PB_DISTANCES, runBests } from './records';

/**
 * Ranks are based on speed: your best run of 1 mile or more in the last 90 days, converted to
 * the 5 km time it predicts (Riegel's formula). Getting faster moves you up; stopping running
 * for three months lets the rank lapse.
 */
export interface Tier {
  id: string;
  name: string;
  /** Slowest 5 km equivalent (seconds) that reaches this tier. */
  under: number;
  colors: [string, string]; // badge gradient, light to dark
}

export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze', under: Infinity, colors: ['#F0B27A', '#8C5226'] },
  { id: 'silver', name: 'Silver', under: 35 * 60, colors: ['#F1F4F7', '#8A96A3'] },
  { id: 'gold', name: 'Gold', under: 30 * 60, colors: ['#FFE58A', '#C38A12'] },
  { id: 'emerald', name: 'Emerald', under: 26 * 60, colors: ['#7BEDC0', '#0B7D55'] },
  { id: 'platinum', name: 'Platinum', under: 23 * 60, colors: ['#C9F4F2', '#3A8E9B'] },
  { id: 'diamond', name: 'Diamond', under: 20 * 60 + 30, colors: ['#C6DDFF', '#5468E8'] },
  { id: 'elite', name: 'Elite', under: 18 * 60, colors: ['#FFB3C7', '#B0124F'] },
];
export const UNRANKED_COLORS: [string, string] = ['#D5D9E2', '#7D869B'];

const BRONZE_FLOOR = 50 * 60; // Bronze's divisions split 35 to 50 minutes
export const WINDOW_DAYS = 90;
export const MIN_EFFORT = 1609; // shorter efforts are too easy to sprint
const ROMAN = ['', 'I', 'II', 'III'];

export interface Rank {
  tier: Tier | null; // null when unranked
  division: number; // 1 (best) to 3; 0 for Elite and unranked
  score: number | null; // 5 km equivalent in seconds
  level: number; // higher is better, for comparing ranks
  label: string; // "Gold II"
  spoken: string; // "Gold 2"
  id: string; // "gold-2", stored on leaderboards
  from: { distance: string; time: number; date: string } | null;
  next: { label: string; target: number; progress: number } | null;
}

export const fiveKEquivalent = (meters: number, seconds: number) => seconds * Math.pow(5000 / meters, 1.06);

/** The 5 km equivalent at which each division starts, best first. Used for ranks and for "how ranks work". */
function divisionsOf(i: number): number[] {
  const t = TIERS[i];
  if (t.id === 'elite') return [t.under];
  const lo = TIERS[i + 1].under, hi = t.under === Infinity ? BRONZE_FLOOR : t.under;
  const step = (hi - lo) / 3;
  return [lo + step, lo + 2 * step, hi]; // I, II, III: reach division d by running under divisions[d - 1]
}

function describe(score: number | null): Pick<Rank, 'tier' | 'division' | 'level' | 'label' | 'spoken' | 'id'> {
  if (score === null) return { tier: null, division: 0, level: 0, label: 'Unranked', spoken: 'unranked', id: 'unranked' };
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const divs = divisionsOf(i);
    if (score >= divs[divs.length - 1] && TIERS[i].under !== Infinity) continue;
    const t = TIERS[i];
    if (t.id === 'elite') return { tier: t, division: 0, level: i * 3 + 3, label: t.name, spoken: t.name, id: t.id };
    const d = divs.findIndex((limit) => score < limit) + 1 || 3;
    return { tier: t, division: d, level: i * 3 + (4 - d), label: `${t.name} ${ROMAN[d]}`, spoken: `${t.name} ${d}`, id: `${t.id}-${d}` };
  }
  return describe(null);
}

/** Every division in order from the bottom, with the 5 km time needed to reach it. For the "how ranks work" list. */
export function ladder(): { label: string; tier: Tier; division: number; target: number }[] {
  const out: { label: string; tier: Tier; division: number; target: number }[] = [];
  TIERS.forEach((t, i) => {
    const divs = divisionsOf(i);
    if (t.id === 'elite') out.push({ label: t.name, tier: t, division: 0, target: t.under });
    else for (let d = 3; d >= 1; d--) out.push({ label: `${t.name} ${ROMAN[d]}`, tier: t, division: d, target: d === 3 && t.under === Infinity ? Infinity : divs[d - 1] });
  });
  return out;
}

export function rankFor(runs: RunRecord[], now = Date.now()): Rank {
  let best: Rank['from'] = null, score: number | null = null;
  for (const r of runs) {
    if (now - Date.parse(r.startedAt) > WINDOW_DAYS * 864e5) continue;
    const bests = runBests(r);
    for (const d of PB_DISTANCES) {
      if (d.meters < MIN_EFFORT || !bests[d.key]) continue;
      const eq = fiveKEquivalent(d.meters, bests[d.key]);
      if (score === null || eq < score) { score = eq; best = { distance: d.label, time: bests[d.key], date: r.startedAt }; }
    }
  }
  const base = describe(score);
  const all = ladder();
  const pos = all.findIndex((x) => x.label === base.label);
  // Unranked people have no target time: any run of a mile or more gets them a rank.
  const up = score !== null && pos >= 0 && pos < all.length - 1 ? all[pos + 1] : null;
  let next: Rank['next'] = null;
  if (up && score !== null) {
    const from = all[pos].target !== Infinity ? all[pos].target : BRONZE_FLOOR + 10 * 60;
    const progress = Math.max(0, Math.min(1, (from - score) / (from - up.target)));
    next = { label: up.label, target: Math.floor(up.target) - 1, progress };
  }
  return { ...base, score: score === null ? null : Math.round(score), from: best, next };
}

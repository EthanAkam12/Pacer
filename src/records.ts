import { RunRecord } from './types';

export const PB_DISTANCES = [
  { key: '1000', meters: 1000, label: '1 km', spoken: '1 kilometre' },
  { key: '1609', meters: 1609.34, label: '1 mile', spoken: '1 mile' },
  { key: '5000', meters: 5000, label: '5 km', spoken: '5 kilometres' },
  { key: '10000', meters: 10000, label: '10 km', spoken: '10 kilometres' },
  { key: '21097', meters: 21097.5, label: 'Half marathon', spoken: 'the half marathon' },
  { key: '42195', meters: 42195, label: 'Marathon', spoken: 'the marathon' },
];

/**
 * Fastest time to cover each standard distance anywhere in a run.
 * `series` is cumulative distance over elapsed time, starting at { t: 0, d: 0 }.
 */
export function bestEfforts(series: { t: number; d: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { key, meters } of PB_DISTANCES) {
    let best = Infinity, i = 0;
    for (let j = 1; j < series.length; j++) {
      const target = series[j].d - meters;
      if (target < 0) continue;
      while (i + 1 < j && series[i + 1].d <= target) i++;
      const a = series[i], b = series[i + 1];
      const tAt = b.d > a.d ? a.t + ((target - a.d) / (b.d - a.d)) * (b.t - a.t) : a.t;
      best = Math.min(best, series[j].t - tAt);
    }
    if (isFinite(best) && best > 0) out[key] = Math.round(best);
  }
  return out;
}

/** A run's best efforts, estimated from its splits and total for runs saved before best efforts were recorded. */
export function runBests(r: RunRecord): Record<string, number> {
  if (r.bests) return r.bests;
  const out: Record<string, number> = {};
  for (const { key, meters } of PB_DISTANCES) {
    if (r.mode === 'distance' && Math.abs(r.distance - meters) <= meters * 0.01) out[key] = Math.round(r.duration);
    if (key === '1000') {
      let prev = 0;
      for (const s of r.splits) {
        if (Math.abs(s.distance - prev - 1000) < 1 && (!out[key] || s.time < out[key])) out[key] = Math.round(s.time);
        prev = s.distance;
      }
    }
  }
  return out;
}

export interface PersonalBest { key: string; label: string; time: number; runId: string; date: string }

export function personalBests(runs: RunRecord[]): PersonalBest[] {
  return PB_DISTANCES.flatMap(({ key, label }) => {
    let best: PersonalBest | null = null;
    for (const r of runs) {
      const t = runBests(r)[key];
      if (t && (!best || t < best.time)) best = { key, label, time: t, runId: r.id, date: r.startedAt };
    }
    return best ? [best] : [];
  });
}

/** Distance keys where `bests` beats every earlier run, or where there was no earlier time. */
export function newPbs(bests: Record<string, number>, earlier: RunRecord[]): string[] {
  const prior = new Map(personalBests(earlier).map((p) => [p.key, p.time]));
  return Object.keys(bests).filter((k) => !prior.has(k) || bests[k] < prior.get(k)!);
}

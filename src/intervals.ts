import { IntervalStep, StepKind, Workout } from './types';
import { fmtTime, sayDist, sayTime } from './format';

export const KIND_NAME: Record<StepKind, string> = { run: 'Run', walk: 'Walk', rest: 'Rest' };

const T = (kind: StepKind, sec: number): IntervalStep => ({ kind, measure: 'time', value: sec });
const D = (kind: StepKind, m: number): IntervalStep => ({ kind, measure: 'distance', value: m });

export const PRESETS: Workout[] = [
  { id: 'preset-beginner', name: 'Beginner run/walk', warmup: T('walk', 300), block: [T('run', 60), T('walk', 90)], repeats: 8, cooldown: T('walk', 300) },
  { id: 'preset-400s', name: '400 m repeats', warmup: T('walk', 300), block: [D('run', 400), T('rest', 90)], repeats: 6, cooldown: T('walk', 300) },
  { id: 'preset-5-1', name: 'Run 5, walk 1', warmup: null, block: [T('run', 300), T('walk', 60)], repeats: 5, cooldown: null },
];

export function stepAmount(s: IntervalStep): string {
  if (s.measure === 'time') return fmtTime(s.value);
  return s.value >= 1000 ? `${+(s.value / 1000).toFixed(2)} km` : `${s.value} m`;
}
export const stepLabel = (s: IntervalStep) => `${KIND_NAME[s.kind]} ${stepAmount(s)}`;

export function stepSpoken(s: IntervalStep): string {
  return s.measure === 'time' ? `${s.kind} for ${sayTime(s.value)}` : `${s.kind} ${sayDist(s.value)}`;
}

export function expandWorkout(w: Workout): IntervalStep[] {
  const out: IntervalStep[] = [];
  if (w.warmup) out.push(w.warmup);
  for (let i = 0; i < w.repeats; i++) out.push(...w.block);
  if (w.cooldown) out.push(w.cooldown);
  return out;
}

export function summarize(w: Workout): string {
  const block = w.block.map(stepLabel).join(', ');
  return [
    w.warmup ? `${stepLabel(w.warmup)} warm-up` : null,
    `${w.repeats} × (${block})`,
    w.cooldown ? `${stepLabel(w.cooldown)} cool-down` : null,
  ].filter(Boolean).join(', ');
}

/** Rough seconds for a step, assuming ~6:00/km running and 10:00/km walking. */
export function estimateSeconds(s: IntervalStep): number {
  if (s.measure === 'time') return s.value;
  const perKm = s.kind === 'run' ? 360 : s.kind === 'walk' ? 600 : 900;
  return (s.value / 1000) * perKm;
}
export const estimateMinutes = (w: Workout) => Math.round(expandWorkout(w).reduce((a, s) => a + estimateSeconds(s), 0) / 60);

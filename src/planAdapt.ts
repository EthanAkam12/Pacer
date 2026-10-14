import { PlanProgress, RunRecord, Workout, IntervalStep } from './types';
import { PlanSession, TrainingPlan } from './plans';
import { loadPlan, savePlan } from './storage';

/**
 * Helping runners who can't keep up with a training plan: a log of attempts with how each one
 * felt, spotting when someone is struggling or coming back from a break, stepping back a week,
 * and easier versions of the big sessions.
 */
export type Feel = 'easy' | 'ok' | 'hard';
export interface PlanAttempt {
  id: string; // session id, "w5s3"
  run: string; // run record id
  at: string;
  done: boolean; // finished the whole session
  easier?: boolean;
  feel?: Feel;
}

export const FEELS: { value: Feel; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '😊' },
  { value: 'ok', label: 'Just right', emoji: '💪' },
  { value: 'hard', label: 'Too hard', emoji: '😮‍💨' },
];

const BREAK_DAYS = 10;

/** The week of the next unfinished session (the plan's last week once it's complete). */
export function currentWeek(plan: TrainingPlan, progress: PlanProgress): number {
  return plan.sessions.find((s) => !progress.done[s.id])?.week ?? plan.weeks;
}

/** Attempts since the plan was last adjusted, newest last. */
const recent = (p: PlanProgress) => (p.log ?? []).filter((a) => !p.adjustedAt || a.at > p.adjustedAt);

/** Two tough sessions in a row (felt too hard, or stopped early) since the last adjustment. */
export function struggling(progress: PlanProgress): boolean {
  const last = recent(progress).slice(-2);
  return last.length === 2 && last.every((a) => !a.done || a.feel === 'hard');
}

/** Days since anything happened in the plan, if it's been long enough to suggest easing back in. */
export function breakDays(plan: TrainingPlan, progress: PlanProgress, runs: RunRecord[], now = Date.now()): number | null {
  if (!Object.keys(progress.done).length || currentWeek(plan, progress) < 2) return null;
  const times = [progress.startedAt, progress.adjustedAt, ...(progress.log ?? []).map((a) => a.at),
    ...runs.filter((r) => r.planSession?.startsWith(`${plan.id}:`)).map((r) => r.startedAt)]
    .filter(Boolean).map((x) => Date.parse(x!));
  const days = Math.floor((now - Math.max(...times)) / 864e5);
  return days >= BREAK_DAYS ? days : null;
}

/** Unticks every session from `week` onwards, so the plan picks up again at the start of that week. Runs stay in History. */
export async function restartFrom(plan: TrainingPlan, week: number) {
  const p = await loadPlan();
  if (!p || p.planId !== plan.id) return null;
  const keep = plan.sessions.filter((s) => s.week < week).map((s) => s.id);
  const done = Object.fromEntries(Object.entries(p.done).filter(([id]) => keep.includes(id)));
  const next = { ...p, done, adjustedAt: new Date().toISOString() };
  await savePlan(next);
  return next;
}

/** Marks the plan as looked at (e.g. "Carry on" after a break or a tough patch) without changing it. */
export async function acknowledge(plan: TrainingPlan) {
  const p = await loadPlan();
  if (!p || p.planId !== plan.id) return null;
  const next = { ...p, adjustedAt: new Date().toISOString() };
  await savePlan(next);
  return next;
}

/** Called by the coaching engine when a plan session run is saved, finished or not. */
export async function recordAttempt(planSession: string, run: string, done: boolean, easier: boolean) {
  const [planId, id] = planSession.split(':');
  const p = await loadPlan();
  if (!p || p.planId !== planId) return;
  const log = [...(p.log ?? []), { id, run, at: new Date().toISOString(), done, ...(easier ? { easier } : {}) }].slice(-30);
  await savePlan({ ...p, log, done: done ? { ...p.done, [id]: run } : p.done });
}

/** The attempt saved with this run, if it was a plan session for the current plan. */
export async function attemptFor(run: string): Promise<{ attempt: PlanAttempt; progress: PlanProgress } | null> {
  const p = await loadPlan();
  const attempt = p?.log?.find((a) => a.run === run);
  return p && attempt ? { attempt, progress: p } : null;
}

export async function setFeel(run: string, feel: Feel) {
  const p = await loadPlan();
  if (!p?.log) return null;
  const next = { ...p, log: p.log.map((a) => (a.run === run ? { ...a, feel } : a)) };
  await savePlan(next);
  return next;
}

// ----- easier versions -----

const LONG_RUN = 8 * 60;

/** Splits long continuous run steps in half with a 90 second walk in the middle. */
function easierWorkout(w: Workout): Workout | null {
  const split = (steps: IntervalStep[]) => steps.flatMap((s): IntervalStep[] =>
    s.kind === 'run' && s.measure === 'time' && s.value >= LONG_RUN
      ? [{ ...s, value: Math.round(s.value / 2) }, { kind: 'walk', measure: 'time', value: 90 }, { ...s, value: Math.round(s.value / 2) }]
      : [s]);
  const block = split(w.block);
  if (block.length === w.block.length) return null;
  return { ...w, id: `${w.id}-easier`, name: `${w.name} (easier)`, block };
}

/** A gentler version of a session: long runs split by a walk break, or a distance run cut by about a fifth. */
export function easierSession(s: PlanSession): PlanSession | null {
  if (s.kind === 'workout' && s.workout) {
    const w = easierWorkout(s.workout);
    if (!w) return null;
    const long = s.workout.block.filter((x) => x.kind === 'run' && x.measure === 'time' && x.value >= LONG_RUN);
    const what = long.length === 1 ? `the ${Math.round(long[0].value / 60)} minute run` : 'each long run';
    return { ...s, workout: w, summary: `Easier: a 90 second walk in the middle of ${what}` };
  }
  if (s.kind === 'distance' && s.km && s.km >= 4) {
    const km = Math.max(3, Math.round(s.km * 0.8 * 2) / 2);
    return { ...s, km, targetPace: undefined, summary: `Easier: ${km} km at a relaxed pace, walk breaks are fine` };
  }
  return null;
}

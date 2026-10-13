import { IntervalStep, StepKind, Workout } from './types';

/**
 * Training plans: a fixed set of sessions over several weeks. Each session is either a timed or
 * distance-based interval workout, or a distance run. The Run tab offers the next unfinished one.
 */
export interface PlanSession {
  id: string; // "w3s2"
  week: number;
  day: number;
  title: string;
  summary: string;
  kind: 'workout' | 'distance';
  workout?: Workout;
  km?: number;
  targetPace?: number; // seconds per km
}
export interface TrainingPlan { id: string; name: string; level: string; blurb: string; weeks: number; perWeek: number; sessions: PlanSession[] }

const T = (kind: StepKind, min: number): IntervalStep => ({ kind, measure: 'time', value: Math.round(min * 60) });
const D = (kind: StepKind, m: number): IntervalStep => ({ kind, measure: 'distance', value: m });
const WARM = T('walk', 5);

function session(planId: string, week: number, day: number, summary: string, body: Omit<PlanSession, 'id' | 'week' | 'day' | 'title' | 'summary'>): PlanSession {
  const id = `w${week}s${day}`;
  const s: PlanSession = { id, week, day, title: `Week ${week}, run ${day}`, summary, ...body };
  if (s.workout) s.workout = { ...s.workout, id: `${planId}-${id}`, name: `${planId === 'c25k' ? 'C25K' : 'Plan'}: week ${week}, run ${day}` };
  return s;
}
const wk = (block: IntervalStep[], repeats = 1, warmup: IntervalStep | null = WARM, cooldown: IntervalStep | null = WARM): Workout =>
  ({ id: '', name: '', warmup, block, repeats, cooldown });

// ----- Couch to 5K (9 weeks, the NHS programme) -----
const C25K_WEEKS: { summary: string; w: Workout }[][] = [
  [{ summary: '8 × (run 1 min, walk 1½ min)', w: wk([T('run', 1), T('walk', 1.5)], 8) }],
  [{ summary: '6 × (run 1½ min, walk 2 min)', w: wk([T('run', 1.5), T('walk', 2)], 6) }],
  [{ summary: '2 × (run 1½, walk 1½, run 3, walk 3)', w: wk([T('run', 1.5), T('walk', 1.5), T('run', 3), T('walk', 3)], 2) }],
  [{ summary: 'Run 3, walk 1½, run 5, walk 2½, run 3, walk 1½, run 5', w: wk([T('run', 3), T('walk', 1.5), T('run', 5), T('walk', 2.5), T('run', 3), T('walk', 1.5), T('run', 5)]) }],
  [
    { summary: '3 × (run 5 min, walk 3 min)', w: wk([T('run', 5), T('walk', 3)], 3) },
    { summary: 'Run 8, walk 5, run 8', w: wk([T('run', 8), T('walk', 5), T('run', 8)]) },
    { summary: 'Run 20 minutes without stopping', w: wk([T('run', 20)]) },
  ],
  [
    { summary: 'Run 5, walk 3, run 8, walk 3, run 5', w: wk([T('run', 5), T('walk', 3), T('run', 8), T('walk', 3), T('run', 5)]) },
    { summary: 'Run 10, walk 3, run 10', w: wk([T('run', 10), T('walk', 3), T('run', 10)]) },
    { summary: 'Run 25 minutes', w: wk([T('run', 25)]) },
  ],
  [{ summary: 'Run 25 minutes', w: wk([T('run', 25)]) }],
  [{ summary: 'Run 28 minutes', w: wk([T('run', 28)]) }],
  [{ summary: 'Run 30 minutes. You did it!', w: wk([T('run', 30)]) }],
];
const c25k: PlanSession[] = C25K_WEEKS.flatMap((days, i) => [0, 1, 2].map((d) => {
  const day = days[days.length === 3 ? d : 0];
  return session('c25k', i + 1, d + 1, day.summary, { kind: 'workout', workout: day.w });
}));

// ----- First 10K (8 weeks) -----
const tenK: PlanSession[] = [];
const tenKEasy = [20, 25, 25, 30, 30, 35, 35, 25];
const tenKLong = [4, 5, 5.5, 6.5, 7, 8, 9, 10];
for (let w = 1; w <= 8; w++) {
  tenK.push(session('10k', w, 1, `Easy run, ${tenKEasy[w - 1]} min`, { kind: 'workout', workout: wk([T('run', tenKEasy[w - 1])]) }));
  tenK.push(session('10k', w, 2, w < 8 ? `${4 + Math.min(w, 4)} × (run 2 min, walk 1 min)` : 'Short and sharp: 4 × (run 2, walk 1)',
    { kind: 'workout', workout: wk([T('run', 2), T('walk', 1)], w < 8 ? 4 + Math.min(w, 4) : 4) }));
  tenK.push(session('10k', w, 3, w < 8 ? `Long run, ${tenKLong[w - 1]} km` : 'Race day: 10 km!', { kind: 'distance', km: tenKLong[w - 1] }));
}

// ----- Sub-30 5K (6 weeks) -----
const sub30: PlanSession[] = [];
const sub30Reps = [5, 6, 6, 7, 8, 4];
for (let w = 1; w <= 6; w++) {
  sub30.push(session('sub30', w, 1, `${sub30Reps[w - 1]} × 400 m at 5:30 per km, 90 s rest`,
    { kind: 'workout', workout: wk([D('run', 400), T('rest', 1.5)], sub30Reps[w - 1]), targetPace: 330 }));
  sub30.push(session('sub30', w, 2, `Easy run, ${20 + w * 3} min`, { kind: 'workout', workout: wk([T('run', 20 + w * 3)]) }));
  sub30.push(w < 6
    ? session('sub30', w, 3, `Steady ${[4, 5, 5, 6, 6][w - 1]} km at 6:00 per km`, { kind: 'distance', km: [4, 5, 5, 6, 6][w - 1], targetPace: 360 })
    : session('sub30', w, 3, 'Time trial: 5 km under 30 minutes!', { kind: 'distance', km: 5, targetPace: 355 }));
}

// ----- First half marathon (12 weeks) -----
const half: PlanSession[] = [];
const halfEasy = [30, 30, 35, 35, 40, 40, 45, 45, 45, 40, 35, 25];
const halfTempo = [10, 12, 14, 15, 16, 18, 20, 20, 22, 20, 15, 10];
const halfLong = [8, 9, 10, 11, 12, 13, 14, 15, 16, 14, 11, 21.1];
for (let w = 1; w <= 12; w++) {
  half.push(session('half', w, 1, `Easy run, ${halfEasy[w - 1]} min`, { kind: 'workout', workout: wk([T('run', halfEasy[w - 1])]) }));
  half.push(session('half', w, 2, `Tempo: ${halfTempo[w - 1]} min comfortably hard`,
    { kind: 'workout', workout: wk([T('run', halfTempo[w - 1])], 1, T('run', 10), T('walk', 5)) }));
  half.push(session('half', w, 3, w < 12 ? `Long run, ${halfLong[w - 1]} km, nice and easy` : 'Race day: the half marathon!', { kind: 'distance', km: halfLong[w - 1] }));
}

export const PLANS: TrainingPlan[] = [
  { id: 'c25k', name: 'Couch to 5K', level: 'Beginner', blurb: 'From your first steps to running 30 minutes non-stop. Run/walk sessions that build up gently.', weeks: 9, perWeek: 3, sessions: c25k },
  { id: '10k', name: 'First 10K', level: 'Beginner+', blurb: 'For people who can run 3 km. Easy runs, run/walk reps and a long run that grows to 10 km.', weeks: 8, perWeek: 3, sessions: tenK },
  { id: 'sub30', name: 'Sub-30 5K', level: 'Intermediate', blurb: 'Can run 5 km already? Speed reps and steady runs to get you under 30 minutes.', weeks: 6, perWeek: 3, sessions: sub30 },
  { id: 'half', name: 'First half marathon', level: 'Intermediate', blurb: 'For people who can run 5–8 km. Easy runs, tempo runs and a weekly long run up to 21.1 km.', weeks: 12, perWeek: 3, sessions: half },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id) ?? null;
export const sessionKey = (planId: string, s: PlanSession) => `${planId}:${s.id}`;

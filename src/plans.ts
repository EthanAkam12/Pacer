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
export interface TrainingPlan {
  id: string; name: string; level: string; blurb: string; weeks: number; perWeek: number; sessions: PlanSession[];
  /** Beginner plan: the coach encourages walking breaks instead of warning about slowing down. */
  gentle?: boolean;
  /** Pacely Plus plan. */
  plus?: boolean;
  /** Personal plan built by src/customPlan.ts. */
  custom?: { km: number; raceDate: string; goalTime: number; paces: { easy: number; tempo: number; reps: number; race: number } };
}

export const T = (kind: StepKind, min: number): IntervalStep => ({ kind, measure: 'time', value: Math.round(min * 60) });
export const D = (kind: StepKind, m: number): IntervalStep => ({ kind, measure: 'distance', value: m });
const WARM = T('walk', 5);

export function session(planId: string, week: number, day: number, summary: string, body: Omit<PlanSession, 'id' | 'week' | 'day' | 'title' | 'summary'>): PlanSession {
  const id = `w${week}s${day}`;
  const s: PlanSession = { id, week, day, title: `Week ${week}, run ${day}`, summary, ...body };
  if (s.workout) s.workout = { ...s.workout, id: `${planId}-${id}`, name: `${planId === 'c25k' ? 'C25K' : 'Plan'}: week ${week}, run ${day}` };
  return s;
}
export const wk = (block: IntervalStep[], repeats = 1, warmup: IntervalStep | null = WARM, cooldown: IntervalStep | null = WARM): Workout =>
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

// ----- Pacely Plus plans -----

// Marathon (16 weeks, 4 runs a week)
const marathon: PlanSession[] = [];
const marEasy = [30, 35, 35, 40, 35, 40, 45, 45, 40, 45, 50, 50, 45, 50, 40, 30];
const marQual = [20, 20, 25, 25, 20, 30, 30, 35, 25, 35, 40, 40, 30, 40, 25, 15];
const marLong = [13, 14, 16, 18, 15, 19, 21, 23, 19, 24, 26, 28, 22, 32, 21, 42.2];
for (let w = 1; w <= 16; w++) {
  marathon.push(session('marathon', w, 1, `Easy run, ${marEasy[w - 1]} min`, { kind: 'workout', workout: wk([T('run', marEasy[w - 1])]) }));
  marathon.push(w % 2
    ? session('marathon', w, 2, `${Math.round(marQual[w - 1] / 5)} × 1 km comfortably hard, 2 min jog between`, { kind: 'workout', workout: wk([D('run', 1000), T('walk', 2)], Math.round(marQual[w - 1] / 5), T('run', 10), T('walk', 5)) })
    : session('marathon', w, 2, `Tempo: ${marQual[w - 1]} min comfortably hard`, { kind: 'workout', workout: wk([T('run', marQual[w - 1])], 1, T('run', 10), T('walk', 5)) }));
  marathon.push(session('marathon', w, 3, `Easy run, ${Math.max(20, marEasy[w - 1] - 10)} min`, { kind: 'workout', workout: wk([T('run', Math.max(20, marEasy[w - 1] - 10))]) }));
  marathon.push(session('marathon', w, 4, w < 16 ? `Long run, ${marLong[w - 1]} km, slow and steady` : 'Race day: the marathon!', { kind: 'distance', km: marLong[w - 1] }));
}

// Sub-25 5K (6 weeks)
const sub25: PlanSession[] = [];
const sub25Reps = [5, 6, 7, 7, 8, 4];
const sub25Steady = [4, 5, 5, 6, 6];
for (let w = 1; w <= 6; w++) {
  sub25.push(session('sub25', w, 1, `${sub25Reps[w - 1]} × 400 m at 4:40 per km, 90 s rest`, { kind: 'workout', workout: wk([D('run', 400), T('rest', 1.5)], sub25Reps[w - 1]), targetPace: 280 }));
  sub25.push(session('sub25', w, 2, `Easy run, ${25 + w * 3} min`, { kind: 'workout', workout: wk([T('run', 25 + w * 3)]) }));
  sub25.push(w < 6
    ? session('sub25', w, 3, `Steady ${sub25Steady[w - 1]} km at 5:00 per km`, { kind: 'distance', km: sub25Steady[w - 1], targetPace: 300 })
    : session('sub25', w, 3, 'Time trial: 5 km under 25 minutes!', { kind: 'distance', km: 5, targetPace: 297 }));
}

// Sub-20 5K (8 weeks, 4 runs a week)
const sub20: PlanSession[] = [];
const sub20Reps = [4, 5, 5, 6, 6, 7, 6, 3];
const sub20Tempo = [15, 18, 20, 20, 22, 25, 20, 10];
const sub20Long = [8, 9, 10, 10, 11, 12, 10, 5];
for (let w = 1; w <= 8; w++) {
  sub20.push(session('sub20', w, 1, `${sub20Reps[w - 1]} × 1 km at 3:50 per km, 2 min jog`, { kind: 'workout', workout: wk([D('run', 1000), T('walk', 2)], sub20Reps[w - 1], T('run', 10), T('walk', 5)), targetPace: 230 }));
  sub20.push(session('sub20', w, 2, `Easy run, ${30 + Math.min(w, 5) * 2} min`, { kind: 'workout', workout: wk([T('run', 30 + Math.min(w, 5) * 2)]) }));
  sub20.push(session('sub20', w, 3, `Tempo: ${sub20Tempo[w - 1]} min at 4:15 per km`, { kind: 'workout', workout: wk([T('run', sub20Tempo[w - 1])], 1, T('run', 10), T('walk', 5)), targetPace: 255 }));
  sub20.push(w < 8
    ? session('sub20', w, 4, `Long run, ${sub20Long[w - 1]} km easy`, { kind: 'distance', km: sub20Long[w - 1] })
    : session('sub20', w, 4, 'Time trial: 5 km under 20 minutes!', { kind: 'distance', km: 5, targetPace: 238 }));
}

// 10K personal best (8 weeks, 4 runs a week)
const tenKpb: PlanSession[] = [];
const pbReps = [5, 6, 6, 7, 8, 8, 6, 4];
const pbTempo = [15, 18, 20, 22, 25, 25, 20, 10];
const pbLong = [10, 11, 12, 12, 13, 14, 12, 10];
for (let w = 1; w <= 8; w++) {
  tenKpb.push(session('10kpb', w, 1, `${pbReps[w - 1]} × 800 m hard, 90 s jog`, { kind: 'workout', workout: wk([D('run', 800), T('walk', 1.5)], pbReps[w - 1], T('run', 10), T('walk', 5)) }));
  tenKpb.push(session('10kpb', w, 2, `Easy run, ${30 + Math.min(w, 5) * 3} min`, { kind: 'workout', workout: wk([T('run', 30 + Math.min(w, 5) * 3)]) }));
  tenKpb.push(session('10kpb', w, 3, `Tempo: ${pbTempo[w - 1]} min comfortably hard`, { kind: 'workout', workout: wk([T('run', pbTempo[w - 1])], 1, T('run', 10), T('walk', 5)) }));
  tenKpb.push(w < 8
    ? session('10kpb', w, 4, `Long run, ${pbLong[w - 1]} km easy`, { kind: 'distance', km: pbLong[w - 1] })
    : session('10kpb', w, 4, 'Race day: go for your 10K PB!', { kind: 'distance', km: 10 }));
}

// Return after injury (6 weeks, gentle run/walk)
const COMEBACK: { summary: string; w: Workout }[] = [
  { summary: '8 × (run 2 min, walk 1 min)', w: wk([T('run', 2), T('walk', 1)], 8) },
  { summary: '6 × (run 3 min, walk 1 min)', w: wk([T('run', 3), T('walk', 1)], 6) },
  { summary: '4 × (run 5 min, walk 1 min)', w: wk([T('run', 5), T('walk', 1)], 4) },
  { summary: '3 × (run 8 min, walk 1 min)', w: wk([T('run', 8), T('walk', 1)], 3) },
  { summary: '2 × (run 12 min, walk 1 min)', w: wk([T('run', 12), T('walk', 1)], 2) },
  { summary: 'Run 25 minutes, easy', w: wk([T('run', 25)]) },
];
const comeback: PlanSession[] = COMEBACK.flatMap((x, i) => [1, 2, 3].map((d) => session('comeback', i + 1, d, x.summary, { kind: 'workout', workout: x.w })));

export const PLANS: TrainingPlan[] = [
  { id: 'c25k', name: 'Couch to 5K', level: 'Beginner', blurb: 'From your first steps to running 30 minutes non-stop. Run/walk sessions that build up gently.', weeks: 9, perWeek: 3, sessions: c25k, gentle: true },
  { id: '10k', name: 'First 10K', level: 'Beginner+', blurb: 'For people who can run 3 km. Easy runs, run/walk reps and a long run that grows to 10 km.', weeks: 8, perWeek: 3, sessions: tenK, gentle: true },
  { id: 'sub30', name: 'Sub-30 5K', level: 'Intermediate', blurb: 'Can run 5 km already? Speed reps and steady runs to get you under 30 minutes.', weeks: 6, perWeek: 3, sessions: sub30 },
  { id: 'half', name: 'First half marathon', level: 'Intermediate', blurb: 'For people who can run 5–8 km. Easy runs, tempo runs and a weekly long run up to 21.1 km.', weeks: 12, perWeek: 3, sessions: half },
  { id: 'comeback', name: 'Return after injury', level: 'Comeback', blurb: 'Back from injury or a long break? Gentle run/walk sessions that rebuild to 25 minutes of easy running.', weeks: 6, perWeek: 3, sessions: comeback, gentle: true, plus: true },
  { id: 'sub25', name: 'Sub-25 5K', level: 'Intermediate+', blurb: 'Already under 28 minutes? Speed reps and steady runs to break 25.', weeks: 6, perWeek: 3, sessions: sub25, plus: true },
  { id: '10kpb', name: '10K personal best', level: 'Intermediate+', blurb: 'For regular 10K runners. Reps, tempo runs and long runs to set a new PB.', weeks: 8, perWeek: 4, sessions: tenKpb, plus: true },
  { id: 'sub20', name: 'Sub-20 5K', level: 'Advanced', blurb: 'For runners around 21–22 minutes. Kilometre reps, tempo runs and long runs to break 20.', weeks: 8, perWeek: 4, sessions: sub20, plus: true },
  { id: 'marathon', name: 'Marathon', level: 'Advanced', blurb: 'For people who have run a half. Four runs a week, with a long run that builds to 32 km.', weeks: 16, perWeek: 4, sessions: marathon, plus: true },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id) ?? null;
/** The plan for some progress: a personal plan travels with its progress, the rest are looked up. */
export const planFor = (p: { planId: string; custom?: TrainingPlan } | null | undefined): TrainingPlan | null =>
  !p ? null : p.custom ?? planById(p.planId);
export const sessionKey = (planId: string, s: PlanSession) => `${planId}:${s.id}`;

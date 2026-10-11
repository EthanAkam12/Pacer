export type StepKind = 'run' | 'walk' | 'rest';
export type StepMeasure = 'time' | 'distance';

export interface IntervalStep {
  kind: StepKind;
  measure: StepMeasure;
  value: number; // seconds when measure is 'time', metres when 'distance'
}

export interface Workout {
  id: string;
  name: string;
  warmup: IntervalStep | null;
  block: IntervalStep[];
  repeats: number;
  cooldown: IntervalStep | null;
}

export type RunMode = 'distance' | 'intervals';

export type CoachStyle = 'friendly' | 'tough' | 'calm' | 'minimal' | 'cheeky';

/** When the coach reads out heart rate: never, with each split, every N seconds (t30) or every N metres (d500). */
export type HrEvery = 'off' | 'split' | 't30' | 't60' | 't120' | 't300' | 'd500' | 'd1000';

export interface Plan {
  mode: RunMode;
  goalMeters: number;
  targetPace: number | null; // seconds per km
  splitEvery: number; // metres
  workout: Workout | null;
  voice: boolean;
  maxHr: number;
  simulate: boolean;
  coach: CoachStyle;
  voiceId: string | null;
  voiceRate: number;
  voicePitch: number;
  hrEvery: HrEvery;
}

export interface Split {
  distance: number; // cumulative distance at the end of the split
  time: number;
  pace: number; // 0 when unknown
  hr: number | null;
}

export interface IntervalResult {
  kind: StepKind;
  label: string;
  time: number;
  distance: number;
  pace: number; // 0 when unknown
  hr: number | null;
  completed: boolean;
}

export interface RunRecord {
  id: string;
  startedAt: string;
  mode: RunMode;
  title: string;
  distance: number;
  duration: number;
  avgPace: number;
  avgHr: number | null;
  maxHr: number | null;
  splits: Split[];
  intervals: IntervalResult[];
  route: { lat: number; lon: number }[];
  completed: boolean;
  simulated: boolean;
  /** Fastest time in seconds for each standard distance covered, keyed by metres. Missing on older runs. */
  bests?: Record<string, number>;
  /** Distance keys that were personal bests when this run was saved. */
  pbs?: string[];
}

export interface Settings {
  mode: RunMode;
  goalKm: string;
  targetPace: string;
  splitEvery: number;
  voice: boolean;
  maxHr: string;
  simulate: boolean;
  workoutId: string | null;
  /** Coach persona id, e.g. 'laura'. Older saves hold a style name, which `personaFor` maps across. */
  coach: string;
  voiceId: string | null;
  voiceRate: number;
  hrEvery: HrEvery;
}

export type Phase = 'idle' | 'running' | 'paused' | 'finishing' | 'finished';

export interface LiveSnapshot {
  phase: Phase;
  mode: RunMode;
  title: string;
  elapsed: number;
  distance: number;
  currentPace: number;
  avgPace: number;
  hr: number | null;
  slow: boolean;
  coachLine: string;
  gpsStatus: string;
  notice: string | null;
  goal: number;
  step: IntervalStep | null;
  nextStep: IntervalStep | null;
  stepIndex: number;
  stepCount: number;
  stepRemaining: number;
  stepProgress: number;
  recordId: string | null;
  simulated: boolean;
}

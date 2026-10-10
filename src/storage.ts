import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunRecord, Settings, Workout } from './types';
import { PRESETS } from './intervals';

const RUNS = 'pacer.runs.v1';
const WORKOUTS = 'pacer.workouts.v1';
const SETTINGS = 'pacer.settings.v1';

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

// ----- runs -----
export async function loadRuns(): Promise<RunRecord[]> {
  const runs = await read<RunRecord[]>(RUNS, []);
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export async function getRun(id: string) {
  return (await read<RunRecord[]>(RUNS, [])).find((r) => r.id === id) ?? null;
}
export async function saveRun(r: RunRecord) {
  const runs = await read<RunRecord[]>(RUNS, []);
  runs.push(r);
  await write(RUNS, runs);
}
export async function deleteRun(id: string) {
  await write(RUNS, (await read<RunRecord[]>(RUNS, [])).filter((r) => r.id !== id));
}

// ----- workouts (seeded with presets on first launch) -----
export async function loadWorkouts(): Promise<Workout[]> {
  const raw = await AsyncStorage.getItem(WORKOUTS);
  if (raw === null) {
    await write(WORKOUTS, PRESETS);
    return PRESETS;
  }
  try { return JSON.parse(raw) as Workout[]; } catch { return PRESETS; }
}
export async function saveWorkout(w: Workout) {
  const list = await loadWorkouts();
  const i = list.findIndex((x) => x.id === w.id);
  if (i >= 0) list[i] = w; else list.push(w);
  await write(WORKOUTS, list);
}
export async function deleteWorkout(id: string) {
  await write(WORKOUTS, (await loadWorkouts()).filter((w) => w.id !== id));
}

// ----- settings -----
export const DEFAULT_SETTINGS: Settings = {
  mode: 'distance', goalKm: '5', targetPace: '', splitEvery: 1000,
  voice: true, maxHr: '', simulate: false, workoutId: 'preset-beginner',
  coach: 'friendly', voiceId: null, voiceRate: 1,
};
export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await read<Partial<Settings>>(SETTINGS, {})) };
}
export const saveSettings = (s: Settings) => write(SETTINGS, s);

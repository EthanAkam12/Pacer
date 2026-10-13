import AsyncStorage from '@react-native-async-storage/async-storage';
import { HrEvery, PlanProgress, RunRecord, Settings, Workout } from './types';
import { PRESETS } from './intervals';

/**
 * Everything is saved on the phone. Runs, workouts and plan progress belong to the signed-in account
 * (their keys end in the user id) and are backed up to the cloud by src/cloud.ts through the hooks below.
 * Settings belong to the phone.
 */
const SETTINGS = 'pacer.settings.v1';
let user: string | null = null;
const key = (base: string) => (user ? `${base}.${user}` : base);
const RUNS = () => key('pacer.runs.v1');
const WORKOUTS = () => key('pacer.workouts.v1');
const PLAN = () => key('pacer.plan.v1');

export interface StorageHooks {
  runSaved?: (r: RunRecord) => void;
  runDeleted?: (id: string) => void;
  stateChanged?: () => void; // workouts or plan progress changed
}
let hooks: StorageHooks = {};
export const setStorageHooks = (h: StorageHooks) => { hooks = h; };

/** Switches to an account's saved data. Runs saved before accounts existed move to the first account that signs in. */
export async function setStorageUser(uid: string | null) {
  user = uid;
  if (!uid) return;
  for (const base of ['pacer.runs.v1', 'pacer.workouts.v1']) {
    const legacy = await AsyncStorage.getItem(base);
    if (legacy !== null && (await AsyncStorage.getItem(`${base}.${uid}`)) === null) {
      await AsyncStorage.setItem(`${base}.${uid}`, legacy);
      await AsyncStorage.removeItem(base);
    }
  }
}
export const storageUser = () => user;

/** Lets screens refresh when runs arrive from the cloud. */
const dataListeners = new Set<() => void>();
export const onDataChanged = (l: () => void) => { dataListeners.add(l); return () => { dataListeners.delete(l); }; };
export const notifyDataChanged = () => dataListeners.forEach((l) => l());

async function read<T>(k: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v));

// ----- runs -----
export async function loadRuns(): Promise<RunRecord[]> {
  const runs = await read<RunRecord[]>(RUNS(), []);
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export async function getRun(id: string) {
  return (await read<RunRecord[]>(RUNS(), [])).find((r) => r.id === id) ?? null;
}
export async function saveRun(r: RunRecord) {
  const runs = await read<RunRecord[]>(RUNS(), []);
  runs.push(r);
  await write(RUNS(), runs);
  hooks.runSaved?.(r);
}
export async function deleteRun(id: string) {
  await write(RUNS(), (await read<RunRecord[]>(RUNS(), [])).filter((r) => r.id !== id));
  hooks.runDeleted?.(id);
}
/** Adds runs from the cloud that this phone doesn't have yet. */
export async function mergeRuns(incoming: RunRecord[]) {
  const runs = await read<RunRecord[]>(RUNS(), []);
  const have = new Set(runs.map((r) => r.id));
  const add = incoming.filter((r) => !have.has(r.id));
  if (add.length) await write(RUNS(), [...runs, ...add]);
  return add.length;
}

// ----- workouts (seeded with presets on first launch) -----
export async function loadWorkouts(): Promise<Workout[]> {
  const raw = await AsyncStorage.getItem(WORKOUTS());
  if (raw === null) {
    await write(WORKOUTS(), PRESETS);
    return PRESETS;
  }
  try { return JSON.parse(raw) as Workout[]; } catch { return PRESETS; }
}
export async function saveWorkouts(list: Workout[], fromCloud = false) {
  await write(WORKOUTS(), list);
  if (!fromCloud) hooks.stateChanged?.();
}
export async function saveWorkout(w: Workout) {
  const list = await loadWorkouts();
  const i = list.findIndex((x) => x.id === w.id);
  if (i >= 0) list[i] = w; else list.push(w);
  await saveWorkouts(list);
}
export async function deleteWorkout(id: string) {
  await saveWorkouts((await loadWorkouts()).filter((w) => w.id !== id));
}

// ----- training plan progress -----
export const loadPlan = () => read<PlanProgress | null>(PLAN(), null);
export async function savePlan(p: PlanProgress | null, fromCloud = false) {
  await write(PLAN(), p);
  if (!fromCloud) hooks.stateChanged?.();
}

// ----- settings -----
export const DEFAULT_SETTINGS: Settings = {
  mode: 'distance', goalKm: '5', targetPace: '', splitEvery: 1000,
  voice: true, maxHr: '', simulate: false, workoutId: 'preset-beginner',
  coach: 'maya', voiceId: null, voiceRate: 1, hrEvery: 'split', leaderboards: true,
  themeId: 'ocean', appearance: 'system', duckMusic: true, weeklyGoalKm: 10,
  runDays: [0, 1, 2, 3, 4, 5, 6],
};
export const HR_OPTIONS: { label: string; value: HrEvery }[] = [
  { label: 'Off', value: 'off' }, { label: 'Each split', value: 'split' },
  { label: '30 sec', value: 't30' }, { label: '1 min', value: 't60' }, { label: '2 min', value: 't120' }, { label: '5 min', value: 't300' },
  { label: '0.5 km', value: 'd500' }, { label: '1 km', value: 'd1000' },
];
export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await read<Partial<Settings>>(SETTINGS, {})) };
}
export const saveSettings = (s: Settings) => write(SETTINGS, s);

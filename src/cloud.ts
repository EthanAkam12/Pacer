import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { loadPlan, loadRuns, loadWorkouts, mergeRuns, notifyDataChanged, savePlan, saveWorkouts, setStorageHooks } from './storage';
import { PlanProgress, RunRecord, Workout } from './types';

/**
 * Backs up runs, workouts and plan progress to Firestore (users/{uid}/...), and restores them on a new
 * phone. Runs are one document each; workouts and plan progress share users/{uid}/data/state.
 * Everything still works offline: the phone's copy is the main one and the cloud catches up.
 */
let uid: string | null = null;
let stateTimer: ReturnType<typeof setTimeout> | null = null;

/** Firestore rejects `undefined`, so drop those fields. */
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const runsCol = (u: string) => collection(db!, 'users', u, 'runs');
const stateDoc = (u: string) => doc(db!, 'users', u, 'data', 'state');

async function uploadState() {
  if (!db || !uid) return;
  const [workouts, plan] = await Promise.all([loadWorkouts(), loadPlan()]);
  await setDoc(stateDoc(uid), clean({ workouts, plan, updatedAt: Date.now() }));
}

export function startCloud(userId: string | null) {
  uid = db ? userId : null;
  setStorageHooks(uid ? {
    runSaved: (r) => { setDoc(doc(runsCol(uid!), r.id), clean(r)).catch(() => {}); },
    runDeleted: (id) => { deleteDoc(doc(runsCol(uid!), id)).catch(() => {}); },
    stateChanged: () => {
      if (stateTimer) clearTimeout(stateTimer);
      stateTimer = setTimeout(() => { uploadState().catch(() => {}); }, 1500);
    },
  } : {});
  if (uid) syncAll().catch(() => {});
}

/** Two-way merge: anything the cloud has that the phone doesn't comes down, and the other way round. */
export async function syncAll() {
  if (!db || !uid) return;
  const u = uid;

  const remote = (await getDocs(runsCol(u))).docs.map((d) => d.data() as RunRecord);
  const added = await mergeRuns(remote);
  const remoteIds = new Set(remote.map((r) => r.id));
  const local = await loadRuns();
  await Promise.all(local.filter((r) => !remoteIds.has(r.id)).map((r) => setDoc(doc(runsCol(u), r.id), clean(r))));

  const snap = await getDoc(stateDoc(u));
  let changed = added > 0;
  if (snap.exists()) {
    const cloud = snap.data() as { workouts?: Workout[]; plan?: PlanProgress | null };
    const mine = await loadWorkouts();
    const ids = new Set(mine.map((w) => w.id));
    const extra = (cloud.workouts ?? []).filter((w) => !ids.has(w.id));
    if (extra.length) { await saveWorkouts([...mine, ...extra], true); changed = true; }
    const plan = await loadPlan();
    const theirs = cloud.plan ?? null;
    // Keep whichever copy of the plan has more sessions finished.
    if (theirs && (!plan || (plan.planId === theirs.planId && Object.keys(theirs.done).length > Object.keys(plan.done).length))) {
      await savePlan(theirs, true); changed = true;
    }
  }
  await uploadState();
  if (changed) notifyDataChanged();
}

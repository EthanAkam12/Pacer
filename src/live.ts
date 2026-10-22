import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { ready } from './leaderboard';
import { loadSettings } from './storage';
import { hasPlus } from './plus';
import { session } from './session';
import { LiveSnapshot } from './types';

/**
 * Live tracking for safety (Pacely Plus). During a run, live/{uid} holds your latest position,
 * a short trail, distance and time, readable only by the safety contacts you chose (people you
 * follow, who have Pacely). Updated at most every 20 seconds from the coaching engine's updates,
 * which keep coming while the phone is locked. Marked finished when the run ends.
 */
export interface LiveDoc {
  uid: string; name: string; active: boolean; paused: boolean;
  lat: number | null; lon: number | null; trail: { lat: number; lon: number }[];
  km: number; secs: number; updatedAt: number | null; startedAt: number | null;
}

const EVERY = 20000;
let stop: (() => void) | null = null;

/** Starts sharing if the runner has Plus, live sharing on and at least one contact. Safe to call always. */
export async function startLive(): Promise<boolean> {
  const r = ready();
  const s = await loadSettings();
  if (!r || !hasPlus() || !s.liveShare || !s.safetyContacts.length) return false;
  const ref = doc(r.db, 'live', r.uid);
  const viewers = s.safetyContacts.map((c) => c.uid).slice(0, 10);
  let trail: { lat: number; lon: number }[] = [];
  let last = 0;
  const write = (snap: LiveSnapshot, force = false) => {
    if (!force && Date.now() - last < EVERY) return;
    last = Date.now();
    if (snap.position) {
      const p = { lat: Math.round(snap.position.lat * 1e5) / 1e5, lon: Math.round(snap.position.lon * 1e5) / 1e5 };
      const prev = trail[trail.length - 1];
      if (!prev || prev.lat !== p.lat || prev.lon !== p.lon) trail = [...trail, p].slice(-60);
    }
    const at = trail[trail.length - 1];
    setDoc(ref, {
      name: r.name, viewers, active: snap.phase === 'running' || snap.phase === 'paused', paused: snap.phase === 'paused',
      lat: at?.lat ?? null, lon: at?.lon ?? null, trail,
      km: Math.round(snap.distance / 10) / 100, secs: Math.round(snap.elapsed), updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  };
  await setDoc(ref, { name: r.name, viewers, active: true, paused: false, lat: null, lon: null, trail: [], km: 0, secs: 0, startedAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(() => {});
  const unsub = session.subscribe((snap) => write(snap));
  stop = () => { unsub(); write({ ...session.snapshot(), phase: 'finished' }, true); };
  return true;
}

/** Stops sharing: the doc is marked finished, so contacts see the run ended. */
export function endLive() {
  stop?.();
  stop = null;
}

/** Removes your live doc entirely (e.g. when turning live sharing off). */
export async function clearLive() {
  const r = ready();
  if (r) await deleteDoc(doc(r.db, 'live', r.uid)).catch(() => {});
}

const toLive = (uid: string, v: Record<string, unknown>): LiveDoc => {
  const ms = (x: unknown) => (x && typeof (x as { toMillis?: () => number }).toMillis === 'function' ? (x as { toMillis: () => number }).toMillis() : null);
  return {
    uid, name: String(v.name ?? ''), active: !!v.active, paused: !!v.paused,
    lat: typeof v.lat === 'number' ? v.lat : null, lon: typeof v.lon === 'number' ? v.lon : null,
    trail: Array.isArray(v.trail) ? (v.trail as LiveDoc['trail']) : [], km: Number(v.km ?? 0), secs: Number(v.secs ?? 0),
    updatedAt: ms(v.updatedAt), startedAt: ms(v.startedAt),
  };
};

/** People sharing a live run with you right now (or who finished in the last hour). */
export async function liveForMe(): Promise<LiveDoc[]> {
  const r = ready();
  if (!r) return [];
  const snap = await getDocs(query(collection(r.db, 'live'), where('viewers', 'array-contains', r.uid)));
  return snap.docs.map((d) => toLive(d.id, d.data()))
    .filter((l) => l.active || (l.updatedAt && Date.now() - l.updatedAt < 3600e3));
}

/** Follows one runner's live doc. Returns an unsubscribe function. */
export function watchLive(uid: string, cb: (l: LiveDoc | null) => void): () => void {
  const r = ready();
  if (!r) { cb(null); return () => {}; }
  return onSnapshot(doc(r.db, 'live', uid), (d) => cb(d.exists() ? toLive(d.id, d.data()) : null), () => cb(null));
}

import {
  collection, deleteDoc, deleteField, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, QueryConstraint, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { loadRuns, loadSettings, saveSettings } from './storage';
import { geohash, placeName } from './geo';
import { personalBests } from './records';
import { RANKED, rankFor } from './ranks';
import { weekStats } from './progress';
import { RunRecord } from './types';

/**
 * Global leaderboards in Firestore. Each runner has a public profile (profiles/{uid}) and an entry
 * for the current week (weeks/{week}/entries/{uid}). Only the runner name, rank, distances and best
 * times are shared, never the email. Everything is worked out from the runs saved on the phone.
 */

/** week/total: most km. rank: best overall rank. best1609 etc: fastest time at that distance. */
export type Board = 'week' | 'total' | 'rank' | 'trophies' | `best${string}`;

export interface Row { uid: string; name: string; tier: string; value: number; position: number; plus?: boolean }

const TOP = 50;

/** Monday-based week id, e.g. "2026-10-12" for the week starting Monday 12 October. */
export function weekKey(d = new Date()): string {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

function weekStart(): number {
  const [y, mo, d] = weekKey().split('-').map(Number);
  return new Date(y, mo - 1, d).getTime();
}

export function summary(runs: RunRecord[], goalKm = 10) {
  const real = runs.filter((r) => !r.simulated);
  const start = weekStart();
  const round = (n: number) => Math.round(n * 100) / 100;
  const bests: Record<string, number> = {};
  for (const pb of personalBests(real)) bests[`best${pb.key}`] = pb.time;
  const rank = rankFor(real);
  // The last few runs, for friends to see. Only a summary: no route or heart rate.
  const recent = real.slice(0, 5).map((r) => ({ id: r.id, km: round(r.distance / 1000), sec: Math.round(r.duration), at: r.startedAt, title: r.title.slice(0, 40) }));
  return {
    rank,
    recent,
    runs: real.length,
    streak: weekStats(real, goalKm).streak,
    totalKm: round(real.reduce((a, r) => a + r.distance, 0) / 1000),
    weekKm: round(real.filter((r) => Date.parse(r.startedAt) >= start).reduce((a, r) => a + r.distance, 0) / 1000),
    bests,
  };
}

export const ready = () => (db && auth?.currentUser?.emailVerified ? { db, uid: auth.currentUser.uid, name: auth.currentUser.displayName ?? '' } : null);

/** Uploads this runner's latest numbers, or removes them if they've opted out. Safe to call often. */
export async function syncMyEntry(): Promise<void> {
  const r = ready();
  if (!r) return;
  const [s, runs] = await Promise.all([loadSettings(), loadRuns()]);
  if (!s.leaderboards || !r.name) { await removeMyEntry(); return; }
  const { rank, totalKm, weekKm, bests, recent, runs: count, streak } = summary(runs, s.weeklyGoalKm);
  const name = r.name;
  await setDoc(doc(r.db, 'profiles', r.uid), {
    name, tier: rank.id, totalKm, ...bests, ...(rank.score ? { rankScore: rank.score } : {}),
    weekKm, weekKey: weekKey(), runs: count, recent, streak, updatedAt: serverTimestamp(),
  }, { merge: true });
  // Plus badge, written separately so older Firestore rules can't block the main update.
  await setDoc(doc(r.db, 'profiles', r.uid), { plus: !!s.plus, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  // Local leaderboard: the town of your latest outdoor run. Written separately so older
  // Firestore rules (without these fields) can't stop the rest of the profile updating.
  const local = s.localBoard ? await myArea(runs) : null;
  await setDoc(doc(r.db, 'profiles', r.uid), { ...(local ? { area: local.area, areaName: local.areaName } : { area: deleteField(), areaName: deleteField() }), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  const entry = doc(r.db, 'weeks', weekKey(), 'entries', r.uid);
  if (weekKm > 0) {
    await setDoc(entry, { name, tier: rank.id, km: weekKm, updatedAt: serverTimestamp() });
    await setDoc(entry, { plus: !!s.plus, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
  else await deleteDoc(entry).catch(() => {});
}

/** The area of the latest outdoor run, with its place name (looked up once per area and cached in Settings). */
export async function myArea(runs?: RunRecord[]): Promise<{ area: string; areaName: string } | null> {
  const list = runs ?? (await loadRuns());
  const run = list.filter((x) => !x.simulated && !x.treadmill && x.route.length).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!run) return null;
  const { lat, lon } = run.route[0];
  const area = geohash(lat, lon);
  const s = await loadSettings();
  if (s.area === area && s.areaName) return { area, areaName: s.areaName };
  const areaName = (await placeName(lat, lon)) || 'your area';
  await saveSettings({ ...(await loadSettings()), area, areaName });
  return { area, areaName };
}

export async function removeMyEntry(): Promise<void> {
  const r = ready();
  if (!r) return;
  await Promise.all([
    deleteDoc(doc(r.db, 'profiles', r.uid)).catch(() => {}),
    deleteDoc(doc(r.db, 'weeks', weekKey(), 'entries', r.uid)).catch(() => {}),
  ]);
}

/** Top runners on a board, plus this runner's own row (with their position) if they aren't in the top. */
export async function fetchBoard(board: Board): Promise<{ rows: Row[]; me: Row | null }> {
  const r = ready();
  if (!r) throw new Error('signed-out');
  const week = board === 'week';
  const col = week ? collection(r.db, 'weeks', weekKey(), 'entries') : collection(r.db, 'profiles');
  const field = week ? 'km' : board === 'total' ? 'totalKm' : board === 'rank' ? 'rankScore' : board;  // 'trophies' is its own field
  const fastest = board.startsWith('best') || board === 'rank';
  const order: QueryConstraint = orderBy(field, fastest ? 'asc' : 'desc');

  const snap = await getDocs(query(col, order, limit(TOP)));
  const rows: Row[] = [];
  snap.docs.forEach((d, i) => {
    const v = d.data();
    if (!fastest && !(v[field] > 0)) return;
    // Equal values share a position.
    const position = i > 0 && v[field] === rows[rows.length - 1]?.value ? rows[rows.length - 1].position : i + 1;
    rows.push({ uid: d.id, name: v.name, tier: v.tier ?? 'unranked', value: v[field], position, plus: v.plus === true });
  });

  let me: Row | null = null;
  if (!rows.some((x) => x.uid === r.uid)) {
    const mine = summary(await loadRuns());
    const value = week ? mine.weekKm : board === 'total' ? mine.totalKm : board === 'rank' ? mine.rank.score
      : board === 'trophies' ? await myTrophiesCount() : mine.bests[board];
    const s = await loadSettings();
    if (value && s.leaderboards && r.name) {
      const ahead = await getCountFromServer(query(col, where(field, fastest ? '<' : '>', value)));
      me = { uid: r.uid, name: r.name, tier: mine.rank.id, value, position: ahead.data().count + 1, plus: s.plus };
    }
  }
  return { rows, me };
}

async function myTrophiesCount() {
  const r = ready();
  if (!r) return 0;
  const snap = await getDoc(doc(r.db, 'profiles', r.uid));
  return snap.exists() ? Number(snap.data().trophies ?? 0) : 0;
}

export const distanceBoard = (key: string) => `best${key}` as Board;
export const RANKED_KEYS = RANKED.map((d) => d.key);

/** True for errors that mean the leaderboard database hasn't been switched on or its rules are missing. */
export const notSetUp = (e: unknown) => ['permission-denied', 'failed-precondition', 'not-found'].includes((e as { code?: string })?.code ?? '');

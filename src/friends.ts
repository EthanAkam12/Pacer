import { collection, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { ready, weekKey } from './leaderboard';

/**
 * Following other runners. Who you follow is private (users/{you}/following/{them}); what you see of
 * them is their public leaderboard profile, which they can hide in Settings.
 */
export interface Profile {
  uid: string;
  name: string;
  tier: string;
  totalKm: number;
  weekKm: number; // 0 unless the profile was updated this week
  runs: number;
  recent: { km: number; sec: number; at: string; title: string }[];
  bests: Record<string, number>; // "5000" -> seconds
  rankScore: number | null;
}

function toProfile(uid: string, v: Record<string, unknown>): Profile {
  const bests: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) if (k.startsWith('best') && typeof val === 'number') bests[k.slice(4)] = val;
  return {
    uid, name: String(v.name ?? ''), tier: String(v.tier ?? 'unranked'), totalKm: Number(v.totalKm ?? 0),
    weekKm: v.weekKey === weekKey() ? Number(v.weekKm ?? 0) : 0, runs: Number(v.runs ?? 0),
    recent: Array.isArray(v.recent) ? (v.recent as Profile['recent']) : [], bests, rankScore: typeof v.rankScore === 'number' ? v.rankScore : null,
  };
}

/** Finds a runner by username. Returns null if there's no such username or they've hidden their profile. */
export async function findRunner(username: string): Promise<Profile | null> {
  const r = ready();
  if (!r) throw new Error('signed-out');
  const claim = await getDoc(doc(r.db, 'usernames', username.trim().toLowerCase()));
  if (!claim.exists()) return null;
  const uid = claim.data().uid as string;
  const prof = await getDoc(doc(r.db, 'profiles', uid));
  return prof.exists() ? toProfile(uid, prof.data()) : { ...toProfile(uid, { name: username.trim() }), tier: 'hidden' };
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const r = ready();
  if (!r) return null;
  const prof = await getDoc(doc(r.db, 'profiles', uid));
  return prof.exists() ? toProfile(uid, prof.data()) : null;
}

export async function followingIds(): Promise<string[]> {
  const r = ready();
  if (!r) return [];
  return (await getDocs(collection(r.db, 'users', r.uid, 'following'))).docs.map((d) => d.id);
}

export async function follow(uid: string) {
  const r = ready();
  if (!r || uid === r.uid) return;
  await setDoc(doc(r.db, 'users', r.uid, 'following', uid), { since: Date.now() });
}
export async function unfollow(uid: string) {
  const r = ready();
  if (!r) return;
  await deleteDoc(doc(r.db, 'users', r.uid, 'following', uid));
}

/** Public profiles for a list of runners (Firestore allows 30 ids per query, so ask in batches). */
export async function profiles(uids: string[]): Promise<Profile[]> {
  if (!db || !uids.length) return [];
  const out: Profile[] = [];
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await getDocs(query(collection(db, 'profiles'), where(documentId(), 'in', uids.slice(i, i + 30))));
    snap.docs.forEach((d) => out.push(toProfile(d.id, d.data())));
  }
  return out;
}

/** You plus everyone you follow, for the friends leaderboard. */
export async function friendsAndMe(): Promise<Profile[]> {
  const r = ready();
  if (!r) return [];
  return profiles([r.uid, ...(await followingIds())]);
}

import {
  addDoc, collection, deleteDoc, deleteField, doc, getCountFromServer, getDoc, getDocs, orderBy, query, serverTimestamp,
  setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { ready } from './leaderboard';
import { loadRuns } from './storage';
import { runBests } from './records';
import { Profile } from './friends';

/**
 * The social side of Pacely:
 * - "Well done" on a friend's run: wellDone/{owner}/runs/{runId}/from/{you}
 * - Cheers read out by a friend's coach mid-run: cheers/{them}/items/{id}
 * - Whether someone is running right now: profiles/{uid}.runningSince
 * - Challenges between friends: challenges/{id} with progress/{uid} for each member
 */

// ----- well done -----

const fromCol = (owner: string, runId: string) => collection(ready()!.db, 'wellDone', owner, 'runs', runId, 'from');

export async function sayWellDone(owner: string, runId: string) {
  const r = ready();
  if (!r || owner === r.uid) return;
  await setDoc(doc(fromCol(owner, runId), r.uid), { name: r.name, at: serverTimestamp() });
}
export async function undoWellDone(owner: string, runId: string) {
  const r = ready();
  if (!r) return;
  await deleteDoc(doc(fromCol(owner, runId), r.uid));
}
/** How many people said well done to a run, and whether you did. */
export async function wellDoneState(owner: string, runId: string): Promise<{ count: number; mine: boolean }> {
  const r = ready();
  if (!r) return { count: 0, mine: false };
  const [count, mine] = await Promise.all([
    getCountFromServer(fromCol(owner, runId)).then((c) => c.data().count),
    getDoc(doc(fromCol(owner, runId), r.uid)).then((d) => d.exists()),
  ]);
  return { count, mine };
}
/** Who said well done to one of your runs (newest first). */
export async function wellDoneNames(runId: string): Promise<string[]> {
  const r = ready();
  if (!r) return [];
  const snap = await getDocs(query(fromCol(r.uid, runId), orderBy('at', 'desc')));
  return snap.docs.map((d) => String(d.data().name));
}

// ----- cheers -----

export const CHEERS = ['Keep going!', "You've got this!", 'Nearly there!', 'Go go go!', 'Proud of you!', 'Dig deep!'];

export async function sendCheer(to: string, text: string) {
  const r = ready();
  if (!r) return;
  await addDoc(collection(r.db, 'cheers', to, 'items'), { fromUid: r.uid, fromName: r.name, text: text.trim().slice(0, 80), at: serverTimestamp() });
}

/** Cheers sent to you since `since` (ms). Each is deleted once collected, so it's only read out once. */
export async function collectCheers(since: number): Promise<{ from: string; text: string }[]> {
  const r = ready();
  if (!r) return [];
  const snap = await getDocs(query(collection(r.db, 'cheers', r.uid, 'items'), where('at', '>=', Timestamp.fromMillis(since)), orderBy('at')));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  return snap.docs.map((d) => ({ from: String(d.data().fromName), text: String(d.data().text) }));
}

/** Marks you as running (or not) on your public profile, so friends can send cheers. */
export async function setRunning(on: boolean) {
  const r = ready();
  if (!r) return;
  const ref = doc(r.db, 'profiles', r.uid);
  if (!(await getDoc(ref)).exists()) return; // hidden from leaderboards: nobody can see you anyway
  await updateDoc(ref, { runningSince: on ? serverTimestamp() : deleteField(), updatedAt: serverTimestamp() });
}
/** True if a profile says they started a run in the last 3 hours. */
export const isRunningNow = (p: { runningSince?: number | null }) => !!p.runningSince && Date.now() - p.runningSince < 3 * 3600e3;

// ----- challenges -----

/**
 * Challenges: invite runners by username; each invitee must accept. Whoever runs the most distance
 * (or most runs, or fastest 5K) by the end wins a trophy. Each member's phone posts its own score to
 * challenges/{id}/progress/{uid}. When it's over, the first member to look records the winner, and the
 * winner's phone adds the trophy (trophies/{uid}/won/{challengeId}) and the count on their profile.
 */
export type ChallengeType = 'distance' | 'runs' | 'fastest5k';
export const CHALLENGE_TYPES: { value: ChallengeType; label: string; desc: string }[] = [
  { value: 'distance', label: 'Most distance', desc: 'Whoever runs the most km wins.' },
  { value: 'runs', label: 'Most runs', desc: 'Whoever gets out the door most often wins.' },
  { value: 'fastest5k', label: 'Fastest 5K', desc: 'Fastest 5 km within any run wins.' },
];
export const DURATIONS = [
  { label: '1 day', days: 1 }, { label: '3 days', days: 3 }, { label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }, { label: '1 month', days: 30 },
];

export interface Challenge {
  id: string; name: string; type: ChallengeType; start: number; end: number; creator: string; creatorName: string;
  members: string[]; invited: string[]; winner?: string; winnerName?: string;
}
export interface Standing { uid: string; name: string; value: number; position: number }

const asChallenge = (id: string, v: Record<string, unknown>): Challenge => { const c = v as Omit<Challenge, 'id'>; return { ...c, id, invited: c.invited ?? [] }; };

/** Starts now and runs for `days`. Invitees join when they accept. */
export async function createChallenge(c: { name: string; type: ChallengeType; days: number; invited: string[] }) {
  const r = ready();
  if (!r) throw new Error('signed-out');
  const start = Date.now();
  const data = {
    name: c.name.trim().slice(0, 40) || 'Challenge', type: c.type, start, end: start + c.days * 864e5,
    creator: r.uid, creatorName: r.name, members: [r.uid], invited: [...new Set(c.invited)].filter((u) => u !== r.uid).slice(0, 20),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(r.db, 'challenges'), data);
  await syncChallenge(asChallenge(ref.id, data)).catch(() => {});
  return ref.id;
}

export async function myChallenges(): Promise<{ active: Challenge[]; invites: Challenge[] }> {
  const r = ready();
  if (!r) return { active: [], invites: [] };
  const col = collection(r.db, 'challenges');
  const [mine, inv] = await Promise.all([
    getDocs(query(col, where('members', 'array-contains', r.uid))),
    getDocs(query(col, where('invited', 'array-contains', r.uid))),
  ]);
  return {
    active: mine.docs.map((d) => asChallenge(d.id, d.data())).sort((a, b) => b.end - a.end),
    invites: inv.docs.map((d) => asChallenge(d.id, d.data())).filter((c) => c.end > Date.now()),
  };
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const r = ready();
  if (!r) return null;
  const d = await getDoc(doc(r.db, 'challenges', id));
  return d.exists() ? asChallenge(d.id, d.data()) : null;
}

export async function respondToInvite(c: Challenge, accept: boolean) {
  const r = ready();
  if (!r) return;
  await updateDoc(doc(r.db, 'challenges', c.id), {
    invited: c.invited.filter((u) => u !== r.uid),
    ...(accept ? { members: [...c.members, r.uid] } : {}),
  });
  if (accept) await syncChallenge({ ...c, members: [...c.members, r.uid] }).catch(() => {});
}

/** Leave a challenge, or delete it if you made it. */
export async function leaveChallenge(c: Challenge) {
  const r = ready();
  if (!r) return;
  if (c.creator === r.uid) await deleteDoc(doc(r.db, 'challenges', c.id));
  else await updateDoc(doc(r.db, 'challenges', c.id), { members: c.members.filter((m) => m !== r.uid) });
}

/** Your score in a challenge, worked out from the runs on this phone. Lower is better for fastest5k. */
async function myScore(c: Challenge): Promise<number> {
  const runs = (await loadRuns()).filter((x) => !x.simulated && Date.parse(x.startedAt) >= c.start && Date.parse(x.startedAt) < c.end);
  if (c.type === 'runs') return runs.length;
  if (c.type === 'distance') return Math.round(runs.reduce((a, x) => a + x.distance, 0) / 10) / 100;
  const best = Math.min(...runs.map((x) => runBests(x)['5000'] ?? Infinity));
  return isFinite(best) ? best : 0;
}

export async function syncChallenge(c: Challenge) {
  const r = ready();
  if (!r || !c.members.includes(r.uid) || Date.now() > c.end + 864e5) return;
  await setDoc(doc(r.db, 'challenges', c.id, 'progress', r.uid), { name: r.name, value: await myScore(c), updatedAt: serverTimestamp() });
}

/** Update your score in every challenge that's still running, and collect any trophies. Called after runs. */
export async function syncAllChallenges() {
  const { active } = await myChallenges();
  for (const c of active) {
    if (Date.now() < c.end + 864e5) await syncChallenge(c).catch(() => {});
    if (Date.now() >= c.end) await settle(c).catch(() => {});
  }
}

export async function standings(c: Challenge): Promise<Standing[]> {
  const r = ready();
  if (!r) return [];
  const snap = await getDocs(collection(r.db, 'challenges', c.id, 'progress'));
  const low = c.type === 'fastest5k';
  const rows = snap.docs.map((d) => ({ uid: d.id, name: String(d.data().name), value: Number(d.data().value) }))
    .filter((x) => c.members.includes(x.uid))
    .sort((a, b) => (low ? (a.value || Infinity) - (b.value || Infinity) : b.value - a.value));
  return rows.map((x, i) => ({ ...x, position: i > 0 && x.value === rows[i - 1].value ? i : i + 1 }));
}

/**
 * After a challenge ends: record the winner (if nobody has yet), and if it's you, collect the trophy.
 * A challenge with no scores, or a tie for first, has no winner.
 */
export async function settle(c: Challenge): Promise<Challenge> {
  const r = ready();
  if (!r || Date.now() < c.end) return c;
  let winner = c.winner, winnerName = c.winnerName;
  if (!winner) {
    const rows = (await standings(c)).filter((x) => x.value > 0);
    if (rows.length && !(rows[1] && rows[1].value === rows[0].value)) {
      winner = rows[0].uid; winnerName = rows[0].name;
      await updateDoc(doc(r.db, 'challenges', c.id), { winner, winnerName }).catch(() => {});
    } else {
      winner = 'none'; winnerName = '';
      await updateDoc(doc(r.db, 'challenges', c.id), { winner, winnerName }).catch(() => {});
    }
  }
  if (winner === r.uid) {
    const won = doc(r.db, 'trophies', r.uid, 'won', c.id);
    if (!(await getDoc(won)).exists()) {
      await setDoc(won, { name: c.name, at: serverTimestamp() });
      const count = (await getCountFromServer(collection(r.db, 'trophies', r.uid, 'won'))).data().count;
      await updateDoc(doc(r.db, 'profiles', r.uid), { trophies: count, updatedAt: serverTimestamp() }).catch(() => {});
    }
  }
  return { ...c, winner, winnerName };
}

/** How many challenges you've won. */
export async function myTrophies(): Promise<number> {
  const r = ready();
  if (!r) return 0;
  return (await getCountFromServer(collection(r.db, 'trophies', r.uid, 'won'))).data().count;
}

/** Runs from the people you follow, newest first, for the feed. */
export function feedFrom(profiles: Profile[]) {
  return profiles
    .flatMap((p) => p.recent.filter((x) => x.id).map((x) => ({ profile: p, run: x as Required<typeof x> })))
    .sort((a, b) => b.run.at.localeCompare(a.run.at))
    .slice(0, 40);
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile, User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, authConfigured, db } from './firebase';
import { removeMyEntry } from './leaderboard';

interface AuthState {
  loading: boolean;
  configured: boolean;
  user: User | null;
  verified: boolean;
  /** The account's unique username (Firebase displayName), or null until chosen. */
  username: string | null;
  setUsername: (name: string) => Promise<void>;
  /** Re-reads the user from Firebase, e.g. after they tap the link in the verification email. */
  refresh: () => Promise<boolean>;
}

const Ctx = createContext<AuthState>({
  loading: true, configured: authConfigured, user: null, verified: false, username: null, setUsername: async () => {}, refresh: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(authConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [username, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setVerified(!!u?.emailVerified);
      setName(u?.displayName || null);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const u = auth?.currentUser;
    if (!u) return false;
    await u.reload();
    await u.getIdToken(true);
    setVerified(u.emailVerified);
    return u.emailVerified;
  };

  const setUsername = async (name: string) => {
    await claimUsername(name);
    setName(name);
  };

  return <Ctx.Provider value={{ loading, configured: authConfigured, user, verified, username, setUsername, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

const need = () => {
  if (!auth) throw new Error('Accounts are not set up yet.');
  return auth;
};

export const MIN_PASSWORD = 8;
export const USERNAME_RULE = /^[A-Za-z0-9_.]{3,20}$/;

/**
 * Reserves a username (case-insensitive) in Firestore's usernames/{lowercase} collection, frees the
 * old one, and saves it on the account. If the leaderboard database isn't set up yet, the name is
 * saved without the uniqueness check.
 */
async function claimUsername(name: string) {
  const a = need(), u = a.currentUser!;
  if (!USERNAME_RULE.test(name)) throw { code: 'username-invalid' };
  const key = name.toLowerCase(), old = u.displayName?.toLowerCase();
  if (db && key !== old) {
    const ref = doc(db, 'usernames', key);
    let databaseReady = true;
    try {
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().uid !== u.uid) throw { code: 'username-taken' };
      if (!snap.exists()) await setDoc(ref, { uid: u.uid });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'username-taken') throw e;
      if (code !== 'permission-denied') throw e;
      // A denied read means the database or its rules aren't set up; a denied write means someone just took it.
      databaseReady = await getDoc(ref).then(() => true, () => false);
      if (databaseReady) throw { code: 'username-taken' };
    }
    if (databaseReady && old) await deleteDoc(doc(db, 'usernames', old)).catch(() => {});
  }
  await updateProfile(u, { displayName: name });
}

export async function signUp(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(need(), email.trim(), password);
  await sendEmailVerification(cred.user);
}
export const signIn = (email: string, password: string) => signInWithEmailAndPassword(need(), email.trim(), password);
export const resendVerification = () => sendEmailVerification(need().currentUser!);
export const resetPassword = (email: string) => sendPasswordResetEmail(need(), email.trim());
export const signOut = () => fbSignOut(need());

/** Firebase only lets you delete an account you signed in to recently, so this asks for the password again. */
export async function deleteAccount(password: string) {
  const u = need().currentUser!;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email!, password));
  await removeMyEntry().catch(() => {});
  if (db && u.displayName) await deleteDoc(doc(db, 'usernames', u.displayName.toLowerCase())).catch(() => {});
  await deleteUser(u);
}

/** Turns Firebase error codes into plain English. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': "That email address doesn't look right.",
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': `Use a password of at least ${MIN_PASSWORD} characters.`,
    'auth/email-already-in-use': 'There is already an account with that email. Try signing in instead.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong password.',
    'auth/user-not-found': 'There is no account with that email.',
    'auth/user-disabled': 'This account has been switched off.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your signal and try again.',
    'auth/requires-recent-login': 'Please sign in again first.',
    'username-taken': 'That username is taken. Try another.',
    'username-invalid': 'Use 3 to 20 letters, numbers, dots or underscores. No spaces.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
}

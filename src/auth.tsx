import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, User,
} from 'firebase/auth';
import { auth, authConfigured } from './firebase';

interface AuthState {
  loading: boolean;
  configured: boolean;
  user: User | null;
  verified: boolean;
  /** Re-reads the user from Firebase, e.g. after they tap the link in the verification email. */
  refresh: () => Promise<boolean>;
}

const Ctx = createContext<AuthState>({ loading: true, configured: authConfigured, user: null, verified: false, refresh: async () => false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(authConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setVerified(!!u?.emailVerified);
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

  return <Ctx.Provider value={{ loading, configured: authConfigured, user, verified, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

const need = () => {
  if (!auth) throw new Error('Accounts are not set up yet.');
  return auth;
};

export const MIN_PASSWORD = 8;

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
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
}

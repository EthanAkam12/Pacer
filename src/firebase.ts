import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';

// Only the React Native build of Firebase Auth has this, and Firebase's type definitions leave it out.
const getReactNativePersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence }).getReactNativePersistence;

/**
 * The Firebase project's web app config (Firebase console > Project settings > Your apps).
 * These values are public by design; Firebase security rules and Auth settings protect the data.
 * EXPO_PUBLIC_FIREBASE_* environment variables override them if set.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBvTlorDZisRm3Vx5k7ZlyjOuNOkqP4Xpk',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'pacer-82fc9.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'pacer-82fc9',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:322159393147:web:1b99628634b7f5a0a2a5de',
};

/** False if the config above is empty. The app then skips sign-in so it can still be tested. */
export const authConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: Auth | null = null;
if (authConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    // Keeps people signed in between app launches. Web (no React Native build) uses Firebase's own default.
    auth = getReactNativePersistence ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }) : getAuth(app);
  } catch {
    auth = getAuth(app); // already initialised (fast refresh)
  }
}
export { auth };

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './client';

/** Sign in with email and password */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign in with Google OAuth popup */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/** Create a new account with email and password */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/** Send password reset email */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/** Change the current user's password */
export async function changePassword(
  user: FirebaseUser,
  newPassword: string
): Promise<void> {
  return updatePassword(user, newPassword);
}

/** Subscribe to auth state changes */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Get the current user's ID token for API calls */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

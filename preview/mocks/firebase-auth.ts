/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dev-only stand-in for the 'firebase/auth' package (wired by next.config.ts when AG_UI_PREVIEW=1).
 * Preview OFF: the real SDK, unchanged. Preview ON: a signed-in fake student or admin; no network.
 */
import * as real from 'firebase/auth';
import { PREVIEW, PREVIEW_ROLE, PREVIEW_UID } from '../runtime';
import '../fetch-shim';

export * from 'firebase/auth';

const created = new Date(Date.now() - 400 * 86_400_000).toUTCString();
const previewUser: any = PREVIEW
  ? {
      uid: PREVIEW_UID,
      email: PREVIEW_ROLE === 'admin' ? 'admin@acadegrade.preview' : 'adaeze.okafor@student.preview',
      displayName: PREVIEW_ROLE === 'admin' ? 'AcadeGrade Admin' : 'Adaeze Okafor',
      emailVerified: true,
      isAnonymous: false,
      photoURL: null,
      phoneNumber: null,
      providerId: 'firebase',
      tenantId: null,
      refreshToken: 'preview',
      providerData: [{ providerId: 'password', uid: PREVIEW_UID, displayName: null, email: null, phoneNumber: null, photoURL: null }],
      metadata: { creationTime: created, lastSignInTime: new Date().toUTCString() },
      getIdToken: async () => 'preview-token',
      getIdTokenResult: async () => ({
        token: 'preview-token',
        claims: { admin: PREVIEW_ROLE === 'admin' },
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3_600_000).toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
      }),
      reload: async () => undefined,
      delete: async () => undefined,
      toJSON: () => ({ uid: PREVIEW_UID }),
    }
  : null;

const previewAuth: any = { __preview: 'auth', currentUser: previewUser, app: {}, name: 'preview', config: {}, languageCode: 'en' };
const isPreviewAuth = (a: unknown) => PREVIEW && (a === previewAuth || a === undefined || (a as any)?.__preview === 'auth');
const credential = async () => ({ user: previewUser, providerId: 'password', operationType: 'signIn' });
const leavePreview = async () => {
  document.cookie = 'ag-ui-preview=; path=/; max-age=0';
  window.location.assign('/');
};

export const getAuth: typeof real.getAuth = ((...args: any[]) => (PREVIEW ? previewAuth : (real.getAuth as any)(...args))) as any;
export const initializeAuth: typeof real.initializeAuth = ((...args: any[]) => (PREVIEW ? previewAuth : (real.initializeAuth as any)(...args))) as any;

export const onAuthStateChanged: typeof real.onAuthStateChanged = ((auth: any, next: any, ...rest: any[]) => {
  if (!isPreviewAuth(auth)) return (real.onAuthStateChanged as any)(auth, next, ...rest);
  const cb = typeof next === 'function' ? next : next?.next;
  const t = setTimeout(() => cb?.(previewUser), 40);
  return () => clearTimeout(t);
}) as any;
export const onIdTokenChanged = onAuthStateChanged as unknown as typeof real.onIdTokenChanged;

export const signInWithEmailAndPassword: typeof real.signInWithEmailAndPassword = ((auth: any, ...rest: any[]) =>
  isPreviewAuth(auth) ? credential() : (real.signInWithEmailAndPassword as any)(auth, ...rest)) as any;
export const createUserWithEmailAndPassword: typeof real.createUserWithEmailAndPassword = ((auth: any, ...rest: any[]) =>
  isPreviewAuth(auth) ? credential() : (real.createUserWithEmailAndPassword as any)(auth, ...rest)) as any;
export const signInWithPopup: typeof real.signInWithPopup = ((auth: any, ...rest: any[]) =>
  isPreviewAuth(auth) ? credential() : (real.signInWithPopup as any)(auth, ...rest)) as any;
export const signOut: typeof real.signOut = ((auth: any) => (isPreviewAuth(auth) ? leavePreview() : real.signOut(auth))) as any;
export const sendPasswordResetEmail: typeof real.sendPasswordResetEmail = ((auth: any, ...rest: any[]) =>
  isPreviewAuth(auth) ? Promise.resolve() : (real.sendPasswordResetEmail as any)(auth, ...rest)) as any;
export const sendEmailVerification: typeof real.sendEmailVerification = ((user: any, ...rest: any[]) =>
  PREVIEW ? Promise.resolve() : (real.sendEmailVerification as any)(user, ...rest)) as any;
export const updatePassword: typeof real.updatePassword = ((user: any, pw: string) => (PREVIEW ? Promise.resolve() : real.updatePassword(user, pw))) as any;
export const updateProfile: typeof real.updateProfile = ((user: any, p: any) => (PREVIEW ? Promise.resolve() : real.updateProfile(user, p))) as any;
export const reauthenticateWithCredential: typeof real.reauthenticateWithCredential = ((user: any, c: any) =>
  PREVIEW ? credential() : real.reauthenticateWithCredential(user, c)) as any;
export const reauthenticateWithPopup: typeof real.reauthenticateWithPopup = ((user: any, ...rest: any[]) =>
  PREVIEW ? credential() : (real.reauthenticateWithPopup as any)(user, ...rest)) as any;
export const deleteUser: typeof real.deleteUser = ((user: any) => (PREVIEW ? Promise.resolve() : real.deleteUser(user))) as any;
export const setPersistence: typeof real.setPersistence = ((auth: any, p: any) => (isPreviewAuth(auth) ? Promise.resolve() : real.setPersistence(auth, p))) as any;

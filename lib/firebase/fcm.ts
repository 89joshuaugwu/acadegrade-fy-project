/**
 * FCM (Firebase Cloud Messaging) Client Module
 *
 * ARCHITECTURE:
 * - Tokens are stored in an ARRAY (fcmTokens) in Firestore to support
 *   multiple devices per user. arrayUnion prevents duplicates.
 * - On sign-out, we BOTH remove the token from Firestore AND call
 *   deleteToken() locally to revoke the browser's push subscription.
 *   This prevents "stuck bad token" cycles where a PWA install
 *   invalidates the underlying subscription but the old token string
 *   remains cached in IndexedDB.
 *
 * ROOT CAUSE OF "no active Service Worker" ERRORS:
 * - navigator.serviceWorker.ready resolves when a SW is registered,
 *   but NOT necessarily when it is "active" and can accept push
 *   subscriptions. There is a race condition between the initial page
 *   load, Serwist's SW lifecycle, and FCM's getToken call.
 * - SOLUTION: We wait for the SW controllerchange event (which fires
 *   when the SW becomes the controller) AND check registration.active.
 *   We defer the entire token request by 2 seconds after login to
 *   give the SW time to fully take control.
 */

import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  type Messaging,
} from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import app, { db } from './client';

let messaging: Messaging | null = null;

// Module-level lock: prevents concurrent calls (e.g., from React Strict Mode)
let isRequestingToken = false;

// Lazily initialize messaging on the client side only
function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
  } catch {
    // Browser does not support FCM (e.g., Firefox private mode, some iOS)
    messaging = null;
  }
  return messaging;
}

/**
 * Wait until a service worker is both registered AND actively controlling
 * the page. This is the key fix for "no active Service Worker" errors.
 */
async function waitForActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.ready;

  // If there's already an active controller, we're done
  if (navigator.serviceWorker.controller) {
    return registration;
  }

  // Otherwise, wait for the 'controllerchange' event, which fires when
  // the SW takes control of the page (after skipWaiting + clientsClaim)
  return new Promise((resolve) => {
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.ready.then(resolve);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Safety timeout: if the SW is already active but controller is stale
    // (can happen after a hard refresh), resolve after 3s anyway
    setTimeout(async () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve(await navigator.serviceWorker.ready);
    }, 3000);
  });
}

/**
 * Request notification permission and register this device's FCM token
 * in the user's Firestore document using arrayUnion (safe for multi-device).
 *
 * Called automatically from StudentShell when a user logs in.
 * Has a 2-second initial delay to let the SW settle after page load.
 */
export async function requestNotificationPermission(uid: string): Promise<string | null> {
  const msg = getMessagingInstance();
  if (!msg) return null;

  // Prevent concurrent calls (e.g., React Strict Mode double-invoke)
  if (isRequestingToken) return null;
  isRequestingToken = true;

  try {
    // Check/request browser permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Give the Service Worker time to activate. This is the single most
    // important fix. Without this delay on the FIRST load after login,
    // the SW hasn't claimed the page yet, causing "no active Service Worker".
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Now wait until the SW is truly active and controlling this page
    const registration = await waitForActiveServiceWorker();

    // Attempt to get the FCM token, with retries for transient errors
    let fcmToken: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fcmToken = await getToken(msg, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        break; // Success — exit retry loop
      } catch (err: any) {
        const isTransient =
          err?.name === 'AbortError' ||
          err?.message?.includes('storage') ||
          err?.message?.includes('Registration failed') ||
          err?.message?.includes('active Service Worker') ||
          err?.message?.includes('subscribe');

        if (isTransient && attempt < 2) {
          const delay = 2000 * (attempt + 1);
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        } else {
          // Non-transient error — log and abort
          console.error('[FCM] Failed to get token after retries:', err?.message);
          return null;
        }
      }
    }

    if (!fcmToken) return null;

    // Persist token into Firestore using arrayUnion (idempotent, multi-device safe)
    const userRef = doc(db, `users/${uid}`);
    await setDoc(userRef, { fcmTokens: arrayUnion(fcmToken) }, { merge: true });

    // Cache in sessionStorage for fast logout cleanup
    sessionStorage.setItem('acadegrade_fcm_token', fcmToken);

    return fcmToken;
  } catch (err) {
    console.error('[FCM] requestNotificationPermission error:', err);
    return null;
  } finally {
    isRequestingToken = false;
  }
}

/**
 * Remove this device's FCM token from Firestore and revoke the local
 * push subscription. MUST be called on sign-out to prevent stale tokens.
 *
 * deleteToken() is critical: it revokes the browser's push subscription
 * so the NEXT user on this device gets a completely fresh token.
 */
export async function removeNotificationToken(uid: string, tokenOverride?: string): Promise<void> {
  const msg = getMessagingInstance();

  try {
    // 1. Find the token to remove
    let tokenToRemove = tokenOverride || sessionStorage.getItem('acadegrade_fcm_token');

    // If we don't have it in session (e.g., hard refresh before logout),
    // ask the browser for the current token one more time
    if (!tokenToRemove && msg) {
      try {
        const registration = await navigator.serviceWorker.ready;
        tokenToRemove = await getToken(msg, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      } catch {
        // Can't get the token — proceed with local revocation anyway
      }
    }

    // 2. Remove from Firestore if we found the token
    if (tokenToRemove) {
      try {
        const userRef = doc(db, `users/${uid}`);
        await updateDoc(userRef, { fcmTokens: arrayRemove(tokenToRemove) });
      } catch (err) {
        console.warn('[FCM] Could not remove token from Firestore:', err);
      }
    }

    // 3. Revoke the browser push subscription locally.
    // This is the KEY step: it forces the next login to generate a fresh token,
    // breaking the "stuck bad token" / PWA install invalidation cycle.
    if (msg) {
      try {
        await deleteToken(msg);
      } catch {
        // Non-critical — the Firestore removal above is what matters for delivery
      }
    }
  } finally {
    // Always clear session storage
    sessionStorage.removeItem('acadegrade_fcm_token');
    // Reset the module-level messaging instance so the next user starts fresh
    messaging = null;
  }
}

/**
 * Listen for push messages while the app is in the foreground.
 * Returns an unsubscribe function to be called on component unmount.
 */
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  const msg = getMessagingInstance();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}

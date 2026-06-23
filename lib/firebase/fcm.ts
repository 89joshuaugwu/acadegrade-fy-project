import { getMessaging, getToken, onMessage, deleteToken, type Messaging } from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import app, { db } from './client';

let messaging: Messaging | null = null;
let isRequesting = false;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error('Firebase Messaging not supported:', e);
  }
}

export async function requestNotificationPermission(uid: string): Promise<string | null> {
  if (!messaging) return null;
  
  // Prevent concurrent requests in React Strict Mode which causes IndexedDB storage errors
  if (isRequesting) return null;
  isRequesting = true;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Wait for the service worker to be fully ready
    let registration = await navigator.serviceWorker.ready;

    // Ensure the service worker is active before subscribing
    if (!registration.active) {
      await new Promise<void>((resolve) => {
        const worker = registration.installing || registration.waiting;
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
      registration = await navigator.serviceWorker.ready;
    }

    // Retry logic — the first attempt can fail with storage/AbortError
    // if the SW just activated and IndexedDB isn't ready yet
    let currentToken: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        currentToken = await getToken(messaging!, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        break; // success
      } catch (tokenErr: any) {
        const isRetryable =
          tokenErr?.name === 'AbortError' ||
          tokenErr?.message?.includes('storage') ||
          tokenErr?.message?.includes('Registration failed') ||
          tokenErr?.message?.includes('active Service Worker');
        
        if (isRetryable && attempt < 2) {
          console.warn(`FCM getToken attempt ${attempt + 1} failed, retrying...`, tokenErr.message);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        } else {
          throw tokenErr;
        }
      }
    }
    
    if (currentToken) {
      // Use setDoc with merge to handle users created before fcmTokens field existed
      const userRef = doc(db, `users/${uid}`);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken)
      }, { merge: true });
      
      // Store the token in sessionStorage so we can remove it on logout
      sessionStorage.setItem('acadegrade_fcm_token', currentToken);
      
      return currentToken;
    }
  } catch (err) {
    console.error('Error retrieving notification token:', err);
  } finally {
    isRequesting = false;
  }
  return null;
}

export async function removeNotificationToken(uid: string, token?: string): Promise<void> {
  try {
    let tokenToRemove = token || sessionStorage.getItem('acadegrade_fcm_token');
    
    // If we couldn't find the token in sessionStorage (e.g. new tab), try to get it directly
    if (!tokenToRemove && messaging) {
      try {
        const registration = await navigator.serviceWorker.ready;
        tokenToRemove = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      } catch (e) {
        console.warn('Could not retrieve token to remove:', e);
      }
    }

    if (tokenToRemove) {
      const userRef = doc(db, `users/${uid}`);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(tokenToRemove)
      });
    }

    // Delete the token locally so the next user on this device gets a fresh token
    if (messaging) {
      try {
        await deleteToken(messaging);
      } catch (e) {
        console.warn('Could not delete FCM token locally:', e);
      }
    }
    
    sessionStorage.removeItem('acadegrade_fcm_token');
  } catch (err) {
    console.error('Error removing notification token:', err);
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

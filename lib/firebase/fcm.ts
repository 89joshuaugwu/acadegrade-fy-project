import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import app, { db } from './client';

let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error('Firebase Messaging not supported:', e);
  }
}

/** Wait until the service worker registration has an active worker */
async function waitForActiveWorker(reg: ServiceWorkerRegistration, maxWaitMs = 5000): Promise<boolean> {
  if (reg.active) return true;
  
  const worker = reg.installing || reg.waiting;
  if (!worker) return false;
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), maxWaitMs);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        clearTimeout(timeout);
        resolve(true);
      }
    });
  });
}

export async function requestNotificationPermission(uid: string): Promise<string | null> {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Wait for the service worker to be fully ready AND active
      const registration = await navigator.serviceWorker.ready;
      
      // Ensure the worker is actually active before subscribing
      const isActive = await waitForActiveWorker(registration);
      if (!isActive) {
        console.warn('Service worker did not activate in time, skipping FCM token retrieval');
        return null;
      }
      
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      
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
    }
  } catch (err) {
    console.error('Error retrieving notification token:', err);
  }
  return null;
}

export async function removeNotificationToken(uid: string, token?: string): Promise<void> {
  try {
    const tokenToRemove = token || sessionStorage.getItem('acadegrade_fcm_token');
    if (!tokenToRemove) return;
    
    const userRef = doc(db, `users/${uid}`);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(tokenToRemove)
    });
    
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

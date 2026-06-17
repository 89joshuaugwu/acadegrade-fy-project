import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './client';
import { updateDocument } from './firestore';

let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error('Firebase Messaging not supported:', e);
  }
}

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './client';

export async function requestNotificationPermission(uid: string): Promise<string | null> {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Ensure the service worker is ready so we don't need a separate firebase-messaging-sw.js
      const registration = await navigator.serviceWorker.ready;
      
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      
      if (currentToken) {
        // Save token to Firestore array
        const userRef = doc(db, `users/${uid}`);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        return currentToken;
      }
    }
  } catch (err) {
    console.error('Error retrieving notification token:', err);
  }
  return null;
}

export async function removeNotificationToken(uid: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, `users/${uid}`);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token)
    });
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

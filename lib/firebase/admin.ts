import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Firebase Admin SDK — SERVER-SIDE ONLY
 * Used in app/api/ routes for verified writes and admin operations.
 * NEVER import this file in client components.
 */

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let app: any;
try {
  app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      })
    : getApps()[0];
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
  // Create a dummy app object to prevent downstream destructuring crashes
  app = { name: '[DEFAULT]' };
}

/** Admin Auth — verify ID tokens, manage users */
export const adminAuth = getAuth(app);

/** Admin Firestore — server-side reads/writes */
export const adminDb = getFirestore(app);

/** Admin RTDB — notification count updates */
export const adminRtdb = getDatabase(app);

/** Admin Messaging — FCM push notifications */
export const adminMessaging = getMessaging(app);

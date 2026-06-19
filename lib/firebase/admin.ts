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

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    console.error('FIREBASE_PRIVATE_KEY is not set!');
    return '';
  }
  // Handle both Vercel's double-escaped newlines and regular ones
  // Vercel stores the key with literal \n characters that need to become real newlines
  return key.replace(/\\n/g, '\n');
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: getPrivateKey(),
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

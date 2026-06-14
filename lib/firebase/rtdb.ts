import { ref, onValue, off, type DatabaseReference } from 'firebase/database';
import { rtdb } from './client';

/**
 * Realtime Database helpers.
 * Used ONLY for live notification badge counter (notif_counts/{uid}/unread).
 * All other data lives in Firestore.
 */

/** Subscribe to a RTDB path with real-time updates */
export function subscribeToRTDB<T>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const dbRef = ref(rtdb, path);
  const listener = onValue(dbRef, (snapshot) => {
    callback(snapshot.val() as T | null);
  });

  // Return unsubscribe function
  return () => off(dbRef);
}

/** Get a reference to a RTDB path */
export function getRTDBRef(path: string): DatabaseReference {
  return ref(rtdb, path);
}

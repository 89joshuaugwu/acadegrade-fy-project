import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Firestore helper utilities for client-side operations.
 * These wrap the modular Firestore SDK for common patterns.
 */

/** Get a single document by path */
export async function getDocument<T>(path: string): Promise<T | null> {
  const docRef = doc(db, path);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

/** Set a document (create or overwrite) */
export async function setDocument(
  path: string,
  data: DocumentData
): Promise<void> {
  const docRef = doc(db, path);
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update specific fields on a document */
export async function updateDocument(
  path: string,
  data: Partial<DocumentData>
): Promise<void> {
  const docRef = doc(db, path);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a document */
export async function deleteDocument(path: string): Promise<void> {
  const docRef = doc(db, path);
  await deleteDoc(docRef);
}

/** Query a collection with optional constraints */
export async function queryCollection<T>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const ref = collection(db, collectionPath);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T
  );
}

/** Subscribe to a document with real-time updates */
export function subscribeToDocument<T>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const docRef = doc(db, path);
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as T);
  });
}

/** Subscribe to a collection with real-time updates */
export function subscribeToCollection<T>(
  collectionPath: string,
  callback: (data: T[]) => void,
  ...constraints: QueryConstraint[]
): () => void {
  const ref = collection(db, collectionPath);
  const q = query(ref, ...constraints);
  return onSnapshot(q, (snapshot) => {
    const results = snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T
    );
    callback(results);
  });
}

/** Re-export commonly used Firestore functions */
export {
  doc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';

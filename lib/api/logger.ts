import { adminDb } from '@/lib/firebase/admin';

/**
 * Lightweight, fire-and-forget API call logger.
 * Writes a document to `api_logs` with the endpoint, user, status, and timing info.
 * Never throws — all errors are silently caught so logging can never break an API route.
 */

export type ApiCategory = 'ai' | 'email' | 'otp' | 'notification' | 'transcript' | 'extract' | 'auth' | 'admin';

export interface ApiLogEntry {
  /** The API route path, e.g. '/api/ai/forecast' */
  endpoint: string;
  /** Category for grouping, e.g. 'ai', 'email', 'otp' */
  category: ApiCategory;
  /** The UID of the user who triggered the call (null for unauthenticated) */
  uid: string | null;
  /** HTTP status code returned */
  status: number;
  /** Duration of the request in milliseconds */
  durationMs: number;
  /** Optional provider label, e.g. 'gemini', 'deepseek', 'groq', 'gmail' */
  provider?: string;
  /** Timestamp of the call */
  timestamp: Date;
  /** Optional error message if the call failed */
  error?: string;
}

/**
 * Log an API call. Fire-and-forget — never awaited, never throws.
 */
export function logApiCall(entry: Omit<ApiLogEntry, 'timestamp'>): void {
  try {
    const doc: ApiLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Fire and forget — don't await
    adminDb.collection('api_logs').add(doc).catch(() => {});
  } catch {
    // Silently ignore any logging errors
  }
}

/**
 * Helper to create a timer for measuring API duration.
 * Usage:
 *   const timer = apiTimer();
 *   // ... do work ...
 *   logApiCall({ ..., durationMs: timer() });
 */
export function apiTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

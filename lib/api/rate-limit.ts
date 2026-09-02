import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export interface RateLimitWindow {
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
  window: string;
}

interface RateLimitDocument {
  count?: number;
  windowStartedAt?: Timestamp;
}

function safeDocumentId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

/**
 * Distributed, per-user fixed-window limiter backed by Firestore transactions.
 * It remains correct across parallel Vercel instances and cold starts.
 */
export async function checkRateLimit(
  uid: string,
  endpoint: string,
  windows: RateLimitWindow[],
): Promise<RateLimitResult> {
  if (!windows.length) throw new Error('Rate limiter requires at least one window.');

  const now = Date.now();
  const refs = windows.map((window) => adminDb
    .collection('_api_rate_limits')
    .doc(safeDocumentId(`${uid}_${endpoint}_${window.name}`)));

  return adminDb.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const states = snapshots.map((snapshot, index) => {
      const policy = windows[index];
      const data = snapshot.data() as RateLimitDocument | undefined;
      const storedStart = data?.windowStartedAt?.toMillis?.() ?? 0;
      const expired = !storedStart || now >= storedStart + policy.windowMs;
      const windowStartedAt = expired ? now : storedStart;
      const count = expired ? 0 : Number(data?.count ?? 0);
      return { policy, windowStartedAt, count, ref: refs[index] };
    });

    const blocked = states
      .filter((state) => state.count >= state.policy.limit)
      .map((state) => ({
        ...state,
        retryAfterSeconds: Math.max(1, Math.ceil((state.windowStartedAt + state.policy.windowMs - now) / 1000)),
      }))
      .sort((a, b) => b.retryAfterSeconds - a.retryAfterSeconds)[0];

    if (blocked) {
      return {
        allowed: false,
        retryAfterSeconds: blocked.retryAfterSeconds,
        limit: blocked.policy.limit,
        remaining: 0,
        window: blocked.policy.name,
      };
    }

    states.forEach((state) => {
      transaction.set(state.ref, {
        uid,
        endpoint,
        window: state.policy.name,
        limit: state.policy.limit,
        count: state.count + 1,
        windowStartedAt: Timestamp.fromMillis(state.windowStartedAt),
        expiresAt: Timestamp.fromMillis(state.windowStartedAt + state.policy.windowMs + (24 * 60 * 60 * 1000)),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const tightest = states
      .map((state) => ({
        ...state,
        remaining: Math.max(0, state.policy.limit - (state.count + 1)),
      }))
      .sort((a, b) => a.remaining - b.remaining)[0];

    return {
      allowed: true,
      retryAfterSeconds: 0,
      limit: tightest.policy.limit,
      remaining: tightest.remaining,
      window: tightest.policy.name,
    };
  });
}

export function rateLimitResponse(result: RateLimitResult, message = 'Too many AI requests. Please wait before trying again.') {
  return NextResponse.json(
    {
      error: message,
      retryAfterSeconds: result.retryAfterSeconds,
      limit: result.limit,
      window: result.window,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store',
      },
    },
  );
}

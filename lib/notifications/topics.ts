import 'server-only';

import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { deviceTokens } from '@/lib/admin/user-devices';

/**
 * FCM topics for announcements (G1). Subscriptions are made on the server with
 * the tokens already stored on `users/{uid}`, so installed APKs are included
 * without an update. Topic names never contain personal data:
 *   ag_all, ag_u_<first 16 hex of sha256(lower-cased, trimmed university)>, ag_l_<level>
 * Topic changes can take up to 24 hours to apply on Google's side.
 */
export const TOPIC_ALL = 'ag_all';
export const MAX_CONDITION_TOPICS = 5;
const TOKEN_CHUNK = 1000;

export interface AnnouncementAudience {
  universities?: string[];
  levels?: number[];
}

/** The subset of messaging this module uses (firebase-admin `Messaging`). */
export interface TopicMessaging {
  subscribeToTopic(tokens: string[], topic: string): Promise<unknown>;
  unsubscribeFromTopic(tokens: string[], topic: string): Promise<unknown>;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function universityTopic(university: unknown): string | null {
  if (typeof university !== 'string') return null;
  const normalized = university.trim().toLowerCase();
  return normalized ? `ag_u_${sha256(normalized).slice(0, 16)}` : null;
}

export function levelTopic(level: unknown): string | null {
  const value = typeof level === 'string' ? Number(level) : level;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 1000 ? `ag_l_${value}` : null;
}

/** Topics a profile should be in. None when the student turned admin broadcasts off. */
export function topicsForProfile(profile: Record<string, unknown> | undefined | null): string[] {
  if (!profile) return [];
  const preferences = profile.notificationPreferences as { adminBroadcasts?: unknown } | undefined;
  if (preferences?.adminBroadcasts === false) return [];
  return [TOPIC_ALL, universityTopic(profile.university), levelTopic(profile.currentLevel)]
    .filter((topic): topic is string => Boolean(topic));
}

/**
 * The FCM condition for an audience: (any of the universities) && (any of the levels).
 * An empty audience is everyone. Throws when more than 5 topics would be needed (FCM limit).
 */
export function conditionForAudience(audience: AnnouncementAudience | null | undefined): string {
  const universities = [...new Set((audience?.universities ?? []).map(universityTopic).filter((topic): topic is string => Boolean(topic)))];
  const levels = [...new Set((audience?.levels ?? []).map(levelTopic).filter((topic): topic is string => Boolean(topic)))];
  if (universities.length + levels.length > MAX_CONDITION_TOPICS) {
    throw new Error(`An announcement can target at most ${MAX_CONDITION_TOPICS} topics (universities plus levels).`);
  }
  const anyOf = (topics: string[]) => `(${topics.map((topic) => `'${topic}' in topics`).join(' || ')})`;
  const parts = [universities, levels].filter((topics) => topics.length > 0).map(anyOf);
  return parts.length ? parts.join(' && ') : `'${TOPIC_ALL}' in topics`;
}

export const tokensHash = (tokens: string[]) => sha256([...tokens].sort().join('\n'));

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function forEachChunk(tokens: string[], run: (chunk: string[]) => Promise<unknown>) {
  for (const chunk of chunks(tokens, TOKEN_CHUNK)) await run(chunk);
}

export interface TopicSyncResult { subscribed: string[]; unsubscribed: string[]; changed: boolean }

/**
 * Brings one profile's topic subscriptions in line with its university, level,
 * broadcast preference and current tokens. Diffs against the server-owned
 * `fcmTopics` and `fcmTopicsTokensHash`; when the token set changed, every
 * desired topic is subscribed again for the current tokens.
 */
export async function syncProfileTopics(
  db: Firestore,
  messaging: TopicMessaging,
  uid: string,
  profile: Record<string, unknown>,
): Promise<TopicSyncResult> {
  const tokens = deviceTokens(profile);
  const desired = tokens.length ? topicsForProfile(profile) : [];
  const current = Array.isArray(profile.fcmTopics) ? (profile.fcmTopics as unknown[]).filter((topic): topic is string => typeof topic === 'string') : [];
  // No devices and nothing recorded: nothing to do (and no write for every device-less account).
  if (!tokens.length && !current.length) return { subscribed: [], unsubscribed: [], changed: false };
  const hash = tokensHash(tokens);
  const tokensChanged = profile.fcmTopicsTokensHash !== hash;

  const unsubscribed = tokens.length ? current.filter((topic) => !desired.includes(topic)) : [];
  const subscribed = tokensChanged ? desired : desired.filter((topic) => !current.includes(topic));
  const sameTopics = current.length === desired.length && current.every((topic, index) => topic === desired[index]);
  if (!subscribed.length && !unsubscribed.length && sameTopics && !tokensChanged) {
    return { subscribed: [], unsubscribed: [], changed: false };
  }

  for (const topic of unsubscribed) await forEachChunk(tokens, (chunk) => messaging.unsubscribeFromTopic(chunk, topic));
  for (const topic of subscribed) await forEachChunk(tokens, (chunk) => messaging.subscribeToTopic(chunk, topic));
  await db.collection('users').doc(uid).set({ fcmTopics: desired, fcmTopicsTokensHash: hash }, { merge: true });
  return { subscribed, unsubscribed, changed: true };
}

export async function syncUserTopics(db: Firestore, messaging: TopicMessaging, uid: string): Promise<TopicSyncResult> {
  const snapshot = await db.collection('users').doc(uid).get();
  if (!snapshot.exists) return { subscribed: [], unsubscribed: [], changed: false };
  return syncProfileTopics(db, messaging, uid, (snapshot.data() ?? {}) as Record<string, unknown>);
}

/** Before tokens are cleared (admin "Sign out everywhere"): unsubscribe them from every topic. */
export async function unsubscribeAllTopics(db: Firestore, messaging: TopicMessaging, uid: string, profile: Record<string, unknown> | undefined) {
  if (!profile) return;
  const tokens = deviceTokens(profile);
  const current = Array.isArray(profile.fcmTopics) ? (profile.fcmTopics as unknown[]).filter((topic): topic is string => typeof topic === 'string') : [];
  if (tokens.length) {
    for (const topic of current) await forEachChunk(tokens, (chunk) => messaging.unsubscribeFromTopic(chunk, topic));
  }
  await db.collection('users').doc(uid).set({ fcmTopics: [], fcmTopicsTokensHash: tokensHash([]) }, { merge: true });
}

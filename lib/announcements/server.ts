import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { conditionForAudience, type AnnouncementAudience } from '@/lib/notifications/topics';
import { announcementTime } from './shared';

/** Push lifetime on Android: 3 days. */
export const ANNOUNCEMENT_PUSH_TTL_MS = 259_200_000;

export interface AnnouncementSender {
  send(message: {
    condition: string;
    notification: { title: string; body: string };
    data: Record<string, string>;
    android: { ttl: number };
  }): Promise<unknown>;
}

const iso = (value: unknown) => {
  const time = announcementTime(value);
  return time === null ? null : new Date(time).toISOString();
};

export function announcementView(id: string, data: Record<string, unknown>) {
  return {
    id,
    title: data.title,
    body: data.body,
    linkUrl: data.linkUrl ?? null,
    audience: data.audience ?? {},
    startsAt: iso(data.startsAt),
    endsAt: iso(data.endsAt),
    status: data.status,
    showAsBanner: data.showAsBanner === true,
    push: data.push === true,
    sentAt: iso(data.sentAt),
    createdBy: data.createdBy ?? null,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

/**
 * Publishes one announcement. With `push`, sends ONE condition message to the
 * audience's topics (never a per-user scan) and records `sentAt`, so a second
 * publish never pushes twice. `startsAt` moves to now when it was in the future.
 */
export async function publishAnnouncement(db: Firestore, sender: AnnouncementSender, id: string, now: number) {
  const ref = db.collection('announcements').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Announcement not found');
  const data = snapshot.data() as Record<string, unknown>;
  const update: Record<string, unknown> = { status: 'published', updatedAt: new Date(now) };
  const starts = announcementTime(data.startsAt);
  if (starts === null || starts > now) update.startsAt = new Date(now);

  let pushed = false;
  if (data.push === true && !data.sentAt) {
    await sender.send({
      condition: conditionForAudience((data.audience ?? {}) as AnnouncementAudience),
      notification: { title: String(data.title ?? ''), body: String(data.body ?? '') },
      data: { type: 'announcement', url: typeof data.linkUrl === 'string' && data.linkUrl ? data.linkUrl : '/notifications', announcementId: id },
      android: { ttl: ANNOUNCEMENT_PUSH_TTL_MS },
    });
    update.sentAt = new Date(now);
    pushed = true;
  }
  await ref.set(update, { merge: true });
  return { pushed, data: { ...data, ...update } };
}

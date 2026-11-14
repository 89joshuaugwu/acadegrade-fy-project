import { FieldPath } from 'firebase-admin/firestore';
import { publishAnnouncement, type AnnouncementSender } from '@/lib/announcements/server';
import { syncProfileTopics, type TopicMessaging } from '@/lib/notifications/topics';
import type { CronContext, CronJob, CronJobResult } from './jobs';

type Messaging = AnnouncementSender & TopicMessaging;

async function defaultMessaging(): Promise<Messaging> {
  // Imported lazily so this module can be loaded without initialising Firebase Admin.
  const { adminMessaging } = await import('@/lib/firebase/admin');
  return adminMessaging as unknown as Messaging;
}

const DUE_LIMIT = 50;

/**
 * Publishes `scheduled` announcements whose start time has passed. Cron runs once
 * a day (03:00-03:59 UTC on Hobby), so "scheduled" means "on that day's run".
 */
export function createScheduledAnnouncementsJob(getSender: () => Promise<AnnouncementSender> = defaultMessaging): CronJob {
  return {
    id: 'scheduledAnnouncements',
    async run(ctx: CronContext): Promise<CronJobResult> {
      const due = await ctx.db.collection('announcements')
        .where('status', '==', 'scheduled')
        .where('startsAt', '<=', new Date(ctx.now))
        .orderBy('startsAt', 'asc')
        .limit(DUE_LIMIT)
        .get();
      if (due.empty) return { written: 0 };
      const sender = await getSender();
      let written = 0;
      const failed: string[] = [];
      for (const doc of due.docs) {
        try {
          await publishAnnouncement(ctx.db, sender, doc.id, ctx.now);
          written += 1;
        } catch {
          failed.push(doc.id);
        }
      }
      return { written, truncated: due.size === DUE_LIMIT, ...(failed.length ? { note: `Failed: ${failed.length}` } : {}) };
    },
  };
}

/**
 * Subscribes existing devices (including installed APKs) to announcement topics.
 * One page of users per day by document id, resuming from `_cron_state/topics`.
 * After the first full pass it sets `completedOnce`, which lets the admin hide the
 * legacy "send to every device" broadcast, and keeps cycling to catch changes.
 */
export function createTopicBackfillJob(options: { getMessaging?: () => Promise<TopicMessaging>; pageSize?: number } = {}): CronJob {
  const getMessaging = options.getMessaging ?? defaultMessaging;
  const pageSize = options.pageSize ?? 500;
  return {
    id: 'topicBackfill',
    async run(ctx: CronContext): Promise<CronJobResult> {
      const stateRef = ctx.db.collection('_cron_state').doc('topics');
      const state = (await stateRef.get()).data() ?? {};
      const cursor = typeof state.cursor === 'string' ? state.cursor : null;
      let query = ctx.db.collection('users').orderBy(FieldPath.documentId()).limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      const messaging = await getMessaging();

      let written = 0;
      let failures = 0;
      for (const doc of page.docs) {
        if (Date.now() > ctx.deadline) break;
        try {
          const result = await syncProfileTopics(ctx.db, messaging, doc.id, (doc.data() ?? {}) as Record<string, unknown>);
          if (result.changed) written += 1;
        } catch {
          failures += 1;
        }
      }

      const finished = page.size < pageSize;
      const last = page.docs.length ? page.docs[page.docs.length - 1].id : cursor;
      await stateRef.set({
        cursor: finished ? null : last,
        completedOnce: state.completedOnce === true || finished,
        updatedAt: new Date(ctx.now),
      }, { merge: true });
      return { written, truncated: !finished, ...(failures ? { note: `Failed: ${failures}` } : {}) };
    },
  };
}

export const scheduledAnnouncementsJob = createScheduledAnnouncementsJob();
export const topicBackfillJob = createTopicBackfillJob();

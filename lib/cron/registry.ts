import type { CronJob } from './jobs';
import { cleanupJob } from './cleanup';
import { createdAtBackfillJob, metricsJob } from './metrics';
import { supportRetentionJob } from './support';
import { scheduledAnnouncementsJob, topicBackfillJob } from './announcements';
import { accountDeletionFollowUpJob } from './account-deletion';

/**
 * Everything Vercel Cron runs once a day (03:00 UTC, see vercel.json).
 * Hobby plans allow one daily run, so later packages add jobs HERE, not new crons.
 * Order matters: the createdAt backfill runs before the metrics roll-up so newly
 * dated accounts are counted the same day.
 */
export const DAILY_JOBS: readonly CronJob[] = [
  // First, so unfinished account deletions are never starved by later jobs (21-day promise).
  accountDeletionFollowUpJob,
  cleanupJob,
  supportRetentionJob,
  // Topics before scheduled sends, so newly subscribed devices receive today's pushes.
  topicBackfillJob,
  scheduledAnnouncementsJob,
  createdAtBackfillJob,
  metricsJob,
];

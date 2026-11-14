import type { CronJob } from './jobs';
import { cleanupJob } from './cleanup';

/**
 * Everything Vercel Cron runs once a day (03:00 UTC, see vercel.json).
 * Hobby plans allow one daily run, so later packages add jobs HERE, not new crons:
 * for example the admin metrics roll-up (G4) and scheduled announcements (G1).
 */
export const DAILY_JOBS: readonly CronJob[] = [cleanupJob];

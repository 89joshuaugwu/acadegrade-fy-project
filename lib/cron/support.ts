import { deleteExpired } from './cleanup';
import type { CronContext, CronJob, CronJobResult } from './jobs';

/**
 * Closed support tickets carry `purgeAt` (closedAt + 180 days); open and waiting
 * tickets have `purgeAt: null`, which a range filter never matches.
 */
export const supportRetentionJob: CronJob = {
  id: 'supportRetention',
  async run(ctx: CronContext): Promise<CronJobResult> {
    const result = await deleteExpired(ctx.db, 'support_tickets', 'purgeAt', new Date(ctx.now));
    return { deleted: { support_tickets: result.deleted }, truncated: result.truncated };
  },
};

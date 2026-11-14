import type { Firestore } from 'firebase-admin/firestore';

/** What a job needs to run. `deadline` is a Unix time in ms after which no new job should start. */
export interface CronContext {
  db: Firestore;
  now: number;
  deadline: number;
}

export interface CronJobResult {
  deleted?: Record<string, number>;
  written?: number;
  truncated?: boolean;
  note?: string;
}

export interface CronJob {
  id: string;
  run(ctx: CronContext): Promise<CronJobResult>;
}

export type CronJobOutcome = CronJobResult | { error: string } | { skipped: 'deadline' };

/**
 * Runs jobs one after another. A job that throws is recorded and does not stop the
 * others. Once the deadline passes, remaining jobs are skipped, not started.
 */
export async function runCronJobs(jobs: readonly CronJob[], ctx: CronContext): Promise<Record<string, CronJobOutcome>> {
  const results: Record<string, CronJobOutcome> = {};
  for (const job of jobs) {
    if (Date.now() > ctx.deadline) {
      results[job.id] = { skipped: 'deadline' };
      continue;
    }
    try {
      results[job.id] = await job.run(ctx);
    } catch (error) {
      // The message only: never log the document data a job was working on.
      results[job.id] = { error: error instanceof Error ? error.message.slice(0, 300) : 'Job failed' };
    }
  }
  return results;
}

import { computeCumulativeCGPA, type SemesterSummaryInput } from '@/lib/cgpa/academicRules';

export interface SharedStandingSource {
  cgpa?: unknown;
  pi?: unknown;
  totalCredits?: unknown;
  semesters?: readonly SemesterSummaryInput[] | null;
}

export interface SharedStanding {
  cgpa: number;
  pi: number;
  totalCredits: number;
  /** 'snapshot' when the server's figures were used, 'recomputed' for old snapshots. */
  source: 'snapshot' | 'recomputed';
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The cumulative standing to show on a shared record. The server snapshot is
 * computed with the shared academic rules, so it is authoritative; snapshots
 * created before it carried `cgpa` are recomputed with the same shared rule.
 */
export function resolveSharedStanding(source: SharedStandingSource | null | undefined): SharedStanding {
  const recomputed = computeCumulativeCGPA(source?.semesters ?? []);
  if (source && finite(source.cgpa)) {
    return {
      cgpa: source.cgpa,
      pi: finite(source.pi) ? source.pi : recomputed.pi,
      totalCredits: finite(source.totalCredits) ? source.totalCredits : recomputed.totalCredits,
      source: 'snapshot',
    };
  }
  return { cgpa: recomputed.cgpa, pi: recomputed.pi, totalCredits: recomputed.totalCredits, source: 'recomputed' };
}

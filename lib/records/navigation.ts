/**
 * What the student app shows for each record type (GRADING_AND_PROFILES_PLAN.md,
 * Phase 2 design, "Per type"). Tertiary is today's app, unchanged. O-level and
 * admission accounts never see results, insights, transcript or timetable:
 * those pages are about semesters and a CGPA they do not have.
 */

import { studentNavigation, type NavigationItem } from '@/lib/ui/route-meta';
import type { RecordType } from '@/types/records';

const OLEVEL_TAB: NavigationItem = { href: '/olevel', label: 'O-level', icon: 'olevel' };
const AGGREGATE_TAB: NavigationItem = { href: '/admission', label: 'Aggregate', icon: 'admission' };
const DASHBOARD_TAB: NavigationItem = { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' };

export function navigationFor(recordType: RecordType): NavigationItem[] {
  if (recordType === 'olevel') return [DASHBOARD_TAB, OLEVEL_TAB];
  if (recordType === 'admission') return [DASHBOARD_TAB, AGGREGATE_TAB, OLEVEL_TAB];
  return studentNavigation;
}

const TERTIARY_ONLY = ['/results', '/insights', '/transcript', '/timetable'];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/**
 * The record type a page belongs to when this account cannot use it, or null
 * when it can. Shared pages (dashboard, settings, notifications) are never blocked.
 */
export function pageRecordType(pathname: string, recordType: RecordType): RecordType | null {
  const path = (pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/');
  if (TERTIARY_ONLY.some((base) => under(path, base))) return recordType === 'tertiary' ? null : 'tertiary';
  if (under(path, '/olevel')) return recordType === 'tertiary' ? 'olevel' : null;
  if (under(path, '/admission')) return recordType === 'admission' ? null : 'admission';
  return null;
}

/** Plain names for each type: registration, settings and admin use the same words. */
export const RECORD_TYPE_COPY: Record<RecordType, { title: string; line: string; short: string }> = {
  tertiary: {
    title: 'University, polytechnic or college results',
    line: 'GPA, CGPA and your class of degree, semester by semester.',
    short: 'University',
  },
  olevel: {
    title: 'WAEC or NECO results',
    line: 'Your O-level grades from up to two sittings, and whether you have five credits with English and Maths.',
    short: 'O-level',
  },
  admission: {
    title: 'JAMB and admission',
    line: 'Your UTME, post-UTME and O-level grades worked into an admission aggregate.',
    short: 'Admission',
  },
};

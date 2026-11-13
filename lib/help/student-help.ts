/**
 * Student help for the web app (spec 2026-11-13, Part 4).
 *
 * `student-help.json` is the canonical copy shared byte-for-byte with
 * acadegrade-mobile/lib/help/student-help.json (pinned by STUDENT_HELP_SHA256
 * and tests/unit/student-help-content.test.ts). Never edit it here alone.
 * Web-only entries live in `web-help.json` with `only: 'web'`.
 */
import shared from './student-help.json';
import webOnly from './web-help.json';
import type { HelpEntry, HelpId, HelpSource } from './types';

/** sha256 of student-help.json with CRLF normalised to LF; matches the Android lock file. */
export const STUDENT_HELP_SHA256 = '04384c7a12e61d9f9c00724b9c2bb58aabbeba4143710f371382a96d5363eec2';
export const STUDENT_HELP_CONTENT_VERSION = '2026-11-13.2';

/** Help ids for each authenticated student page (spec 4.4). */
export const STUDENT_HELP = {
  dashboard: 'student.dashboard',
  results: 'student.results',
  newSemester: 'student.new-semester',
  semester: 'student.semester',
  insights: 'student.insights',
  transcript: 'student.transcript',
  notifications: 'student.notifications',
  settings: 'student.settings',
} as const satisfies Record<string, HelpId>;

export type InsightsHelpTab = 'forecast' | 'whatif' | 'risk' | 'analysis';
export function insightsHelpId(tab: InsightsHelpTab): HelpId {
  return `student.insights.${tab}`;
}

/** The JSON shape shared with Android (tours are per platform). */
interface SharedHelpEntry extends Omit<HelpEntry, 'tourId'> {
  tour?: Partial<Record<'web' | 'android', string>>;
}
interface SharedHelpFile { version: string; entries: Record<string, SharedHelpEntry> }

function toWebEntries(...files: SharedHelpFile[]): Record<HelpId, HelpEntry> {
  const entries: Record<HelpId, HelpEntry> = {};
  for (const file of files) {
    for (const [id, raw] of Object.entries(file.entries)) {
      if (raw.only && raw.only !== 'web') continue;
      const { tour, ...entry } = raw;
      entries[id] = { ...entry, ...(tour?.web ? { tourId: tour.web } : {}) };
    }
  }
  return entries;
}

const ROUTES: Record<string, string> = {
  'student.dashboard': '/dashboard',
  'student.results': '/results',
  'student.new-semester': '/results/new',
  'student.semester': '/results',
  'student.course-entry': '/results',
  'student.course-codes': '/results',
  'student.scanner': '/results',
  'student.insights': '/insights',
  'student.transcript': '/transcript',
  'student.notifications': '/notifications',
  'student.settings': '/settings',
};

export const studentHelpSource: HelpSource = {
  entries: toWebEntries(shared as SharedHelpFile, webOnly as SharedHelpFile),
  platform: 'web',
  hrefFor: (id) => ROUTES[id] ?? (id.startsWith('student.insights.') ? '/insights' : undefined),
};

/** The help id for a student pathname, for a shell-level Help button. */
export function studentHelpIdForPath(pathname: string): HelpId | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/results/new') return STUDENT_HELP.newSemester;
  if (/^\/results\/[^/]+$/.test(path)) return STUDENT_HELP.semester;
  const match = Object.values(STUDENT_HELP).find(id => ROUTES[id] === path);
  return match;
}

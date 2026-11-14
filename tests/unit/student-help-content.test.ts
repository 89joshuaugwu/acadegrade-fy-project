import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  STUDENT_HELP,
  STUDENT_HELP_CONTENT_VERSION,
  STUDENT_HELP_SHA256,
  insightsHelpId,
  studentHelpIdForPath,
  studentHelpSource,
} from '@/lib/help/student-help';
import webHelp from '@/lib/help/web-help.json';
import sharedHelp from '@/lib/help/student-help.json';

const root = path.resolve(import.meta.dirname, '../..');

describe('canonical student help copy', () => {
  it('is byte-identical to the shared Android copy (sha256 with CRLF normalised to LF)', () => {
    const raw = readFileSync(path.join(root, 'lib/help/student-help.json'), 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(raw, 'utf8').digest('hex')).toBe(STUDENT_HELP_SHA256);
    expect(STUDENT_HELP_SHA256).toBe('04384c7a12e61d9f9c00724b9c2bb58aabbeba4143710f371382a96d5363eec2');
    expect(sharedHelp.version).toBe(STUDENT_HELP_CONTENT_VERSION);
  });

  it('keeps web-only entries out of the shared file', () => {
    const shared = Object.keys(sharedHelp.entries);
    for (const [id, entry] of Object.entries(webHelp.entries as Record<string, { only?: string }>)) {
      expect(shared).not.toContain(id);
      expect(entry.only).toBe('web');
    }
  });
});

describe('studentHelpSource', () => {
  it('has an entry for every page and Insights tab id the web mounts', () => {
    for (const id of Object.values(STUDENT_HELP)) expect(studentHelpSource.entries[id]?.title).toBeTruthy();
    for (const tab of ['forecast', 'whatif', 'risk', 'analysis'] as const) {
      expect(studentHelpSource.entries[insightsHelpId(tab)]?.id).toBe(`student.insights.${tab}`);
    }
  });

  it('drops Android-only entries and maps the web tour id', () => {
    expect(Object.values(studentHelpSource.entries).some(entry => entry.only === 'android')).toBe(false);
    expect(studentHelpSource.platform).toBe('web');
    expect(studentHelpSource.entries['student.dashboard'].tourId).toBe('dashboard');
    expect(studentHelpSource.entries['student.insights'].tourId).toBeUndefined();
  });

  it('links help entries to their web routes', () => {
    expect(studentHelpSource.hrefFor('student.insights.forecast')).toBe('/insights');
    expect(studentHelpSource.hrefFor('student.new-semester')).toBe('/results/new');
    expect(studentHelpSource.hrefFor('student.notifications')).toBe('/notifications');
  });

  it('resolves a pathname to its help id', () => {
    expect(studentHelpIdForPath('/dashboard')).toBe('student.dashboard');
    expect(studentHelpIdForPath('/results')).toBe('student.results');
    expect(studentHelpIdForPath('/results/new')).toBe('student.new-semester');
    expect(studentHelpIdForPath('/results/abc123')).toBe('student.semester');
    expect(studentHelpIdForPath('/insights')).toBe('student.insights');
    expect(studentHelpIdForPath('/transcript')).toBe('student.transcript');
    expect(studentHelpIdForPath('/notifications/')).toBe('student.notifications');
    expect(studentHelpIdForPath('/settings')).toBe('student.settings');
    expect(studentHelpIdForPath('/admin/dashboard')).toBeUndefined();
  });
});

'use client';

import { limit, orderBy, where } from 'firebase/firestore';
import { getDocument, queryCollection } from '@/lib/firebase/firestore';
import {
  ANNOUNCEMENTS_READ_KEY, announcementMatchesProfile, announcementTime, isAnnouncementActive, type AnnouncementAudienceInput,
} from './shared';

export interface StudentAnnouncement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  startsAt: number;
  showAsBanner: boolean;
}

const HIDDEN_KEY = (uid: string) => `acadegrade:announcements-hidden:v1:${uid}`;
const MAX_STORED = 200;

function readSet(key: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function addToSet(key: string, ids: string[]) {
  try {
    const next = [...new Set([...readSet(key), ...ids])].slice(-MAX_STORED);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Private mode or storage full: read state is a convenience only.
  }
}

export const readAnnouncementIds = (uid: string) => readSet(ANNOUNCEMENTS_READ_KEY(uid));
export const hiddenAnnouncementIds = (uid: string) => readSet(HIDDEN_KEY(uid));
export const markAnnouncementsRead = (uid: string, ids: string[]) => addToSet(ANNOUNCEMENTS_READ_KEY(uid), ids);
export const hideAnnouncements = (uid: string, ids: string[]) => addToSet(HIDDEN_KEY(uid), ids);

/**
 * Active published announcements for this student, newest first. Audience and
 * end time are checked here (the rules only guarantee `published`). Fail-open:
 * any error gives an empty list and never blocks the inbox.
 */
export async function loadActiveAnnouncements(uid: string, now = Date.now()): Promise<StudentAnnouncement[]> {
  try {
    const [profile, rows] = await Promise.all([
      getDocument<{ university?: string; currentLevel?: number }>(`users/${uid}`).catch(() => null),
      queryCollection<{ id: string; status?: unknown; startsAt?: unknown; endsAt?: unknown; [field: string]: unknown }>('announcements', where('status', '==', 'published'), orderBy('startsAt', 'desc'), limit(20)),
    ]);
    return rows
      .filter((row) => isAnnouncementActive(row, now))
      .filter((row) => announcementMatchesProfile(row.audience as AnnouncementAudienceInput | undefined, profile))
      .map((row) => ({
        id: row.id,
        title: String(row.title ?? ''),
        body: String(row.body ?? ''),
        linkUrl: typeof row.linkUrl === 'string' && row.linkUrl ? row.linkUrl : null,
        startsAt: announcementTime(row.startsAt) ?? now,
        showAsBanner: row.showAsBanner === true,
      }))
      .sort((a, b) => b.startsAt - a.startsAt);
  } catch {
    return [];
  }
}

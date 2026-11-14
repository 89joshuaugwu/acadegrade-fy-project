'use client';

import { useCallback, useState } from 'react';
import { AnnouncementSettings } from './AnnouncementSettings';
import { AnnouncementsManager } from './AnnouncementsManager';

/**
 * Settings > Announcements: targeted announcements first, then the simple
 * website banner. The legacy "send to every device" broadcast (which reads every
 * account) stays available until the daily topic backfill has finished once.
 */
export function AnnouncementsTab({ initialBanner, getToken }: Readonly<{ initialBanner: string; getToken: () => Promise<string> }>) {
  const [topicsReady, setTopicsReady] = useState(false);
  const onBackfillState = useCallback((completedOnce: boolean) => setTopicsReady(completedOnce), []);
  return (
    <div className="space-y-6">
      <AnnouncementsManager getToken={getToken} onBackfillState={onBackfillState} />
      <AnnouncementSettings initial={initialBanner} getToken={getToken} showLegacySend={!topicsReady} />
    </div>
  );
}

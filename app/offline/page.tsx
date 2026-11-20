import type { Metadata } from 'next';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { InlineLink } from '@/components/site/auth/controls';
import { NoticeCard, SystemStage } from '@/components/site/system/NoticeCard';
import { OfflineWatch } from '@/components/site/system/OfflineWatch';
import { NO_INDEX_METADATA } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: "You're offline",
  ...NO_INDEX_METADATA,
};

/**
 * Shown by the old service worker when a navigation fails, or opened directly.
 * Nothing here needs the network: inline mark and icons, no photographs, all
 * copy in the HTML. It promises nothing that is not there: the web keeps no
 * offline copy of the record.
 */
export default function OfflinePage() {
  return (
    <MinimalShell>
      <SystemStage>
        <NoticeCard
          width="wide"
          icon="offline"
          title="You're offline"
          sentence="AcadeGrade needs a connection to load your record on the web. Your record is safe: it's saved on your account, not on this phone."
          foot={
            <>
              <p className="text-ag-mist">On Android? The AcadeGrade app keeps your timetable and reminders working without data.</p>
              <InlineLink href="/app" className="inline-flex min-h-11 items-center">
                Get the Android app
              </InlineLink>
            </>
          }
        >
          <OfflineWatch />
        </NoticeCard>
      </SystemStage>
    </MinimalShell>
  );
}

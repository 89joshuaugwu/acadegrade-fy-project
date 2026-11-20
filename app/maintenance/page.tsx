import type { Metadata } from 'next';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { InlineLink } from '@/components/site/auth/controls';
import { MaintenanceWatch } from '@/components/site/system/MaintenanceWatch';
import { NoticeCard, SystemStage } from '@/components/site/system/NoticeCard';
import { returnPlaceLabel } from '@/components/site/system/maintenance-return';
import { safeNextPath } from '@/lib/public/maintenance-redirect';
import { NO_INDEX_METADATA } from '@/lib/seo/site';
import { contactHref, getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = {
  title: 'Back soon',
  ...NO_INDEX_METADATA,
};

type Props = {
  searchParams: Promise<{ next?: string | string[] }>;
};

/** The configured support address, or null. Never lets a storage outage take this page down. */
async function contactEmailSafe(): Promise<string | null> {
  try {
    return await getContactEmail();
  } catch {
    return null;
  }
}

export default async function MaintenancePage({ searchParams }: Props) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(rawNext);
  const email = await contactEmailSafe();

  return (
    <MinimalShell>
      <SystemStage>
        <NoticeCard
          width="wide"
          icon="tools"
          title="AcadeGrade is being updated"
          sentence="We're making some improvements and will be back shortly. Your saved records are not affected."
          foot={
            <>
              <p>
                Need something urgently?{' '}
                {email ? (
                  <InlineLink href={contactHref(email, 'During maintenance')}>Write to {email}</InlineLink>
                ) : (
                  <>
                    Visit <InlineLink href="/support">Support</InlineLink>
                  </>
                )}
              </p>
              <InlineLink href="/" className="inline-flex min-h-11 items-center">
                Go to the home page
              </InlineLink>
            </>
          }
        >
          <MaintenanceWatch next={next} place={returnPlaceLabel(next)} />
        </NoticeCard>
      </SystemStage>
    </MinimalShell>
  );
}

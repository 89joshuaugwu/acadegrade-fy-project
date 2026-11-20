import type { Metadata } from 'next';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { AuthLinkButton, InlineLink } from '@/components/site/auth/controls';
import { NoticeActions, NoticeCard, SystemStage, type NoticeIconName } from '@/components/site/system/NoticeCard';
import { normaliseImportCode, shareCodeLinkPath } from '../import-link';
import { CourseListCard } from './CourseList';
import { loadSharedCourseList } from './share-code';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Shared course list',
  description: 'A course list shared by a classmate on AcadeGrade.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

function StateCard({ icon, title, sentence, children }: { icon: NoticeIconName; title: string; sentence: string; children: React.ReactNode }) {
  return (
    <MinimalShell>
      <SystemStage>
        <NoticeCard icon={icon} title={title} sentence={sentence}>
          <NoticeActions>{children}</NoticeActions>
        </NoticeCard>
      </SystemStage>
    </MinimalShell>
  );
}

export default async function SharedCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await loadSharedCourseList(code);

  if (result.status === 'paused') {
    return (
      <StateCard icon="pause" title="Course sharing is paused" sentence="Sharing and importing course lists is switched off for a short while. Try this link again later.">
        <AuthLinkButton href="/">Back to AcadeGrade</AuthLinkButton>
      </StateCard>
    );
  }
  if (result.status === 'unavailable') {
    const normalised = normaliseImportCode(code);
    return (
      <StateCard icon="signal" title="We couldn't load this list" sentence="Something went wrong while reading the list. Check your connection and try the link again.">
        {/* A plain link, so the page is fetched again rather than served from the client cache. */}
        <AuthLinkButton href={normalised ? shareCodeLinkPath(normalised) : '/'} external>
          Try again
        </AuthLinkButton>
        <InlineLink href="/" className="inline-flex min-h-11 items-center justify-center">
          Back to AcadeGrade
        </InlineLink>
      </StateCard>
    );
  }
  if (result.status !== 'ok') {
    return (
      <StateCard icon="list" title="This code isn't available" sentence="It may have been typed wrongly, or your classmate may have stopped sharing it. Ask them to send it again.">
        <AuthLinkButton href="/">Back to AcadeGrade</AuthLinkButton>
      </StateCard>
    );
  }

  return <CourseListCard code={result.code} courses={result.courses} />;
}

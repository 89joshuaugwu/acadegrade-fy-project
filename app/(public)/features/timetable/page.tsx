import type { Metadata } from 'next';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { ClosingBand, PageHero, TextLinkV2, Trail } from '@/components/site/ui';
import { AuthAction } from '@/components/site/product/AuthAction';
import { FeatureFoot, GoldLink, JsonLd } from '@/components/site/product/shared';
import {
  BuildSection, LengthSection, RemindersSection, TT_OPEN, TT_PAUSED, TT_REGISTER, TimetableFaq, TimetableHeroPicture, WeekSection,
} from '@/components/site/product/timetable';
import { TIMETABLE_COPY, TIMETABLE_FAQ } from '@/lib/public/features-timetable';
import { breadcrumbJsonLd, productMetadata } from '@/lib/public/features-shared';

export const metadata: Metadata = productMetadata({
  title: TIMETABLE_COPY.title,
  description: TIMETABLE_COPY.description,
  path: '/features/timetable',
  keywords: [...TIMETABLE_COPY.keywords],
});

/**
 * /features/timetable, brand v2 (content: docs/public-redesign/pages/features-timetable.md).
 * The example week and reading plan are computed from lib/timetable/engine.ts
 * (a pure function), so the page cannot drift from the real rules. The
 * builder is rule-based and never called AI on this page.
 */
export default function TimetableFeaturePage() {
  return (
    <div className="ag-site">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Features', path: '/features' },
            { name: 'Timetable', path: '/features/timetable' },
          ]),
          faqPageJsonLd(TIMETABLE_FAQ),
        ]}
      />
      <PageHero
        titleId="timetable-title"
        trail={<Trail items={[{ label: 'Features', href: '/features' }, { label: 'Timetable' }]} />}
        title={`${TIMETABLE_COPY.h1[0]} ${TIMETABLE_COPY.h1[1]}`}
        sentence={TIMETABLE_COPY.sentence}
        actions={
          <>
            <AuthAction {...TT_REGISTER} signedIn={TT_OPEN} timetableOff={TT_PAUSED} size="lg" />
            <TextLinkV2 href="/app" onDark>
              Get the Android app
            </TextLinkV2>
          </>
        }
        aside={<TimetableHeroPicture />}
      />
      <WeekSection />
      <BuildSection />
      <LengthSection />
      <RemindersSection />
      <TimetableFaq />
      <FeatureFoot current="/features/timetable" />
      <ClosingBand
        title="Your lectures are already set. Put them in AcadeGrade."
        actions={
          <>
            <AuthAction {...TT_REGISTER} signedIn={TT_OPEN} timetableOff={TT_PAUSED} variant="night" size="lg" />
            <GoldLink href="/calculator">Try the calculator first</GoldLink>
          </>
        }
      />
    </div>
  );
}

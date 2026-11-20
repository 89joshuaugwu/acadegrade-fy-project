import type { Metadata } from 'next';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { ClosingBand, PageHero, buttonClass } from '@/components/site/ui';
import { AndroidHeroPhone, DownloadActions, InstallSection, IphoneSection, SafetyFaq, WhatTheAppAdds } from '@/components/site/product/android';
import { GoldLink, JsonLd } from '@/components/site/product/shared';
import { ANDROID_COPY, downloadName, safetyQa, softwareApplicationJsonLd } from '@/lib/public/features-android';
import { readAppRelease } from '@/lib/public/features-app-release';
import { productMetadata } from '@/lib/public/features-shared';

export const revalidate = 300;

export const metadata: Metadata = productMetadata({
  title: ANDROID_COPY.title,
  description: ANDROID_COPY.description,
  path: '/app',
  keywords: [...ANDROID_COPY.keywords],
});

/**
 * /app, brand v2: the Android download and install page
 * (content: docs/public-redesign/pages/android-app.md). It lives in the
 * public shell; the download routes stay in app/app/download/** (outside the
 * public layout). Size, version, the Play link and coins are live and
 * optional (config/settings.mobileAppLinks via getMobileAppLinksSafe,
 * config/mobileRelease, config/usage): a failed read leaves them out.
 */
export default async function AndroidAppPage() {
  const release = await readAppRelease();
  const qa = safetyQa(release);
  const bandHref = release.playUrl ?? release.apkHref;
  const bandName = release.playUrl ? 'Get AcadeGrade on Google Play (opens Google Play)' : downloadName(release);
  return (
    <div className="ag-site">
      <JsonLd data={[softwareApplicationJsonLd(release), faqPageJsonLd(qa)]} />
      <PageHero
        titleId="android-title"
        title={`${ANDROID_COPY.h1[0]} ${ANDROID_COPY.h1[1]}`}
        sentence={ANDROID_COPY.sentence}
        actions={<DownloadActions release={release} />}
        aside={<AndroidHeroPhone />}
      />
      <WhatTheAppAdds release={release} />
      <InstallSection release={release} />
      <SafetyFaq qa={qa} />
      <IphoneSection />
      <ClosingBand
        title="Your record, in your pocket. Free."
        actions={
          <>
            <a
              href={bandHref}
              aria-label={bandName}
              className={buttonClass('night', 'lg')}
              {...(release.playUrl ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {release.playUrl ? 'Get AcadeGrade on Google Play' : 'Download AcadeGrade'}
            </a>
            <GoldLink href="/register">Or start on the website</GoldLink>
          </>
        }
      />
    </div>
  );
}

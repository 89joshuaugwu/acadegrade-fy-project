import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import '@/components/site/site.css';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { Container, TextLinkV2 } from '@/components/site/ui';
import { AuthAction } from '@/components/site/product/AuthAction';
import { SafariShareSheet } from '@/components/site/product/ios';
import { IOS_COPY, iosRedirectTarget, iosSteps } from '@/lib/public/features-android';
import { productMetadata } from '@/lib/public/features-shared';
import { getMobileAppLinks } from '@/lib/mobile-app-links';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = productMetadata({
  title: IOS_COPY.title,
  description: IOS_COPY.description,
  path: '/app/download/ios',
});

async function readIosUrl(): Promise<string | null> {
  try {
    return iosRedirectTarget((await getMobileAppLinks()).iosUrl);
  } catch {
    // A Firestore outage never shows an error here: the honest iPhone page renders.
    return null;
  }
}

/**
 * /app/download/ios, brand v2 (content: docs/public-redesign/pages/download-ios.md).
 * Redirects to the admin's iOS link when one is set; otherwise the honest
 * iPhone page inside the minimal shell: the website works in Safari, add it
 * to the Home Screen. No "coming soon", no promise of an App Store app.
 */
export default async function IosDownloadPage() {
  const iosUrl = await readIosUrl();
  if (iosUrl) redirect(iosUrl);
  const steps = iosSteps();
  return (
    <MinimalShell>
      <div className="ag-site">
        <section aria-labelledby="iphone-title" className="ag-hero-sky ag-noise relative overflow-hidden text-white">
          <Container className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pb-24">
            <div className="max-w-2xl">
              <h1 id="iphone-title" className="ag-display ag-rise text-[2.5rem] font-bold leading-[1.03] sm:text-[3.5rem]">
                {IOS_COPY.h1[0]} {IOS_COPY.h1[1]}
              </h1>
              <p className="ag-rise ag-rise-2 mt-6 max-w-[36rem] text-[1.125rem] leading-relaxed text-ag-mist-night">{IOS_COPY.sentence}</p>

              <ol className="ag-rise ag-rise-3 mt-9 space-y-2">
                {steps.map((step, index) => (
                  <li key={step.step} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-4 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]">
                    <span className="ag-display ag-num grid h-9 w-9 place-items-center rounded-full bg-ag-gold text-[1rem] font-bold text-ag-night" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="text-[1.0625rem] font-semibold">{step.step}</span>
                    <span className="col-start-2 text-[0.875rem] text-ag-mist-night sm:col-start-auto sm:text-right">{step.pointer}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-ag-mist-night">
                Opened this inside WhatsApp or Instagram? Tap <span aria-hidden="true">···</span>
                <span className="sr-only">the More button</span> and choose Open in Safari first. On newer iPhones, Share may sit under the{' '}
                <span aria-hidden="true">···</span>
                <span className="sr-only">More</span> button.
              </p>
              <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-white/85">{IOS_COPY.reminder}</p>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <AuthAction href="/register" label="Create your free record" signedIn={{ href: '/dashboard', label: 'Open dashboard' }} size="lg" />
                <TextLinkV2 href="/login" onDark>
                  Sign in
                </TextLinkV2>
              </div>
              <p className="mt-6 text-[0.9375rem]">
                <TextLinkV2 href="/app" onDark>
                  Have an Android phone? Get the Android app
                </TextLinkV2>
              </p>
            </div>
            <div className="ag-rise ag-rise-3" aria-hidden="true">
              <SafariShareSheet />
            </div>
          </Container>
        </section>
      </div>
    </MinimalShell>
  );
}

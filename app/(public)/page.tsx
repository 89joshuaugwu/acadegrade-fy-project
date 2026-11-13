import Image from 'next/image';
import mobileShowcaseDark from '../../mobile-app-images/AcadeGrade App Dashboard Showcase.png';
import mobileShowcaseLight from '../../mobile-app-images/AcadeGrade App Dashboard Showcase-lightmode.png';
import mobileShowcaseDarkMobile from '../../mobile-app-images/AcadeGrade App Dashboard Showcase - mobile.png';
import mobileShowcaseLightMobile from '../../mobile-app-images/AcadeGrade App Dashboard Showcase-lightmode - mobile.png';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { AcademicProof, HomeFAQ, HomeHero, ProductStory, SmartAutomation } from '@/components/marketing';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';
import { LandingMotion } from '@/components/marketing/LandingMotion';
import { getContactEmail } from '@/lib/site/contact';

const showcaseAlt = 'AcadeGrade mobile showcase featuring result scanning, dashboard, transcript and profile screens';

export default async function LandingPage() {
  const contactEmail = await getContactEmail();
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <div id="hero-sentinel" className="pointer-events-none absolute top-0 h-px w-full" aria-hidden="true" />

      <LandingMotion>
      <main>
        <HomeHero />
        <AcademicProof />
        <SmartAutomation />
        <ProductStory />

        <section aria-labelledby="mobile-product-title" className="public-atmosphere-section text-[var(--acade-text)]">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
            <figure className="mobile-showcase relative isolate overflow-hidden rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] lg:min-h-[32rem]">
              <div className="mobile-showcase-stage relative aspect-[4/3] md:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto">
                <Image src={mobileShowcaseLight} alt={showcaseAlt} fill sizes="(max-width: 1023px) 1px, (max-width: 1200px) 100vw, 1200px" className="mobile-showcase-art mobile-showcase-art-desktop mobile-showcase-light z-0" />
                <Image src={mobileShowcaseDark} alt={showcaseAlt} fill sizes="(max-width: 1023px) 1px, (max-width: 1200px) 100vw, 1200px" className="mobile-showcase-art mobile-showcase-art-desktop mobile-showcase-dark z-0" />
                <Image src={mobileShowcaseLightMobile} alt={showcaseAlt} fill sizes="(max-width: 1023px) 100vw, 1px" className="mobile-showcase-art mobile-showcase-art-mobile mobile-showcase-light z-0" />
                <Image src={mobileShowcaseDarkMobile} alt={showcaseAlt} fill sizes="(max-width: 1023px) 100vw, 1px" className="mobile-showcase-art mobile-showcase-art-mobile mobile-showcase-dark z-0" />
                <div className="mobile-showcase-scrim absolute inset-0 z-10 hidden lg:block" aria-hidden="true" />
              </div>

              <div className="mobile-showcase-copy relative z-20 px-5 pb-8 pt-7 sm:px-8 lg:w-[46%] lg:pb-20 lg:pl-12 lg:pt-12" data-landing-motion="section">
                <h2
                  data-landing-motion="words"
                  id="mobile-product-title"
                  className="max-w-[19ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-[1.06] tracking-[-0.04em]"
                >
                  <span>Your academic record,</span>{' '}<span>ready when you are.</span>
                </h2>
                <p
                  data-landing-motion=""
                  style={{ '--landing-delay': '160ms' } as React.CSSProperties}
                  className="mt-4 max-w-[46ch] text-base leading-7 text-[var(--acade-text-muted)]"
                >
                  The AcadeGrade mobile app lets you review results, scan a result slip, check your trajectory and keep your unofficial transcript within reach.
                </p>
                <MobileAppDownload className="mt-6 flex-wrap justify-start [&>*]:shrink-0 [&>*]:whitespace-nowrap" />
              </div>

              <figcaption className="relative z-20 bg-[var(--acade-deep)] px-5 py-3 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)] sm:px-8 lg:absolute lg:inset-x-0 lg:bottom-0">Mobile interface showcase. Personal academic planning, not an official university record.</figcaption>
            </figure>
          </div>
        </section>

        <HomeFAQ />
      </main>
      </LandingMotion>

      <PublicFooter contactEmail={contactEmail} />
    </div>
  );
}

import Image from 'next/image';
import mobileShowcaseDark from '../../mobile-app-images/AcadeGrade App Dashboard Showcase.png';
import mobileShowcaseLight from '../../mobile-app-images/AcadeGrade App Dashboard Showcase-lightmode.png';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { AcademicProof, HomeFAQ, HomeHero, ProductStory, SmartAutomation } from '@/components/marketing';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';
import { LandingMotion } from '@/components/marketing/LandingMotion';

export default function LandingPage() {
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

        <section aria-labelledby="mobile-product-title" className="public-atmosphere-section border-y border-[var(--acade-border-subtle)] text-[var(--acade-text)]">
          <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
            <figure className="mobile-showcase relative isolate min-h-[38rem] overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)] md:min-h-[32rem]">
              <Image src={mobileShowcaseLight} alt="AcadeGrade mobile showcase featuring result scanning, dashboard, transcript and profile screens" fill priority={false} sizes="(max-width: 1200px) 100vw, 1200px" className="mobile-showcase-art mobile-showcase-light -z-20" />
              <Image src={mobileShowcaseDark} alt="AcadeGrade mobile showcase featuring result scanning, dashboard, transcript and profile screens" fill priority={false} sizes="(max-width: 1200px) 100vw, 1200px" className="mobile-showcase-art mobile-showcase-dark -z-20" />
              <div className="mobile-showcase-scrim absolute inset-0 -z-10" aria-hidden="true" />

              <div className="mobile-showcase-copy relative px-5 pb-24 pt-8 sm:px-8 md:w-[45%] md:py-10">
                <p className="text-sm font-semibold text-[var(--acade-primary)]">AcadeGrade for mobile</p>
                <h2 id="mobile-product-title" className="mt-2 max-w-[17ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-[1.06] tracking-[-0.04em]">
                  Your academic record, ready when you are.
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-6 text-[var(--acade-text-muted)] sm:text-base sm:leading-7">Review results, scan a result slip, check your trajectory and keep your unofficial transcript within reach.</p>
                <MobileAppDownload className="mt-5 flex-wrap justify-start [&>*]:shrink-0 [&>*]:whitespace-nowrap" />
              </div>

              <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--acade-border)] bg-[var(--acade-deep)]/94 px-4 py-3 text-xs text-[var(--acade-text-faint)] backdrop-blur-md sm:px-7">Mobile interface showcase. Personal academic planning, not an official university record.</figcaption>
            </figure>
          </div>
        </section>

        <HomeFAQ />
      </main>
      </LandingMotion>

      <PublicFooter />
    </div>
  );
}

import Image from 'next/image';
import mobileShowcaseDark from '../../mobile-app-images/AcadeGrade App Dashboard Showcase.png';
import mobileShowcaseLight from '../../mobile-app-images/AcadeGrade App Dashboard Showcase-lightmode.png';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { AcademicProof, HomeFAQ, HomeHero, ProductStory, SmartAutomation } from '@/components/marketing';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';

export default function LandingPage() {
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <div id="hero-sentinel" className="pointer-events-none absolute top-0 h-px w-full" aria-hidden="true" />

      <main>
        <HomeHero />
        <AcademicProof />
        <SmartAutomation />
        <ProductStory />

        <section aria-labelledby="mobile-product-title" className="public-atmosphere-section border-y border-[var(--acade-border-subtle)] text-[var(--acade-text)]">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-7 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="text-sm font-semibold text-[var(--acade-primary)]">AcadeGrade for mobile</p>
                <h2 id="mobile-product-title" className="mt-3 max-w-[14ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,4vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.04em]">
                  Your academic record, ready when you are.
                </h2>
              </div>
              <div className="lg:col-span-5">
                <p className="leading-7 text-[var(--acade-text-muted)]">Review results, scan a result slip, check your trajectory and keep your unofficial transcript within reach.</p>
                <MobileAppDownload className="mt-6 justify-start" />
              </div>
            </div>

            <figure className="mt-10 overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)]">
              <Image src={mobileShowcaseLight} alt="AcadeGrade mobile showcase featuring result scanning, dashboard, transcript and profile screens" sizes="(max-width: 1200px) 100vw, 1200px" className="h-auto w-full object-cover dark:hidden" />
              <Image src={mobileShowcaseDark} alt="" aria-hidden="true" sizes="(max-width: 1200px) 100vw, 1200px" className="hidden h-auto w-full object-cover dark:block" />
              <figcaption className="border-t border-[var(--acade-border)] px-5 py-4 text-xs text-[var(--acade-text-faint)] sm:px-7">Mobile interface showcase. Personal academic planning, not an official university record.</figcaption>
            </figure>
          </div>
        </section>

        <HomeFAQ />
      </main>

      <PublicFooter />
    </div>
  );
}

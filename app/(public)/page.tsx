import { Smartphone } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { AcademicProof, HomeFAQ, HomeHero, ProductStory, SmartAutomation } from '@/components/marketing';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--acade-void)] text-[var(--acade-text)]">
      <Navbar />
      <div id="hero-sentinel" className="pointer-events-none absolute top-0 h-px w-full" aria-hidden="true" />

      <main>
        <HomeHero />
        <AcademicProof />
        <SmartAutomation />
        <ProductStory />

        <section aria-labelledby="mobile-product-title" className="border-b border-[var(--acade-border-subtle)]">
          <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid gap-7 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                <Smartphone size={23} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-primary)]">AcadeGrade for Android</p>
                <h2 id="mobile-product-title" className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
                  Keep your academic record within reach.
                </h2>
                <p className="mt-2 max-w-2xl leading-7 text-[var(--acade-text-muted)]">
                  Review results, record courses, and check your progress from the same account on mobile and web.
                </p>
              </div>
              <MobileAppDownload />
            </div>
          </div>
        </section>

        <HomeFAQ />
      </main>

      <PublicFooter />
    </div>
  );
}

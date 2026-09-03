import { redirect } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import { getMobileAppLinks } from '@/lib/mobile-app-links';

export const dynamic = 'force-dynamic';

export default async function IosDownloadPage() {
  const { iosUrl } = await getMobileAppLinks();
  if (iosUrl) redirect(iosUrl);

  return (
    <main className="min-h-screen bg-[var(--acade-void)] px-5 flex items-center justify-center text-center">
      <section className="max-w-md rounded-3xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-8 shadow-2xl shadow-black/15">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[var(--acade-primary)]/12 text-[var(--acade-primary)]">
          <Smartphone size={27} />
        </div>
        <p className="text-[length:var(--text-xs)] font-bold tracking-[0.14em] text-[var(--acade-primary)] uppercase">AcadeGrade mobile</p>
        <h1 className="mt-2 text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">iOS is coming soon</h1>
        <p className="mt-3 text-[length:var(--text-base)] leading-6 text-[var(--acade-text-muted)]">We are preparing the AcadeGrade iPhone experience. Please check back soon.</p>
        <a href="/app/download/android" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--acade-primary)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--acade-primary-hover)]">Download Android instead</a>
      </section>
    </main>
  );
}

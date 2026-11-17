import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Calculator, Home } from 'lucide-react';
import { Logo } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/** Shown for any URL that does not exist. Next.js sends the 404 status itself. */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--acade-void)] flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <div className="size-20 bg-[var(--acade-primary)]/10 rounded-full flex items-center justify-center mb-6">
        <Compass size={40} className="text-[var(--acade-primary)]" aria-hidden="true" />
      </div>

      <p className="text-[length:var(--text-sm)] font-semibold tracking-widest text-[var(--acade-primary)] mb-2">
        ERROR 404
      </p>
      <h1 className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
        We can&apos;t find that page
      </h1>

      <p className="text-[length:var(--text-lg)] text-[var(--acade-text-muted)] max-w-md mb-8">
        The link may be mistyped or the page may have moved. Your results are safe; nothing was changed.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-none sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--acade-primary)] text-white font-bold hover:bg-[var(--acade-primary-glow)] transition-colors"
        >
          <Home size={18} aria-hidden="true" /> Go to home
        </Link>
        <Link
          href="/calculator"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[var(--acade-border)] text-[var(--acade-text)] font-bold hover:bg-[var(--acade-overlay)]/20 transition-colors"
        >
          <Calculator size={18} aria-hidden="true" /> Open the calculator
        </Link>
      </div>

      <p className="mt-8 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
        Already have an account?{' '}
        <Link href="/dashboard" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">
          Go to your dashboard
        </Link>
      </p>
    </main>
  );
}

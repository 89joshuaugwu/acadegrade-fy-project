import Link from 'next/link';
import type { ReactNode } from 'react';
import { featureFoot, type FeaturePageHref } from '@/lib/public/features-shared';
import { serializeJsonLd } from '@/lib/seo/site';
import { AcadeGradeMark } from '@/components/public/Logo';
import { Container } from '@/components/site/ui';

/**
 * Brand v2 pieces shared by the product pages (/features, the three feature
 * pages, /app and the iPhone page). Server-safe.
 */

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

/** One line for each feature page, used by the "Next feature" card. */
const NEXT_LINE: Record<FeaturePageHref, string> = {
  '/features/result-scanner': 'Photograph your slip or paste your portal page, then check every row before it is saved.',
  '/features/ai-insights': 'A written analysis of your semesters, a forecast of your CGPA and what-if answers in plain English.',
  '/features/timetable': 'Lectures, reading and exams in one week, with reminders on your Android phone.',
};

/** "Next feature: …" and the other features, at the foot of each feature page (before the gold close). */
export function FeatureFoot({ current }: { current: FeaturePageHref }) {
  const { next, others } = featureFoot(current);
  return (
    <div className="bg-white pb-20 pt-4 sm:pb-24">
      <Container>
        <nav aria-label="More features" className="grid grid-cols-[minmax(0,1fr)] gap-8 border-t border-ag-ink/10 pt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Link
              href={next.href}
              className="ag-focus ag-display inline-block rounded text-[1.75rem] font-bold leading-tight text-ag-ink underline decoration-ag-violet/30 decoration-[3px] underline-offset-[8px] transition hover:decoration-ag-violet sm:text-[2.25rem]"
            >
              Next feature: {next.label}
            </Link>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist">{NEXT_LINE[next.href as FeaturePageHref]}</p>
          </div>
          <div className="lg:justify-self-end">
            <p className="text-[0.9375rem] font-semibold text-ag-ink">Other features</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="ag-focus inline-flex min-h-10 items-center rounded-full bg-ag-haze px-4 text-[0.9375rem] font-semibold text-ag-ink transition hover:bg-ag-violet/10 hover:text-ag-violet">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </Container>
    </div>
  );
}

/** A text link on the gold closing band (night ink; violet would fail contrast on gold). */
export function GoldLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="ag-focus rounded text-[1rem] font-semibold text-ag-night underline decoration-ag-night/30 underline-offset-[6px] hover:decoration-ag-night">
      {children}
    </Link>
  );
}

/** Small facts in a row (each its own chip, so no separator characters). */
export function FactChips({ items, onDark = false, className = '' }: { items: readonly string[]; onDark?: boolean; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${onDark ? 'bg-white/10 text-white' : 'bg-ag-haze text-ag-ink'}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- UI cards */

/**
 * A white product card that floats over a photo or a dark ground (real UI
 * built in HTML, with the example student's numbers). Radius 20px.
 */
export function UiCard({ children, className = '', float = false }: { children: ReactNode; className?: string; float?: boolean }) {
  return (
    <div
      className={`rounded-[20px] bg-white p-5 text-ag-ink ring-1 ring-ag-ink/5 ${
        float ? 'shadow-[0_24px_60px_-18px_rgba(14,11,43,0.55)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** The card's head: the mark (or another icon), a title and a quiet second line. */
export function UiCardHead({ title, sub, icon, aside }: { title: ReactNode; sub?: ReactNode; icon?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon === undefined ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ag-haze">
          <AcadeGradeMark size={22} />
        </span>
      ) : (
        icon
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold leading-snug text-ag-ink">{title}</p>
        {sub ? <p className="mt-0.5 text-[0.8125rem] text-ag-mist">{sub}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** A grade in a small round pill, gold for A, coral for F. */
export function GradePill({ grade, className = '' }: { grade: string; className?: string }) {
  const tone = grade === 'A' ? 'bg-ag-gold text-ag-night' : grade === 'F' ? 'bg-[#FFE1DC] text-[#C2361F]' : 'bg-ag-haze text-ag-violet';
  return <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold ${tone} ${className}`}>{grade}</span>;
}

/** A button drawn inside a picture of the product (not interactive). */
export function FakeButton({ children, quiet = false, className = '' }: { children: ReactNode; quiet?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[0.875rem] font-semibold ${
        quiet ? 'bg-ag-haze text-ag-ink' : 'bg-ag-violet text-white'
      } ${className}`}
    >
      {children}
    </span>
  );
}

/** The Android notification a reminder arrives as. */
export function NotificationCard({ title, body, when = 'now', className = '' }: { title: string; body: string; when?: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-[20px] bg-white/95 p-4 text-ag-ink shadow-[0_24px_60px_-18px_rgba(14,11,43,0.6)] ring-1 ring-ag-ink/5 backdrop-blur ${className}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ag-night">
        <AcadeGradeMark size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3 text-[0.8125rem] text-ag-mist">
          <span>AcadeGrade</span>
          <span>{when}</span>
        </span>
        <span className="mt-0.5 block text-[0.9375rem] font-semibold leading-snug">{title}</span>
        <span className="block text-[0.875rem] leading-snug text-ag-mist">{body}</span>
      </span>
    </div>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import heroStudentDashboard from '../../../mobile-app-images/heroimage2.png';
import ocrScreen from '../../../mobile-app-images/ocr page.jpeg';
import transcriptScreen from '../../../mobile-app-images/transcrip-page.jpeg';
import { EditorialHero, ProductCta, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Academic tracking features',
  description: 'Explore AcadeGrade features for result tracking, CGPA and PI analysis, result-slip scanning, transcripts, forecasts, and AI-assisted academic insights.',
  path: '/features',
  keywords: ['student result tracker', 'academic performance tracker', 'CGPA tracker', 'AI academic insights'],
});

type Capability = {
  id: string;
  label: string;
  title: string;
  description: string;
  detail: string;
  href?: string;
  linkLabel?: string;
  media: React.ReactNode;
};

const recordRows = [
  { code: 'GST 111', units: 2, score: 63, grade: 'B' },
  { code: 'MAT 111', units: 3, score: 61, grade: 'B' },
  { code: 'GST 113', units: 2, score: 82, grade: 'A' },
  { code: 'ICH 111', units: 3, score: 51, grade: 'C' },
] as const;

const gradeTone: Record<string, string> = {
  A: 'text-[var(--grade-a)]',
  B: 'text-[var(--grade-b)]',
  C: 'text-[var(--grade-c)]',
};

function RecordFragment() {
  return (
    <div data-ui="" className="w-full max-w-[30rem] rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-5 ring-1 ring-[var(--acade-border)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-semibold">100L First Semester</p>
        <p className="text-sm text-[var(--acade-text-muted)]">2022/2023</p>
      </div>
      <table className="mt-4 w-full text-left text-sm">
        <caption className="sr-only">Illustrative semester record</caption>
        <thead className="text-[0.8125rem] text-[var(--acade-text-muted)]">
          <tr><th scope="col" className="pb-2 font-semibold">Course</th><th scope="col" className="pb-2 text-right font-semibold">Units</th><th scope="col" className="pb-2 text-right font-semibold">Score</th><th scope="col" className="pb-2 text-right font-semibold">Grade</th></tr>
        </thead>
        <tbody className="divide-y divide-[var(--acade-border-subtle)] font-[family-name:var(--font-geist-mono)] tabular-nums">
          {recordRows.map((row) => (
            <tr key={row.code}>
              <td className="py-2.5 font-semibold">{row.code}</td>
              <td className="py-2.5 text-right">{row.units}</td>
              <td className="py-2.5 text-right">{row.score}</td>
              <td className={`py-2.5 text-right font-semibold ${gradeTone[row.grade]}`}>{row.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[0.8125rem] text-[var(--acade-text-muted)]">Illustrative record · scores, units and session kept together</p>
    </div>
  );
}

function StandingFragment() {
  return (
    <div data-ui="" className="w-full max-w-[30rem] rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-5 ring-1 ring-[var(--acade-border)] sm:p-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] p-4">
          <p className="text-sm font-semibold text-[var(--acade-text)]">CGPA</p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-semibold tabular-nums">3.71</p>
        </div>
        <div className="rounded-[var(--radius-control)] bg-[var(--acade-gold-dim)] p-4">
          <p className="text-sm font-semibold text-[var(--acade-gold)]">PI</p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-semibold tabular-nums text-[var(--acade-gold)]">3.04</p>
        </div>
      </div>
      <svg viewBox="0 0 400 110" role="img" aria-label="Illustrative CGPA and PI trend across six semesters" className="mt-5 h-auto w-full">
        <path d="M8 62 L80 64 L152 72 L224 68 L296 50 L392 30" fill="none" stroke="var(--chart-cgpa)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 84 L80 84 L152 90 L224 86 L296 76 L392 80" fill="none" stroke="var(--chart-pi)" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-[var(--acade-text-muted)]">
        <span>Second Class Upper · 117 credits</span>
        <span>Illustrative</span>
      </div>
    </div>
  );
}

function ScreenFragment({ src, alt }: { src: typeof ocrScreen; alt: string }) {
  return (
    <div className="feature-row-media mx-auto w-full max-w-[19rem]">
      <Image src={src} alt={alt} width={562} height={1280} sizes="(max-width: 1024px) 70vw, 304px" className="h-auto w-full rounded-t-[1.5rem]" />
    </div>
  );
}

function InsightFragment() {
  return (
    <div data-ui="" className="w-full max-w-[30rem] rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-5 ring-1 ring-[var(--acade-border)] sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/acadegradeailogo.png" alt="AcadeMind" width={28} height={28} className="size-7 object-contain" />
        <p className="font-semibold">AcadeMind <span className="font-normal text-[var(--acade-text-muted)]">· what-if</span></p>
      </div>
      <p className="mt-5 font-[family-name:var(--font-bricolage)] text-xl font-semibold leading-snug tracking-[-0.01em]">
        To reach 4.00 by your final semester, you would need about 4.63 in each of the next three.
      </p>
      <p className="mt-4 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Illustrative scenario: 3.71 after 117 credits, then three 18-credit semesters. Forecasts are estimates, not guaranteed outcomes.</p>
    </div>
  );
}

const capabilities: Capability[] = [
  {
    id: 'record',
    label: 'Record',
    title: 'A structured home for every semester',
    description: 'Keep course scores, letter grades, credit units, sessions, and semester status together in one readable timeline.',
    detail: 'Manual entry · flexible score modes · semester context',
    media: <RecordFragment />,
  },
  {
    id: 'understand',
    label: 'Understand',
    title: 'CGPA and PI, read together',
    description: 'See grade-point progress beside raw-score performance so a single average never tells the whole story.',
    detail: 'CGPA · Performance Index · degree class · trends',
    media: <StandingFragment />,
  },
  {
    id: 'scan',
    label: 'Save time',
    title: 'Reviewable result-slip scanning',
    description: 'Extract course details from an image or PDF, check every value, and decide what enters your record.',
    detail: 'Image and PDF input · editable extraction · explicit save',
    href: '/features/result-scanner',
    linkLabel: 'How the result scanner works',
    media: <ScreenFragment src={ocrScreen} alt="AcadeGrade AI Result Import screen with a camera frame for a result slip" />,
  },
  {
    id: 'plan',
    label: 'Plan',
    title: 'AcadeMind insights grounded in your record',
    description: 'Explore trend explanations, risk signals, forecasts, and what-if scenarios without presenting them as official advice.',
    detail: 'Trend context · forecasts · what-if planning',
    href: '/features/ai-insights',
    linkLabel: 'How AcadeMind insights work',
    media: <InsightFragment />,
  },
  {
    id: 'present',
    label: 'Present',
    title: 'Transcripts ready to export and share',
    description: 'Generate an unofficial transcript, download a useful copy, or create a private link that you can revoke when it is no longer needed.',
    detail: 'PDF and HTML export · private share links · revocable access',
    media: <ScreenFragment src={transcriptScreen} alt="AcadeGrade unofficial transcript screen listing 100L first-semester courses with credits, CA, exam scores and grades" />,
  },
];

export default function FeaturesPage() {
  return (
    <PublicPage>
      <EditorialHero
        title="One record. A clearer degree journey."
        description="AcadeGrade brings your semester results, calculations, scans, and planning tools into a private workspace designed for how university progress actually unfolds."
        primary={{ href: '/register', label: 'Start your academic record' }}
        secondary={{ href: '/calculator', label: 'Try the free calculator' }}
        aside={<FeatureHeroArt />}
      />

      <section aria-labelledby="workspace-title" className="mx-auto grid max-w-[1200px] gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-12 lg:items-end lg:px-8">
        <div className="lg:col-span-7">
        <SectionIntro
          id="workspace-title"
          title="Useful at the moment you need it."
          description="Begin with the basics, then unlock more context as your academic history grows. Every layer remains understandable on its own."
        />
        </div>
        <nav aria-label="Feature index" className="lg:col-span-5">
          <ul className="flex flex-wrap gap-2 lg:justify-end">
            {capabilities.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="marketing-press inline-flex min-h-11 items-center rounded-full bg-[var(--acade-surface)] px-4 text-[0.9375rem] font-medium text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 pb-12 pt-8 sm:px-6 lg:gap-8 lg:px-8">
        {capabilities.map((item, index) => {
          const isScreen = item.id === 'scan' || item.id === 'present';
          return (
            <article
              key={item.id}
              id={item.id}
              aria-labelledby={`${item.id}-title`}
              data-landing-motion="section"
              className="feature-row grid scroll-mt-28 items-center gap-8 overflow-hidden rounded-[var(--radius-dialog)] bg-[var(--acade-deep)] p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14"
            >
              <div className={index % 2 === 1 ? 'lg:order-2 lg:col-span-5' : 'lg:col-span-5'}>
                <h2 id={`${item.id}-title`} className="text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.5rem,2.8vw,2.375rem)] font-bold leading-[1.1] tracking-[-0.035em]">{item.title}</h2>
                <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">{item.description}</p>
                <p className="mt-5 text-[0.9375rem] leading-6 text-[var(--acade-text)]">{item.detail}</p>
                {item.href ? (
                  <Link href={item.href} className="group mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline">
                    {item.linkLabel}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              <div
                className={[
                  'flex min-w-0 justify-center rounded-[var(--radius-surface)] bg-[var(--acade-primary-dim)] lg:col-span-7',
                  isScreen ? 'max-h-[26rem] overflow-hidden px-6 pt-8 sm:max-h-[30rem] sm:pt-10' : 'p-5 sm:p-10',
                  index % 2 === 1 ? 'lg:order-1' : '',
                ].join(' ')}
              >
                {item.media}
              </div>
            </article>
          );
        })}
      </div>

      <section aria-labelledby="privacy-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <ShieldCheck size={28} className="text-[var(--acade-success)]" aria-hidden="true" />
            <h2 id="privacy-title" className="mt-5 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.06] tracking-[-0.04em]">Your record stays yours.</h2>
          </div>
          <div className="grid gap-6 text-[1.0625rem] leading-8 text-[var(--acade-text-muted)] sm:grid-cols-2 lg:col-span-7">
            <p>AcadeGrade is a personal tracking workspace. Your academic data is connected to your account and is not a replacement for your institution&apos;s official transcript.</p>
            <p>Scanning and AI-assisted tools keep you in control: review extracted values before saving and treat generated guidance as context, not an academic decision.</p>
          </div>
        </div>
      </section>

      <ProductCta />
    </PublicPage>
  );
}

function FeatureHeroArt() {
  return (
    <figure className="relative mx-auto aspect-[6/7] w-full max-w-[26rem] overflow-hidden">
      <div className="absolute inset-x-[4%] bottom-0 top-[16%] rounded-t-full bg-[var(--acade-primary-dim)]" aria-hidden="true" />
      <Image
        src={heroStudentDashboard}
        alt="A student holding a phone that shows the AcadeGrade dashboard with CGPA, credits and recent grades"
        fill
        loading="eager"
        sizes="(max-width: 1023px) min(90vw, 26rem), 26rem"
        className="object-contain object-bottom"
      />
    </figure>
  );
}

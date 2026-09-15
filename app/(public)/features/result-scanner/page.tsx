import type { Metadata } from 'next';
import { Check, FileCheck2, FileImage, PencilLine, ScanLine, ShieldCheck } from 'lucide-react';
import { CheckList, EditorialHero, ProductCta, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Result Scanner — OCR course extraction',
  description: 'Turn an image or PDF result slip into editable course rows. Review every extracted value before saving it to your AcadeGrade record.',
  path: '/features/result-scanner',
  keywords: ['result scanner', 'OCR result slip', 'scan university result', 'extract course grades'],
});

const steps = [
  { icon: FileImage, number: '01', title: 'Choose your source', text: 'Upload an image or PDF result slip from your device.' },
  { icon: ScanLine, number: '02', title: 'Let the scanner structure it', text: 'AcadeGrade identifies likely course codes, titles, units, and scores.' },
  { icon: PencilLine, number: '03', title: 'Review every row', text: 'Correct uncertain values, remove unwanted rows, and confirm the semester context.' },
  { icon: FileCheck2, number: '04', title: 'Save when it is right', text: 'Nothing becomes part of your academic record until you approve it.' },
] as const;

export default function ResultScannerPage() {
  return (
    <PublicPage>
      <EditorialHero
        eyebrow="Result scanner"
        title="Move from result slip to editable record."
        description="AcadeGrade uses optical character recognition to reduce repetitive typing while keeping the final decision in your hands."
        primary={{ href: '/register', label: 'Create your workspace' }}
        secondary={{ href: '/features', label: 'View all features' }}
        aside={<ScannerPreview />}
      />

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="A controlled import"
          title="Four steps, with a human check before save."
          description="OCR is most useful when it accelerates entry without pretending imperfect documents are perfectly readable."
        />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-border)] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, number, title, text }) => (
            <li key={number} className="bg-[var(--acade-surface)] p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <Icon className="size-6 text-[var(--acade-primary)]" aria-hidden="true" />
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">{number}</span>
              </div>
              <h2 className="mt-10 text-lg font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-start lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--acade-primary)]">Designed for real documents</p>
            <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Faster entry without blind trust.</h2>
            <p className="mt-5 leading-7 text-[var(--acade-text-muted)]">Document quality, layout, handwriting, shadows, and compression can affect extraction. The review stage is a core part of the feature, not an afterthought.</p>
          </div>
          <CheckList items={[
            'Works with supported image and PDF result slips.',
            'Highlights extracted course information in editable rows.',
            'Lets you correct, add, or remove courses before saving.',
            'Keeps the original academic record under your control.',
          ]} />
        </div>
      </section>

      <ProductCta title="Spend less time retyping results." description="Create your record, scan a supported result slip, review the extraction, and save only what you confirm." />
    </PublicPage>
  );
}

function ScannerPreview() {
  const rows = [
    ['CSC 415', '2 units', '74'],
    ['CSC 463', '2 units', '68'],
    ['CSC 455', '3 units', '71'],
  ];

  return (
    <figure className="overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--acade-border-subtle)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]"><ScanLine size={18} aria-hidden="true" /></span>
          <div><p className="text-sm font-bold">Extraction review</p><p className="text-xs text-[var(--acade-text-faint)]">3 course rows found</p></div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--acade-success-dim)] px-2.5 py-1 text-xs font-bold text-[var(--acade-success)]"><Check size={13} aria-hidden="true" /> Ready</span>
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        {rows.map(([code, units, score]) => (
          <div key={code} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] px-4 py-3">
            <div><p className="text-sm font-bold">{code}</p><p className="mt-0.5 text-xs text-[var(--acade-text-faint)]">{units}</p></div>
            <span className="rounded-lg bg-[var(--acade-primary-dim)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-primary)]">{score}</span>
          </div>
        ))}
      </div>
      <figcaption className="flex gap-3 border-t border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] px-5 py-4 text-xs leading-5 text-[var(--acade-text-muted)]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--acade-success)]" aria-hidden="true" /> Illustrative review. Confirm extracted values against your result slip.
      </figcaption>
    </figure>
  );
}

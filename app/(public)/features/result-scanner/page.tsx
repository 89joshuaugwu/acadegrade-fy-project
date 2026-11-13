import type { Metadata } from 'next';
import Image from 'next/image';
import { FileCheck2, FileImage, PencilLine, ScanLine } from 'lucide-react';
import heroStudentScanner from '../../../../mobile-app-images/heroimage3.png';
import { CheckList, EditorialHero, ProductCta, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Result Scanner — OCR course extraction',
  description: 'Turn an image or PDF result slip into editable course rows. Review every extracted value before saving it to your AcadeGrade record.',
  path: '/features/result-scanner',
  keywords: ['result scanner', 'OCR result slip', 'scan university result', 'extract course grades'],
});

const steps = [
  { icon: FileImage, title: 'Choose your source', text: 'Upload an image or PDF result slip from your device.' },
  { icon: ScanLine, title: 'Let the scanner structure it', text: 'AcadeGrade identifies likely course codes, titles, units, and scores.' },
  { icon: PencilLine, title: 'Review every row', text: 'Correct uncertain values, remove unwanted rows, and confirm the semester context.' },
  { icon: FileCheck2, title: 'Save when it is right', text: 'Nothing becomes part of your academic record until you approve it.' },
] as const;

const stepTones = [
  'story-segment--record',
  'story-segment--understand',
  'story-segment--understand',
  'story-segment--plan',
] as const;

export default function ResultScannerPage() {
  return (
    <PublicPage>
      <EditorialHero
        trail={[{ href: '/features', label: 'Features' }]}
        crumb="Result scanner"
        title="Move from result slip to editable record."
        description="AcadeGrade uses optical character recognition to reduce repetitive typing while keeping the final decision in your hands."
        primary={{ href: '/register', label: 'Create your workspace' }}
        secondary={{ href: '/features', label: 'View all features' }}
        aside={<ScannerHeroArt />}
      />

      <section aria-labelledby="scanner-steps-title" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28">
        <SectionIntro
          id="scanner-steps-title"
          title="Four steps, with a human check before save."
          description="OCR is most useful when it accelerates entry without pretending imperfect documents are perfectly readable."
        />
        <ol aria-label="Result scanner steps" className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-1.5">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="min-w-0">
              <div
                aria-hidden="true"
                className={`flex h-14 items-end rounded-[var(--radius-surface)] px-5 py-4 sm:h-24 sm:p-5 ${stepTones[index]}`}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="mt-5 font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-[-0.02em]">{title}</h3>
              <p className="mt-2 max-w-[32ch] leading-7 text-[var(--acade-text-muted)]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="real-documents-title" className="bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-16 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            <h2 id="real-documents-title" className="text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.06] tracking-[-0.04em]">Faster entry without blind trust.</h2>
            <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">Document quality, layout, handwriting, shadows, and compression can affect extraction. The review stage is a core part of the feature, not an afterthought.</p>
          </div>
          <div className="lg:col-span-6">
            <CheckList items={[
              'Works with supported image and PDF result slips.',
              'Highlights extracted course information in editable rows.',
              'Lets you correct, add, or remove courses before saving.',
              'Keeps the original academic record under your control.',
            ]} />
          </div>
        </div>
      </section>

      <ProductCta title="Spend less time retyping results." description="Create your record, scan a supported result slip, review the extraction, and save only what you confirm." />
    </PublicPage>
  );
}

function ScannerHeroArt() {
  return (
    <figure className="relative mx-auto aspect-[4/5] w-full max-w-[26rem] overflow-hidden">
      <div className="absolute inset-x-[4%] bottom-0 top-[16%] rounded-t-full bg-[var(--acade-primary-dim)]" aria-hidden="true" />
      <Image
        src={heroStudentScanner}
        alt="A student holding a phone on the AcadeGrade AI Result Import screen next to a printed course registration slip"
        fill
        loading="eager"
        sizes="(max-width: 1023px) min(90vw, 26rem), 26rem"
        className="object-contain object-bottom"
      />
      <figcaption className="sr-only">Illustrative scene. Always confirm extracted values against your result slip.</figcaption>
    </figure>
  );
}

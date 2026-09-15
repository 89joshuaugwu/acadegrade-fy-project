import Image from 'next/image';
import { ArrowRight, ScanLine } from 'lucide-react';
import ocrScreen from '../../mobile-app-images/ocr page.jpeg';
import { LinkButton } from '@/components/ui';

const captureSteps = [
  { marker: '01 · CAPTURE', detail: 'Photograph or upload the result.' },
  { marker: '02 · REVIEW', detail: 'Confirm every extracted field.' },
  { marker: '03 · SAVE', detail: 'Add the verified draft to your record.' },
] as const;

export function SmartAutomation() {
  return (
    <>
      <section aria-labelledby="ocr-title" className="public-atmosphere-section border-b border-[var(--acade-border-subtle)]">
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold text-[var(--acade-primary)]">OCR-assisted result capture</p>
          <h2 id="ocr-title" className="mx-auto mt-3 max-w-[17ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,4vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.04em]">
            Turn a result slip into fields you can review.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-[var(--acade-text-muted)]">
            Scan an image or select a document. AcadeGrade prepares a draft, then leaves the final check and save decision with you.
          </p>

          <div className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-overlay)] px-5 pb-0 pt-8 shadow-[var(--shadow-card)] sm:px-10 sm:pt-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--acade-primary)]" aria-hidden="true" />
            <Image src={ocrScreen} alt="AcadeGrade AI Result Import screen with camera alignment frame and upload options" width={562} height={1280} sizes="(max-width: 768px) 85vw, 520px" className="mx-auto max-h-[660px] w-auto max-w-full rounded-t-[var(--radius-dialog)] border-x border-t border-[var(--acade-border)] object-contain shadow-[0_20px_50px_rgba(20,24,39,.12)]" />
          </div>

          <ol aria-label="OCR result capture workflow" className="mx-auto mt-6 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            {captureSteps.map((step) => (
              <li key={step.marker} className="rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] bg-[var(--acade-void)] p-4">
                <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-primary)]">{step.marker}</p>
                <p className="mt-1 text-sm text-[var(--acade-text-muted)]">{step.detail}</p>
              </li>
            ))}
          </ol>

          <LinkButton href="/features/result-scanner" className="group mt-8">
            <ScanLine className="size-4" aria-hidden="true" />
            Explore result scanner
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </LinkButton>
          <p className="mt-4 text-xs text-[var(--acade-text-faint)]">Always review extracted details before saving them to your record.</p>
        </div>
      </section>

      <section aria-labelledby="ai-title" className="public-atmosphere-section border-b border-[var(--acade-border-subtle)]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:px-8">
          <div className="lg:col-span-5">
            <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)]">
              <Image src="/acadegradeailogo.png" alt="AcadeMind" width={24} height={24} className="size-6 object-contain" />
            </span>
            <p className="mt-6 text-sm font-semibold text-[var(--acade-primary)]">AcadeMind insights</p>
            <h2 id="ai-title" className="mt-2 max-w-[14ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.035em]">
              Ask better questions about what comes next.
            </h2>
            <p className="mt-5 max-w-[48ch] leading-7 text-[var(--acade-text-muted)]">
              Use the academic history already in your workspace to explore trend explanations, course priorities and what-if scenarios—without presenting guidance as an official decision.
            </p>
          </div>

          <div className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7 lg:col-span-7">
            <div className="grid gap-5 sm:grid-cols-[.8fr_1.2fr]">
              <div className="academic-ledger-rules rounded-[var(--radius-surface)] border border-[var(--acade-border-subtle)] p-5">
                <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-text-faint)]">ACADEMIC SIGNALS</p>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-[var(--acade-text-muted)]">Direction</dt><dd className="font-semibold text-[var(--acade-success)]">Improving</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[var(--acade-text-muted)]">Highest leverage</dt><dd className="font-semibold">3-credit courses</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[var(--acade-text-muted)]">Confidence</dt><dd className="font-semibold">Record-based</dd></div>
                </dl>
              </div>
              <blockquote className="academic-margin-note rounded-[var(--radius-surface)] bg-[var(--acade-primary-dim)] p-5 pl-6">
                <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-primary)]">MARGIN NOTE · EXAMPLE</p>
                <p className="mt-4 font-[family-name:var(--font-bricolage)] text-xl font-semibold leading-8 tracking-[-0.02em]">“Your recent performance is improving. Compare the credit weight of your remaining courses before setting the next CGPA target.”</p>
                <footer className="mt-5 text-xs leading-5 text-[var(--acade-text-muted)]">AI-generated guidance · verify against your programme requirements.</footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

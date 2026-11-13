import Image from 'next/image';
import { ArrowRight, ScanLine } from 'lucide-react';
import ocrScreen from '../../mobile-app-images/ocr page.jpeg';
import { LinkButton } from '@/components/ui';

const captureSteps = [
  { title: 'Capture', detail: 'Photograph or upload the result.' },
  { title: 'Review', detail: 'Confirm every extracted field.' },
  { title: 'Save', detail: 'Add the verified draft to your record.' },
] as const;

const signals = [
  { label: 'Direction', value: 'Improving', tone: 'text-[var(--acade-success)]' },
  { label: 'Highest leverage', value: '3-credit courses', tone: '' },
  { label: 'Confidence', value: 'Record-based', tone: '' },
] as const;

export function SmartAutomation() {
  return (
    <>
      <section aria-labelledby="ocr-title" className="public-atmosphere-section">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-32">
          <div className="lg:order-2 lg:col-span-6">
            <h2
              id="ocr-title"
              data-landing-motion="heading"
              className="max-w-[17ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2.125rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em]"
            >
              Turn a result slip into fields you can review.
            </h2>
            <p data-landing-motion="" style={{ '--landing-delay': '90ms' } as React.CSSProperties} className="mt-5 max-w-[50ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
              Scan an image or select a document. AcadeGrade prepares a draft, then leaves the final check and save decision with you.
            </p>

            <ol aria-label="OCR result capture workflow" className="capture-steps mt-8 grid gap-5">
              {captureSteps.map((step, index) => (
                <li
                  key={step.title}
                  data-landing-motion="capture"
                  data-landing-order={index}
                  className="capture-step grid grid-cols-[auto_1fr] items-baseline gap-4"
                >
                  <span className="capture-step-marker" aria-hidden="true" />
                  <p className="text-[1.0625rem] leading-7">
                    <span className="font-semibold text-[var(--acade-text)]">{step.title}.</span>{' '}
                    <span className="text-[var(--acade-text-muted)]">{step.detail}</span>
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-9 flex flex-col items-start gap-3">
              <LinkButton href="/features/result-scanner" className="marketing-press group">
                <ScanLine className="size-4" aria-hidden="true" />
                Explore result scanner
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </LinkButton>
              <p className="text-sm text-[var(--acade-text-muted)]">Always review extracted details before saving them to your record.</p>
            </div>
          </div>

          <figure data-landing-motion="section" className="ocr-stage relative overflow-hidden rounded-[var(--radius-dialog)] bg-[var(--acade-primary-dim)] px-6 pt-10 sm:px-12 sm:pt-14 lg:order-1 lg:col-span-6">
            <Image
              src={ocrScreen}
              alt="AcadeGrade AI Result Import screen with camera alignment frame and upload options"
              width={562}
              height={1280}
              sizes="(max-width: 768px) 80vw, 380px"
              className="ocr-stage-shot mx-auto h-auto w-full max-w-[22rem] rounded-t-[1.75rem]"
            />
          </figure>
        </div>
      </section>

      <section aria-labelledby="ai-title" className="public-atmosphere-section">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
          <div className="lg:col-span-6">
            <h2
              id="ai-title"
              data-landing-motion="heading"
              className="max-w-[22ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em]"
            >
              Ask better questions about what comes next.
            </h2>
            <p data-landing-motion="" style={{ '--landing-delay': '90ms' } as React.CSSProperties} className="mt-5 max-w-[50ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
              AcadeMind uses the academic history already in your workspace to explore trend explanations, course priorities and what-if scenarios, without presenting guidance as an official decision.
            </p>
            <LinkButton href="/features/ai-insights" variant="outline" className="marketing-press group mt-8">
              How AcadeMind insights work
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </LinkButton>
          </div>

          <div data-ui="" data-landing-motion="section" className="rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-5 ring-1 ring-[var(--acade-border)] sm:p-7 lg:col-span-6">
            <div className="flex items-center gap-3">
              <Image src="/acadegradeailogo.png" alt="" width={28} height={28} className="size-7 object-contain" />
              <p className="font-semibold">AcadeMind <span className="font-normal text-[var(--acade-text-muted)]">· example insight</span></p>
            </div>
            <blockquote className="mt-6">
              <p data-landing-motion="note" className="font-[family-name:var(--font-bricolage)] text-lg font-semibold leading-[1.45] tracking-[-0.01em] sm:text-2xl sm:leading-[1.4]">
                “Your recent performance is improving. Compare the credit weight of your remaining courses before setting the next CGPA target.”
              </p>
              <footer className="mt-4 text-sm leading-6 text-[var(--acade-text-muted)]">AI-generated guidance · verify against your programme requirements.</footer>
            </blockquote>
            <dl className="mt-6 grid gap-2 sm:grid-cols-3">
              {signals.map((signal) => (
                <div key={signal.label} className="rounded-[var(--radius-control)] bg-[var(--acade-overlay)] px-4 py-3">
                  <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">{signal.label}</dt>
                  <dd className={`mt-1 font-semibold ${signal.tone}`}>{signal.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

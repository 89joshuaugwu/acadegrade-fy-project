import { ArrowRight, BrainCircuit, Check, FileImage, ScanText, Sparkles } from 'lucide-react';
import { LinkButton } from '@/components/ui';

export function SmartAutomation() {
  return (
    <section aria-labelledby="smart-tools-title" className="border-b border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-7 border-b border-[var(--acade-border)] pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-sm font-semibold text-[var(--acade-primary)]">Less manual work. Better questions.</p>
            <h2 id="smart-tools-title" className="mt-3 max-w-[15ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              Intelligence where it actually helps.
            </h2>
          </div>
          <p className="max-w-[48ch] text-base leading-7 text-[var(--acade-text-muted)] lg:col-span-4">
            AcadeGrade combines assisted result capture with academic analysis, while keeping you in control of the record and every final decision.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div aria-hidden="true" className="absolute right-0 top-0 size-36 translate-x-12 -translate-y-12 rounded-full border-[18px] border-[var(--acade-primary-dim)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                  <ScanText size={23} aria-hidden="true" />
                </span>
                <span className="rounded-full border border-[var(--acade-border)] px-3 py-1.5 text-xs font-semibold text-[var(--acade-text-muted)]">OCR-assisted import</span>
              </div>
              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">From document to draft</p>
              <h3 className="mt-3 max-w-[18ch] font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight sm:text-3xl">
                Review the extracted courses before saving.
              </h3>
              <p className="mt-4 max-w-xl leading-7 text-[var(--acade-text-muted)]">
                Upload an image or PDF result slip and AcadeGrade prepares course and score fields for review—reducing repetitive entry without silently changing your record.
              </p>

              <div className="mt-8 grid grid-cols-[auto_1fr] gap-4 rounded-[var(--radius-surface)] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] p-4">
                <FileImage className="mt-0.5 text-[var(--acade-primary)]" size={20} aria-hidden="true" />
                <div className="space-y-3">
                  {['Upload result slip', 'Check extracted details', 'Save when everything is correct'].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-sm font-medium text-[var(--acade-text-muted)]">
                      <Check className="size-4 text-[var(--acade-success)]" aria-hidden="true" /> {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-primary-dim)] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary)] text-[var(--acade-on-primary)]">
                <BrainCircuit size={23} aria-hidden="true" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--acade-primary)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--acade-primary)]">
                <Sparkles size={14} aria-hidden="true" /> AcadeMind insights
              </span>
            </div>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">From numbers to direction</p>
            <h3 className="mt-3 max-w-[19ch] font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight sm:text-3xl">
              Ask better questions about what comes next.
            </h3>
            <p className="mt-4 max-w-xl leading-7 text-[var(--acade-text-muted)]">
              Explore trend explanations, risk signals, degree outlooks, and what-if guidance using the academic history already in your workspace.
            </p>

            <blockquote className="mt-8 rounded-[var(--radius-surface)] border border-[var(--acade-primary)]/20 bg-[var(--acade-surface)] p-5">
              <p className="text-sm leading-6 text-[var(--acade-text)]">
                “Your recent trajectory is improving. Compare the credit weight of your remaining courses before setting the next target.”
              </p>
              <footer className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4 text-xs text-[var(--acade-text-muted)]">
                Example guidance, not an official academic decision.
              </footer>
            </blockquote>
          </article>
        </div>

        <div className="mt-8 flex justify-end">
          <LinkButton href="/register" variant="outline" className="group">
            Explore AcadeGrade
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

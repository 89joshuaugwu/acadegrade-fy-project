import { AcadeGradeMark } from '@/components/public/Logo';
import { InlineLink } from '@/components/site/auth/controls';

/** A quiet "what made this" note under the record. No button, no sign-up push. Never printed. */
export function VisitorStub() {
  return (
    <aside aria-labelledby="visitor-title" className="ag-print-hide flex flex-col gap-4 rounded-[24px] bg-white/60 p-6 ring-1 ring-ag-ink/[0.06] sm:flex-row sm:items-start sm:gap-5 sm:p-7">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ag-night">
        <AcadeGradeMark size={30} />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="visitor-title" className="ag-display text-[1.25rem] font-bold text-ag-ink">
          Made with AcadeGrade
        </h2>
        <p className="max-w-[40rem] text-[0.9375rem] leading-relaxed text-ag-mist">
          Nigerian university students use AcadeGrade to work out their GPA, CGPA and degree class from their result slips, and to share records
          like this one. It&apos;s free.
        </p>
        <p>
          <InlineLink href="/" className="inline-flex min-h-11 items-center text-[0.9375rem]">
            What is AcadeGrade?
          </InlineLink>
        </p>
      </div>
    </aside>
  );
}

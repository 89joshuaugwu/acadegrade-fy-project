import type { ReactNode } from 'react';

/**
 * The working behind a figure, printed like a receipt with the visitor's own
 * numbers: description, dotted leader, value; the final line of each group
 * is the night bar with the sum. Server-safe.
 */

export interface ReceiptLine {
  label: ReactNode;
  value: ReactNode;
  /** Visually hidden text after the label ("Your class"). */
  note?: string;
  /** Print this line as the night bar. */
  inverted?: boolean;
}

export interface ReceiptGroup {
  name?: string;
  lines: readonly ReceiptLine[];
}

export function ReceiptRows({ groups }: { groups: readonly ReceiptGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.name ? <p className="mb-2 text-[0.875rem] font-semibold text-ag-violet">{group.name}</p> : null}
          <dl className="space-y-1.5">
            {group.lines.map((line, index) =>
              line.inverted ? (
                <div key={index} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ag-night px-4 py-3 text-white">
                  <dt className="ag-num min-w-0 text-[0.9375rem] font-semibold">
                    {line.label}
                    {line.note ? <span className="sr-only"> ({line.note})</span> : null}
                  </dt>
                  <dd className="ag-num shrink-0 text-[0.9375rem] font-semibold text-ag-gold">{line.value}</dd>
                </div>
              ) : (
                <div key={index} className="flex items-end text-[0.9375rem] leading-snug">
                  <dt className="ag-num min-w-0 text-ag-ink">
                    {line.label}
                    {line.note ? <span className="sr-only"> ({line.note})</span> : null}
                  </dt>
                  <span className="ag-leader" aria-hidden="true" />
                  <dd className="ag-num shrink-0 text-right font-semibold text-ag-ink">{line.value}</dd>
                </div>
              ),
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** The receipt card: a white card on haze (or haze on white) with a title. */
export function ReceiptCard({
  title,
  titleId,
  meta,
  children,
  tone = 'white',
  className = '',
}: {
  title: ReactNode;
  titleId?: string;
  meta?: ReactNode;
  children: ReactNode;
  tone?: 'white' | 'haze';
  className?: string;
}) {
  return (
    <div className={`rounded-[24px] p-6 sm:p-8 ${tone === 'haze' ? 'bg-ag-haze' : 'bg-white ring-1 ring-ag-ink/[0.06]'} ${className}`} data-ui="">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-ag-ink/15 pb-4">
        <h3 id={titleId} className="ag-display text-[1.375rem] font-bold leading-tight text-ag-ink">
          {title}
        </h3>
        {meta ? <p className="text-[0.8125rem] text-ag-mist">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}

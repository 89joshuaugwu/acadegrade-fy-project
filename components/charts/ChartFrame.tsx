import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChartLegendItem {
  label: string;
  colour: string;
  lineStyle?: 'solid' | 'dashed';
}

export interface ChartFrameProps {
  title: string;
  period?: string;
  summary: string;
  legend?: ChartLegendItem[];
  controls?: React.ReactNode;
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
}

export function ChartFrame({
  title,
  period,
  summary,
  legend = [],
  controls,
  children,
  table,
  className,
}: ChartFrameProps) {
  const id = useId();
  return (
    <figure
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-summary`}
      className={cn(
        'rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] md:p-6',
        className
      )}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-[var(--acade-text)]">{title}</h2>
          {period && <p className="mt-1 text-xs text-[var(--acade-text-faint)]">{period}</p>}
        </div>
        {controls}
      </figcaption>
      <p id={`${id}-summary`} className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">{summary}</p>
      {legend.length > 0 && (
        <ul aria-label="Chart legend" className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs font-medium text-[var(--acade-text-muted)]">
              <span
                aria-hidden="true"
                className="w-7 border-t-2"
                style={{ borderColor: item.colour, borderStyle: item.lineStyle === 'dashed' ? 'dashed' : 'solid' }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 min-h-60 md:min-h-[280px]">{children}</div>
      {table && <div className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5">{table}</div>}
    </figure>
  );
}

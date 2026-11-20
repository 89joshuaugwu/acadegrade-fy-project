'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MISREAD_CODE, PLATE_COPY, plateFallbackLine, plateFigures, plateRows, type PlateRow } from '@/lib/public/features-scanner';
import { buttonClass } from '@/components/site/ui';
import { GradePill } from './shared';

/**
 * The one live thing on the scanner page: the rows a scan returns, with
 * GST 311 misread as 1 unit. "Change it to 2" fixes it and the GPA corrects
 * itself (4.17 to 4.15, PI 3.32 to 3.30), computed with the real engine.
 * Nothing is saved or sent. Without JavaScript the card shows the checked
 * rows and a line saying what the scan read.
 */

type RowsState = 'as-read' | 'checked';

const toNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

interface DraftRow extends Omit<PlateRow, 'units' | 'ca' | 'exam'> {
  units: string;
  ca: string;
  exam: string;
}

const draft = (state: RowsState): DraftRow[] =>
  plateRows(state).map((row) => ({ ...row, units: String(row.units), ca: String(row.ca), exam: String(row.exam) }));

const FIELD_NAME = { units: 'Units', ca: 'CA', exam: 'Exam' } as const;

export function CheckRows() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<RowsState>('checked');
  const [rows, setRows] = useState<DraftRow[]>(() => draft('checked'));
  const [announce, setAnnounce] = useState('');
  const misreadRef = useRef<HTMLInputElement>(null);
  const tabsId = useId();

  // Start "as read" once scripts run; the server shows the checked rows.
  useEffect(() => {
    setHydrated(true);
    setState('as-read');
    setRows(draft('as-read'));
  }, []);

  const figures = plateFigures(rows.map((row) => ({ ...row, units: toNumber(row.units) ?? 0, ca: toNumber(row.ca), exam: toNumber(row.exam) })));

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => setAnnounce(`GPA ${figures.gpa} over ${figures.units} units`), 500);
    return () => window.clearTimeout(timer);
  }, [figures.gpa, figures.units, hydrated]);

  const show = (next: RowsState) => {
    setState(next);
    setRows(draft(next));
  };

  const edit = (index: number, field: 'units' | 'ca' | 'exam', value: string) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const tabs: { id: RowsState; label: string }[] = [
    { id: 'as-read', label: PLATE_COPY.tabs.asRead },
    { id: 'checked', label: PLATE_COPY.tabs.checked },
  ];

  return (
    <div className="flex h-full flex-col rounded-[24px] bg-white p-5 text-ag-ink ring-1 ring-ag-ink/5 sm:p-7">
      <div role="tablist" aria-label="Rows" className="grid grid-cols-2 gap-1 rounded-xl bg-ag-haze p-1 text-center text-[0.9375rem] font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tabsId}-${tab.id}`}
            aria-selected={state === tab.id}
            aria-controls={`${tabsId}-panel`}
            tabIndex={state === tab.id ? 0 : -1}
            className={`ag-focus min-h-11 rounded-lg px-3 transition ${state === tab.id ? 'bg-white text-ag-ink shadow-sm' : 'text-ag-mist hover:text-ag-ink'}`}
            onClick={() => show(tab.id)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              const next = tab.id === 'as-read' ? 'checked' : 'as-read';
              show(next);
              document.getElementById(`${tabsId}-${next}`)?.focus();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${state}`} className="mt-5 min-w-0">
        <table className="w-full border-separate border-spacing-y-1.5 text-left">
          <caption className="sr-only">Course rows to check</caption>
          <thead>
            <tr className="text-[0.8125rem] text-ag-mist">
              <th scope="col" className="font-medium">Code</th>
              <th scope="col" className="w-12 text-center font-medium sm:w-16">Units</th>
              <th scope="col" className="w-12 text-center font-medium sm:w-16">CA</th>
              <th scope="col" className="w-12 text-center font-medium sm:w-16">Exam</th>
              <th scope="col" className="w-10 text-right font-medium sm:w-12">Total</th>
              <th scope="col" className="w-10 text-right font-medium sm:w-12">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const misread = row.code === MISREAD_CODE && state === 'as-read';
              return (
                <tr key={row.code}>
                  <th scope="row" className="pr-2 text-left text-[0.875rem] font-semibold sm:text-[0.9375rem]">
                    <span className="whitespace-nowrap">{row.code}</span>
                    <span className="sr-only"> {row.title}</span>
                  </th>
                  {(['units', 'ca', 'exam'] as const).map((field) => (
                    <td key={field} className="px-0.5 sm:px-1">
                      <input
                        ref={row.code === MISREAD_CODE && field === 'units' ? misreadRef : undefined}
                        className={`ag-num block h-10 w-full rounded-lg bg-white text-center text-[0.9375rem] ring-1 transition focus:outline-none focus:ring-2 focus:ring-ag-violet disabled:opacity-100 ${
                          misread && field === 'units' ? 'bg-ag-gold/20 font-semibold ring-ag-gold' : 'ring-ag-ink/15'
                        }`}
                        inputMode="numeric"
                        value={row[field]}
                        onChange={(event) => edit(index, field, event.target.value)}
                        aria-label={`${FIELD_NAME[field]} for ${row.code} ${row.title}`}
                        disabled={!hydrated}
                      />
                    </td>
                  ))}
                  <td className="ag-num text-right text-[0.9375rem]">{figures.rows[index].total ?? '–'}</td>
                  <td className="text-right">
                    <GradePill grade={figures.rows[index].grade} className="ml-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-2xl bg-ag-haze px-4 py-3">
          <span className="ag-num text-[0.9375rem] text-ag-mist">{figures.units} units</span>
          <span className="ag-display ag-num text-[1.5rem] font-bold">GPA {figures.gpa}</span>
          <span className="ag-display ag-num text-[1.5rem] font-bold text-ag-violet">PI {figures.pi}</span>
        </p>
        {hydrated ? null : <p className="mt-3 text-[0.875rem] text-ag-mist">{plateFallbackLine()}</p>}
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 pt-1 lg:mt-auto">
        <button
          type="button"
          className={buttonClass('night')}
          onClick={() => {
            // Fix only the misread field; any other edits stay.
            setState('checked');
            setRows((current) => current.map((row) => (row.code === MISREAD_CODE ? { ...row, units: '2' } : row)));
            window.requestAnimationFrame(() => misreadRef.current?.focus());
          }}
          disabled={!hydrated}
        >
          {PLATE_COPY.apply}
        </button>
        <button
          type="button"
          className="ag-focus rounded text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet disabled:opacity-60"
          onClick={() => show('as-read')}
          disabled={!hydrated}
        >
          {PLATE_COPY.reset}
        </button>
      </div>
    </div>
  );
}

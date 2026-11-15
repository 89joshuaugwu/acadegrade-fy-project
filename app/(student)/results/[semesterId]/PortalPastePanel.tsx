'use client';

import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { parsePortalText } from '@/lib/import/portalText';
import type { CourseInput } from '@/types/course';
import { mapPortalRow } from './import-mapping';

/**
 * A11: paste text copied from a university results page. Rule-based, not AI, so
 * it is open to every student. Rows go to the table for review; nothing is saved.
 */
export function PortalPastePanel({ onImport }: { onImport: (rows: CourseInput[]) => void }) {
  const [text, setText] = useState('');
  const fieldId = useId();
  const parsed = useMemo(() => parsePortalText(text), [text]);
  const hasText = text.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={fieldId} className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">
          Paste your results text
        </label>
        <p className="mt-1 text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
          Copy the course list from your school portal and paste it here. One course per line, for example &quot;CSC 201 Data Structures 3 68 B&quot;. Nothing is saved until you review the courses and save the semester.
        </p>
        <textarea
          id={fieldId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          spellCheck={false}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-3 font-[family-name:var(--font-geist-mono)] text-sm text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
        />
      </div>

      {hasText && (
        <div role="status" aria-live="polite" className="rounded-[var(--radius-control)] bg-[var(--acade-overlay)] p-3 text-sm">
          <p className="font-semibold text-[var(--acade-text)]">
            {parsed.rows.length === 0
              ? 'No courses found yet'
              : `${parsed.rows.length} course${parsed.rows.length === 1 ? '' : 's'} found`}
          </p>
          {parsed.rows.length > 0 && (
            <ul className="mt-2 grid gap-1 text-[var(--acade-text-muted)]">
              {parsed.rows.map((row, index) => (
                <li key={`${row.code}-${index}`}>
                  <span className="font-semibold text-[var(--acade-text)]">{row.code}</span>
                  {row.title ? ` ${row.title}` : ''} · {row.units} unit{row.units === 1 ? '' : 's'}
                  {row.totalScore !== undefined ? ` · ${row.totalScore}` : ''}
                  {row.grade ? ` · ${row.grade}` : ''}
                </li>
              ))}
            </ul>
          )}
          {parsed.unparsed.length > 0 && (
            <div className="mt-3">
              <p className="font-semibold text-[var(--acade-warning)]">
                {parsed.unparsed.length} line{parsed.unparsed.length === 1 ? '' : 's'} could not be read
              </p>
              <ul className="mt-1 grid gap-1 text-[var(--acade-text-muted)]">
                {parsed.unparsed.slice(0, 10).map((line, index) => (
                  <li key={`${index}-${line}`} className="break-words font-[family-name:var(--font-geist-mono)] text-xs">{line}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-[var(--acade-text-muted)]">Add these by hand after importing.</p>
            </div>
          )}
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        disabled={parsed.rows.length === 0}
        onClick={() => onImport(parsed.rows.map(mapPortalRow))}
      >
        {parsed.rows.length > 0
          ? `Add ${parsed.rows.length} course${parsed.rows.length === 1 ? '' : 's'} for review`
          : 'Add courses for review'}
      </Button>
    </div>
  );
}

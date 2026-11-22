'use client';

import Link from 'next/link';
import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/admin/ui/Panel';
import { TableFrame, tableClass } from '@/components/admin/ui/TableFrame';
import type { CatalogKind } from '@/lib/academic-catalog/model';

export type TypedNameRow = { kind: CatalogKind; name: string; normalizedName: string; count: number };
type Students = { state: 'loading' } | { state: 'error' } | { state: 'ready'; students: { uid: string; displayName: string }[]; total: number };

const KIND_NAMES: Record<CatalogKind, string> = { university: 'University', department: 'Department', programme: 'Programme' };
const PAGE = 25;
export const typedRowKey = (row: Pick<TypedNameRow, 'kind' | 'normalizedName'>) => `typed:${row.kind}:${row.normalizedName}`;

/**
 * "Names typed by students": profile values that are not catalogue names or
 * aliases, with counts. Students are listed only on request (display names).
 */
export function TypedNamesPanel({ rows, scanned, truncated, loading, error, onRetry, busyKey, assignKey, assignSlot, onAssign, onAdd, onIgnore, loadStudents }: {
  rows: TypedNameRow[];
  scanned: number;
  truncated: boolean;
  loading: boolean;
  error: string;
  onRetry: () => void;
  busyKey: string | null;
  assignKey: string | null;
  assignSlot: ReactNode;
  onAssign: (row: TypedNameRow) => void;
  onAdd: (row: TypedNameRow) => void;
  onIgnore: (row: TypedNameRow) => void;
  loadStudents: (row: TypedNameRow) => Promise<{ students: { uid: string; displayName: string }[]; total: number }>;
}) {
  const [shown, setShown] = useState(PAGE);
  const [students, setStudents] = useState<Record<string, Students>>({});

  async function toggleStudents(row: TypedNameRow) {
    const key = typedRowKey(row);
    if (students[key]) {
      setStudents(({ [key]: _closed, ...rest }) => rest);
      return;
    }
    setStudents((current) => ({ ...current, [key]: { state: 'loading' } }));
    try {
      const result = await loadStudents(row);
      setStudents((current) => ({ ...current, [key]: { state: 'ready', ...result } }));
    } catch {
      setStudents((current) => ({ ...current, [key]: { state: 'error' } }));
    }
  }

  const description = 'Names on student profiles that match no catalogue name or alias. Assign one to fix every profile that uses it.';
  const visible = rows.slice(0, shown);

  return (
    <Panel title="Names typed by students" description={description} padded={false}>
      <div className="px-5 pb-5 sm:px-6">
        {error ? (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] border border-[color-mix(in_srgb,var(--acade-danger)_30%,transparent)] bg-[var(--acade-danger-dim)] px-4 py-3 text-sm text-[var(--acade-danger)]">
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={onRetry} className="min-h-11 cursor-pointer rounded-[10px] px-2 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">Try again</button>
          </div>
        ) : null}
        {loading ? (
          <p role="status" className="py-6 text-sm text-[var(--acade-text-muted)]">Checking student profiles…</p>
        ) : !error && rows.length === 0 ? (
          <p className="py-6 text-sm text-[var(--acade-text-muted)]">Every name on the {scanned} profiles checked is in the catalogue.</p>
        ) : rows.length > 0 ? (
          <>
            <p className="mt-2 mb-3 text-[0.8125rem] text-[var(--acade-text-muted)]">
              {rows.length} name{rows.length === 1 ? '' : 's'} from {scanned} profiles{truncated ? ' (the first profiles only; fix these and check again for more)' : ''}.
            </p>
            <TableFrame minWidth="720px">
              <table className={tableClass} aria-label="Names typed by students">
                <thead>
                  <tr>
                    <th scope="col">Name typed</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="ag-right">Students</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const key = typedRowKey(row);
                    const list = students[key];
                    const busy = busyKey === key;
                    return (
                      <Fragment key={key}>
                        <tr>
                          <td className="max-w-[22rem] break-words font-semibold">{row.name}</td>
                          <td className="text-[var(--acade-text-muted)]">{KIND_NAMES[row.kind]}</td>
                          <td className="ag-right">
                            <button
                              type="button"
                              aria-label={`${list ? 'Hide' : 'Show'} students for ${row.name}`}
                              aria-expanded={Boolean(list)}
                              onClick={() => void toggleStudents(row)}
                              className="min-h-10 cursor-pointer rounded-[10px] px-2 font-semibold tabular-nums text-[var(--acade-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"
                            >
                              {row.count}
                            </button>
                          </td>
                          <td>
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" aria-label={`Assign ${row.name}`} disabled={Boolean(busyKey)} onClick={() => onAssign(row)}>Assign</Button>
                              <Button variant="outline" size="sm" aria-label={`Add ${row.name} as a new entry`} disabled={Boolean(busyKey)} loading={busy} loadingLabel="Adding…" onClick={() => onAdd(row)}>Add as new entry</Button>
                              <Button variant="ghost" size="sm" aria-label={`Ignore ${row.name}`} disabled={Boolean(busyKey)} onClick={() => onIgnore(row)}>Ignore</Button>
                            </div>
                          </td>
                        </tr>
                        {list ? (
                          <tr>
                            <td colSpan={4} className="bg-[var(--acade-overlay)] text-sm">
                              {list.state === 'loading' ? <span role="status" className="text-[var(--acade-text-muted)]">Loading students…</span>
                                : list.state === 'error' ? <span role="alert" className="text-[var(--acade-danger)]">Could not load the students. Close and try again.</span>
                                : (
                                  <span className="leading-7">
                                    {list.students.map((student, index) => (
                                      <Fragment key={student.uid}>
                                        {index > 0 ? ', ' : ''}
                                        <Link href={`/admin/users?uid=${encodeURIComponent(student.uid)}`} className="font-medium text-[var(--acade-primary)] underline underline-offset-2">{student.displayName}</Link>
                                      </Fragment>
                                    ))}
                                    {list.total > list.students.length ? ` and ${list.total - list.students.length} more` : ''}
                                  </span>
                                )}
                            </td>
                          </tr>
                        ) : null}
                        {assignKey === key ? (
                          <tr>
                            <td colSpan={4}>{assignSlot}</td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </TableFrame>
            {rows.length > shown ? (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setShown((count) => count + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more</Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Panel>
  );
}

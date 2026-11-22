'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/admin/ui/Checkbox';
import { suggestProgrammeSplit } from '@/lib/academic-catalog/split';
import type { CatalogEntry, CatalogKind } from '@/lib/academic-catalog/model';
import { EntryPicker } from './EntryPicker';

export type AssignTarget = { key: string; kind: CatalogKind; name: string; suggestionId?: string; count?: number };
export type AssignRequest =
  ({ suggestionId: string } | { kind: CatalogKind; name: string })
  & { entryId: string; departmentEntryId?: string; updateAll: boolean };

const KIND_LABEL: Record<CatalogKind, string> = { university: 'University', department: 'Department', programme: 'Programme' };

/**
 * Inline "Assign" form: point a typed name at an existing catalogue entry. A
 * programme can also carry a department ("B.Sc Computer Science"), pre-filled when
 * both are found. "Update every other student" is on by default.
 */
export function AssignPanel({ target, entries, busy, error, onSubmit, onCancel }: {
  target: AssignTarget;
  entries: readonly CatalogEntry[];
  busy: boolean;
  error?: string;
  onSubmit: (request: AssignRequest) => void;
  onCancel: () => void;
}) {
  const active = useMemo(() => entries.filter((entry) => entry.status === 'active'), [entries]);
  const ofKind = useMemo(() => active.filter((entry) => entry.kind === target.kind), [active, target.kind]);
  const departments = useMemo(() => active.filter((entry) => entry.kind === 'department'), [active]);
  const split = useMemo(() => (target.kind === 'programme' ? suggestProgrammeSplit(target.name, active) : {}), [target, active]);
  const [entryId, setEntryId] = useState<string | null>(split.programmeId ?? null);
  const [departmentId, setDepartmentId] = useState<string | null>(split.departmentId ?? null);
  const [updateAll, setUpdateAll] = useState(true);
  const chosen = ofKind.find((entry) => entry.id === entryId);
  const kindLabel = KIND_LABEL[target.kind];

  function submit() {
    if (!entryId) return;
    const source = target.suggestionId ? { suggestionId: target.suggestionId } : { kind: target.kind, name: target.name };
    onSubmit({ ...source, entryId, ...(target.kind === 'programme' && departmentId ? { departmentEntryId: departmentId } : {}), updateAll });
  }

  const othersLine = typeof target.count === 'number'
    ? `${target.count} profile${target.count === 1 ? '' : 's'} have this name, compared ignoring case and spacing.`
    : 'Compared ignoring case and spacing. Each student gets a short inbox message.';

  return (
    <div role="group" aria-label={`Assign “${target.name}”`} className="space-y-4 rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] p-4 sm:p-5">
      <div>
        <h3 className="ag-admin-h2 text-base">Assign “{target.name}”</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
          Choose the listed {kindLabel.toLowerCase()} this name means. The name is kept as an alias so the pickers find it next time.
        </p>
      </div>
      <div className={target.kind === 'programme' ? 'grid gap-4 md:grid-cols-2' : ''}>
        <EntryPicker
          label={`${kindLabel} in the catalogue`}
          entries={ofKind}
          value={entryId}
          onChange={setEntryId}
          placeholder={`Search ${kindLabel.toLowerCase()} names or short names`}
        />
        {target.kind === 'programme' ? (
          <EntryPicker
            label="Department (optional)"
            hint="Set when the name also holds a department. Only fills a blank department; a different one is left alone."
            entries={departments}
            value={departmentId}
            onChange={setDepartmentId}
            placeholder="Search departments"
          />
        ) : null}
      </div>
      <Checkbox
        checked={updateAll}
        onChange={(event) => setUpdateAll(event.target.checked)}
        label="Also update every other student who typed this name"
        description={othersLine}
      />
      {error ? <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!chosen} loading={busy} loadingLabel="Assigning…" onClick={submit}>Assign</Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

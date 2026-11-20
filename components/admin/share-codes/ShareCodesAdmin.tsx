'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatusChip } from '@/components/admin/StatusChip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/shared';
import { AdminSelect, optionsFrom } from '@/components/admin/ui/AdminSelect';

export interface AdminShareCode {
  code: string;
  useCount: number;
  disabled: boolean;
  disabledReason: string | null;
  promotedAt: string | null;
  createdAt: string | null;
  authorId: string | null;
  courseCount: number;
  courses: { code: string; title: string; units: number }[];
}

type Dialog = { kind: 'disable' | 'enable' | 'promote'; row: AdminShareCode } | null;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown');

/** Admin > Share codes: the most used course-list codes, with disable, enable and promote to the catalogue (G7). */
export function ShareCodesAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminShareCode[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('100');
  const [semester, setSemester] = useState('1');
  const [busy, setBusy] = useState(false);

  const token = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const load = useCallback(async (cursor?: string) => {
    if (!user) return;
    if (cursor) setLoadingMore(true); else { setLoading(true); setError(null); }
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/admin/share-codes?${params.toString()}`, { headers: { Authorization: `Bearer ${await token()}` } });
      if (!response.ok) throw new Error('list');
      const body = await response.json() as { codes?: AdminShareCode[]; nextCursor?: string | null };
      const list = Array.isArray(body.codes) ? body.codes : [];
      setRows((current) => (cursor ? [...current, ...list.filter((row) => !current.some((item) => item.code === row.code))] : list));
      setNextCursor(body.nextCursor ?? null);
    } catch {
      if (cursor) toast.error('More codes could not be loaded.');
      else setError('Share codes did not load. Nothing was changed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, user]);

  useEffect(() => { void load(); }, [load]);

  const close = () => { if (!busy) { setDialog(null); setReason(''); } };
  const open = (kind: 'disable' | 'enable' | 'promote', row: AdminShareCode) => { setDialog({ kind, row }); setReason(''); };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog || busy) return;
    setBusy(true);
    try {
      const payload = dialog.kind === 'promote'
        ? { action: 'promote', code: dialog.row.code, reason: reason.trim(), department: department.trim(), level: Number(level), semester: Number(semester) }
        : { action: dialog.kind, code: dialog.row.code, reason: reason.trim() };
      const response = await fetch('/api/admin/share-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; promoted?: number; skipped?: number };
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The code was not updated.');
      if (dialog.kind === 'promote') {
        toast.success(`${body.promoted ?? 0} added to the catalogue, ${body.skipped ?? 0} already there.`);
        await load();
      } else {
        const disabled = dialog.kind === 'disable';
        setRows((current) => current.map((row) => (row.code === dialog.row.code ? { ...row, disabled, disabledReason: disabled ? reason.trim() : null } : row)));
        toast.success(disabled ? 'Code disabled.' : 'Code enabled.');
      }
      setDialog(null);
      setReason('');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The code was not updated.');
    } finally {
      setBusy(false);
    }
  }

  const title = dialog?.kind === 'disable' ? `Disable ${dialog.row.code}?` : dialog?.kind === 'enable' ? `Enable ${dialog?.row.code}?` : `Add ${dialog?.row.code} to the catalogue`;
  const reasonValid = reason.trim().length >= 3;
  const promoteValid = dialog?.kind !== 'promote' || department.trim().length > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Share codes"
        description="Course lists students share with a 6-character code, most used first. Disable a bad one, or add a checked list to the academic catalogue."
        helpId="admin.share-codes"
      />

      {error ? (
        <ErrorState title="Share codes could not be loaded" description={error} onRetry={() => { void load(); }} />
      ) : loading ? (
        <div role="status" aria-label="Loading share codes" className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-16" />)}</div>
      ) : rows.length === 0 ? (
        <p role="status" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-10 text-center text-sm text-[var(--acade-text-muted)]">No share codes yet.</p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
            {rows.map((row) => (
              <li key={row.code} className="border-b border-[var(--acade-border-subtle)] px-4 py-3 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-[var(--acade-text)]">{row.code}</p>
                    <p className="text-xs text-[var(--acade-text-muted)]">{row.useCount} {row.useCount === 1 ? 'use' : 'uses'}, {row.courseCount} courses, made {when(row.createdAt)}{row.promotedAt ? `, added to the catalogue ${when(row.promotedAt)}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip state={row.disabled ? 'problem' : 'verified'} detail={row.disabled ? 'disabled' : undefined} />
                    <Button variant="ghost" size="sm" aria-expanded={openCode === row.code} aria-label={`${openCode === row.code ? 'Hide' : 'Show'} courses in ${row.code}`} onClick={() => setOpenCode(openCode === row.code ? null : row.code)}>
                      {openCode === row.code ? 'Hide courses' : 'Show courses'}
                    </Button>
                    {row.disabled
                      ? <Button variant="outline" size="sm" aria-label={`Enable ${row.code}`} onClick={() => open('enable', row)}>Enable</Button>
                      : <Button variant="outline" size="sm" aria-label={`Disable ${row.code}`} onClick={() => open('disable', row)}>Disable</Button>}
                    <Button variant="outline" size="sm" aria-label={`Add ${row.code} to catalogue`} onClick={() => open('promote', row)}>Add to catalogue</Button>
                  </div>
                </div>
                {row.disabled && row.disabledReason && <p className="mt-1 text-xs text-[var(--acade-text-muted)]">Reason: {row.disabledReason}</p>}
                {openCode === row.code && (
                  <div className="mt-2 space-y-1 text-sm">
                    {row.authorId && <p className="break-all text-xs text-[var(--acade-text-muted)]">Created by account {row.authorId}</p>}
                    <ul className="divide-y divide-[var(--acade-border-subtle)] rounded-xl bg-[var(--acade-overlay)] px-3">
                      {row.courses.map((course) => (
                        <li key={course.code} className="flex flex-wrap justify-between gap-2 py-1.5 text-[var(--acade-text)]">
                          <span><span className="font-mono">{course.code}</span> {course.title}</span>
                          <span className="text-[var(--acade-text-muted)]">{course.units} {course.units === 1 ? 'unit' : 'units'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {nextCursor && <Button variant="outline" size="sm" loading={loadingMore} loadingLabel="Loading more codes" onClick={() => { void load(nextCursor); }}>Load more</Button>}
        </>
      )}

      <Modal open={dialog !== null} onClose={close} title={title} size="confirm">
        <form onSubmit={submit} className="space-y-4">
          {dialog?.kind === 'disable' && <p className="text-sm text-[var(--acade-text)]">Students can no longer open or import this list. The code is kept and can be enabled again.</p>}
          {dialog?.kind === 'promote' && (
            <>
              <p className="text-sm text-[var(--acade-text)]">Check the course codes, titles and units first. Each row is added once for the department, level and semester you choose; rows already there are skipped.</p>
              <Input id="share-promote-department" label="Department" value={department} maxLength={80} onChange={(event) => setDepartment(event.target.value)} />
              <AdminSelect label="Level" value={String(level)} onChange={(value) => setLevel(value)} options={optionsFrom([100, 200, 300, 400, 500, 600])} />
              <AdminSelect label="Semester" value={String(semester)} onChange={(value) => setSemester(value)} options={[{ value: '1', label: 'First' }, { value: '2', label: 'Second' }]} />
            </>
          )}
          <Input id="share-reason" label="Reason (saved in the audit log)" value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={!reasonValid || !promoteValid} loading={busy} loadingLabel="Saving">
              {dialog?.kind === 'disable' ? 'Disable code' : dialog?.kind === 'enable' ? 'Enable code' : 'Add to catalogue'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

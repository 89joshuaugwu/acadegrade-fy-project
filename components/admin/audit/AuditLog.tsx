'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { auditUrl, parseAuditPage, type AuditEntry } from './parse';

type Status = 'loading' | 'ready' | 'unavailable' | 'error' | 'index';
interface Filters { action: string; actor: string }

const INDEX_MESSAGE = 'Filtering by action needs a database index. Ask the developer to create it (the server logs a link).';

class AuditRequestError extends Error {
  constructor(readonly status: number) { super('The audit log could not be loaded.'); }
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Read-only view of admin changes from `GET /api/admin/audit`. */
export function AuditLog() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState<Filters>({ action: '', actor: '' });
  const [applied, setApplied] = useState<Filters>({ action: '', actor: '' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const request = useRef(0);

  const fetchPage = useCallback(async (action: string, cursor: string | null) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const response = await fetch(auditUrl({ action, cursor }), { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (response.status === 404) return 'unavailable' as const;
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new AuditRequestError(response.status);
    return parseAuditPage(body);
  }, [user]);

  /** Loads the newest page for an action filter (the only server-side filter). */
  const loadFirst = useCallback(async (action: string) => {
    const id = ++request.current;
    setStatus('loading'); setMoreError(null);
    try {
      const page = await fetchPage(action, null);
      if (id !== request.current) return;
      if (page === 'unavailable') { setStatus('unavailable'); return; }
      setEntries(page.entries); setNextCursor(page.nextCursor); setStatus('ready');
    } catch (cause) {
      if (id !== request.current) return;
      // An action filter needs a composite index; until it exists the query fails.
      setStatus(action && cause instanceof AuditRequestError && cause.status >= 500 ? 'index' : 'error');
    }
  }, [fetchPage]);

  useEffect(() => { if (user) void loadFirst(''); }, [loadFirst, user]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true); setMoreError(null);
    try {
      const page = await fetchPage(applied.action, nextCursor);
      if (page === 'unavailable') { setStatus('unavailable'); return; }
      setEntries((current) => [...current, ...page.entries.filter((entry) => !current.some((item) => item.id === entry.id))]);
      setNextCursor(page.nextCursor);
    } catch {
      setMoreError('Older entries could not be loaded. Try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const filters = { action: draft.action.trim(), actor: draft.actor.trim() };
    const actionChanged = filters.action !== applied.action || status !== 'ready';
    setApplied(filters);
    if (actionChanged) void loadFirst(filters.action);
  };

  const clearFilters = () => {
    const empty = { action: '', actor: '' };
    const reload = Boolean(applied.action) || status !== 'ready';
    setDraft(empty); setApplied(empty);
    if (reload) void loadFirst('');
  };

  const filtered = Boolean(applied.action || applied.actor);
  const actorQuery = applied.actor.toLowerCase();
  // The server cannot filter by admin, so this narrows what has been loaded.
  const visible = actorQuery ? entries.filter((entry) => entry.actor.toLowerCase().includes(actorQuery)) : entries;

  return <div className="space-y-6">
    <AdminPageHeader title="Audit log" description="Who changed what in the admin, and when. Newest first. Read only." helpId="admin.audit" />

    {status === 'unavailable' ? (
      <div className="flex flex-col items-center rounded-[var(--radius-surface)] border border-dashed border-[var(--acade-border)] px-6 py-12 text-center">
        <ScrollText className="mb-3 size-8 text-[var(--acade-text-faint)]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-[var(--acade-text)]">Not available yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--acade-text-muted)]">The audit log isn&apos;t available yet. It will appear here once the server records admin changes.</p>
      </div>
    ) : <>
      <form onSubmit={applyFilters} aria-label="Filter the audit log" className="flex flex-col gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1"><Input label="Action" value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} placeholder="settings.update" hint="The exact action name." /></div>
        <div className="min-w-0 flex-1"><Input label="Admin" type="text" value={draft.actor} onChange={(event) => setDraft({ ...draft, actor: event.target.value })} placeholder="Email address" hint="Matches the entries already loaded." /></div>
        <div className="flex gap-2 sm:mb-[1.375rem]">
          {filtered && <Button type="button" variant="ghost" onClick={clearFilters}>Clear</Button>}
          <Button type="submit" variant="outline" disabled={status === 'loading'}>Apply filters</Button>
        </div>
      </form>

      {status === 'loading' && <div role="status" aria-label="Loading audit log" aria-busy="true" className="space-y-2">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-12" />)}
      </div>}

      {status === 'error' && <ErrorState title="The audit log could not be loaded" description="Nothing has been changed. Check your connection and try again." onRetry={() => void loadFirst(applied.action)} />}
      {status === 'index' && <ErrorState title="This filter is not ready yet" description={INDEX_MESSAGE} onRetry={() => void loadFirst(applied.action)} />}

      {status === 'ready' && (visible.length === 0 ? (
        <p className="rounded-[var(--radius-surface)] border border-dashed border-[var(--acade-border)] px-4 py-6 text-center text-sm text-[var(--acade-text-muted)]">
          {filtered ? 'No entries match these filters.' : 'No admin changes have been recorded yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
            <table aria-label="Admin changes" className="w-full text-left text-sm max-sm:block">
              <thead className="max-sm:sr-only">
                <tr className="border-b border-[var(--acade-border)] text-xs text-[var(--acade-text-muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">Time</th>
                  <th scope="col" className="px-4 py-3 font-medium">Admin</th>
                  <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  <th scope="col" className="px-4 py-3 font-medium">Target</th>
                  <th scope="col" className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {visible.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--acade-border-subtle)] align-top last:border-b-0 max-sm:grid max-sm:gap-1 max-sm:px-4 max-sm:py-3">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--acade-text-muted)] tabular-nums max-sm:p-0">
                      {entry.at ? <time dateTime={entry.at}>{timeFormat.format(new Date(entry.at))}</time> : <span aria-label="No time recorded">—</span>}
                    </td>
                    <td className="break-all px-4 py-3 text-[var(--acade-text)] max-sm:p-0 max-sm:font-medium">{entry.actor || '—'}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text)] max-sm:p-0">{entry.action || '—'}</td>
                    <td className="break-all px-4 py-3 text-[var(--acade-text-muted)] max-sm:p-0"><span className="sm:hidden">Target: </span>{entry.target || '—'}</td>
                    <td className="px-4 py-3 text-[var(--acade-text)] max-sm:p-0">
                      {entry.details || (entry.changes.length ? null : '—')}
                      {entry.changes.length > 0 && <details className="mt-1 text-xs">
                        <summary className="cursor-pointer font-medium text-[var(--acade-primary)]">{entry.changes.length} {entry.changes.length === 1 ? 'change' : 'changes'}</summary>
                        <ul className="mt-1 space-y-1 font-[family-name:var(--font-geist-mono)] text-[var(--acade-text-muted)]">
                          {entry.changes.map((change) => <li key={change.key || 'value'} className="break-all">{change.key ? `${change.key}: ` : ''}{change.before} → {change.after}</li>)}
                        </ul>
                      </details>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--acade-text-muted)]">
              {actorQuery
                ? `${visible.length} of ${entries.length} loaded entries shown.`
                : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} shown${nextCursor ? '' : ', the oldest included'}.`}
            </p>
            {nextCursor && <Button variant="outline" loading={loadingMore} loadingLabel="Loading older entries…" onClick={() => void loadMore()}>Load more</Button>}
          </div>
          {moreError && <p role="alert" className="text-sm text-[var(--acade-danger)]">{moreError}</p>}
        </div>
      ))}
    </>}
  </div>;
}

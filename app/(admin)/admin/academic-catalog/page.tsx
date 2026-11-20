'use client';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/admin/ui/Panel';
import { cn } from '@/lib/utils/cn';

type Kind = 'university' | 'department' | 'programme';
type Entry = { id: string; kind: Kind; name: string; status: 'active' | 'archived'; source: 'default' | 'admin' };
type Snapshot = { revision: number; entries: Entry[] };
type Suggestion = { id: string; kind: Kind; name: string; status: 'pending'; uid: string; createdAt: string };
type Mutation = { action: 'add'; kind: Kind; name: string } | { action: 'edit'; id: string; name: string } | { action: 'archive' | 'restore'; id: string };

const kinds: { value: Kind; label: string; singular: string }[] = [
  { value: 'university', label: 'Universities', singular: 'university' },
  { value: 'department', label: 'Departments', singular: 'department' },
  { value: 'programme', label: 'Programmes', singular: 'programme' },
];

const KIND_NAMES: Record<Kind, string> = { university: 'University', department: 'Department', programme: 'Programme' };
const STATUS_LABELS = { active: 'Active', archived: 'Archived' } as const;

const fieldClass = 'h-12 w-full rounded-[12px] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] text-sm text-[var(--acade-text)] placeholder:text-[var(--acade-text-faint)] transition-colors focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';
const pillClass = 'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium leading-5';

function suggestedWhen(createdAt: string) {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function AcademicCatalogPage() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('university');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ mode: 'add' | 'edit'; entry?: Entry } | null>(null);
  const [name, setName] = useState('');
  const [confirmEntry, setConfirmEntry] = useState<Entry | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/academic-catalog', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load the academic catalog.'));
      setSnapshot(await response.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the academic catalog.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    setSuggestionsLoading(true);
    setSuggestionsError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/academic-catalog/suggestions', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load suggestions.'));
      const data = await response.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (cause) {
      setSuggestionsError(cause instanceof Error ? cause.message : 'Unable to load suggestions.');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSuggestions(); }, [loadSuggestions]);
  useEffect(() => { if (form) nameRef.current?.focus(); }, [form]);

  const selectedKind = kinds.find(item => item.value === kind)!;
  const filtered = useMemo(() => snapshot?.entries.filter(entry => entry.kind === kind && entry.status === status && entry.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [], [snapshot, kind, status, query]);
  const activeCounts = useMemo(() => {
    const counts: Record<Kind, number> = { university: 0, department: 0, programme: 0 };
    for (const entry of snapshot?.entries ?? []) if (entry.status === 'active' && entry.kind in counts) counts[entry.kind] += 1;
    return counts;
  }, [snapshot]);

  async function mutate(mutation: Mutation) {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/academic-catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(mutation),
      });
      if (!response.ok) throw new Error(await responseMessage(response, 'Unable to update the academic catalog.'));
      setSnapshot(await response.json());
      setForm(null);
      setConfirmEntry(null);
      setNotice(mutation.action === 'add' ? 'Entry added.' : mutation.action === 'edit' ? 'Entry updated.' : mutation.action === 'archive' ? 'Entry archived.' : 'Entry restored.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the academic catalog.');
    } finally {
      setSaving(false);
    }
  }

  async function moderate(suggestion: Suggestion, action: 'approve' | 'reject') {
    if (!user || moderatingId) return;
    setModeratingId(suggestion.id);
    setSuggestionsError('');
    setNotice('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/academic-catalog/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: suggestion.id, action }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${action} suggestion.`));
      await response.json();
      setSuggestions(previous => previous.filter(item => item.id !== suggestion.id));
      setNotice(`Suggestion ${action === 'approve' ? 'approved' : 'rejected'}.`);
      if (action === 'approve') await load();
    } catch (cause) {
      setSuggestionsError(cause instanceof Error ? cause.message : `Unable to ${action} suggestion.`);
    } finally {
      setModeratingId(null);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a name.'); nameRef.current?.focus(); return; }
    if (!form) return;
    void mutate(form.mode === 'add' ? { action: 'add', kind, name: trimmed } : { action: 'edit', id: form.entry!.id, name: trimmed });
  }

  const pendingCount = suggestions.length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Academic catalogue"
        description="The universities, departments and programmes students pick from when they sign up on the website or the Android app."
        helpId="admin.academic-catalogue"
        actions={<Button size="sm" onClick={() => { setName(''); setForm({ mode: 'add' }); setError(''); }} disabled={loading || !snapshot || saving}><Plus size={16} aria-hidden="true" />Add {selectedKind.singular}</Button>}
      />

      {/* Suggestions queue */}
      <Panel
        title="Pending suggestions"
        description="Review entries suggested by students. Approving adds the name to the catalogue; a name that already exists is merged."
        actions={!suggestionsLoading && pendingCount > 0 ? (
          <span className={cn(pillClass, 'bg-[var(--acade-gold-dim)] px-2.5 py-1 text-[var(--acade-warning)]')}>{pendingCount} waiting</span>
        ) : undefined}
        padded={false}
      >
        <div className="px-5 pb-2 sm:px-6">
          {suggestionsError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] border border-[color-mix(in_srgb,var(--acade-danger)_30%,transparent)] bg-[var(--acade-danger-dim)] px-4 py-3 text-sm text-[var(--acade-danger)]">
              <span className="min-w-0 flex-1">{suggestionsError}</span>
              <button type="button" onClick={() => void loadSuggestions()} className="min-h-11 cursor-pointer rounded-[10px] px-2 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">Retry suggestions</button>
            </div>
          )}
          {suggestionsLoading ? (
            <p role="status" className="py-6 text-sm text-[var(--acade-text-muted)]">Loading suggestions…</p>
          ) : suggestions.length === 0 ? (
            <p className="py-6 text-sm text-[var(--acade-text-muted)]">No pending suggestions.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--acade-border-subtle)]">
              {suggestions.map(suggestion => (
                <li key={suggestion.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold text-[var(--acade-text)]">{suggestion.name}</p>
                      <span className={cn(pillClass, 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]')}>{KIND_NAMES[suggestion.kind] ?? suggestion.kind}</span>
                    </div>
                    <p className="mt-0.5 break-all text-[0.8125rem] text-[var(--acade-text-muted)]">
                      Suggested by {suggestion.uid}{suggestedWhen(suggestion.createdAt) ? ` on ${suggestedWhen(suggestion.createdAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" aria-label={`Approve ${suggestion.name}`} disabled={Boolean(moderatingId)} loading={moderatingId === suggestion.id} onClick={() => void moderate(suggestion, 'approve')}>Approve</Button>
                    <Button variant="outline" size="sm" aria-label={`Reject ${suggestion.name}`} disabled={Boolean(moderatingId)} onClick={() => void moderate(suggestion, 'reject')}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {/* Catalogue browser */}
      <Panel padded={false}>
        <div className="space-y-4 border-b border-[var(--acade-border-subtle)] p-4 sm:p-5">
          <div role="tablist" aria-label="Catalog type" className="flex w-full gap-1 overflow-x-auto rounded-[14px] bg-[var(--acade-overlay)] p-1 sm:w-auto sm:max-w-max">
            {kinds.map(item => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={kind === item.value}
                onClick={() => { setKind(item.value); setForm(null); setConfirmEntry(null); }}
                className={cn(
                  'flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-2 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] sm:flex-none sm:shrink-0 sm:px-4 sm:text-sm',
                  kind === item.value
                    ? 'bg-[var(--acade-surface)] text-[var(--acade-text)] ring-1 ring-[var(--acade-border-subtle)]'
                    : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]'
                )}
              >
                {item.label}
                {snapshot ? <span className={cn('hidden tabular-nums text-xs font-medium sm:inline',kind === item.value ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-faint)]')}>{activeCounts[item.value]}</span> : null}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
              <input ref={searchRef} type="search" aria-label="Search catalog" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${selectedKind.label.toLowerCase()}…`} className={cn(fieldClass, 'pl-12 pr-12')} />
              {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }} className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"><X size={16} /></button>}
            </div>
            <div role="group" aria-label="Entry status" className="flex gap-1 rounded-[14px] bg-[var(--acade-overlay)] p-1">
              {(['active', 'archived'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    'min-h-10 flex-1 cursor-pointer rounded-[10px] px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] sm:flex-none',
                    status === value
                      ? 'bg-[var(--acade-surface)] text-[var(--acade-text)] ring-1 ring-[var(--acade-border-subtle)]'
                      : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]'
                  )}
                >
                  {STATUS_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] border border-[color-mix(in_srgb,var(--acade-danger)_30%,transparent)] bg-[var(--acade-danger-dim)] px-4 py-3 text-sm text-[var(--acade-danger)]">
              <span className="min-w-0 flex-1">{error}</span>
              {!snapshot && <button type="button" onClick={() => void load()} className="min-h-11 cursor-pointer rounded-[10px] px-2 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">Try again</button>}
            </div>
          )}
          {notice && <p role="status" className="text-sm font-medium text-[var(--acade-success)]">{notice}</p>}

          {form && (
            <form onSubmit={submit} noValidate className="space-y-4 rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] p-4 sm:p-5">
              <h2 className="ag-admin-h2 text-base">{form.mode === 'add' ? `Add ${selectedKind.singular}` : `Edit ${selectedKind.singular}`}</h2>
              <div>
                <label htmlFor="catalog-name" className="mb-1.5 block text-sm font-medium text-[var(--acade-text)]">Name</label>
                <input ref={nameRef} id="catalog-name" value={name} onChange={event => setName(event.target.value)} className={cn(fieldClass, 'px-4 text-base')} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" loading={saving} disabled={!name.trim()}>{form.mode === 'add' ? `Save ${selectedKind.singular}` : 'Save changes'}</Button>
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </form>
          )}

          {confirmEntry && (
            <div role="alertdialog" aria-labelledby="archive-title" aria-describedby="archive-description" className="rounded-[16px] border border-[color-mix(in_srgb,var(--acade-danger)_35%,transparent)] bg-[var(--acade-danger-dim)] p-4 sm:p-5">
              <h2 id="archive-title" className="ag-admin-h2 text-base">Archive {confirmEntry.name}?</h2>
              <p id="archive-description" className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">This entry will be hidden from the active catalog. You can restore it later.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setConfirmEntry(null)}>Cancel</Button>
                <Button type="button" variant="danger" size="sm" loading={saving} onClick={() => void mutate({ action: 'archive', id: confirmEntry.id })}>Archive entry</Button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 text-sm tabular-nums text-[var(--acade-text-muted)] sm:px-6" role="status">{loading ? 'Loading catalog…' : `${filtered.length} ${status} ${selectedKind.label.toLowerCase()}`}</div>
        {!loading && snapshot && (filtered.length ? (
          <ul aria-label={`${STATUS_LABELS[status]} ${selectedKind.label.toLowerCase()}`} className="max-h-[38rem] divide-y divide-[var(--acade-border-subtle)] overflow-y-auto border-t border-[var(--acade-border-subtle)]">
            {filtered.map(entry => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-[var(--acade-text)]">{entry.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--acade-text-muted)]">{entry.source === 'admin' ? 'Added by an admin' : 'Built-in list'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" aria-label={`Edit ${entry.name}`} disabled={saving} onClick={() => { setName(entry.name); setForm({ mode: 'edit', entry }); setError(''); }}>Edit</Button>
                  {entry.status === 'active'
                    ? <Button variant="ghost" size="sm" aria-label={`Archive ${entry.name}`} disabled={saving} onClick={() => setConfirmEntry(entry)}>Archive</Button>
                    : <Button variant="ghost" size="sm" aria-label={`Restore ${entry.name}`} disabled={saving} onClick={() => void mutate({ action: 'restore', id: entry.id })}>Restore</Button>}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="border-t border-[var(--acade-border-subtle)] p-10 text-center text-sm text-[var(--acade-text-muted)]">{query ? 'No matching entries.' : `No ${status} ${selectedKind.label.toLowerCase()} yet.`}</p>)}
      </Panel>

      <details className="group rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] px-5 py-4 sm:px-6">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--acade-text)] [&::-webkit-details-marker]:hidden">
          Advanced
          <ChevronDown size={18} aria-hidden="true" className="text-[var(--acade-text-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">
          <Link href="/admin/courses" className="font-medium text-[var(--acade-primary)] underline underline-offset-2">Legacy course list (not used by the apps)</Link>
          {' '}is an older list of course codes. It does not affect sign-up or students&apos; courses.
        </p>
      </details>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)]">Academic catalog</h1>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Manage the shared universities, departments, and programmes.</p>
        </div>
        <Button size="sm" onClick={() => { setName(''); setForm({ mode: 'add' }); setError(''); }} disabled={loading || !snapshot || saving}><Plus size={16} aria-hidden="true" />Add {selectedKind.singular}</Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-[var(--acade-border)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">Pending suggestions</h2>
          <p className="text-sm text-[var(--acade-text-muted)]">Review entries suggested by students.</p>
        </div>
        {suggestionsError && <div role="alert" className="px-5 py-4 text-sm text-[var(--acade-danger)]">{suggestionsError}<button type="button" onClick={() => void loadSuggestions()} className="ml-3 cursor-pointer underline focus-visible:outline-2">Retry suggestions</button></div>}
        {suggestionsLoading ? <p role="status" className="px-5 py-6 text-sm text-[var(--acade-text-muted)]">Loading suggestions…</p> : suggestions.length === 0 ? <p className="px-5 py-6 text-sm text-[var(--acade-text-muted)]">No pending suggestions.</p> : <ul className="divide-y divide-[var(--acade-border-subtle)]">{suggestions.map(suggestion => <li key={suggestion.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-[var(--acade-text)]">{suggestion.name}</p><p className="text-xs capitalize text-[var(--acade-text-muted)]">{suggestion.kind} · suggested by {suggestion.uid}</p></div><div className="flex gap-2"><Button size="sm" disabled={Boolean(moderatingId)} loading={moderatingId === suggestion.id} onClick={() => void moderate(suggestion, 'approve')}>Approve {suggestion.name}</Button><Button variant="outline" size="sm" disabled={Boolean(moderatingId)} onClick={() => void moderate(suggestion, 'reject')}>Reject {suggestion.name}</Button></div></li>)}</ul>}
      </Card>

      <div role="tablist" aria-label="Catalog type" className="flex gap-2 overflow-x-auto pb-1">
        {kinds.map(item => <button key={item.value} type="button" role="tab" aria-selected={kind === item.value} onClick={() => { setKind(item.value); setForm(null); setConfirmEntry(null); }} className={`min-h-12 shrink-0 cursor-pointer rounded-xl border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] ${kind === item.value ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' : 'border-[var(--acade-border)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]'}`}>{item.label}</button>)}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
          <input ref={searchRef} type="search" aria-label="Search catalog" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${selectedKind.label.toLowerCase()}…`} className="h-12 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] pl-12 pr-12 text-sm text-[var(--acade-text)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]" />
          {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"><X size={16} /></button>}
        </div>
        <div role="group" aria-label="Entry status" className="flex gap-2">
          {(['active', 'archived'] as const).map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`min-h-12 flex-1 cursor-pointer rounded-xl border px-4 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] ${status === value ? 'border-[var(--acade-primary)] text-[var(--acade-primary)]' : 'border-[var(--acade-border)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]'}`}>{value}</button>)}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-[var(--acade-danger)]/40 bg-[var(--acade-danger-dim)] p-4 text-sm text-[var(--acade-danger)]">{error}{!snapshot && <button type="button" onClick={() => void load()} className="ml-3 cursor-pointer underline focus-visible:outline-2">Try again</button>}</div>}
      {notice && <p role="status" className="text-sm text-[var(--acade-success)]">{notice}</p>}

      {form && <Card className="p-5"><form onSubmit={submit} noValidate className="space-y-4">
        <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">{form.mode === 'add' ? `Add ${selectedKind.singular}` : `Edit ${selectedKind.singular}`}</h2>
        <div><label htmlFor="catalog-name" className="mb-1.5 block text-sm font-medium text-[var(--acade-text-muted)]">Name</label><input ref={nameRef} id="catalog-name" value={name} onChange={event => setName(event.target.value)} className="h-12 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 text-[var(--acade-text)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]" /></div>
        <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" loading={saving} disabled={!name.trim()}>{form.mode === 'add' ? `Save ${selectedKind.singular}` : 'Save changes'}</Button><Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setForm(null)}>Cancel</Button></div>
      </form></Card>}

      {confirmEntry && <Card className="border-[var(--acade-danger)]/40 p-5"><div role="alertdialog" aria-labelledby="archive-title" aria-describedby="archive-description"><h2 id="archive-title" className="text-lg font-bold text-[var(--acade-text)]">Archive {confirmEntry.name}?</h2><p id="archive-description" className="mt-2 text-sm text-[var(--acade-text-muted)]">This entry will be hidden from the active catalog. You can restore it later.</p><div className="mt-4 flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setConfirmEntry(null)}>Cancel</Button><Button type="button" variant="danger" size="sm" loading={saving} onClick={() => void mutate({ action: 'archive', id: confirmEntry.id })}>Archive entry</Button></div></div></Card>}

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-[var(--acade-border)] px-5 py-3 text-sm text-[var(--acade-text-muted)]" role="status">{loading ? 'Loading catalog…' : `${filtered.length} ${status} ${selectedKind.label.toLowerCase()}`}</div>
        {!loading && snapshot && (filtered.length ? <ul className="divide-y divide-[var(--acade-border-subtle)]">{filtered.map(entry => <li key={entry.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-[var(--acade-text)]">{entry.name}</p><p className="text-xs capitalize text-[var(--acade-text-muted)]">{entry.source} · {entry.status}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={saving} onClick={() => { setName(entry.name); setForm({ mode: 'edit', entry }); setError(''); }}>Edit {entry.name}</Button>{entry.status === 'active' ? <Button variant="ghost" size="sm" disabled={saving} onClick={() => setConfirmEntry(entry)}>Archive {entry.name}</Button> : <Button variant="ghost" size="sm" disabled={saving} onClick={() => void mutate({ action: 'restore', id: entry.id })}>Restore {entry.name}</Button>}</div></li>)}</ul> : <p className="p-10 text-center text-sm text-[var(--acade-text-muted)]">{query ? 'No matching entries.' : `No ${status} ${selectedKind.label.toLowerCase()} yet.`}</p>)}
      </Card>
    </div>
  );
}

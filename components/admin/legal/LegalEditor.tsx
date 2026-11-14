'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { parseLegalMarkup } from '@/lib/legal/markup';
import { renderLegalSections } from '@/lib/legal/render';
import { formatLegalDate, nextLegalVersion, type LegalDocumentId } from '@/lib/legal/versions';

interface Fields { title: string; summary: string; effectiveDate: string; body: string; changeNote: string }
interface VersionRow { version: string; publishedAt: string | null; publishedBy: string | null; changeNote: string }
interface LegalData {
  current: { version: string; effectiveDate: string; title: string; summary: string; body: string; source: 'published' | 'builtin' };
  configVersion: string;
  draft: Fields | null;
  versions: VersionRow[];
}
type LoadState = { status: 'loading' } | { status: 'unavailable' } | { status: 'error'; message: string } | { status: 'ready'; data: LegalData };

const DOCUMENTS: ReadonlyArray<{ id: LegalDocumentId; name: string }> = [
  { id: 'terms', name: 'Terms of use' },
  { id: 'privacy', name: 'Privacy notice' },
];

const today = () => new Date().toISOString().slice(0, 10);
const fieldsFromCurrent = (data: LegalData): Fields => ({ title: data.current.title, summary: data.current.summary, effectiveDate: today(), body: data.current.body, changeNote: '' });
const sameFields = (a: Fields, b: Fields) => a.title === b.title && a.summary === b.summary && a.effectiveDate === b.effectiveDate && a.body === b.body && a.changeNote === b.changeNote;
const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function readData(body: unknown): LegalData | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Partial<LegalData>;
  if (!value.current || typeof value.current.body !== 'string' || typeof value.configVersion !== 'string') return null;
  return { current: value.current, configVersion: value.configVersion, draft: value.draft ?? null, versions: Array.isArray(value.versions) ? value.versions : [] };
}

interface ApiError { message: string; issues: string[]; code?: string }
async function apiError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null) as { error?: string; issues?: string[]; code?: string } | null;
  return { message: body?.error || fallback, issues: Array.isArray(body?.issues) ? body.issues : [], code: body?.code };
}

/** Admin > Legal documents: edit, preview, save and publish the Terms and Privacy text. */
export function LegalEditor() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [doc, setDoc] = useState<LegalDocumentId>(params?.get('doc') === 'privacy' ? 'privacy' : 'terms');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [fields, setFields] = useState<Fields | null>(null);
  const [saved, setSaved] = useState<Fields | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<ApiError | null>(null);

  const token = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const load = useCallback(async (target: LegalDocumentId) => {
    setState({ status: 'loading' }); setProblem(null);
    try {
      const response = await fetch(`/api/admin/legal/documents/${target}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' });
      if (response.status === 404) { setState({ status: 'unavailable' }); return; }
      if (!response.ok) throw new Error((await apiError(response, 'The document could not be loaded.')).message);
      const data = readData(await response.json().catch(() => null));
      if (!data) throw new Error('The server sent an unexpected answer.');
      setState({ status: 'ready', data });
      setFields(data.draft ?? fieldsFromCurrent(data));
      setSaved(data.draft);
    } catch (cause) {
      setState({ status: 'error', message: cause instanceof Error ? cause.message : 'The document could not be loaded.' });
    }
  }, [token]);

  useEffect(() => { if (user) void load(doc); }, [doc, load, user]);

  const parsed = useMemo(() => parseLegalMarkup(fields?.body ?? ''), [fields?.body]);
  const preview = useMemo(() => renderLegalSections(parsed.sections, null), [parsed.sections]);
  const dirty = fields !== null && (saved === null || !sameFields(fields, saved));
  const issues = problem?.issues.length ? problem.issues : parsed.issues;

  const edit = (patch: Partial<Fields>) => { setFields((current) => (current ? { ...current, ...patch } : current)); setNotice(null); setProblem(null); };

  const chooseDocument = (next: LegalDocumentId) => {
    if (next === doc) return;
    if (dirty && !window.confirm('You have unsaved changes. Switch document and discard them?')) return;
    setDoc(next);
    const url = new URL(window.location.href);
    url.searchParams.set('doc', next);
    window.history.replaceState(null, '', url);
  };

  const saveDraft = async () => {
    if (!fields) return;
    setSaving(true); setProblem(null); setNotice(null);
    try {
      const response = await fetch(`/api/admin/legal/documents/${doc}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify(fields),
      });
      if (!response.ok) { setProblem(await apiError(response, 'The draft was not saved.')); return; }
      setSaved(fields);
      setNotice('Draft saved. Students will not see it until you publish.');
    } catch {
      setProblem({ message: 'The draft was not saved. Check your connection and try again.', issues: [] });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (state.status !== 'ready') return;
    setConfirming(false); setPublishing(true); setProblem(null); setNotice(null);
    try {
      const response = await fetch(`/api/admin/legal/documents/${doc}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ expectedCurrentVersion: state.data.configVersion }),
      });
      if (!response.ok) { setProblem(await apiError(response, 'The document was not published.')); return; }
      const { version } = await response.json().catch(() => ({ version: '' })) as { version?: string };
      await load(doc);
      setNotice(`Published version ${version ?? ''}. Every student will be asked to agree again.`.replace('version .', 'the new version.'));
    } catch {
      setProblem({ message: 'The document was not published. Check your connection and try again.', issues: [] });
    } finally {
      setPublishing(false);
    }
  };

  const documentName = DOCUMENTS.find((entry) => entry.id === doc)?.name ?? doc;
  const nextVersion = state.status === 'ready' ? nextLegalVersion(state.data.configVersion) : '';
  const canPublish = state.status === 'ready' && saved !== null && !dirty && parsed.issues.length === 0 && !saving && !publishing;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Legal documents"
        description="Write and publish the Terms of use and the Privacy notice. Publishing creates a new version and asks every student to agree again."
        helpId="admin.legal"
      />

      <div role="group" aria-label="Document" className="flex flex-wrap gap-2">
        {DOCUMENTS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={doc === entry.id}
            onClick={() => chooseDocument(entry.id)}
            className={`min-h-11 rounded-[var(--radius-control)] border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] ${doc === entry.id ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-text)]' : 'border-[var(--acade-control-border)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]'}`}
          >
            {entry.name}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <div role="status" aria-label="Loading document" className="space-y-3">
          <Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" />
        </div>
      )}
      {state.status === 'unavailable' && (
        <p className="rounded-xl bg-[var(--acade-overlay)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">
          Legal documents are not available yet. This appears once the server has been updated.
        </p>
      )}
      {state.status === 'error' && (
        <ErrorState title="Could not load this document" description={state.message} onRetry={() => { void load(doc); }} />
      )}

      {state.status === 'ready' && fields && (
        <>
          <p className="text-sm text-[var(--acade-text-muted)]">
            Live now: version <span className="font-semibold text-[var(--acade-text)]">{state.data.current.version}</span>
            {state.data.current.source === 'builtin' ? ' (the built-in text)' : ''}, effective {formatLegalDate(state.data.current.effectiveDate)}.
            {saved ? ' You have a saved draft.' : ' No draft saved yet.'}
          </p>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-label="Edit text" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { if (!dirty || window.confirm('Replace what you have typed with the live text?')) { setFields(fieldsFromCurrent(state.data)); setNotice(null); setProblem(null); } }}
                >
                  Start from current text
                </Button>
              </div>
              <Input label="Title" value={fields.title} maxLength={120} onChange={(event) => edit({ title: event.target.value })} />
              <Input label="Short summary" value={fields.summary} maxLength={400} onChange={(event) => edit({ summary: event.target.value })} hint="Shown under the title on the public page." />
              <Input label="Effective date" type="date" value={fields.effectiveDate} onChange={(event) => edit({ effectiveDate: event.target.value })} />
              <Textarea
                label="Text"
                rows={22}
                spellCheck
                value={fields.body}
                onChange={(event) => edit({ body: event.target.value })}
                className="font-mono text-sm"
                hint="Start each section with ## Heading. Do not type an email address: write {{contact}} instead."
              />
              <Input label="What changed (optional, for the history)" value={fields.changeNote} maxLength={300} onChange={(event) => edit({ changeNote: event.target.value })} />

              <details className="rounded-xl bg-[var(--acade-overlay)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">
                <summary className="cursor-pointer font-medium text-[var(--acade-text)]">Formatting guide</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><code>## Heading</code> starts a section. Add <code>{'{#id}'}</code> to name it.</li>
                  <li>A blank line starts a new paragraph. <code>- text</code> makes a bullet.</li>
                  <li><code>**bold**</code>, and <code>[label](/privacy)</code> or <code>[label](https://example.org)</code> for links.</li>
                  <li><code>{'{{contact}}'}</code> or <code>{'{{contact:Subject}}'}</code> shows the public contact email.</li>
                  <li>Tables: <code>| A | B |</code>, then <code>| --- | --- |</code>, then rows.</li>
                </ul>
              </details>

              {issues.length > 0 && (
                <div role="alert" className="rounded-xl border border-[var(--acade-danger)] px-4 py-3 text-sm">
                  <p className="font-semibold text-[var(--acade-danger)]">Fix these formatting problems first</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--acade-text)]">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </div>
              )}
              {problem && problem.issues.length === 0 && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-[var(--acade-danger)]">
                  <p>{problem.message}</p>
                  {problem.code === 'VERSION_MISMATCH' && <Button variant="ghost" size="sm" onClick={() => { void load(doc); }}>Reload</Button>}
                </div>
              )}
              {notice && <p role="status" className="text-sm text-[var(--acade-text)]">{notice}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" loading={saving} loadingLabel="Saving…" disabled={!dirty || parsed.issues.length > 0 || publishing} onClick={() => { void saveDraft(); }}>
                  Save draft
                </Button>
                <Button variant="outline" loading={publishing} loadingLabel="Publishing…" disabled={!canPublish} onClick={() => setConfirming(true)}>
                  Publish…
                </Button>
                {dirty && <span className="text-sm text-[var(--acade-text-muted)]">{saved ? 'Unsaved changes. Save the draft before publishing.' : 'Save a draft to enable publishing.'}</span>}
              </div>
            </section>

            <section aria-label="Preview" className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--acade-text)]">Preview</h2>
              <p className="mt-1 text-sm text-[var(--acade-text-muted)]">How the public page will read. Links are not active here.</p>
              <article className="legal-article mt-3 max-h-[70vh] space-y-8 overflow-y-auto rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
                <header>
                  <h2 className="text-2xl font-bold text-[var(--acade-text)]">{fields.title || 'Untitled'}</h2>
                  {fields.summary && <p className="mt-2 text-sm text-[var(--acade-text-muted)]">{fields.summary}</p>}
                  <p className="mt-2 text-xs text-[var(--acade-text-muted)]">Effective {formatLegalDate(fields.effectiveDate)}</p>
                </header>
                {preview.length === 0 && <p className="text-sm text-[var(--acade-text-muted)]">Nothing to preview yet. Start with a ## heading.</p>}
                {preview.map((section) => (
                  <section key={section.id} aria-labelledby={`preview-${section.id}`}>
                    <h3 id={`preview-${section.id}`} className="text-lg font-bold text-[var(--acade-text)]">{section.title}</h3>
                    <div className="mt-2 space-y-3 text-sm leading-7 text-[var(--acade-text)] [&_li]:pl-1 [&_table]:w-full [&_td]:py-1 [&_td]:pr-3 [&_td]:align-top [&_th]:py-1 [&_th]:pr-3 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{section.content}</div>
                  </section>
                ))}
              </article>
            </section>
          </div>

          <section aria-labelledby="legal-history-title">
            <h2 id="legal-history-title" className="text-base font-semibold text-[var(--acade-text)]">Version history</h2>
            {state.data.versions.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Nothing has been published from here yet. The built-in text is live.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--acade-border-subtle)] text-sm">
                {state.data.versions.map((row) => (
                  <li key={row.version} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
                    <span className="font-semibold tabular-nums text-[var(--acade-text)]">{row.version}</span>
                    <span className="text-[var(--acade-text-muted)]">{row.publishedAt ? dateTime.format(new Date(row.publishedAt)) : 'Unknown time'} by {row.publishedBy ?? 'an admin'}</span>
                    {row.changeNote && <span className="text-[var(--acade-text)]">{row.changeNote}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Publish ${documentName} version ${nextVersion}?`}
        description="Every student will be asked to agree again the next time they open AcadeGrade."
        confirm={{ label: 'Publish', onConfirm: () => { void publish(); } }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">
          The public page changes straight away. This cannot be undone, but you can publish a newer version later.
        </p>
      </Modal>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

/** The version every account is assumed to have seen before versions were stored. */
export const DEFAULT_LEGAL_VERSION = '2026-11-13';

type LegalDocument = 'terms' | 'privacy';
interface Versions { termsVersion: string; privacyVersion: string }
type LoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'ready'; versions: Versions };

const DOCUMENTS: Array<{ id: LegalDocument; name: string; short: string; key: keyof Versions }> = [
  { id: 'terms', name: 'Terms of Service', short: 'Terms', key: 'termsVersion' },
  { id: 'privacy', name: 'Privacy Policy', short: 'Privacy', key: 'privacyVersion' },
];

function readVersions(body: unknown): Versions {
  const value = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const source = (value.legal && typeof value.legal === 'object' ? value.legal : value) as Record<string, unknown>;
  const read = (key: keyof Versions) => typeof source[key] === 'string' && (source[key] as string).trim() ? (source[key] as string).trim() : DEFAULT_LEGAL_VERSION;
  return { termsVersion: read('termsVersion'), privacyVersion: read('privacyVersion') };
}

/** Today's date as the version; a second publish on the same day becomes `.2`, `.3`… */
export function nextLegalVersion(current: string, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  if (!current.startsWith(today)) return today;
  const suffix = Number(current.slice(today.length + 1)) || 1;
  return `${today}.${suffix + 1}`;
}

/**
 * Settings → Access → Legal versions. `GET /api/admin/legal` and
 * `PUT /api/admin/legal { termsVersion, privacyVersion }` (both keys required).
 * If the endpoint is missing (404) the card says so instead of failing.
 */
export function LegalVersions({ getToken }: { getToken: () => Promise<string> }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [publishing, setPublishing] = useState<LegalDocument | null>(null);
  const [confirming, setConfirming] = useState<LegalDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/legal', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.status === 404 || response.status === 405) { setState({ status: 'unavailable' }); return; }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error((body as { error?: string } | null)?.error || 'Legal versions could not be loaded.');
      setState({ status: 'ready', versions: readVersions(body) });
    } catch (cause) {
      setState({ status: 'error', message: cause instanceof Error ? cause.message : 'Legal versions could not be loaded.' });
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const versions = state.status === 'ready' ? state.versions : null;
  const target = confirming ? DOCUMENTS.find((document) => document.id === confirming)! : null;
  const proposed = target && versions ? nextLegalVersion(versions[target.key]) : '';

  async function publish(document: (typeof DOCUMENTS)[number], version: string) {
    setConfirming(null); setPublishing(document.id); setError(null); setNotice(null);
    try {
      const token = await getToken();
      const submitted: Versions = { ...(versions ?? readVersions(null)), [document.key]: version };
      const response = await fetch('/api/admin/legal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitted),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error((body as { error?: string } | null)?.error || `The new ${document.short} version was not published.`);
      const next = body && typeof body === 'object' && ('termsVersion' in body || 'privacyVersion' in body) ? readVersions(body) : submitted;
      setState({ status: 'ready', versions: next });
      setNotice(`${document.name} is now version ${next[document.key]}. Students will be asked to agree again.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `The new ${document.short} version was not published.`);
    } finally {
      setPublishing(null);
    }
  }

  return (
    <Card padding="lg">
      <section aria-labelledby="legal-versions-title">
        <h2 id="legal-versions-title" className="text-lg font-semibold text-[var(--acade-text)]">Legal versions</h2>
        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Publish a new version after you change the Terms or Privacy page. It takes effect at once.</p>

        {state.status === 'loading' && <p role="status" className="mt-4 text-sm text-[var(--acade-text-muted)]">Loading legal versions…</p>}
        {state.status === 'unavailable' && (
          <p className="mt-4 rounded-xl bg-[var(--acade-overlay)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">
            Legal versions are not available yet. This appears once the server can store them.
          </p>
        )}
        {state.status === 'error' && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <p className="text-[var(--acade-danger)]">{state.message}</p>
            <Button variant="ghost" size="sm" onClick={() => { void load(); }}>Try again</Button>
          </div>
        )}
        {versions && (
          <dl className="mt-4 divide-y divide-[var(--acade-border-subtle)]">
            {DOCUMENTS.map((document) => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <dt className="text-sm font-medium text-[var(--acade-text)]">{document.name}</dt>
                  <dd className="text-sm tabular-nums text-[var(--acade-text-muted)]">{versions[document.key]}</dd>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Publish new ${document.short} version`}
                  loading={publishing === document.id}
                  loadingLabel="Publishing…"
                  disabled={publishing !== null}
                  onClick={() => setConfirming(document.id)}
                >
                  Publish new version
                </Button>
              </div>
            ))}
          </dl>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-[var(--acade-danger)]">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-[var(--acade-text)]">{notice}</p>}
      </section>

      <Modal
        open={target !== null}
        onClose={() => setConfirming(null)}
        title={target ? `Publish a new ${target.short} version?` : ''}
        description="Every student will be asked to agree again the next time they open AcadeGrade."
        confirm={target ? { label: 'Publish new version', onConfirm: () => { void publish(target, proposed); } } : undefined}
      >
        {target && versions && (
          <p className="text-sm text-[var(--acade-text-muted)]">
            {target.name}: {versions[target.key]} → <span className="font-semibold text-[var(--acade-text)]">{proposed}</span>. This cannot be undone.
          </p>
        )}
      </Modal>
    </Card>
  );
}

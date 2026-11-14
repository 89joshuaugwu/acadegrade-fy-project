'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

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
  const read = (key: keyof Versions) => (typeof source[key] === 'string' && (source[key] as string).trim() ? (source[key] as string).trim() : DEFAULT_LEGAL_VERSION);
  return { termsVersion: read('termsVersion'), privacyVersion: read('privacyVersion') };
}

/**
 * Settings → Access → Legal versions. Shows the version students are asked to accept
 * (`GET /api/admin/legal`) and links to Legal documents, where the text is edited and
 * published. A version can no longer be bumped without publishing text with it.
 * If the endpoint is missing (404) the card says so instead of failing.
 */
export function LegalVersions({ getToken }: Readonly<{ getToken: () => Promise<string> }>) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

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

  return (
    <Card padding="lg">
      <section aria-labelledby="legal-versions-title">
        <h2 id="legal-versions-title" className="text-lg font-semibold text-[var(--acade-text)]">Legal versions</h2>
        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
          The version of each document students are asked to accept. To change the wording, edit the text in Legal documents: publishing there creates the next version and asks every student to agree again.
        </p>

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
                <Link
                  href={`/admin/legal?doc=${document.id}`}
                  aria-label={`Edit ${document.short} text and publish`}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--acade-control-border)] px-4 text-sm font-medium text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
                >
                  Edit text and publish
                </Link>
              </div>
            ))}
          </dl>
        )}
      </section>
    </Card>
  );
}

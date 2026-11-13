'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { postAdminSettings } from '@/components/admin/settings/api';

interface PublicLinks { androidUrl: string; iosUrl: string }

/**
 * Android release → Download links. The update notice link
 * (`mobileRelease.downloadUrl`) and the public site link
 * (`config/settings.mobileAppLinks.androidUrl`) stay separate fields; this
 * shows them side by side so they do not drift.
 */
export function DownloadLinks({ updateUrl, getToken }: { updateUrl: string; getToken: () => Promise<string> }) {
  const [saved, setSaved] = useState<PublicLinks | null>(null);
  const [androidUrl, setAndroidUrl] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Settings request failed.');
      const data = await response.json() as { settings?: { mobileAppLinks?: Partial<PublicLinks> } };
      const links = { androidUrl: data.settings?.mobileAppLinks?.androidUrl ?? '', iosUrl: data.settings?.mobileAppLinks?.iosUrl ?? '' };
      setSaved(links);
      setAndroidUrl(links.androidUrl);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const trimmedUpdate = updateUrl.trim();
  const dirty = saved !== null && androidUrl.trim() !== saved.androidUrl;
  const mismatch = saved !== null && Boolean(trimmedUpdate) && saved.androidUrl !== trimmedUpdate;

  async function save() {
    if (!saved) return;
    setSaving(true); setError(null); setNotice(null);
    const next = { androidUrl: androidUrl.trim(), iosUrl: saved.iosUrl };
    try {
      await postAdminSettings(await getToken(), { field: 'mobileAppLinks', value: next });
      setSaved(next);
      setNotice('Public site link saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The public link was not saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <section aria-labelledby="download-links-title" className="space-y-4">
        <div>
          <h2 id="download-links-title" className="text-lg font-semibold text-[var(--acade-text)]">Download links</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Two separate links: the one in the update notice, and the one on the public site.</p>
        </div>
        <dl className="grid gap-1 text-sm">
          <dt className="font-medium text-[var(--acade-text-muted)]">Update notice link</dt>
          <dd className="break-all text-[var(--acade-text)]">{trimmedUpdate || <span className="text-[var(--acade-text-muted)]">Not set. Enter the Download URL above.</span>}</dd>
        </dl>
        {state === 'loading' && <p role="status" className="text-sm text-[var(--acade-text-muted)]">Loading the public site link…</p>}
        {state === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-[var(--acade-danger)]">The public site link could not be loaded.</p>
            <Button variant="ghost" size="sm" onClick={() => { void load(); }}>Try again</Button>
          </div>
        )}
        {state === 'ready' && (
          <>
            <Input
              label="Public site Android link"
              type="url"
              value={androidUrl}
              onChange={(event) => { setAndroidUrl(event.target.value); setNotice(null); setError(null); }}
              hint="Shown on the home, sign-in and sign-up pages. Also editable in Settings → Public site."
            />
            {mismatch && (
              <p className="rounded-lg bg-[var(--acade-warning)]/10 px-3 py-2 text-sm text-[var(--acade-text)]">
                The saved links do not match, so the public site and the update notice may offer different APKs.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" disabled={!trimmedUpdate || androidUrl.trim() === trimmedUpdate} onClick={() => { setAndroidUrl(trimmedUpdate); setNotice(null); }}>
                Use the update link for the public site
              </Button>
              <Button size="sm" disabled={!dirty} loading={saving} loadingLabel="Saving…" onClick={() => { void save(); }}>Save public link</Button>
            </div>
            {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
            {notice && <p role="status" className="text-sm text-[var(--acade-text)]">{notice}</p>}
          </>
        )}
      </section>
    </Card>
  );
}

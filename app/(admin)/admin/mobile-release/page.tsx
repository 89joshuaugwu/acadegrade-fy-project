'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { defaultMobileRelease, type MobileReleaseConfig } from '@/lib/mobile-release/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

function httpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function validate(draft: MobileReleaseConfig) {
  if (draft.headline.length > 100 || draft.message.length > 400 || draft.latestVersion.length > 40) return 'Release text is too long.';
  if (!Number.isSafeInteger(draft.latestBuild) || draft.latestBuild < 0) return 'Build must be a non-negative whole number.';
  if (!Number.isSafeInteger(draft.minSupportedBuild) || draft.minSupportedBuild < 0 || draft.minSupportedBuild > draft.latestBuild) return 'Minimum supported build must be between zero and the latest build.';
  if (draft.imageUrl && !httpsUrl(draft.imageUrl)) return 'Image URL must use HTTPS.';
  if (draft.downloadUrl && !httpsUrl(draft.downloadUrl)) return 'Download URL must use HTTPS.';
  if (draft.enabled && !/^\d+\.\d+\.\d+$/.test(draft.latestVersion)) return 'Enter a version in x.y.z format.';
  if (draft.enabled && draft.latestBuild < 1) return 'Enter a positive build number.';
  if (draft.enabled && !draft.headline.trim()) return 'Enter a headline.';
  if (draft.enabled && !draft.downloadUrl) return 'Enter an HTTPS download URL.';
  return '';
}

export default function MobileReleasePage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<MobileReleaseConfig>(defaultMobileRelease);
  const [saved, setSaved] = useState<MobileReleaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/mobile-release', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Android release settings.');
      setDraft(data); setSaved(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load Android release settings.'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof MobileReleaseConfig>(key: K, value: MobileReleaseConfig[K]) => {
    setDraft(previous => ({ ...previous, [key]: value })); setError(''); setNotice('');
  };

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.'); return;
    }
    setUploading(true); setError(''); setNotice('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'acadegrade_avatars');
      const response = await fetch('https://api.cloudinary.com/v1_1/dgqukbs8n/image/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Image upload failed. Please try again.');
      const result = await response.json();
      const url = new URL(result.secure_url);
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith('/dgqukbs8n/image/upload/')) throw new Error('Image host returned an invalid URL.');
      update('imageUrl', url.toString());
      setNotice('Image uploaded. Save the release notice to publish this change.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image upload failed. Please try again.');
    } finally { setUploading(false); }
  }

  async function save() {
    if (!user || saving || uploading) return;
    setConfirming(false); setSaving(true); setError(''); setNotice('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/mobile-release', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save Android release settings.');
      setDraft(data); setSaved(data); setNotice('Android release settings saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save Android release settings.'); }
    finally { setSaving(false); }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate(draft);
    if (problem) { setError(problem); return; }
    if (draft.enabled && !draft.allowIgnore && (saved?.allowIgnore !== false || !saved.enabled || JSON.stringify(saved) !== JSON.stringify(draft))) { setConfirming(true); return; }
    void save();
  }

  if (loading) return <div role="status" className="text-[var(--acade-text-muted)]">Loading Android release settings…</div>;
  if (!saved) return <div role="alert" className="space-y-3"><p>{error || 'Could not load Android release settings.'}</p><Button onClick={() => void load()}>Retry</Button></div>;

  const mandatory = draft.enabled && !draft.allowIgnore;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return <div className="max-w-6xl space-y-6">
    <header><h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold text-[var(--acade-text)]">Android release notice</h1><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Manage the APK update notice shown to Android users. Changes go live when saved.</p></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <Card padding="lg"><form noValidate onSubmit={submit} className="space-y-5">
        <div className="flex items-center justify-between gap-4"><div><label id="enabled-label" className="font-semibold text-[var(--acade-text)]">Enable notice</label><p className="text-sm text-[var(--acade-text-muted)]">Off means no release notice is shown.</p></div><Switch aria-labelledby="enabled-label" aria-label="Enable notice" checked={draft.enabled} onCheckedChange={value => update('enabled', value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Version (x.y.z)" value={draft.latestVersion} maxLength={40} onChange={event => update('latestVersion', event.target.value)} /><Input label="Build number" type="number" min={0} step={1} value={draft.latestBuild || ''} onChange={event => update('latestBuild', Number(event.target.value))} /></div>
        <Input label="Minimum supported build" type="number" min={0} max={draft.latestBuild} step={1} value={draft.minSupportedBuild} onChange={event => update('minSupportedBuild', Number(event.target.value))} hint="Builds below this number must update. Set 0 to use Allow users to ignore for all older builds." />
        <Input label="Headline" value={draft.headline} maxLength={100} onChange={event => update('headline', event.target.value)} />
        <div><label htmlFor="release-message" className="block text-sm font-medium text-[var(--acade-text-muted)]">Message</label><textarea id="release-message" rows={4} maxLength={400} value={draft.message} onChange={event => update('message', event.target.value)} className="mt-1 w-full resize-none rounded-xl border border-[var(--acade-border)] bg-transparent p-3 text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]" /></div>
        <div className="space-y-2"><p className="text-sm font-medium text-[var(--acade-text-muted)]">Notice image (optional)</p><div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)]">{uploading ? 'Uploading image…' : draft.imageUrl ? 'Replace image' : 'Upload image'}<input type="file" className="sr-only" aria-label="Upload notice image" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} onChange={event => void uploadImage(event)} /></label>
          {draft.imageUrl && <Button variant="ghost" size="sm" disabled={uploading || saving} onClick={() => update('imageUrl', '')}>Remove image</Button>}
        </div><p className="text-xs text-[var(--acade-text-muted)]">PNG, JPEG, or WebP, up to 5 MB. Uploading alone does not publish the notice.</p></div>
        <Input label="Download URL" type="url" value={draft.downloadUrl} onChange={event => update('downloadUrl', event.target.value)} hint="Use a trusted HTTPS APK download destination." />
        <div className="flex items-center justify-between gap-4"><div><label id="ignore-label" className="font-semibold text-[var(--acade-text)]">Allow users to ignore</label><p className="text-sm text-[var(--acade-text-muted)]">Turn off only when an update must be required.</p></div><Switch aria-label="Allow users to ignore" aria-labelledby="ignore-label" checked={draft.allowIgnore} onCheckedChange={value => update('allowIgnore', value)} /></div>
        {mandatory && <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">Mandatory notice: users cannot dismiss this update prompt. Verify the APK and download URL before saving.</p>}
        {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[var(--acade-text)]">{notice}</p>}
        <Button type="submit" loading={saving} disabled={!dirty || uploading}>Save release notice</Button>
      </form></Card>
      <Card padding="lg"><h2 className="text-lg font-bold text-[var(--acade-text)]">Preview</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Unsaved draft · Android</p><div className="mt-5 rounded-2xl border border-[var(--acade-border)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--acade-text-muted)]">{draft.enabled ? mandatory ? 'Mandatory update' : 'Optional update' : 'Notice is off'}</p>
        {draft.imageUrl && httpsUrl(draft.imageUrl) && <div className="mt-4 h-40 overflow-hidden rounded-xl bg-[var(--acade-overlay)]"><img src={draft.imageUrl} alt="Release notice artwork" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>}
        <h3 className="mt-4 text-xl font-bold text-[var(--acade-text)]">{draft.headline || 'Release headline'}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-[var(--acade-text-muted)]">{draft.message || 'Release message'}</p><p className="mt-4 text-xs text-[var(--acade-text-muted)]">Version {draft.latestVersion || '—'} · Build {draft.latestBuild || '—'}</p><div className="mt-4 rounded-xl bg-[var(--acade-primary)] px-4 py-3 text-center font-semibold text-[var(--acade-on-primary)]">Download update</div>{draft.allowIgnore && <p className="mt-3 text-center text-sm text-[var(--acade-text-muted)]">Not now</p>}
      </div></Card>
    </div>
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl bg-[var(--acade-surface)] p-6 text-[var(--acade-text)] shadow-xl"><h2 id="confirm-title" className="text-xl font-bold">Publish mandatory update?</h2><p className="mt-3 text-sm">Android users will not be able to ignore this notice. Confirm the download link points to the intended APK.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button><Button onClick={() => void save()}>Publish mandatory notice</Button></div></div></div>}
  </div>;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { defaultMobileRelease, type MobileReleaseConfig } from '@/lib/mobile-release/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';

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
  const [installedBuild, setInstalledBuild] = useState('14');

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
    const submitted = draft;
    setConfirming(false); setSaving(true); setError(''); setNotice('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/mobile-release', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(submitted) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save Android release settings.');
      // Adopt server normalization only for fields unchanged since submission.
      const persisted = data as MobileReleaseConfig;
      setDraft(current => ({ ...persisted, ...Object.fromEntries(
        (Object.keys(submitted) as (keyof MobileReleaseConfig)[])
          .filter(key => current[key] !== submitted[key])
          .map(key => [key, current[key]])
      ) }));
      setSaved(data); setNotice('Submitted release settings saved. Any later edits remain in your draft.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save Android release settings.'); }
    finally { setSaving(false); }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate(draft);
    if (problem) { setError(problem); return; }
    if (draft.enabled && (!draft.allowIgnore || draft.minSupportedBuild > 0) && JSON.stringify(saved) !== JSON.stringify(draft)) { setConfirming(true); return; }
    void save();
  }

  if (loading) return <div role="status" className="text-[var(--acade-text-muted)]">Loading Android release settings…</div>;
  if (!saved) return <div role="alert" className="space-y-3"><p>{error || 'Could not load Android release settings.'}</p><Button onClick={() => void load()}>Retry</Button></div>;

  const mandatory = draft.enabled && (!draft.allowIgnore || draft.minSupportedBuild > 0);
  const enforcement = !draft.allowIgnore ? 'Mandatory update for all older builds' : `Mandatory below build ${draft.minSupportedBuild}; optional for other older builds`;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const installed = Number(installedBuild);
  const eligibility = installedBuild.trim() === '' || !Number.isSafeInteger(installed) || installed < 1
    ? 'Enter a positive whole build number.'
    : validate(draft) ? 'Complete valid release settings to simulate eligibility.'
    : !draft.enabled ? 'Notice is off. No update prompt.'
    : installed > draft.latestBuild ? 'Newer than published. No update prompt.'
    : installed === draft.latestBuild ? 'Up to date. No update prompt.'
    : installed < draft.minSupportedBuild || !draft.allowIgnore ? 'Mandatory update. This installed build cannot ignore the notice.'
    : 'Optional update. This installed build can ignore the notice.';
  return <div className="max-w-6xl space-y-6">
    <header><h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold text-[var(--acade-text)]">Android release notice</h1><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Manage the APK update notice shown to Android users. Changes go live when saved.</p></header>
    <p aria-label="Saved release status" className="text-sm text-[var(--acade-text-muted)]">Saved: {saved.enabled ? `notice enabled for version ${saved.latestVersion}, build ${saved.latestBuild}.` : 'Notice is off.'} {dirty ? 'Draft has unsaved changes.' : 'No unsaved changes.'}</p>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <Card padding="lg"><form noValidate onSubmit={submit} className="space-y-5">
        <div className="flex items-center justify-between gap-4"><div><label id="enabled-label" className="font-semibold text-[var(--acade-text)]">Enable notice</label><p className="text-sm text-[var(--acade-text-muted)]">Off means no release notice is shown.</p></div><Switch aria-labelledby="enabled-label" aria-label="Enable notice" checked={draft.enabled} onCheckedChange={value => update('enabled', value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Version (x.y.z)" value={draft.latestVersion} maxLength={40} onChange={event => update('latestVersion', event.target.value)} /><Input label="Build number" type="number" min={0} step={1} value={draft.latestBuild || ''} onChange={event => update('latestBuild', Number(event.target.value))} /></div>
        <Input label="Minimum supported build" type="number" min={0} max={draft.latestBuild} step={1} value={draft.minSupportedBuild} onChange={event => update('minSupportedBuild', Number(event.target.value))} hint="Builds below this number must update. Set 0 to use Allow users to ignore for all older builds." />
        <Input label="Headline" value={draft.headline} maxLength={100} onChange={event => update('headline', event.target.value)} />
        <div><label htmlFor="release-message" className="block text-sm font-medium text-[var(--acade-text-muted)]">Message</label><textarea id="release-message" rows={4} maxLength={400} value={draft.message} onChange={event => update('message', event.target.value)} className="mt-1 w-full resize-none rounded-xl border border-[var(--acade-border)] bg-transparent p-3 text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]" /></div>
        <div className="space-y-2"><p className="text-sm font-medium text-[var(--acade-text-muted)]">Notice image (optional)</p><div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)]">{uploading ? 'Uploading image…' : draft.imageUrl ? 'Replace image' : 'Upload image'}<input type="file" className="sr-only" aria-label="Upload notice image" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} onChange={event => void uploadImage(event)} /></label>
          {draft.imageUrl && <Button variant="ghost" size="sm" disabled={uploading || saving} onClick={() => update('imageUrl', '')}>Remove image</Button>}
        </div><p className="text-xs text-[var(--acade-text-muted)]">PNG, JPEG, or WebP, up to 5 MB. Uploading alone does not publish the notice.</p></div>
        <Input label="Download URL" type="url" value={draft.downloadUrl} onChange={event => update('downloadUrl', event.target.value)} hint="Use a trusted HTTPS APK download destination." />
        <div className="flex items-center justify-between gap-4"><div><label id="ignore-label" className="font-semibold text-[var(--acade-text)]">Allow users to ignore</label><p className="text-sm text-[var(--acade-text-muted)]">Turn off only when an update must be required.</p></div><Switch aria-label="Allow users to ignore" aria-labelledby="ignore-label" checked={draft.allowIgnore} onCheckedChange={value => update('allowIgnore', value)} /></div>
        {mandatory && <p className="rounded-xl border border-[var(--acade-warning)] p-3 text-sm text-[var(--acade-text)]">{enforcement}. Verify the APK and download URL before saving.</p>}
        {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[var(--acade-text)]">{notice}</p>}
        <Button type="submit" loading={saving} disabled={!dirty || uploading}>Save release notice</Button>
      </form></Card>
      <aside aria-label="Release preview" className="min-w-0 self-start lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
        <Card padding="sm"><h2 className="text-lg font-bold text-[var(--acade-text)]">Preview</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved draft' : 'Saved configuration'} · Android</p>
          <div className="mt-4 space-y-3 break-words">
            <p className="text-sm font-semibold text-[var(--acade-text)]">{draft.enabled ? mandatory ? enforcement : 'Optional update' : 'Notice is off'}</p>
            {draft.imageUrl && httpsUrl(draft.imageUrl) && <div className="h-28 overflow-hidden rounded-xl bg-[var(--acade-overlay)]"><img key={draft.imageUrl} src={draft.imageUrl} alt="Release notice artwork" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>}
            <h3 className="text-xl font-bold text-[var(--acade-text)]">{draft.headline || 'Release headline'}</h3>
            <p className="whitespace-pre-wrap text-sm text-[var(--acade-text-muted)]">{draft.message || 'Release message'}</p>
            <p className="text-sm text-[var(--acade-text-muted)]">Version {draft.latestVersion || '—'} · Build {draft.latestBuild || '—'}</p>
            <div className="rounded-xl bg-[var(--acade-primary)] px-4 py-3 text-center font-semibold text-[var(--acade-on-primary)]">Download update</div>
            {draft.enabled && draft.allowIgnore && <p className="text-center text-sm text-[var(--acade-text-muted)]">{draft.minSupportedBuild > 0 ? `Not now — only for builds ${draft.minSupportedBuild} and above` : 'Not now'}</p>}
          </div>
          <section aria-label="Build eligibility" className="mt-5 space-y-3 border-t border-[var(--acade-border)] pt-4">
            <h3 className="font-semibold text-[var(--acade-text)]">Build eligibility</h3>
            <Input label="Installed build" type="number" min={1} step={1} value={installedBuild} onChange={event => setInstalledBuild(event.target.value)} />
            <p className="text-sm text-[var(--acade-text-muted)]">Installed {installedBuild || '—'} / latest {draft.latestBuild}. Uses the {dirty ? 'draft' : 'saved'} settings.</p>
            <p role="status" className="text-sm text-[var(--acade-text)]">{eligibility}</p>
            <p className="text-xs text-[var(--acade-text-muted)]">Fresh configuration, before optional dismissal. Cached settings or a previously ignored release can suppress optional notices. This preview does not check a device or open the download.</p>
          </section>
        </Card>
      </aside>
    </div>
    <Modal open={confirming} onClose={() => setConfirming(false)} title="Publish mandatory update?" confirm={{ label: 'Publish mandatory notice', onConfirm: () => void save() }}>
      <p className="text-sm text-[var(--acade-text)]">{enforcement}. These users cannot ignore the notice. Confirm the download link points to the intended APK.</p>
    </Modal>
  </div>;
}

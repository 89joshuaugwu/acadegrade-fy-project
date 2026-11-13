'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { postAdminSettings, settingsCapabilities } from './api';
import { SaveBar } from './SaveBar';

export interface AppLinks { androidUrl: string; iosUrl: string }

interface AboutPageData {
  headline: string;
  platformDescription: string;
  mission: string;
  trustStatement: string;
  contactEmail: string;
}

const DEFAULT_ABOUT: AboutPageData = {
  headline: 'Academic progress, made clear.',
  platformDescription: 'AcadeGrade helps university students understand results, monitor degree progress, and make better academic decisions.',
  mission: 'Our mission is to give every student a dependable, understandable view of their academic journey.',
  trustStatement: 'Your academic records remain under your control. Sharing is explicit, revocable, and designed around privacy.',
  // No pre-filled address: saving the form must never publish an unconfirmed mailbox.
  contactEmail: '',
};

const ABOUT_TEXTAREAS: Array<{ key: keyof AboutPageData; label: string }> = [
  { key: 'platformDescription', label: 'Platform description' },
  { key: 'mission', label: 'Mission' },
  { key: 'trustStatement', label: 'Trust and privacy statement' },
];

const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

/** The AdMob app ID (not an ad unit ID): `~` separates the publisher and the app. */
export const ADMOB_APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const ADMOB_APP_ID_ERROR = 'The app ID must look like ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN (16 digits, a tilde, 10 digits).';

/** Settings → Public site: app download links and the About page, one save. */
export function PublicSiteSettings({ initialLinks, initialAdmobAppId, getToken }: {
  initialLinks: AppLinks;
  /** `config/settings.admobAndroidAppId`, used by the server to publish /app-ads.txt. */
  initialAdmobAppId: string;
  getToken: () => Promise<string>;
}) {
  const [savedLinks, setSavedLinks] = useState(initialLinks);
  const [links, setLinks] = useState(initialLinks);
  const [supportsAppId] = useState(() => settingsCapabilities.admobAndroidAppId());
  const [savedAppId, setSavedAppId] = useState(initialAdmobAppId);
  const [appId, setAppId] = useState(initialAdmobAppId);
  const [appIdError, setAppIdError] = useState<string | null>(null);
  const [about, setAbout] = useState<{ status: 'loading' | 'ready' | 'error'; saved: AboutPageData; draft: AboutPageData }>({ status: 'loading', saved: DEFAULT_ABOUT, draft: DEFAULT_ABOUT });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadAbout = useCallback(async () => {
    setAbout((current) => ({ ...current, status: 'loading' }));
    try {
      const response = await fetch('/api/about');
      if (!response.ok) throw new Error('About page request failed.');
      const json = await response.json() as { about?: Partial<AboutPageData> };
      const loaded = { ...DEFAULT_ABOUT, ...(json.about ?? {}) };
      setAbout({ status: 'ready', saved: loaded, draft: loaded });
    } catch {
      setAbout((current) => ({ ...current, status: 'error' }));
    }
  }, []);

  useEffect(() => { void loadAbout(); }, [loadAbout]);

  const linksDirty = !same(links, savedLinks);
  const aboutDirty = about.status === 'ready' && !same(about.draft, about.saved);
  const appIdDirty = supportsAppId && appId.trim() !== savedAppId.trim();
  const dirtyParts = [linksDirty && 'download links', appIdDirty && 'AdMob app ID', aboutDirty && 'About page'].filter((part): part is string => Boolean(part));

  const editLinks = (patch: Partial<AppLinks>) => { setLinks((current) => ({ ...current, ...patch })); setError(null); setNote(null); };
  const editAbout = (patch: Partial<AboutPageData>) => { setAbout((current) => ({ ...current, draft: { ...current.draft, ...patch } })); setError(null); setNote(null); };

  async function save() {
    const trimmedAppId = appId.trim();
    if (appIdDirty && trimmedAppId && !ADMOB_APP_ID.test(trimmedAppId)) {
      setAppIdError(ADMOB_APP_ID_ERROR);
      setError('Nothing was saved. Fix the AdMob app ID first.');
      return;
    }
    setSaving(true); setError(null); setNote(null);
    const failures: string[] = [];
    try {
      const token = await getToken();
      if (linksDirty) {
        const submitted = links;
        try {
          await postAdminSettings(token, { field: 'mobileAppLinks', value: submitted });
          setSavedLinks(submitted);
        } catch (cause) { failures.push(`Download links: ${cause instanceof Error ? cause.message : 'not saved'}`); }
      }
      if (appIdDirty) {
        try {
          await postAdminSettings(token, { field: 'admobAndroidAppId', value: trimmedAppId });
          setSavedAppId(trimmedAppId);
          setAppId(trimmedAppId);
        } catch (cause) { failures.push(`AdMob app ID: ${cause instanceof Error ? cause.message : 'not saved'}`); }
      }
      if (aboutDirty) {
        const submitted = about.draft;
        try {
          await postAdminSettings(token, { target: 'about', data: submitted });
          setAbout((current) => ({ ...current, saved: submitted }));
        } catch (cause) { failures.push(`About page: ${cause instanceof Error ? cause.message : 'not saved'}`); }
      }
    } catch {
      failures.push('Your admin session is unavailable. Nothing was saved.');
    } finally {
      setSaving(false);
    }
    if (failures.length) setError(failures.join(' ')); else setNote('Saved.');
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <section aria-labelledby="download-links-title" className="space-y-4">
          <div>
            <h2 id="download-links-title" className="text-lg font-semibold text-[var(--acade-text)]">App download links</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Shown on the home page and the sign-in and sign-up pages.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Android download link (APK)"
              type="url"
              value={links.androidUrl}
              onChange={(event) => editLinks({ androidUrl: event.target.value })}
              placeholder="https://…/acadegrade.apk"
              hint="Keep it the same as the download link in Android release."
            />
            <Input
              label="iOS App Store or TestFlight link"
              type="url"
              value={links.iosUrl}
              onChange={(event) => editLinks({ iosUrl: event.target.value })}
              placeholder="Leave blank until iOS is available"
              hint={'Blank shows "iOS coming soon".'}
            />
          </div>
          <p className="text-sm text-[var(--acade-text-muted)]">
            The update notice has its own link in <Link href="/admin/mobile-release" className="font-medium text-[var(--acade-primary)] underline underline-offset-2">Android release</Link>.
          </p>
        </section>
      </Card>

      {supportsAppId && (
        <Card padding="lg">
          <section aria-labelledby="ads-files-title" className="space-y-4">
            <div>
              <h2 id="ads-files-title" className="text-lg font-semibold text-[var(--acade-text)]">Ad verification files</h2>
              <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
                /ads.txt comes from the AdSense publisher ID in <Link href="/admin/ads?tab=networks" className="font-medium text-[var(--acade-primary)] underline underline-offset-2">Web ad networks</Link>.
              </p>
            </div>
            <Input
              label="AdMob Android app ID"
              value={appId}
              onChange={(event) => { setAppId(event.target.value); setAppIdError(null); setError(null); setNote(null); }}
              placeholder="ca-app-pub-0000000000000000~0000000000"
              spellCheck={false}
              autoComplete="off"
              hint="Used to publish app-ads.txt. Find it in AdMob under App settings; it contains a ~, unlike ad unit IDs."
              error={appIdError ?? undefined}
            />
          </section>
        </Card>
      )}

      <Card padding="lg">
        <section aria-labelledby="about-title" className="space-y-5">
          <div>
            <h2 id="about-title" className="text-lg font-semibold text-[var(--acade-text)]">About page</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">The text of the public About page.</p>
          </div>
          {about.status === 'loading' && <p role="status" className="text-sm text-[var(--acade-text-muted)]">Loading the About page…</p>}
          {about.status === 'error' && (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
              <p className="text-[var(--acade-danger)]">The About page text could not be loaded, so it cannot be edited right now.</p>
              <Button variant="ghost" size="sm" onClick={() => { void loadAbout(); }}>Try again</Button>
            </div>
          )}
          {about.status === 'ready' && (
            <>
              <Input label="Headline" value={about.draft.headline} maxLength={100} onChange={(event) => editAbout({ headline: event.target.value })} />
              {ABOUT_TEXTAREAS.map((field) => (
                <Textarea
                  key={field.key}
                  label={field.label}
                  rows={3}
                  value={about.draft[field.key]}
                  onChange={(event) => editAbout({ [field.key]: event.target.value })}
                />
              ))}
              <Input
                label="Public contact email"
                type="email"
                value={about.draft.contactEmail}
                onChange={(event) => editAbout({ contactEmail: event.target.value })}
                hint="Used for product and support enquiries."
              />
            </>
          )}
        </section>
      </Card>

      <SaveBar
        label="Save public site"
        dirtyParts={dirtyParts}
        saving={saving}
        error={error}
        note={note}
        onSave={() => { void save(); }}
        onDiscard={() => { setLinks(savedLinks); setAppId(savedAppId); setAppIdError(null); setAbout((current) => ({ ...current, draft: current.saved })); setError(null); setNote(null); }}
      />
    </div>
  );
}

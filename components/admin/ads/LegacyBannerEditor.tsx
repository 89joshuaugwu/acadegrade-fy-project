'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, Card, Input, Switch } from '@/components/ui';
import { legacyBannersToAdsConfig } from '@/lib/ads/config';
import { PreviewDisclosure } from './PlacementPreview';

export interface LegacyBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

export function LegacyBannerEditor({ initialBanners, onSave }: {
  initialBanners: LegacyBanner[];
  onSave: (banners: LegacyBanner[]) => Promise<void>;
}) {
  const [banners, setBanners] = useState(initialBanners);
  const [savedBanners, setSavedBanners] = useState(initialBanners);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(banners) !== JSON.stringify(savedBanners);

  const update = (index: number, patch: Partial<LegacyBanner>) => {
    setBanners((current) => current.map((banner, i) => i === index ? { ...banner, ...patch } : banner));
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading advert image...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'acadegrade_avatars');
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dgqukbs8n/image/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!data.secure_url) throw new Error('Upload failed');
      update(index, { imageUrl: data.secure_url });
      toast.success('Advert image uploaded. Remember to save.', { id: toastId });
    } catch {
      toast.error('Upload failed', { id: toastId });
    }
  };

  const save = async () => {
    const snapshot = banners;
    setError('');
    setSaving(true);
    try {
      await onSave(snapshot);
      // Edits made while saving stay as a draft against the new saved snapshot.
      setSavedBanners(snapshot);
      toast.success('Legacy banners saved.');
    } catch {
      setError('Legacy banners could not be saved. Your changes are still here; try again or discard them.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--acade-text)]">Legacy banners (fallback)</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">Shown on the web Dashboard when no campaign fits, even if website promotions are off. Turn a banner&apos;s Active switch off to stop it.</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setBanners((current) => [...current, { id: Date.now().toString(), imageUrl: '', linkUrl: '', isActive: true }])}>
          <Plus size={16} aria-hidden="true" /> Add banner
        </Button>
      </div>
      <div className="mt-6 space-y-4">
        {banners.map((banner, index) => (
          <div key={banner.id} className="space-y-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Advert #{index + 1}</span>
              <div className="flex items-center gap-3">
                <Switch checked={banner.isActive} onCheckedChange={(isActive) => update(index, { isActive })} aria-label={`Activate advert ${index + 1}`} />
                <Button variant="ghost" size="sm" className="text-[var(--acade-danger)]" onClick={() => setBanners((current) => current.filter((_, i) => i !== index))} aria-label={`Delete advert ${index + 1}`}><Trash2 size={16} /></Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input label={`Image URL for advert ${index + 1}`} value={banner.imageUrl} onChange={(event) => update(index, { imageUrl: event.target.value })} placeholder="https://..." />
                <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-[var(--acade-border)] px-4 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)]">Upload<input type="file" className="sr-only" accept="image/*" onChange={(event) => void upload(event, index)} /></label>
                {banner.imageUrl && <div className="mt-2 h-20 rounded-lg border border-[var(--acade-border)] bg-cover bg-center" style={{ backgroundImage: `url(${banner.imageUrl})` }} />}
              </div>
              <Input label={`Target link for advert ${index + 1}`} value={banner.linkUrl} onChange={(event) => update(index, { linkUrl: event.target.value })} placeholder="https://sponsor.com" />
            </div>
            <PreviewDisclosure
              label={`Preview advert ${index + 1}`}
              campaign={legacyBannersToAdsConfig([{ ...banner, isActive: true }])?.campaigns[0] ?? null}
              placements={['Dashboard overview']}
              unavailable={`Advert ${index + 1} is skipped on the site: its image (and link, if set) must be an HTTPS URL without a username or password.`}
            />
          </div>
        ))}
        {banners.length === 0 && <p className="rounded-xl border border-dashed border-[var(--acade-border)] p-6 text-center text-[var(--acade-text-muted)]">No legacy banners.</p>}
        {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--acade-border)] pt-4">
          <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={() => { setBanners(savedBanners); setError(''); }}>Discard changes</Button>
          <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void save()}><Save size={16} aria-hidden="true" /> Save legacy banners</Button>
        </div>
      </div>
    </Card>
  );
}

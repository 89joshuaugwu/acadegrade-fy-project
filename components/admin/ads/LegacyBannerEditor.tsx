'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, Card, Input, Switch } from '@/components/ui';

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
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await onSave(banners);
      toast.success('Settings updated successfully.');
    } catch {
      toast.error('Failed to update setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Legacy dashboard banners</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">Older image-and-link house promotions. Valid active banners can appear inline when no eligible new campaign is selected, with at most one view per banner every 6 hours in this browser. These save separately from house campaigns and do not use a pop-up modal.</p>
        </div>
        <Button size="sm" onClick={() => setBanners((current) => [...current, { id: Date.now().toString(), imageUrl: '', linkUrl: '', isActive: true }])}>
          <Plus size={16} /> Add Advert
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
                <label className="mt-2 inline-flex cursor-pointer rounded-xl border border-[var(--acade-border)] px-4 py-2 text-sm">Upload<input type="file" className="sr-only" accept="image/*" onChange={(event) => void upload(event, index)} /></label>
                {banner.imageUrl && <div className="mt-2 h-20 rounded-lg border border-[var(--acade-border)] bg-cover bg-center" style={{ backgroundImage: `url(${banner.imageUrl})` }} />}
              </div>
              <Input label={`Target link for advert ${index + 1}`} value={banner.linkUrl} onChange={(event) => update(index, { linkUrl: event.target.value })} placeholder="https://sponsor.com" />
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="rounded-xl border border-dashed border-[var(--acade-border)] p-6 text-center text-[var(--acade-text-muted)]">No sponsored adverts configured.</p>}
        <div className="flex justify-end"><Button size="sm" loading={saving} onClick={() => void save()}><Save size={16} /> Save Adverts</Button></div>
      </div>
    </Card>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { ErrorState, PageHeader } from '@/components/shared';
import { Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { AdsConfig } from '@/lib/ads/types';

interface AdsPayload {
  config: AdsConfig;
  legacyBannerCount: number;
}

export default function AdminAdsPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<AdsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/ads', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load ads configuration.');
      setPayload(result as AdsPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ads configuration.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const save = async (config: AdsConfig) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/ads', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to save ads configuration.');
    setPayload((current) => current ? { ...current, config: result.config } : current);
    toast.success('Ads configuration saved.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations / monetization"
        title="Advertising"
        description="Manage optional first-party placements without interrupting authentication, saving, or required student flows."
        seam="none"
        sticky={false}
        className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 md:-mx-8 md:-mt-8"
      />

      {loading ? (
        <div aria-busy="true" aria-label="Loading ads configuration" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : error ? (
        <Card padding="none">
          <ErrorState
            title="Advertising controls are unavailable"
            description={error}
            onRetry={() => { void load(); }}
          />
        </Card>
      ) : payload ? (
        <AdsEditor
          initialConfig={payload.config}
          legacyBannerCount={payload.legacyBannerCount}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

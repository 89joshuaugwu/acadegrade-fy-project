'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { ProviderEditor } from '@/components/admin/ads/ProviderEditor';
import { MobileAdsEditor } from '@/components/admin/ads/MobileAdsEditor';
import { LegacyBannerEditor, type LegacyBanner } from '@/components/admin/ads/LegacyBannerEditor';
import { ErrorState, PageHeader } from '@/components/shared';
import { Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { AdsConfig } from '@/lib/ads/types';
import type { ProviderConfig } from '@/lib/ads/providers';
import type { MobileAdsConfig } from '@/lib/ads/mobile';

interface AdsPayload {
  config: AdsConfig;
  legacyBannerCount: number;
}

export default function AdminAdsPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<AdsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legacyBanners, setLegacyBanners] = useState<LegacyBanner[] | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [mobileConfig, setMobileConfig] = useState<MobileAdsConfig | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [iosConfig, setIosConfig] = useState<MobileAdsConfig | null>(null);
  const [iosError, setIosError] = useState<string | null>(null);

  const loadIos = useCallback(async () => {
    if (!user) return;
    setIosError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/ads/ios', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load iOS ads.');
      setIosConfig(body.config);
    } catch (cause) { setIosError(cause instanceof Error ? cause.message : 'Could not load iOS ads.'); }
  }, [user]);
  useEffect(() => { void loadIos(); }, [loadIos]);

  const saveIos = async (config: MobileAdsConfig) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/ads/ios', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not save iOS ads.');
    setIosConfig(body.config);
    toast.success('iOS ad settings saved.');
  };

  const loadMobile = useCallback(async () => {
    if (!user) return;
    setMobileError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/ads/mobile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load Android ads.');
      setMobileConfig(body.config);
    } catch (cause) { setMobileError(cause instanceof Error ? cause.message : 'Could not load Android ads.'); }
  }, [user]);
  useEffect(() => { void loadMobile(); }, [loadMobile]);

  const saveMobile = async (config: MobileAdsConfig) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/ads/mobile', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not save Android ads.');
    setMobileConfig(body.config);
    toast.success('Android ad settings saved.');
  };

  const loadProviders = useCallback(async () => {
    if (!user) return;
    setProviderError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/ads/providers', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load provider settings.');
      setProviderConfig(body.config);
    } catch (cause) { setProviderError(cause instanceof Error ? cause.message : 'Unable to load provider settings.'); }
  }, [user]);
  useEffect(() => { void loadProviders(); }, [loadProviders]);

  const saveProviders = async (config: ProviderConfig) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/ads/providers', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to save provider settings.');
    setProviderConfig(body.config);
    toast.success('Provider settings saved.');
  };

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

  const loadLegacy = useCallback(async () => {
    if (!user) return;
    setLegacyError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load dashboard banners.');
      setLegacyBanners(result.settings?.advertBanners || []);
    } catch (loadError) {
      setLegacyError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard banners.');
    }
  }, [user]);

  useEffect(() => { void loadLegacy(); }, [loadLegacy]);

  const saveLegacy = async (banners: LegacyBanner[]) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'advertBanners', value: banners }),
    });
    if (!response.ok) throw new Error('Unable to save dashboard banners.');
    setLegacyBanners(banners);
  };

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
        <>
          <h2 className="text-2xl font-semibold text-[var(--acade-text)]">Web and first-party campaigns</h2>
          <AdsEditor
            initialConfig={payload.config}
            legacyBannerCount={payload.legacyBannerCount}
            onSave={save}
          />
          {providerError ? <Card padding="none"><ErrorState title="Provider settings are unavailable" description={providerError} onRetry={() => { void loadProviders(); }} /></Card>
            : providerConfig ? <ProviderEditor initialConfig={providerConfig} onSave={saveProviders} />
            : <Skeleton className="h-56 rounded-2xl" aria-label="Loading provider settings" />}
          {mobileError ? <Card padding="none"><ErrorState title="Android ads are unavailable" description={mobileError} onRetry={() => { void loadMobile(); }} /></Card>
            : mobileConfig ? <MobileAdsEditor initialConfig={mobileConfig} onSave={saveMobile} />
            : <Skeleton className="h-56 rounded-2xl" aria-label="Loading Android ad settings" />}
          {iosError ? <Card padding="none"><ErrorState title="iOS ads are unavailable" description={iosError} onRetry={() => { void loadIos(); }} /></Card>
            : iosConfig ? <MobileAdsEditor platform="iOS" initialConfig={iosConfig} onSave={saveIos} />
            : <Skeleton className="h-56 rounded-2xl" aria-label="Loading iOS ad settings" />}
          <h2 className="text-2xl font-semibold text-[var(--acade-text)]">Legacy House banners</h2>
          {legacyError ? (
            <Card padding="none"><ErrorState title="Dashboard banners are unavailable" description={legacyError} onRetry={() => { void loadLegacy(); }} /></Card>
          ) : legacyBanners ? (
            <LegacyBannerEditor initialBanners={legacyBanners} onSave={saveLegacy} />
          ) : (
            <Skeleton className="h-56 rounded-2xl" aria-label="Loading dashboard banners" />
          )}
        </>
      ) : null}
    </div>
  );
}

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { AdvertisingSections } from '@/components/admin/ads/AdvertisingSections';
import { DeliveryDiagnostics } from '@/components/admin/ads/DeliveryDiagnostics';
import { ProviderEditor, networkStates } from '@/components/admin/ads/ProviderEditor';
import { MobileAdsEditor, admobBannerState } from '@/components/admin/ads/MobileAdsEditor';
import { LegacyBannerEditor, type LegacyBanner } from '@/components/admin/ads/LegacyBannerEditor';
import { RewardedReadiness } from '@/components/admin/rewarded/RewardedReadiness';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ErrorState } from '@/components/shared';
import { Button, Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { diagnoseAndroidHousePlacements, diagnoseWebPlacements } from '@/lib/ads/diagnostics';
import { parseHouseConfig, type HouseConfig } from '@/lib/ads/house';
import type { AdsConfig } from '@/lib/ads/types';
import type { ProviderConfig } from '@/lib/ads/providers';
import type { MobileAdsConfig } from '@/lib/ads/mobile';
import type { AdsTab } from '@/lib/help/admin-help';

interface AdsPayload {
  config: AdsConfig;
  legacyBannerCount: number;
  /** Stored campaigns that are skipped at delivery, or an unreadable stored configuration. */
  warnings?: string[];
}

const TABS: ReadonlyArray<{ id: AdsTab; label: string }> = [
  { id: 'status', label: 'Status' },
  { id: 'house', label: 'House promotions' },
  { id: 'networks', label: 'Web ad networks' },
  { id: 'admob', label: 'Android AdMob' },
];
const isTab = (value: string | null | undefined): value is AdsTab => TABS.some((tab) => tab.id === value);

function readTabFromLocation(): AdsTab | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('tab');
  return isTab(value) ? value : null;
}

/** The active tab: the address when it names one, otherwise the last tab chosen here. */
function useAdsTab() {
  const params = useSearchParams();
  const fromUrl = params?.get('tab') ?? null;
  // A choice made here holds until the address changes (for example a Help link to ?tab=).
  const [choice, setChoice] = useState<{ tab: AdsTab; seenUrl: string | null } | null>(() => {
    const initial = readTabFromLocation();
    return initial ? { tab: initial, seenUrl: fromUrl } : null;
  });
  const tab: AdsTab = choice && choice.seenUrl === fromUrl ? choice.tab : isTab(fromUrl) ? fromUrl : choice?.tab ?? 'status';
  const select = useCallback((next: string) => {
    if (!isTab(next)) return;
    setChoice({ tab: next, seenUrl: fromUrl });
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }, [fromUrl]);
  return [tab, select] as const;
}

function AdsLoading({ label }: { label: string }) {
  return <div role="status" aria-label={label} aria-busy="true">
    <span className="sr-only">{label}</span>
    <Skeleton className="h-56 rounded-2xl" />
  </div>;
}

const formatTime = (value: number) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminAdsPage() {
  return <Suspense fallback={<AdsLoading label="Loading advertising" />}><AdvertisingPage /></Suspense>;
}

function AdvertisingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useAdsTab();
  const [payload, setPayload] = useState<AdsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legacyBanners, setLegacyBanners] = useState<LegacyBanner[] | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [mobileConfig, setMobileConfig] = useState<MobileAdsConfig | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [houseConfig, setHouseConfig] = useState<HouseConfig | null>(null);
  const [houseError, setHouseError] = useState<string | null>(null);
  const [iosConfig, setIosConfig] = useState<MobileAdsConfig | null>(null);
  const [iosError, setIosError] = useState<string | null>(null);
  /** Saved coin master switch from Free uses & coins; null when it could not be read. */
  const [coinsEnabled, setCoinsEnabled] = useState<boolean | null>(null);
  // Diagnostics evaluate schedules at this moment; refreshed on demand and after each save.
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const recheck = () => setCheckedAt(Date.now());

  const request = useCallback(async (path: string, init?: { method: 'PUT' | 'POST'; body: unknown }) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    return fetch(path, init
      ? { method: init.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }
      : { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }, [user]);

  const loadHouse = useCallback(async () => {
    if (!user) return;
    setHouseError(null);
    try {
      const response = await request('/api/admin/ads/house');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load Android house promotions.');
      setHouseConfig(parseHouseConfig(body.config));
    } catch (cause) { setHouseError(cause instanceof Error ? cause.message : 'Could not load Android house promotions.'); }
  }, [request, user]);

  const loadIos = useCallback(async () => {
    if (!user) return;
    setIosError(null);
    try {
      const response = await request('/api/admin/ads/ios');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load iOS ads.');
      setIosConfig(body.config);
    } catch (cause) { setIosError(cause instanceof Error ? cause.message : 'Could not load iOS ads.'); }
  }, [request, user]);

  const loadMobile = useCallback(async () => {
    if (!user) return;
    setMobileError(null);
    try {
      const response = await request('/api/admin/ads/mobile');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load Android ads.');
      setMobileConfig(body.config);
    } catch (cause) { setMobileError(cause instanceof Error ? cause.message : 'Could not load Android ads.'); }
  }, [request, user]);

  const loadProviders = useCallback(async () => {
    if (!user) return;
    setProviderError(null);
    try {
      const response = await request('/api/admin/ads/providers');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load web ad networks.');
      setProviderConfig(body.config);
    } catch (cause) { setProviderError(cause instanceof Error ? cause.message : 'Unable to load web ad networks.'); }
  }, [request, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await request('/api/admin/ads');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load house promotions.');
      setPayload(result as AdsPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load house promotions.');
    } finally {
      setLoading(false);
    }
  }, [request, user]);

  const loadLegacy = useCallback(async () => {
    if (!user) return;
    setLegacyError(null);
    try {
      const response = await request('/api/admin/settings');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load legacy banners.');
      setLegacyBanners(result.settings?.advertBanners || []);
    } catch (loadError) {
      setLegacyError(loadError instanceof Error ? loadError.message : 'Unable to load legacy banners.');
    }
  }, [request, user]);

  const loadCoins = useCallback(async () => {
    if (!user) return;
    try {
      const response = await request('/api/admin/usage');
      const body = await response.json().catch(() => null);
      const enabled = body?.policy?.coins?.enabled;
      setCoinsEnabled(response.ok && typeof enabled === 'boolean' ? enabled : null);
    } catch { setCoinsEnabled(null); }
  }, [request, user]);

  useEffect(() => {
    void load(); void loadLegacy(); void loadProviders(); void loadHouse(); void loadMobile(); void loadIos(); void loadCoins();
  }, [load, loadCoins, loadHouse, loadIos, loadLegacy, loadMobile, loadProviders]);

  const put = async (path: string, config: unknown, failure: string) => {
    const response = await request(path, { method: 'PUT', body: { config } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || failure);
    return body.config;
  };

  const saveWeb = async (config: AdsConfig) => {
    const saved = await put('/api/admin/ads', config, 'Unable to save website promotions.');
    setPayload((current) => current ? { ...current, config: saved } : current);
    toast.success('Website promotions saved.');
    recheck();
  };
  const saveHouse = async (config: HouseConfig) => {
    setHouseConfig(parseHouseConfig(await put('/api/admin/ads/house', config, 'Could not save Android house promotions.')));
    toast.success('Android house promotions saved.');
    recheck();
  };
  const saveProviders = async (config: ProviderConfig) => {
    setProviderConfig(await put('/api/admin/ads/providers', config, 'Unable to save web ad networks.'));
    toast.success('Web ad networks saved.');
    recheck();
  };
  const saveMobile = async (config: MobileAdsConfig) => {
    setMobileConfig(await put('/api/admin/ads/mobile', config, 'Could not save Android ads.'));
    toast.success('Android ad settings saved.');
  };
  const saveIos = async (config: MobileAdsConfig) => {
    setIosConfig(await put('/api/admin/ads/ios', config, 'Could not save iOS ads.'));
    toast.success('iOS ad settings saved.');
  };
  const saveLegacy = async (banners: LegacyBanner[]) => {
    const response = await request('/api/admin/settings', { method: 'POST', body: { field: 'advertBanners', value: banners } });
    if (!response.ok) throw new Error('Unable to save legacy banners.');
    setLegacyBanners(banners);
    recheck();
  };

  const savedLegacy = legacyError ? null : legacyBanners;
  const webDiagnoses = useMemo(() => {
    const pending = (loading && !error) || (!legacyBanners && !legacyError) || (!providerConfig && !providerError);
    if (pending) return null;
    return diagnoseWebPlacements({ adsConfig: payload?.config ?? null, legacyBanners: savedLegacy, providerConfig, now: checkedAt });
  }, [checkedAt, error, legacyBanners, legacyError, loading, payload, providerConfig, providerError, savedLegacy]);
  const androidDiagnoses = useMemo(() => {
    const pending = (!houseConfig && !houseError) || (loading && !error) || (!legacyBanners && !legacyError);
    if (pending) return null;
    return diagnoseAndroidHousePlacements({ houseConfig, adsConfig: payload?.config ?? null, legacyBanners: savedLegacy, now: checkedAt });
  }, [checkedAt, error, houseConfig, houseError, legacyBanners, legacyError, loading, payload, savedLegacy]);

  const networks = providerConfig ? networkStates(providerConfig) : null;
  const readiness = <RewardedReadiness mobileAds={mobileError ? null : mobileConfig} coinsEnabled={coinsEnabled} />;
  const houseReady = (!loading || error) && (houseConfig || houseError);
  const unavailable = (title: string, description: string, retry: () => void) =>
    <ErrorState title={title} description={description} onRetry={retry} />;

  const legacyEditor = legacyError
    ? <Card padding="none">{unavailable('Legacy banners are unavailable', legacyError, () => { void loadLegacy(); })}</Card>
    : legacyBanners ? <LegacyBannerEditor initialBanners={legacyBanners} onSave={saveLegacy} />
    : <AdsLoading label="Loading legacy banners" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Advertising"
        description="Your own promotions, web ad networks and Android AdMob, with what each slot should show right now."
        helpId={`admin.ads.${tab}`}
      />

      <AdvertisingSections id="ads" label="Advertising" selectedId={tab} onSelect={setTab} sections={[
        {
          id: 'status', label: 'Status',
          content: <div className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-[var(--acade-text-muted)]">From saved settings only. It is not proof that an ad rendered or filled.</p>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-xs text-[var(--acade-text-muted)]">Checked {formatTime(checkedAt)}</p>
                <Button variant="ghost" size="sm" onClick={recheck}><RotateCcw className="size-4" aria-hidden="true" /> Recheck now</Button>
              </div>
            </div>
            <ul aria-label="Other ad sources" className="grid gap-2 text-sm sm:grid-cols-2">
              <li className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--acade-overlay)] px-4 py-2">
                <span className="text-[var(--acade-text)]">Web ad networks: <span className="font-semibold">{
                  providerError ? 'Unknown' : !networks ? 'Loading…'
                    : networks.adsense === 'Off' && networks.adsterra === 'Off' ? 'Off'
                    : `AdSense ${networks.adsense}, Adsterra ${networks.adsterra}`
                }</span></span>
                <button type="button" onClick={() => setTab('networks')} className="text-xs font-semibold text-[var(--acade-primary)] underline-offset-2 hover:underline">Open</button>
              </li>
              <li className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--acade-overlay)] px-4 py-2">
                <span className="text-[var(--acade-text)]">AdMob banners: <span className="font-semibold">{mobileError ? 'Unknown' : mobileConfig ? admobBannerState(mobileConfig) : 'Loading…'}</span></span>
                <button type="button" onClick={() => setTab('admob')} className="text-xs font-semibold text-[var(--acade-primary)] underline-offset-2 hover:underline">Open</button>
              </li>
            </ul>
            {tab === 'status' && readiness}
            <DeliveryDiagnostics compact title="Website" diagnoses={webDiagnoses} checkedAt={checkedAt} />
            <DeliveryDiagnostics compact title="Android app" diagnoses={androidDiagnoses} checkedAt={checkedAt} />
          </div>,
        },
        {
          id: 'house', label: 'House promotions',
          content: <>
            {payload?.warnings && payload.warnings.length > 0 && (
              <div role="alert" className="rounded-2xl border border-[var(--acade-warning)]/35 bg-[var(--acade-warning)]/10 px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
                <p className="font-semibold">Some saved campaigns are not being served</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--acade-text-muted)]">
                  {payload.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
                <p className="mt-2 text-[var(--acade-text-muted)]">They are not shown below, and saving removes them from storage.</p>
              </div>
            )}
            {!houseReady ? <AdsLoading label="Loading house promotions" />
              : <AdsEditor
                initialConfig={error ? null : payload?.config ?? null}
                webUnavailable={unavailable('Website promotions are unavailable', error ?? 'Unable to load house promotions.', () => { void load(); })}
                onSave={saveWeb}
                android={{
                  initialConfig: houseConfig,
                  onSave: saveHouse,
                  unavailable: unavailable('Android house promotions are unavailable', houseError ?? 'Could not load Android house promotions.', () => { void loadHouse(); }),
                }}
                advanced={legacyEditor}
              />}
          </>,
        },
        {
          id: 'networks', label: 'Web ad networks',
          content: providerError ? <Card padding="none">{unavailable('Web ad networks are unavailable', providerError, () => { void loadProviders(); })}</Card>
            : providerConfig ? <ProviderEditor initialConfig={providerConfig} onSave={saveProviders} />
            : <AdsLoading label="Loading web ad networks" />,
        },
        {
          id: 'admob', label: 'Android AdMob',
          content: <>
            {mobileError ? <Card padding="none">{unavailable('Android ads are unavailable', mobileError, () => { void loadMobile(); })}</Card>
              : mobileConfig ? <MobileAdsEditor initialConfig={mobileConfig} onSave={saveMobile} rewardedReadiness={tab === 'admob' ? readiness : null} />
              : <AdsLoading label="Loading Android ad settings" />}
            <details className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-5">
              <summary className="cursor-pointer text-base font-semibold text-[var(--acade-text)]">iOS (not live; configuration only)</summary>
              <div className="mt-4">
                {iosError ? <Card padding="none">{unavailable('iOS ads are unavailable', iosError, () => { void loadIos(); })}</Card>
                  : iosConfig ? <MobileAdsEditor platform="iOS" initialConfig={iosConfig} onSave={saveIos} />
                  : <AdsLoading label="Loading iOS ad settings" />}
              </div>
            </details>
          </>,
        },
      ]} />
    </div>
  );
}

/**
 * Configuration diagnostics for the admin Advertising page.
 *
 * Pure computation over saved settings that mirrors the delivery rules in
 * `components/ads/AdPlacement.tsx`, `lib/ads/house.ts` and the Android
 * house-promotion selector. It explains what the saved configuration should
 * serve; it is not evidence that anything rendered, was approved, or filled.
 */
import { legacyBannersToAdsConfig, PLACEMENT_NAMES } from './config';
import { getEligibleCampaigns } from './delivery';
import type { HouseConfig } from './house';
import type { ProviderConfig } from './providers';
import { AD_PLACEMENT_IDS, type AdCampaign, type AdPlacementId, type AdsConfig } from './types';

export type DiagnosisOutcome = 'house' | 'legacy' | 'none' | 'unknown';

export interface DiagnosisCandidate {
  id: string;
  name: string;
  source: 'campaign' | 'legacy';
  /** Whole-number percentage of selections before per-viewer caps apply. */
  share: number;
  campaign: AdCampaign;
  warnings: string[];
}

export interface ProviderDiagnosis {
  provider: 'adsense' | 'adsterra';
  label: string;
  state: 'requested' | 'incomplete' | 'off' | 'unavailable';
  summary: string;
  detail: string;
}

export interface PlacementDiagnosis {
  key: string;
  label: string;
  outcome: DiagnosisOutcome;
  summary: string;
  /** Why the outcome was reached, in evaluation order. */
  reasons: string[];
  /** Problems an administrator can act on. */
  warnings: string[];
  /** Behaviour that applies even when the outcome is correct. */
  notes: string[];
  candidates: DiagnosisCandidate[];
  /** Earliest saved schedule boundary after `now` that can change the outcome. */
  nextChangeAt: string | null;
}

export interface WebPlacementDiagnosis extends PlacementDiagnosis {
  placementId: AdPlacementId;
  providers: ProviderDiagnosis[];
}

export interface AndroidPlacementDiagnosis extends PlacementDiagnosis {
  placement: 'dashboard' | 'results';
}

const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;
const formatDate = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

function scheduleState(campaign: AdCampaign, now: number): 'pending' | 'ended' | 'running' {
  const startsAt = campaign.schedule.startsAt ? Date.parse(campaign.schedule.startsAt) : null;
  const endsAt = campaign.schedule.endsAt ? Date.parse(campaign.schedule.endsAt) : null;
  if (startsAt !== null && now < startsAt) return 'pending';
  if (endsAt !== null && now >= endsAt) return 'ended';
  return 'running';
}

function nextBoundary(campaigns: AdCampaign[], now: number) {
  const future = campaigns.flatMap((campaign) => [campaign.schedule.startsAt, campaign.schedule.endsAt])
    .filter((value): value is string => value !== null && Date.parse(value) > now)
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  return future[0] ?? null;
}

function creativeWarnings(campaign: AdCampaign) {
  const warnings: string[] = [];
  if (!campaign.creative.imageUrl) warnings.push('No image — shows as a text-only card.');
  else if (!campaign.creative.altText) warnings.push('Image has no alternative text for screen readers.');
  if (!campaign.linkUrl) warnings.push('No destination URL — the card is not clickable.');
  else if (!campaign.creative.ctaLabel) warnings.push('No call-to-action label — the card links without a visible prompt.');
  return warnings;
}

function candidates(campaigns: AdCampaign[], source: DiagnosisCandidate['source']): DiagnosisCandidate[] {
  const weighted = campaigns.filter((campaign) => Number.isFinite(campaign.weight) && campaign.weight > 0);
  const total = weighted.reduce((sum, campaign) => sum + campaign.weight, 0);
  return weighted.map((campaign) => ({
    id: campaign.id,
    name: source === 'legacy' ? `Legacy banner ${campaign.id}` : campaign.name,
    source,
    share: Math.round((campaign.weight / total) * 100),
    campaign,
    warnings: source === 'legacy' ? [] : creativeWarnings(campaign),
  }));
}

function capNote(campaigns: AdCampaign[], audience: string) {
  const caps = campaigns.map((campaign) => `${campaign.name}: ${campaign.frequencyCap.maxImpressions} views per ${campaign.frequencyCap.windowHours} h`);
  return `Caps apply per ${audience} (${caps.join('; ')}). A view counts only when at least half the card is visible; a capped campaign hands over to the next eligible one.`;
}

/** Explains why campaigns that target a placement are not inside their window. */
function campaignReasons(targeting: AdCampaign[], now: number) {
  const reasons: string[] = [];
  const inactive = targeting.filter((campaign) => !campaign.active);
  if (inactive.length) reasons.push(`${plural(inactive.length, 'targeting campaign is', 'targeting campaigns are')} not marked active.`);
  for (const campaign of targeting.filter((item) => item.active)) {
    const state = scheduleState(campaign, now);
    if (state === 'pending') reasons.push(`${campaign.name} starts ${formatDate(campaign.schedule.startsAt!)}.`);
    if (state === 'ended') reasons.push(`${campaign.name} ended ${formatDate(campaign.schedule.endsAt!)}.`);
  }
  return reasons;
}

interface LegacyState {
  available: boolean;
  campaigns: AdCampaign[];
  skipped: number;
}

function legacyState(banners: unknown[] | null): LegacyState {
  if (banners === null) return { available: false, campaigns: [], skipped: 0 };
  const active = banners.filter((banner) => !!banner && typeof banner === 'object' && (banner as { isActive?: unknown }).isActive === true).length;
  const campaigns = legacyBannersToAdsConfig(banners)?.campaigns ?? [];
  return { available: true, campaigns, skipped: active - campaigns.length };
}

function legacyWarnings(legacy: LegacyState) {
  if (!legacy.available) return ['Legacy banners could not be checked, so fallback status is unknown.'];
  return legacy.skipped > 0
    ? [`${plural(legacy.skipped, 'active legacy banner is', 'active legacy banners are')} skipped because its image or link is not an HTTPS URL.`]
    : [];
}

const UNAVAILABLE_DETAIL = 'Retry the Ad networks section to check this placement.';

function adsenseDiagnosis({ adsense }: ProviderConfig): ProviderDiagnosis {
  const label = 'Google AdSense';
  const missing = [!adsense.publisherId && 'publisher ID', !adsense.slotId && 'slot ID'].filter(Boolean).join(' and ');
  if (adsense.enabled && !missing) {
    return { provider: 'adsense', label, state: 'requested', summary: `Requests unit ${adsense.slotId} on this placement.`, detail: 'Account approval, consent, ad blockers and fill cannot be verified from admin. An unfilled unit stays hidden.' };
  }
  if (adsense.enabled) {
    return { provider: 'adsense', label, state: 'incomplete', summary: `Enabled, but the ${missing} is missing, so nothing is requested.`, detail: 'Add both IDs in Ad networks and save.' };
  }
  return { provider: 'adsense', label, state: 'off', summary: missing ? 'Off — IDs not set.' : 'Off — IDs are saved but the switch is off.', detail: 'No AdSense script loads while this is off.' };
}

function adsterraDiagnosis({ adsterra }: ProviderConfig): ProviderDiagnosis {
  const label = 'Adsterra SmartLink';
  if (adsterra.enabled && adsterra.smartLinkUrl) {
    return { provider: 'adsterra', label, state: 'requested', summary: 'Shows the sponsored SmartLink card on this placement.', detail: 'An outbound link only; partner availability, clicks and payouts cannot be verified from admin.' };
  }
  if (adsterra.enabled) {
    return { provider: 'adsterra', label, state: 'incomplete', summary: 'Enabled, but the SmartLink URL is missing, so no card is shown.', detail: 'Add the HTTPS SmartLink in Ad networks and save.' };
  }
  return { provider: 'adsterra', label, state: 'off', summary: adsterra.smartLinkUrl ? 'Off — link saved but the switch is off.' : 'Off — no SmartLink saved.', detail: 'No sponsored link card is shown while this is off.' };
}

function providerDiagnoses(config: ProviderConfig | null): ProviderDiagnosis[] {
  if (!config) {
    return [
      { provider: 'adsense', label: 'Google AdSense', state: 'unavailable', summary: 'Provider settings could not be loaded.', detail: UNAVAILABLE_DETAIL },
      { provider: 'adsterra', label: 'Adsterra SmartLink', state: 'unavailable', summary: 'Provider settings could not be loaded.', detail: UNAVAILABLE_DETAIL },
    ];
  }
  return [adsenseDiagnosis(config), adsterraDiagnosis(config)];
}

function servingSummary(house: DiagnosisCandidate[]) {
  const names = house.map((item) => `${item.name} (${item.share}%)`).join(', ');
  return `House campaign${house.length > 1 ? 's' : ''} should serve: ${names}.`;
}

export interface WebDiagnosticsInput {
  adsConfig: AdsConfig | null;
  /** Raw legacy banner records; `null` when they could not be loaded. */
  legacyBanners: unknown[] | null;
  providerConfig: ProviderConfig | null;
  now: number;
}

/** Ad-network units and legacy banners are mounted only on the Dashboard. */
const PROVIDER_PLACEMENTS: ReadonlySet<AdPlacementId> = new Set(['dashboard.overview']);
const LEGACY_PLACEMENTS: ReadonlySet<AdPlacementId> = new Set(['dashboard.overview']);

export function diagnoseWebPlacements({ adsConfig, legacyBanners, providerConfig, now }: WebDiagnosticsInput): WebPlacementDiagnosis[] {
  const legacy = legacyState(legacyBanners);
  const legacyConfig = legacyBannersToAdsConfig(legacyBanners);

  return AD_PLACEMENT_IDS.map((placementId) => {
    const label = adsConfig?.placements.find((item) => item.id === placementId)?.name ?? PLACEMENT_NAMES[placementId];
    const providers = PROVIDER_PLACEMENTS.has(placementId) ? providerDiagnoses(providerConfig) : [];
    const base = { key: `web:${placementId}`, placementId, label, providers, warnings: [] as string[], notes: [] as string[], candidates: [] as DiagnosisCandidate[], nextChangeAt: null as string | null };
    const usesLegacy = LEGACY_PLACEMENTS.has(placementId);

    if (!adsConfig) {
      return { ...base, outcome: 'unknown' as const, summary: 'House campaign settings could not be loaded.', reasons: ['Retry My promotions to check this placement.'] };
    }

    const placement = adsConfig.placements.find((item) => item.id === placementId);
    const blockers: string[] = [];
    if (!adsConfig.enabled) blockers.push('House campaign master switch is off.');
    if (!adsConfig.deliveryModes.house) blockers.push('House / internal format is off.');
    if (!placement) blockers.push('Placement is not saved yet, so it is treated as off.');
    else if (!placement.enabled) blockers.push('Placement switch is off.');

    const targeting = adsConfig.campaigns.filter((campaign) => campaign.placementIds.includes(placementId));
    const running = targeting.filter((campaign) => campaign.active && campaign.deliveryMode === 'house' && scheduleState(campaign, now) === 'running');
    const nextChangeAt = nextBoundary(targeting.filter((campaign) => campaign.active), now);
    const reasons: string[] = [];
    let house: DiagnosisCandidate[] = [];

    if (blockers.length) {
      reasons.push(...blockers);
      if (running.length) reasons.push(`${plural(running.length, 'campaign')} would otherwise be eligible.`);
    } else if (!targeting.length) {
      reasons.push('No campaign targets this placement.');
    } else if (!running.length) {
      reasons.push(...campaignReasons(targeting, now));
    } else {
      house = candidates(getEligibleCampaigns(adsConfig, placementId, { now }), 'campaign');
      if (!house.length) reasons.push('Every eligible campaign has a delivery weight of 0.');
    }

    const warnings = usesLegacy ? legacyWarnings(legacy) : [];
    const legacyCandidates = usesLegacy && legacyConfig ? candidates(getEligibleCampaigns(legacyConfig, placementId, { now }), 'legacy') : [];
    const legacyNote = 'Legacy banners follow only their own active switches; house campaign switches do not turn them off.';

    if (house.length) {
      const notes = [capNote(house.map((item) => item.campaign), 'browser')];
      if (legacyCandidates.length) notes.push(`${plural(legacyCandidates.length, 'legacy banner')} on standby as fallback once a browser reaches every campaign cap. ${legacyNote}`);
      else if (usesLegacy) notes.push('No legacy fallback: once a browser reaches every campaign cap, the slot stays empty.');
      return { ...base, outcome: 'house' as const, summary: servingSummary(house), reasons: [`${plural(house.length, 'campaign')} active, in schedule and targeting this placement.`], warnings, notes, candidates: house, nextChangeAt };
    }

    if (legacyCandidates.length) {
      return { ...base, outcome: 'legacy' as const, summary: 'Legacy banner fallback should serve.', reasons: [...reasons, `No house campaign is eligible, so ${plural(legacyCandidates.length, 'active legacy banner')} fill the slot.`], warnings, notes: [legacyNote, 'Each legacy banner shows at most once per 6 h in a browser.'], candidates: legacyCandidates, nextChangeAt };
    }

    return { ...base, outcome: 'none' as const, summary: 'No house promotion should serve here.', reasons: usesLegacy && legacy.available ? [...reasons, 'No active legacy banner is available as fallback.'] : reasons, warnings, notes: usesLegacy ? [] : ['Legacy banners are never used on this placement.'], nextChangeAt };
  });
}

export interface AndroidDiagnosticsInput {
  houseConfig: HouseConfig | null;
  adsConfig: AdsConfig | null;
  legacyBanners: unknown[] | null;
  now: number;
}

const ANDROID_LABELS = { dashboard: 'Android Dashboard overview', results: 'Android Results overview' } as const;

export function diagnoseAndroidHousePlacements({ houseConfig, adsConfig, legacyBanners, now }: AndroidDiagnosticsInput): AndroidPlacementDiagnosis[] {
  const legacy = legacyState(legacyBanners);
  return (['dashboard', 'results'] as const).map((placement) => {
    const base = { key: `android:${placement}`, placement, label: ANDROID_LABELS[placement], warnings: [] as string[], candidates: [] as DiagnosisCandidate[], nextChangeAt: null as string | null };
    const notes = [
      'Website master, format and placement switches do not apply to Android.',
      'Needs an Android build with the house-promotion renderer; installed builds cannot be checked from here.',
    ];
    if (!houseConfig) return { ...base, outcome: 'unknown' as const, summary: 'Android house-promotion settings could not be loaded.', reasons: ['Retry Android house promotions to check this placement.'], notes };
    if (!houseConfig.enabled) return { ...base, outcome: 'none' as const, summary: 'Off on Android.', reasons: ['Android sharing switch is off.'], notes };
    if (!houseConfig.placements[placement]) return { ...base, outcome: 'none' as const, summary: 'Off on this Android placement.', reasons: ['Placement switch is off.'], notes };
    if (!adsConfig) return { ...base, outcome: 'unknown' as const, summary: 'Website house campaigns could not be loaded, so Android campaigns are unknown.', reasons: ['Retry My promotions to check this placement.'], notes };

    // Mirrors buildHouseDelivery: active house campaigns that target web Dashboard overview.
    const activeHouse = adsConfig.campaigns.filter((campaign) => campaign.active && campaign.deliveryMode === 'house');
    const shared = activeHouse.filter((campaign) => campaign.placementIds.includes('dashboard.overview'));
    const unshared = activeHouse.length - shared.length;
    const running = shared.filter((campaign) => scheduleState(campaign, now) === 'running');
    const house = candidates(running, 'campaign');
    const nextChangeAt = nextBoundary(shared, now);
    const reasons: string[] = [];
    if (!shared.length) reasons.push('No active house campaign is shared with Android.');
    else if (!running.length) reasons.push(...campaignReasons(shared, now));
    else if (!house.length) reasons.push('Every eligible campaign has a delivery weight of 0.');
    const unsharedReasons = unshared
      ? [`${plural(unshared, 'active campaign is', 'active campaigns are')} not shared because Android uses only campaigns that target web Dashboard overview.`]
      : [];
    const warnings = houseConfig.includeLegacy ? legacyWarnings(legacy) : [];
    const capped = 'Caps apply per Android installation and count only visible promotions on the focused screen.';

    if (house.length) {
      return { ...base, outcome: 'house' as const, summary: servingSummary(house), reasons: [`${plural(house.length, 'shared campaign')} in schedule.`, ...unsharedReasons], warnings, notes: [capNote(house.map((item) => item.campaign), 'installation'), ...notes], candidates: house, nextChangeAt };
    }
    reasons.push(...unsharedReasons);
    const legacyCandidates = houseConfig.includeLegacy ? candidates(legacy.campaigns.slice(0, 24), 'legacy') : [];
    if (legacyCandidates.length) {
      return { ...base, outcome: 'legacy' as const, summary: 'Legacy banner fallback should serve.', reasons: [...reasons, `${plural(legacyCandidates.length, 'active legacy banner')} fill the slot because no shared campaign is eligible.`], warnings, notes: [capped, ...notes], candidates: legacyCandidates, nextChangeAt };
    }
    if (!houseConfig.includeLegacy && legacy.campaigns.length) reasons.push('Android legacy fallback is off.');
    else if (houseConfig.includeLegacy && legacy.available) reasons.push('No active legacy banner is available as fallback.');
    return { ...base, outcome: 'none' as const, summary: 'No house promotion should serve here.', reasons, warnings, notes, nextChangeAt };
  });
}

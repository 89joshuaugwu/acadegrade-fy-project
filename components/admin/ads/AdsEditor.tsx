'use client';

import { useState, type ReactNode } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { Button, Card, Modal, Switch } from '@/components/ui';
import { EmptyState } from '@/components/shared';
import { describeAdsConfigError, parseAdsConfig, withKnownPlacements } from '@/lib/ads/config';
import { parseHouseConfig, type HouseConfig } from '@/lib/ads/house';
import type { AdCampaign, AdsConfig } from '@/lib/ads/types';
import { getCampaignStatus } from '@/lib/ads/delivery';
import { CampaignEditor, placementLabel } from './CampaignEditor';

interface AdsEditorProps {
  /** Saved website house campaigns (`config/settings.adsConfig`), or null when they could not load. */
  initialConfig: AdsConfig | null;
  onSave: (config: AdsConfig) => Promise<void>;
  /** Shown in place of the website column and campaigns when `initialConfig` is null. */
  webUnavailable?: ReactNode;
  /** Android house promotions (`config/mobileHouseAds`). Omit to edit the website only. */
  android?: {
    initialConfig: HouseConfig | null;
    onSave: (config: HouseConfig) => Promise<void>;
    /** Shown in place of the Android column when `initialConfig` is null. */
    unavailable?: ReactNode;
  };
  /** Extra content for the collapsed Advanced section, e.g. the legacy banner editor. */
  advanced?: ReactNode;
}

function createCampaignDraft(config: AdsConfig): AdCampaign {
  const firstPlacement = config.placements.find((placement) => placement.enabled)
    ?? config.placements[0];
  return {
    id: `house-${Date.now().toString(36)}-${config.campaigns.length + 1}`,
    name: 'New house campaign',
    placementIds: firstPlacement ? [firstPlacement.id] : [],
    deliveryMode: 'house',
    active: false,
    schedule: { startsAt: null, endsAt: null },
    weight: 1,
    frequencyCap: { maxImpressions: 3, windowHours: 24 },
    creative: {
      imageUrl: '',
      altText: '',
      headline: 'New house campaign',
      body: '',
      ctaLabel: '',
    },
    linkUrl: '',
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * House promotions: where they show on the website and in the Android app,
 * the campaigns themselves, and one save bar for both stores.
 */
export function AdsEditor({ initialConfig, onSave, webUnavailable, android, advanced }: AdsEditorProps) {
  // Older saved configurations omit newer placements; list them as off.
  const [config, setConfig] = useState(() => initialConfig ? withKnownPlacements(initialConfig) : null);
  const [savedConfig, setSavedConfig] = useState(() => initialConfig ? withKnownPlacements(initialConfig) : null);
  const [house, setHouse] = useState(() => android?.initialConfig ? parseHouseConfig(android.initialConfig) : null);
  const [savedHouse, setSavedHouse] = useState(house);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState('');
  const [campaignToDelete, setCampaignToDelete] = useState<AdCampaign | null>(null);

  const webDirty = config !== null && !same(config, savedConfig);
  const houseDirty = house !== null && !same(house, savedHouse);
  const dirtyParts = [webDirty && 'website', houseDirty && 'Android app'].filter(Boolean) as string[];

  const changeWeb = (next: AdsConfig) => { setConfig(next); setSavedNote(''); };
  const changeHouse = (next: HouseConfig) => { setHouse(next); setSavedNote(''); };

  const duplicateCampaign = (campaign: AdCampaign) => {
    if (!config) return;
    const suffix = config.campaigns.filter((item) => item.id.startsWith(`${campaign.id}-copy`)).length + 1;
    changeWeb({
      ...config,
      campaigns: [...config.campaigns, {
        ...campaign,
        id: `${campaign.id}-copy-${suffix}`,
        name: `${campaign.name} copy`,
        active: false,
      }],
    });
  };

  const save = async () => {
    setErrors([]);
    setSavedNote('');
    // Validate everything first, so an invalid campaign never leaves Android half-saved.
    let validWeb: AdsConfig | null = null;
    let validHouse: HouseConfig | null = null;
    try {
      if (webDirty && config) validWeb = parseAdsConfig(config);
    } catch (cause) {
      setErrors([cause instanceof Error ? describeAdsConfigError(cause.message) : 'Website promotions are not valid.']);
      return;
    }
    try {
      if (houseDirty && house) validHouse = parseHouseConfig(house);
    } catch (cause) {
      setErrors([`Android app: ${cause instanceof Error ? cause.message : 'settings are not valid.'}`]);
      return;
    }

    setSaving(true);
    const failures: string[] = [];
    const saved: string[] = [];
    if (validWeb && config) {
      const submitted = config;
      try {
        await onSave(validWeb);
        const persisted = validWeb;
        setConfig((current) => current && same(current, submitted) ? persisted : current);
        setSavedConfig(persisted);
        saved.push('Website saved.');
      } catch (cause) {
        failures.push(`Website: ${cause instanceof Error ? describeAdsConfigError(cause.message) : 'could not be saved.'}`);
      }
    }
    if (validHouse && house && android) {
      const submitted = house;
      try {
        await android.onSave(validHouse);
        const persisted = validHouse;
        setHouse((current) => current && same(current, submitted) ? persisted : current);
        setSavedHouse(persisted);
        saved.push('Android app saved.');
      } catch (cause) {
        failures.push(`Android app: ${cause instanceof Error ? cause.message : 'could not be saved.'}`);
      }
    }
    setErrors(failures);
    setSavedNote(saved.join(' '));
    setSaving(false);
  };

  const discard = () => {
    setConfig(savedConfig);
    setHouse(savedHouse);
    setErrors([]);
    setSavedNote('');
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="where-promotions-show" className="space-y-3">
        <h2 id="where-promotions-show" className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
          Where promotions show
        </h2>
        <Card padding="none" className="grid divide-y divide-[var(--acade-border-subtle)] md:grid-cols-2 md:divide-x md:divide-y-0">
          {config ? (
            <fieldset className="min-w-0 space-y-1 p-5">
              <legend className="sr-only">Website</legend>
              <p aria-hidden="true" className="pb-2 text-sm font-semibold text-[var(--acade-text)]">Website</p>
              <SwitchRow
                label="Show house promotions on the website"
                checked={config.enabled}
                onChange={(enabled) => changeWeb({ ...config, enabled })}
              />
              {config.placements.map((placement) => (
                <SwitchRow
                  key={placement.id}
                  label={placementLabel(placement)}
                  ariaLabel={`Website ${placementLabel(placement)} slot`}
                  indent
                  checked={placement.enabled}
                  onChange={(enabled) => changeWeb({
                    ...config,
                    placements: config.placements.map((item) => item.id === placement.id ? { ...item, enabled } : item),
                  })}
                />
              ))}
            </fieldset>
          ) : <div className="p-5">{webUnavailable}</div>}

          {android && (house ? (
            <fieldset className="min-w-0 space-y-1 p-5">
              <legend className="sr-only">Android app</legend>
              <p aria-hidden="true" className="pb-2 text-sm font-semibold text-[var(--acade-text)]">Android app</p>
              <SwitchRow
                label="Show house promotions in the Android app"
                checked={house.enabled}
                onChange={(enabled) => changeHouse({ ...house, enabled })}
              />
              {(['dashboard', 'results'] as const).map((slot) => (
                <SwitchRow
                  key={slot}
                  label={slot === 'dashboard' ? 'Dashboard' : 'Results'}
                  ariaLabel={`Android ${slot === 'dashboard' ? 'Dashboard' : 'Results'} slot`}
                  indent
                  checked={house.placements[slot]}
                  onChange={(value) => changeHouse({ ...house, placements: { ...house.placements, [slot]: value } })}
                />
              ))}
              <SwitchRow
                label="Use legacy banners when no campaign fits"
                checked={house.includeLegacy}
                onChange={(includeLegacy) => changeHouse({ ...house, includeLegacy })}
              />
            </fieldset>
          ) : <div className="p-5">{android.unavailable}</div>)}
        </Card>
      </section>

      {config && (
        <section aria-labelledby="campaigns-heading" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="campaigns-heading" className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Campaigns</h2>
            <Button variant="outline" onClick={() => changeWeb({ ...config, campaigns: [...config.campaigns, createCampaignDraft(config)] })}>
              <Plus className="size-4" aria-hidden="true" /> Add campaign
            </Button>
          </div>

          {config.campaigns.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={<Megaphone className="size-9" aria-hidden="true" />}
                title="No house campaigns yet"
                description="Add a campaign when you have a message that helps students without blocking a task."
              />
            </Card>
          ) : config.campaigns.map((campaign, index) => (
            <CampaignEditor
              key={campaign.id}
              campaign={campaign}
              placements={config.placements}
              onChange={(updated) => changeWeb({
                ...config,
                campaigns: config.campaigns.map((item, itemIndex) => itemIndex === index ? updated : item),
              })}
              onRemove={() => setCampaignToDelete(campaign)}
              onDuplicate={() => duplicateCampaign(campaign)}
              status={getCampaignStatus(config, campaign)}
              unsaved={webDirty}
            />
          ))}
        </section>
      )}

      {(config || advanced) && (
        <details className="group rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-5">
          <summary className="cursor-pointer text-base font-semibold text-[var(--acade-text)]">Advanced</summary>
          <div className="mt-4 space-y-4">
            {config && (
              <SwitchRow
                label="Allow house delivery mode"
                hint="Keep on."
                checked={config.deliveryModes.house}
                onChange={(houseMode) => changeWeb({ ...config, deliveryModes: { ...config.deliveryModes, house: houseMode } })}
              />
            )}
            {advanced}
          </div>
        </details>
      )}

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-xl border border-[var(--acade-danger)]/30 bg-[var(--acade-danger-dim)] px-4 py-3 text-sm text-[var(--acade-danger)]">
          {errors.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-3 shadow-[var(--shadow-popover)]">
        <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">
          {savedNote && <span className="mr-1 text-[var(--acade-text)]">{savedNote}</span>}
          {dirtyParts.length ? `Unsaved changes: ${dirtyParts.join(' and ')}` : 'All changes saved'}
        </p>
        <Button variant="ghost" disabled={!dirtyParts.length || saving} onClick={discard}>Discard changes</Button>
        <Button loading={saving} loadingLabel="Saving house promotions…" disabled={!dirtyParts.length} onClick={() => void save()}>
          Save house promotions
        </Button>
      </div>

      <Modal
        open={campaignToDelete !== null}
        onClose={() => setCampaignToDelete(null)}
        title={`Delete ${campaignToDelete?.name ?? 'campaign'}?`}
        description="This removes the campaign from your unsaved changes."
        confirm={{
          label: 'Delete campaign',
          onConfirm: () => {
            if (campaignToDelete) {
              setConfig((current) => current && ({
                ...current,
                campaigns: current.campaigns.filter((campaign) => campaign.id !== campaignToDelete.id),
              }));
            }
            setCampaignToDelete(null);
          },
        }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">You can discard this change before saving.</p>
      </Modal>
    </div>
  );
}

function SwitchRow({ label, ariaLabel, hint, checked, onChange, indent = false }: {
  label: string;
  ariaLabel?: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  indent?: boolean;
}) {
  return (
    <div className={`flex min-h-12 items-center justify-between gap-4 ${indent ? 'pl-4' : ''}`}>
      <div className="min-w-0">
        <p className={`text-sm ${indent ? 'text-[var(--acade-text-muted)]' : 'font-medium text-[var(--acade-text)]'}`}>{label}</p>
        {hint && <p className="text-xs text-[var(--acade-text-muted)]">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={ariaLabel ?? label} />
    </div>
  );
}

export type { AdsEditorProps };

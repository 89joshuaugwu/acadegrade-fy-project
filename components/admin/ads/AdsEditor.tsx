'use client';

import { useState } from 'react';
import { Megaphone, Plus, ShieldCheck } from 'lucide-react';
import { Button, Card, Switch } from '@/components/ui';
import { EmptyState } from '@/components/shared';
import { parseAdsConfig } from '@/lib/ads/config';
import type { AdCampaign, AdsConfig } from '@/lib/ads/types';
import { CampaignEditor } from './CampaignEditor';

interface AdsEditorProps {
  initialConfig: AdsConfig;
  legacyBannerCount: number;
  onSave: (config: AdsConfig) => Promise<void>;
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

export function AdsEditor({ initialConfig, legacyBannerCount, onSave }: AdsEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCampaigns = config.campaigns.filter((campaign) => campaign.active).length;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const validated = parseAdsConfig(config);
      await onSave(validated);
      setConfig(validated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ads configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card padding="lg">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                <Megaphone className="size-5" aria-hidden="true" />
              </div>
              <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
                Global delivery
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
                This kill switch controls every campaign in the typed ads system. Required flows never contain placements.
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
              aria-label="Enable all typed ad delivery"
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--acade-border-subtle)] pt-5 sm:grid-cols-3">
            <Metric label="Campaigns" value={config.campaigns.length} />
            <Metric label="Active" value={activeCampaigns} />
            <Metric label="Live placements" value={config.placements.filter((item) => item.enabled).length} />
          </div>
        </Card>

        <Card padding="lg" className="border-[var(--acade-primary)]/20">
          <ShieldCheck className="size-6 text-[var(--acade-success)]" aria-hidden="true" />
          <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
            Safe by default
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
            House campaigns are available now. Rewarded and third-party delivery remain locked until consent, policy, and provider controls exist.
          </p>
          {legacyBannerCount > 0 && (
            <p className="mt-4 rounded-xl bg-[var(--acade-overlay)] px-3 py-2 text-xs leading-5 text-[var(--acade-text-muted)]">
              {legacyBannerCount} legacy banners remain active through the backward-compatible dashboard modal.
            </p>
          )}
        </Card>
      </div>

      <Card padding="lg">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
              Delivery modes
            </h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Future modes are visible for planning but cannot be enabled or saved as active.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ModeControl label="House / internal" description="First-party product and partner messages." checked={config.deliveryModes.house} onChange={(house) => setConfig({ ...config, deliveryModes: { ...config.deliveryModes, house } })} />
          <ModeControl label="Rewarded" description="Future opt-in value exchange." checked={false} disabled ariaLabel="Enable rewarded delivery" />
          <ModeControl label="Third-party" description="Future consented ad-network inventory." checked={false} disabled ariaLabel="Enable third-party delivery" />
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Placements</h2>
        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Enable only surfaces where an optional promotion will not interrupt the student.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {config.placements.map((placement) => (
            <div key={placement.id} className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4">
              <div className="min-w-0">
                <p className="font-medium text-[var(--acade-text)]">{placement.name}</p>
                <p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">{placement.id}</p>
              </div>
              <Switch
                checked={placement.enabled}
                onCheckedChange={(enabled) => setConfig({
                  ...config,
                  placements: config.placements.map((item) => item.id === placement.id ? { ...item, enabled } : item),
                })}
                aria-label={`Enable ${placement.name.toLowerCase()} placement`}
              />
            </div>
          ))}
        </div>
      </Card>

      <section aria-labelledby="campaigns-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="campaigns-heading" className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-[var(--acade-text)]">Campaigns</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Schedule, weight, and cap each first-party promotion.</p>
          </div>
          <Button onClick={() => setConfig({ ...config, campaigns: [...config.campaigns, createCampaignDraft(config)] })}>
            <Plus className="size-4" aria-hidden="true" /> Add campaign
          </Button>
        </div>

        {config.campaigns.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Megaphone className="size-9" aria-hidden="true" />}
              title="No typed campaigns yet"
              description="Create a house campaign when you have a message that adds value without blocking a task."
            />
          </Card>
        ) : config.campaigns.map((campaign, index) => (
          <CampaignEditor
            key={campaign.id}
            campaign={campaign}
            placements={config.placements}
            onChange={(updated) => setConfig({
              ...config,
              campaigns: config.campaigns.map((item, itemIndex) => itemIndex === index ? updated : item),
            })}
            onRemove={() => setConfig({
              ...config,
              campaigns: config.campaigns.filter((_, itemIndex) => itemIndex !== index),
            })}
          />
        ))}
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-[var(--acade-danger)]/30 bg-[var(--acade-danger-dim)] px-4 py-3 text-sm text-[var(--acade-danger)]">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 flex justify-end rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)]/95 p-3 shadow-[var(--shadow-float)] backdrop-blur">
        <Button loading={saving} loadingLabel="Saving ads configuration…" onClick={save}>
          Save ads configuration
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[var(--acade-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--acade-text-muted)]">{label}</p>
    </div>
  );
}

function ModeControl({
  label,
  description,
  checked,
  onChange = () => undefined,
  disabled = false,
  ariaLabel,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4">
      <div>
        <p className="font-medium text-[var(--acade-text)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--acade-text-muted)]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={ariaLabel ?? `Enable ${label.toLowerCase()} delivery`} />
    </div>
  );
}

export type { AdsEditorProps };

'use client';

import { Trash2 } from 'lucide-react';
import { Button, Card, Input, Switch, Textarea } from '@/components/ui';
import type { AdCampaign, AdPlacementConfig } from '@/lib/ads/types';

interface CampaignEditorProps {
  campaign: AdCampaign;
  placements: AdPlacementConfig[];
  onChange: (campaign: AdCampaign) => void;
  onRemove: () => void;
}

function toLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function CampaignEditor({ campaign, placements, onChange, onRemove }: CampaignEditorProps) {
  const update = <Key extends keyof AdCampaign>(key: Key, value: AdCampaign[Key]) => {
    onChange({ ...campaign, [key]: value });
  };

  return (
    <Card padding="lg" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
              {campaign.name}
            </h2>
            <span className="rounded-full border border-[var(--acade-border)] px-2.5 py-1 text-xs font-medium text-[var(--acade-text-muted)]">
              House
            </span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">
            {campaign.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={campaign.active}
            onCheckedChange={(active) => update('active', active)}
            aria-label={`Activate ${campaign.name}`}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${campaign.name}`}
            onClick={onRemove}
            className="text-[var(--acade-danger)]"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Campaign name"
          value={campaign.name}
          maxLength={100}
          onChange={(event) => update('name', event.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${campaign.id}-mode`} className="text-sm font-medium text-[var(--acade-text-muted)]">
            Delivery mode
          </label>
          <select
            id={`${campaign.id}-mode`}
            value={campaign.deliveryMode}
            onChange={(event) => update('deliveryMode', event.target.value as AdCampaign['deliveryMode'])}
            className="h-12 w-full rounded-xl border border-[var(--acade-control-border)] bg-[var(--acade-deep)] px-4 text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20"
          >
            <option value="house">House / internal</option>
            <option value="rewarded" disabled>Rewarded (coming later)</option>
            <option value="third-party" disabled>Third-party (coming later)</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Placements</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {placements.map((placement) => {
            const checked = campaign.placementIds.includes(placement.id);
            return (
              <label
                key={placement.id}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-4 py-3 text-sm text-[var(--acade-text)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => update(
                    'placementIds',
                    event.target.checked
                      ? [...campaign.placementIds, placement.id]
                      : campaign.placementIds.filter((id) => id !== placement.id)
                  )}
                  className="size-4 accent-[var(--acade-primary)]"
                />
                <span>{placement.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Headline"
          value={campaign.creative.headline}
          maxLength={100}
          onChange={(event) => update('creative', { ...campaign.creative, headline: event.target.value })}
        />
        <Input
          label="Call-to-action label"
          value={campaign.creative.ctaLabel}
          maxLength={40}
          placeholder="Learn more"
          onChange={(event) => update('creative', { ...campaign.creative, ctaLabel: event.target.value })}
        />
        <div className="md:col-span-2">
          <Textarea
            label="Supporting copy"
            value={campaign.creative.body}
            maxLength={280}
            rows={3}
            onChange={(event) => update('creative', { ...campaign.creative, body: event.target.value })}
          />
        </div>
        <Input
          label="Creative image URL"
          type="url"
          value={campaign.creative.imageUrl}
          placeholder="https://…"
          onChange={(event) => update('creative', { ...campaign.creative, imageUrl: event.target.value })}
        />
        <Input
          label="Image alternative text"
          value={campaign.creative.altText}
          maxLength={180}
          hint="Describe the image; leave empty only when it is decorative."
          onChange={(event) => update('creative', { ...campaign.creative, altText: event.target.value })}
        />
        <Input
          label="Destination URL"
          type="url"
          value={campaign.linkUrl}
          placeholder="https://…"
          onChange={(event) => update('linkUrl', event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Starts at"
          type="datetime-local"
          value={toLocalDateTime(campaign.schedule.startsAt)}
          onChange={(event) => update('schedule', {
            ...campaign.schedule,
            startsAt: fromLocalDateTime(event.target.value),
          })}
        />
        <Input
          label="Ends at"
          type="datetime-local"
          value={toLocalDateTime(campaign.schedule.endsAt)}
          onChange={(event) => update('schedule', {
            ...campaign.schedule,
            endsAt: fromLocalDateTime(event.target.value),
          })}
        />
        <Input
          label="Delivery weight"
          type="number"
          min={1}
          max={100}
          value={campaign.weight}
          onChange={(event) => update('weight', Number(event.target.value))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Max views"
            type="number"
            min={1}
            max={100}
            value={campaign.frequencyCap.maxImpressions}
            onChange={(event) => update('frequencyCap', {
              ...campaign.frequencyCap,
              maxImpressions: Number(event.target.value),
            })}
          />
          <Input
            label="Hours"
            type="number"
            min={1}
            max={720}
            value={campaign.frequencyCap.windowHours}
            onChange={(event) => update('frequencyCap', {
              ...campaign.frequencyCap,
              windowHours: Number(event.target.value),
            })}
          />
        </div>
      </div>
    </Card>
  );
}

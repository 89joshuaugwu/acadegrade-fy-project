'use client';

import { Copy, Trash2 } from 'lucide-react';
import { Button, Input, Switch, Textarea } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeFields';
import { Checkbox } from '@/components/admin/ui/Checkbox';
import { describeCampaignUrlProblem } from '@/lib/ads/config';
import type { AdCampaign, AdPlacementConfig } from '@/lib/ads/types';
import { cn } from '@/lib/utils/cn';
import { PreviewDisclosure } from './PlacementPreview';

/** Digits only, as a number: what the old number field produced for whole numbers ('' gives 0). */
const wholeNumber = (value: string) => Number(value.replace(/[^0-9]/g, ''));

interface CampaignEditorProps {
  campaign: AdCampaign;
  placements: AdPlacementConfig[];
  onChange: (campaign: AdCampaign) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  status: { label: string; tone: 'success' | 'muted' };
  unsaved?: boolean;
}

/** Short slot names, the same words the "Where promotions show" switches use. */
export function placementLabel(placement: Pick<AdPlacementConfig, 'id' | 'name'>) {
  if (placement.id === 'dashboard.overview') return 'Dashboard';
  if (placement.id === 'results.overview') return 'Results';
  return placement.name;
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

export function CampaignEditor({ campaign, placements, onChange, onRemove, onDuplicate, status, unsaved = false }: CampaignEditorProps) {
  const update = <Key extends keyof AdCampaign>(key: Key, value: AdCampaign[Key]) => {
    onChange({ ...campaign, [key]: value });
  };

  return (
    <section className="min-w-0 space-y-6 rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="ag-admin-h2 text-[1.25rem] leading-7">
              {campaign.name}
            </h2>
            <span className={status.tone === 'success'
              ? 'inline-flex items-center gap-1.5 rounded-full bg-[var(--acade-success-dim)] px-2.5 py-1 text-xs font-medium text-[var(--acade-success)]'
              : 'inline-flex items-center gap-1.5 rounded-full bg-[var(--acade-overlay)] px-2.5 py-1 text-xs font-medium text-[var(--acade-text-muted)]'}>
              <span aria-hidden="true" className={status.tone === 'success' ? 'size-1.5 rounded-full bg-[var(--acade-success)]' : 'size-1.5 rounded-full bg-[var(--acade-text-faint)]'} />
              {status.label === 'Live' ? 'Eligible' : status.label}{unsaved ? ' (unsaved)' : ''}
            </span>
          </div>
          <p className="mt-1 break-all text-xs text-[var(--acade-text-faint)]">
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
            aria-label={`Duplicate ${campaign.name}`}
            onClick={onDuplicate}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
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
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Show on</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {placements.map((placement) => {
              const checked = campaign.placementIds.includes(placement.id);
              const hintId = placement.id === 'dashboard.overview' ? `${campaign.id}-android-hint` : undefined;
              return (
                <Checkbox
                  key={placement.id}
                  checked={checked}
                  aria-describedby={hintId}
                  onChange={(event) => update(
                    'placementIds',
                    event.target.checked
                      ? [...campaign.placementIds, placement.id]
                      : campaign.placementIds.filter((id) => id !== placement.id)
                  )}
                  label={placementLabel(placement)}
                  className={cn(
                    'flex min-h-12 items-center rounded-[12px] border px-4 py-2.5 transition-colors',
                    checked ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]' : 'border-[var(--acade-border)] bg-[var(--acade-surface)]',
                  )}
                />
              );
            })}
          </div>
          <p id={`${campaign.id}-android-hint`} className="mt-2 text-xs leading-5 text-[var(--acade-text-muted)]">
            Android shows Dashboard-ticked campaigns on its Dashboard and Results-ticked ones on its Results screen.
          </p>
        </fieldset>
      </div>

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
          error={describeCampaignUrlProblem(campaign.creative.imageUrl) ?? undefined}
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
          error={describeCampaignUrlProblem(campaign.linkUrl) ?? undefined}
          onChange={(event) => update('linkUrl', event.target.value)}
        />
      </div>

      <PreviewDisclosure
        label={`Preview ${campaign.name}`}
        campaign={campaign}
        placements={placements.filter((placement) => campaign.placementIds.includes(placement.id)).map((placement) => placement.name)}
        className="rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-4 py-3"
      />

      <div className="grid gap-4 rounded-[16px] border border-[var(--acade-border-subtle)] bg-[color-mix(in_srgb,var(--acade-overlay)_45%,transparent)] p-4 sm:grid-cols-2">
        <DateTimeField
          label="Starts at"
          value={toLocalDateTime(campaign.schedule.startsAt)}
          onChange={(value) => update('schedule', {
            ...campaign.schedule,
            startsAt: fromLocalDateTime(value),
          })}
        />
        <DateTimeField
          label="Ends at"
          value={toLocalDateTime(campaign.schedule.endsAt)}
          onChange={(value) => update('schedule', {
            ...campaign.schedule,
            endsAt: fromLocalDateTime(value),
          })}
        />
        <Input
          label="Delivery weight"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          hint="1 to 100"
          className="tabular-nums"
          value={campaign.weight}
          onChange={(event) => update('weight', wholeNumber(event.target.value))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Max views"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            hint="1 to 100"
            className="tabular-nums"
            value={campaign.frequencyCap.maxImpressions}
            onChange={(event) => update('frequencyCap', {
              ...campaign.frequencyCap,
              maxImpressions: wholeNumber(event.target.value),
            })}
          />
          <Input
            label="Hours"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            hint="1 to 720"
            className="tabular-nums"
            value={campaign.frequencyCap.windowHours}
            onChange={(event) => update('frequencyCap', {
              ...campaign.frequencyCap,
              windowHours: wholeNumber(event.target.value),
            })}
          />
        </div>
      </div>
    </section>
  );
}

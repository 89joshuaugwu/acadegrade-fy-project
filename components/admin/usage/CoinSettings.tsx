'use client';

import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { panelClass } from '@/components/admin/ui/Panel';
import { TableFrame } from '@/components/admin/ui/TableFrame';
import { cn } from '@/lib/utils/cn';
import { FEATURE_IDS } from '@/lib/usage/policy';
import { FEATURE_LABELS, featureKey, type DraftValue, type PolicyDraft } from './draft';

interface CoinSettingsProps {
  draft: PolicyDraft;
  invalid: ReadonlySet<string>;
  onChange: (key: string, value: DraftValue) => void;
}

export const LEGACY_REFRESH_NOTE = 'Without coins, a verified rewarded ad gives one extra Written Analysis refresh (max 2 per UTC day).';

const whole = (value: DraftValue) => {
  const number = Number(String(value).trim());
  return String(value).trim() && Number.isInteger(number) ? number : null;
};

/** What the earning settings produce for one student on one UTC day. */
function earningPreview(draft: PolicyDraft) {
  const perAd = whole(draft['coins.coinsPerAd']);
  const dailyCap = whole(draft['coins.dailyEarnCap']);
  const balanceCap = whole(draft['coins.balanceCap']);
  if (!perAd || perAd < 1 || dailyCap === null || dailyCap < 0 || !balanceCap || balanceCap < 1) return 'Enter whole numbers to preview earning.';
  if (dailyCap === 0) return 'Earning is paused: a daily earn cap of 0 credits nothing. Existing balances can still be spent.';
  const ads = Math.ceil(dailyCap / perAd);
  return `One verified ad adds ${perAd} ${perAd === 1 ? 'coin' : 'coins'}. ${ads} ${ads === 1 ? 'ad reaches' : 'ads reach'} the ${dailyCap}-coin daily cap, and the balance stops growing at ${balanceCap}.`;
}

export function CoinSettings({ draft, invalid, onChange }: CoinSettingsProps) {
  const enabled = draft['coins.enabled'] === true;
  // Whole-number text fields (no native spinners); the ranges are checked on save by invalidFields().
  const numberInput = (key: string, props: { label?: string; ariaLabel?: string; hint?: string }) => {
    return <Input key={key} label={props.label} aria-label={props.ariaLabel} hint={props.hint}
      type="text" inputMode="numeric" autoComplete="off"
      value={String(draft[key] ?? '')} aria-invalid={invalid.has(key) ? 'true' : undefined}
      onChange={event => onChange(key, event.target.value)}
      className={props.label ? 'tabular-nums' : 'h-11 px-3 text-right tabular-nums'} />;
  };
  const blocked = FEATURE_IDS.filter(id => draft[featureKey(id, 'enabled')] === true && whole(draft[featureKey(id, 'dailyUseCap')]) === 0);

  return <section aria-labelledby="coin-settings-title" className={cn(panelClass, 'space-y-6 p-5 sm:p-6')}>
    <div className="min-w-0">
      <h2 id="coin-settings-title" className="ag-admin-h2">Coins (Android)</h2>
      <p className="mt-1 max-w-[65ch] text-sm text-[var(--acade-text-muted)]">
        Students earn coins from rewarded ads and spend them when a feature&apos;s free uses run out. Coins are not money.
      </p>
    </div>

    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-overlay)] px-4 py-2">
      <div className="min-w-0">
        <p id="coins-master-label" className="font-medium text-[var(--acade-text)]">Let Android users earn and spend coins</p>
        <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">{enabled ? 'On: prices show in the Android app.' : 'Off: nobody earns or spends coins.'}</p>
      </div>
      <Switch aria-label="Let Android users earn and spend coins" checked={enabled} onCheckedChange={value => onChange('coins.enabled', value)} />
    </div>

    <fieldset className="space-y-4">
      <legend className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">Earning, per student</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        {numberInput('coins.coinsPerAd', { label: 'Coins per ad', hint: '1 to 10 per verified ad.' })}
        {numberInput('coins.dailyEarnCap', { label: 'Daily earn cap', hint: '0 to 100 per UTC day. 0 pauses earning.' })}
        {numberInput('coins.balanceCap', { label: 'Balance cap', hint: '1 to 500. Earning stops at this balance.' })}
      </div>
      <p className="rounded-[12px] bg-[var(--acade-primary-dim)] px-4 py-3 text-sm text-[var(--acade-text)]">{enabled ? earningPreview(draft) : 'Coins are off: nobody earns or spends coins.'}</p>
    </fieldset>

    <fieldset className="space-y-3">
      <legend className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">Spending</legend>
      <p className="text-sm text-[var(--acade-text-muted)]">Coins pay only when a feature&apos;s free uses run out. Coin uses are counted per UTC day.</p>
      <TableFrame label="Coin prices per feature">
        <table className="ag-table min-w-[30rem]">
          <caption className="sr-only">Coin prices and daily coin uses per feature</caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Coins allowed</th>
              <th scope="col" className="ag-right">Price</th>
              <th scope="col" className="ag-right">Coin uses per day</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_IDS.map(id => {
              const label = FEATURE_LABELS[id];
              return <tr key={id}>
                <th scope="row" className="px-4 py-2 text-left font-medium text-[var(--acade-text)]">{label}</th>
                <td className="py-1"><Switch aria-label={`Coins allowed for ${label}`} checked={draft[featureKey(id, 'enabled')] === true} onCheckedChange={value => onChange(featureKey(id, 'enabled'), value)} /></td>
                <td className="w-28 py-2">{numberInput(featureKey(id, 'price'), { ariaLabel: `${label} coin price` })}</td>
                <td className="w-36 py-2">{numberInput(featureKey(id, 'dailyUseCap'), { ariaLabel: `${label} coin uses per day` })}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </TableFrame>
      <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">Price 1 to 20 coins. Coin uses per day 0 to 50.</p>
      {blocked.length > 0 && <p className="flex items-start gap-2 text-sm text-[var(--acade-text)]">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--acade-warning)]" aria-hidden="true" />
        <span>{blocked.map(id => FEATURE_LABELS[id]).join(', ')}: 0 coin uses per day blocks every coin-paid request.</span>
      </p>}
    </fieldset>

    {!enabled && <div className="space-y-1 border-t border-[var(--acade-border-subtle)] pt-4">
      <h3 className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">Legacy extra refresh</h3>
      <p className="text-sm text-[var(--acade-text-muted)]">{LEGACY_REFRESH_NOTE}</p>
    </div>}
  </section>;
}

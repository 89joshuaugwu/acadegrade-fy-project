'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { FEATURE_IDS } from '@/lib/usage/policy';
import { FEATURE_LABELS, featureKey, NUMBER_FIELDS, type DraftValue, type PolicyDraft } from './draft';

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
  const numberInput = (key: string, props: { label?: string; ariaLabel?: string; hint?: string }) => {
    const spec = NUMBER_FIELDS[key];
    return <Input key={key} label={props.label} aria-label={props.ariaLabel} hint={props.hint}
      type="number" inputMode="numeric" min={spec.min} max={spec.max} step={1}
      value={String(draft[key] ?? '')} aria-invalid={invalid.has(key) ? 'true' : undefined}
      onChange={event => onChange(key, event.target.value)} />;
  };
  const blocked = FEATURE_IDS.filter(id => draft[featureKey(id, 'enabled')] === true && whole(draft[featureKey(id, 'dailyUseCap')]) === 0);

  return <Card>
    <section aria-labelledby="coin-settings-title" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="coin-settings-title" className="text-lg font-semibold text-[var(--acade-text)]">Coins (Android)</h2>
          <p className="mt-1 max-w-[65ch] text-sm text-[var(--acade-text-muted)]">
            Students earn coins from rewarded ads and spend them when a feature&apos;s free uses run out. Coins are not money.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--acade-overlay)] px-4 py-3">
        <p id="coins-master-label" className="font-medium text-[var(--acade-text)]">Let Android users earn and spend coins</p>
        <Switch aria-label="Let Android users earn and spend coins" checked={enabled} onCheckedChange={value => onChange('coins.enabled', value)} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[var(--acade-text)]">Earning, per student</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {numberInput('coins.coinsPerAd', { label: 'Coins per ad', hint: '1–10 per verified ad.' })}
          {numberInput('coins.dailyEarnCap', { label: 'Daily earn cap', hint: '0–100 per UTC day. 0 pauses earning.' })}
          {numberInput('coins.balanceCap', { label: 'Balance cap', hint: '1–500. Earning stops at this balance.' })}
        </div>
        <p className="text-sm text-[var(--acade-text)]">{enabled ? earningPreview(draft) : 'Coins are off: nobody earns or spends coins.'}</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-[var(--acade-text)]">Spending</legend>
        <p className="text-sm text-[var(--acade-text-muted)]">Coins pay only when a feature&apos;s free uses run out. Coin uses are counted per UTC day.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Coin prices and daily coin uses per feature</caption>
            <thead>
              <tr className="border-b border-[var(--acade-border)] text-xs text-[var(--acade-text-muted)]">
                <th scope="col" className="py-2 pr-3 font-medium">Feature</th>
                <th scope="col" className="px-3 py-2 font-medium">Coins allowed</th>
                <th scope="col" className="px-3 py-2 font-medium">Price</th>
                <th scope="col" className="py-2 pl-3 font-medium">Coin uses per day</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_IDS.map(id => {
                const label = FEATURE_LABELS[id];
                return <tr key={id} className="border-b border-[var(--acade-border-subtle)] last:border-b-0">
                  <th scope="row" className="py-3 pr-3 font-medium text-[var(--acade-text)]">{label}</th>
                  <td className="px-3 py-3"><Switch aria-label={`Coins allowed for ${label}`} checked={draft[featureKey(id, 'enabled')] === true} onCheckedChange={value => onChange(featureKey(id, 'enabled'), value)} /></td>
                  <td className="w-28 px-3 py-3">{numberInput(featureKey(id, 'price'), { ariaLabel: `${label} coin price` })}</td>
                  <td className="w-32 py-3 pl-3">{numberInput(featureKey(id, 'dailyUseCap'), { ariaLabel: `${label} coin uses per day` })}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--acade-text-muted)]">Price 1–20 coins. Coin uses per day 0–50.</p>
        {blocked.length > 0 && <p className="text-sm text-[var(--acade-text)]">
          {blocked.map(id => FEATURE_LABELS[id]).join(', ')}: 0 coin uses per day blocks every coin-paid request.
        </p>}
      </fieldset>

      {!enabled && <div className="space-y-1 border-t border-[var(--acade-border-subtle)] pt-4">
        <h3 className="text-base font-semibold text-[var(--acade-text)]">Legacy extra refresh</h3>
        <p className="text-sm text-[var(--acade-text-muted)]">{LEGACY_REFRESH_NOTE}</p>
      </div>}
    </section>
  </Card>;
}

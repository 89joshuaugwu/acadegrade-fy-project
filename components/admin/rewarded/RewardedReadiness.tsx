import Link from 'next/link';
import { Check, CircleDashed, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Read-only "Rewarded readiness" strip, shared by Advertising and Free uses &
 * coins (spec 3.5.6). Storage stays split: ad delivery in `config/mobileAds`,
 * the coin economy in `config/usage.coins`. This only reads both.
 */

const ADMOB_UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;

export interface RewardedMobileAds {
  enabled: boolean;
  testMode: boolean;
  rewardedEnabled?: boolean;
  rewardedUnitId?: string;
}

type CheckState = 'pass' | 'fail' | 'unknown';

interface ReadinessCheck {
  id: 'ads' | 'rewarded' | 'unit' | 'coins';
  label: string;
  /** Why earning is off when this check fails, as the end of a sentence. */
  failure: string;
  href: string;
  state: CheckState;
}

const state = (known: boolean, value: boolean): CheckState => !known ? 'unknown' : value ? 'pass' : 'fail';

export function rewardedReadiness({ mobileAds, coinsEnabled }: {
  /** Saved Android AdMob settings, or null when they could not be loaded. */
  mobileAds: RewardedMobileAds | null | undefined;
  /** Saved coin master switch, or null when it could not be loaded. */
  coinsEnabled: boolean | null | undefined;
}) {
  const ads = Boolean(mobileAds);
  const coinsKnown = typeof coinsEnabled === 'boolean';
  const checks: ReadinessCheck[] = [
    { id: 'ads', label: 'Android app ads allowed', failure: 'Android app ads are not allowed', href: '/admin/ads?tab=admob', state: state(ads, Boolean(mobileAds?.enabled)) },
    { id: 'rewarded', label: 'Rewarded ads on', failure: 'rewarded ads are off', href: '/admin/ads?tab=admob', state: state(ads, mobileAds?.rewardedEnabled === true) },
    {
      id: 'unit', label: 'Rewarded unit ready', failure: 'there is no valid rewarded unit ID and test ads are off', href: '/admin/ads?tab=admob',
      state: state(ads, Boolean(mobileAds?.testMode) || ADMOB_UNIT.test(mobileAds?.rewardedUnitId?.trim() ?? '')),
    },
    { id: 'coins', label: 'Coins on', failure: 'coins are switched off', href: '/admin/usage', state: state(coinsKnown, coinsEnabled === true) },
  ];
  const failed = checks.find((check) => check.state === 'fail');
  const unknown = checks.some((check) => check.state === 'unknown');
  return { checks, ready: !failed && !unknown, failed, unknown };
}

const STATE_TEXT: Record<CheckState, string> = { pass: 'Yes', fail: 'No', unknown: 'Not loaded' };

export function RewardedReadiness({ mobileAds, coinsEnabled, className }: {
  mobileAds: RewardedMobileAds | null | undefined;
  coinsEnabled: boolean | null | undefined;
  className?: string;
}) {
  const { checks, ready, failed } = rewardedReadiness({ mobileAds, coinsEnabled });
  const headline = ready
    ? 'Students can earn coins now.'
    : failed
      ? `Earning is off because ${failed.failure}.`
      : 'Readiness could not be checked because a setting did not load.';

  return (
    <section aria-labelledby="rewarded-readiness-title" className={cn('rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="rewarded-readiness-title" className="text-base font-semibold text-[var(--acade-text)]">Rewarded readiness</h2>
        <p className={cn('text-sm font-medium', ready ? 'text-[var(--acade-success)]' : failed ? 'text-[var(--acade-text)]' : 'text-[var(--acade-text-muted)]')}>{headline}</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => {
          const Icon = check.state === 'pass' ? Check : check.state === 'fail' ? X : CircleDashed;
          return (
            <li key={check.id} className="flex min-h-11 items-center gap-2.5 rounded-xl bg-[var(--acade-overlay)] px-3 py-2 text-sm">
              <Icon
                aria-hidden="true"
                className={cn('size-4 shrink-0', check.state === 'pass' ? 'text-[var(--acade-success)]' : check.state === 'fail' ? 'text-[var(--acade-danger)]' : 'text-[var(--acade-text-faint)]')}
              />
              <span className="min-w-0 flex-1 text-[var(--acade-text)]">
                {check.label}
                <span className="sr-only">: </span>
                <span className={cn('ml-1.5 text-xs', check.state === 'fail' ? 'font-semibold text-[var(--acade-danger)]' : 'text-[var(--acade-text-muted)]')}>{STATE_TEXT[check.state]}</span>
              </span>
              <Link
                href={check.href}
                aria-label={`${check.state === 'pass' ? 'Change' : 'Fix'} ${check.label}`}
                className={cn('shrink-0 text-xs font-semibold underline-offset-2 hover:underline', check.state === 'pass' ? 'text-[var(--acade-text-muted)]' : 'text-[var(--acade-primary)]')}
              >
                {check.state === 'pass' ? 'Change' : 'Fix'}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-5 text-[var(--acade-text-muted)]">
        Spending coins already earned still works whenever coins and that feature are on.
      </p>
    </section>
  );
}

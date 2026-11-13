'use client';

import { useEffect, useRef, useState } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { blockFromUsage } from './aiAccess';

type CreditFeature = 'insights' | 'forecast' | 'whatif' | 'ocr';
interface FeatureCoin { enabled: boolean; price: number; usesToday: number; dailyUseCap: number }
interface FeatureUsage { id: CreditFeature; label: string; freeDailyLimit: number; freeRemaining: number; freeResetAt: number | null; availableNow: number; retryAfterSeconds: number; cooldownUntil: number | null; coin?: FeatureCoin | null }
interface Summary {
  features: FeatureUsage[];
  writtenRewards?: { earnedToday: number; usedToday: number; earnRemaining: number; resetAtUTC: number };
  coins?: { enabled: boolean; balance: number } | null;
  age?: { status: string; aiAllowed: boolean; aiConsent: boolean | null };
}
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;

export function FeatureCredits({ feature, refreshKey = '' }: { feature: CreditFeature; refreshKey?: string }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const accountRef = useRef(user);
  useEffect(() => { accountRef.current = user; }, [user]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ uid: string; feature: CreditFeature; summary?: Summary; failed?: boolean } | null>(null);
  useEffect(() => {
    const account = accountRef.current;
    if (!account || account.uid !== uid) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); if (active) setResult({ uid: account.uid, feature, failed: true }); }, 10000);
    void (async () => {
      try {
        const token = await account.getIdToken();
        if (!active) return;
        const response = await fetch('/api/ai/usage', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Usage unavailable');
        const summary = await response.json() as Summary;
        const selected = summary.features?.find(item => item.id === feature);
        if (!selected || !Number.isSafeInteger(selected.freeRemaining) || selected.freeRemaining < 0 || !Number.isSafeInteger(selected.freeDailyLimit) || selected.freeRemaining > selected.freeDailyLimit || !Number.isSafeInteger(selected.availableNow) || selected.availableNow < 0 || selected.availableNow > selected.freeRemaining) throw new Error('Invalid usage');
        if (active && !controller.signal.aborted) setResult({ uid: account.uid, feature, summary });
      } catch { if (active) setResult({ uid: account.uid, feature, failed: true }); }
      finally { clearTimeout(timer); }
    })();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [uid, feature, refreshKey, revision]);

  if (!user) return null;
  const current = result?.uid === user.uid && result.feature === feature ? result : null;
  // AI not allowed (age or consent): the page shows the notice instead of credits.
  if (blockFromUsage(current?.summary)) return null;
  const usage = current?.summary?.features.find(item => item.id === feature);
  const rewards = feature === 'insights' ? current?.summary?.writtenRewards : undefined;
  // Display only: coins are earned and spent in the Android app; the web has no rewarded video.
  const wallet = current?.summary?.coins;
  const coin = usage?.coin;
  const showCoins = Boolean(wallet && coin?.enabled && count(wallet.balance) && count(coin.price) && count(coin.usesToday) && count(coin.dailyUseCap));
  return <section aria-label="Feature credits" className="mb-5 flex flex-wrap items-start gap-3 rounded-xl border border-[var(--acade-border)] px-4 py-3">
    <Coins className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
    <div className="min-w-0 flex-1 text-sm leading-6" role="status">
      <p className="font-semibold text-[var(--acade-text)]">{usage ? `${usage.freeRemaining} of ${usage.freeDailyLimit} free credits remaining` : current?.failed ? 'Credit balance unavailable. Your academic records remain available.' : 'Checking feature credits…'}</p>
      {usage && <p className="text-[var(--acade-text-muted)]">{usage.label} only. {usage.availableNow === 0 && usage.freeRemaining > 0 ? 'Short-window limit is active; remaining credits are not available yet.' : `${usage.availableNow} available now.`} {usage.freeResetAt ? `Daily window resets ${new Date(usage.freeResetAt).toLocaleString()}.` : 'The daily window starts with your first new request.'}</p>}
      {usage?.cooldownUntil && <p className="text-[var(--acade-text-muted)]">Regeneration available at {new Date(usage.cooldownUntil).toLocaleString()}.</p>}
      {showCoins && usage && wallet && coin && <p className="text-[var(--acade-text-muted)]">Coin balance: {wallet.balance}. An extra {usage.label} request costs {coin.price} {coin.price === 1 ? 'coin' : 'coins'} in the Android app after free credits run out ({coin.usesToday} of {coin.dailyUseCap} coin-funded uses today).</p>}
      {rewards && <p className="text-[var(--acade-text-muted)]">Ad rewards today: {rewards.earnedToday} verified, {rewards.usedToday} used. {rewards.earnRemaining} more can be earned. Use a confirmed reward in the Android app.</p>}
    </div>
    <button type="button" onClick={() => { setResult(null); setRevision(value => value + 1); }} aria-label="Refresh credit balance" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"><RefreshCw className="size-4" aria-hidden="true" /></button>
  </section>;
}

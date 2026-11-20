'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { buildMaintenanceRedirect } from '@/lib/public/maintenance-redirect';
import { AuthButton, AuthLinkButton } from '@/components/site/auth/controls';
import { formatCheckedTime } from './maintenance-return';

/**
 * Re-checks the public `config/settings` document (readable signed out) and
 * returns the visitor to `next` when maintenance ends: once on mount, every
 * 60 seconds while the tab is visible, at once when the tab becomes visible
 * or the browser comes back online, and on Check now. Never redirects on a
 * failed read. Firebase loads lazily, so the page renders even when the
 * client SDK or Firestore is unavailable. Without JavaScript, Check now is a
 * plain link that reloads the page.
 */

export const RECHECK_MS = 60_000;
const RETURN_DELAY_MS = 1_000;

/** True while maintenance is on. Throws when the read fails. */
export async function readMaintenanceMode(): Promise<boolean> {
  const [{ db }, { doc, getDocFromServer }] = await Promise.all([import('@/lib/firebase/client'), import('firebase/firestore')]);
  const snapshot = await getDocFromServer(doc(db, 'config', 'settings'));
  return snapshot.exists() ? snapshot.data()?.maintenanceMode === true : false;
}

type Phase = 'waiting' | 'checking' | 'failed' | 'ended';

interface MaintenanceWatchProps {
  /** A path already checked with safeNextPath(). */
  next: string;
  /** Where that is, in words ("your dashboard"). */
  place: string;
  /** For tests: the settings read. */
  read?: () => Promise<boolean>;
}

const subscribe = () => () => {};

export function MaintenanceWatch({ next, place, read = readMaintenanceMode }: MaintenanceWatchProps) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const ended = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current || ended.current) return;
    inFlight.current = true;
    setPhase('checking');
    try {
      const on = await read();
      setLastChecked(new Date());
      if (on) {
        setPhase('waiting');
      } else {
        ended.current = true;
        setPhase('ended');
      }
    } catch {
      setPhase('failed');
    } finally {
      inFlight.current = false;
    }
  }, [read]);

  useEffect(() => {
    if (phase !== 'ended') return;
    const timer = window.setTimeout(() => router.replace(next), RETURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, next, router]);

  useEffect(() => {
    let timer: number | null = null;
    const start = () => {
      if (timer === null) timer = window.setInterval(() => void check(), RECHECK_MS);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        void check();
        start();
      }
    };
    const onOnline = () => void check();

    if (document.visibilityState !== 'hidden') {
      void check();
      start();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [check]);

  let line = `This page checks every minute and takes you back to ${place} when we're done.`;
  if (lastChecked) line += ` Last checked ${formatCheckedTime(lastChecked)}.`;
  if (phase === 'checking') line = 'Checking now…';
  if (phase === 'failed') line = "Couldn't check just now. We'll try again in a minute.";
  if (phase === 'ended') line = '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-2xl bg-ag-haze px-4 py-3.5">
        <span aria-hidden="true" className="relative mt-[7px] flex size-2.5 shrink-0">
          <span className={`absolute inline-flex size-full rounded-full ${phase === 'ended' ? 'bg-ag-violet' : 'bg-ag-gold'} opacity-60 motion-safe:animate-ping`} />
          <span className={`relative inline-flex size-2.5 rounded-full ${phase === 'ended' ? 'bg-ag-violet' : 'bg-ag-gold'}`} />
        </span>
        <div className="min-w-0 text-[0.9375rem] leading-relaxed text-ag-ink">
          <p data-testid="maintenance-line">{line}</p>
          <p role="status" className="font-semibold">
            {phase === 'ended' ? "We're back. Taking you there…" : ''}
          </p>
        </div>
      </div>
      <div>
        {hydrated ? (
          <AuthButton busy={phase === 'checking'} disabled={phase === 'ended'} onClick={() => void check()} className="w-full sm:w-auto">
            {phase === 'checking' ? 'Checking…' : 'Check now'}
          </AuthButton>
        ) : (
          <AuthLinkButton href={buildMaintenanceRedirect(next)} external className="w-full sm:w-auto">
            Check now
          </AuthLinkButton>
        )}
      </div>
    </div>
  );
}

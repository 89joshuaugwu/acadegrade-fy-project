'use client';

import { useSyncExternalStore } from 'react';
import { AuthButton, AuthLinkButton } from '@/components/site/auth/controls';

/**
 * The connection watch on /offline. Listens to the browser's online and
 * offline events; it never reloads by itself (the student may be reading).
 * Try again reloads the URL the student asked for when the worker served this
 * page in its place; on /offline itself it goes back, or home. Without
 * JavaScript, Try again is a plain link home.
 */

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

const subscribeNothing = () => () => {};

export function tryAgain(location: Pick<Location, 'pathname' | 'reload' | 'assign'> = window.location, history: Pick<History, 'length' | 'back'> = window.history) {
  if (location.pathname.replace(/\/+$/, '') !== '/offline') {
    location.reload();
  } else if (history.length > 1) {
    history.back();
  } else {
    location.assign('/');
  }
}

export function OfflineWatch() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  // null before hydration: no status line without JavaScript.
  const online = useSyncExternalStore<boolean | null>(subscribeOnline, () => navigator.onLine, () => null);

  return (
    <div className="flex flex-col gap-5">
      <div className={online === null ? 'hidden' : 'flex items-start gap-3 rounded-2xl bg-ag-haze px-4 py-3.5'}>
        <span aria-hidden="true" className={`mt-[7px] size-2.5 shrink-0 rounded-full ${online ? 'bg-ag-violet' : 'bg-ag-mist/50'}`} />
        <div className="min-w-0 text-[0.9375rem] leading-relaxed text-ag-ink">
          <p className="empty:hidden">{online === false ? "We'll notice when your connection is back." : ''}</p>
          <p role="status" className="font-semibold">
            {online === true ? "You're back online." : ''}
          </p>
        </div>
      </div>
      <div>
        {hydrated ? (
          <AuthButton onClick={() => tryAgain()} className="w-full sm:w-auto">
            Try again
          </AuthButton>
        ) : (
          <AuthLinkButton href="/" external className="w-full sm:w-auto">
            Try again
          </AuthLinkButton>
        )}
      </div>
    </div>
  );
}

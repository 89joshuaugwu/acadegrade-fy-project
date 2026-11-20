'use client';

import { useSyncExternalStore } from 'react';
import { AuthLinkButton, InlineLink } from '@/components/site/auth/controls';
import { androidImportLink, isAndroidDevice, rememberPendingImportCode, webImportPath } from '../import-link';

const HINT_ID = 'import-hint';

const subscribe = () => () => {};
const readAndroid = () => isAndroidDevice(typeof navigator === 'undefined' ? null : (navigator as Navigator & { userAgentData?: { platform?: string } }));

const LINK = 'inline-flex min-h-11 items-center text-[0.9375rem]';

/**
 * The ways to use a shared course list. The server renders the "other
 * devices" set, so the page stays cacheable; after hydration an Android
 * visitor gets the Android set, which has the same shape (one button, one
 * hint, two text links) and the same heights, so the swap causes no layout
 * shift. The deep link is never offered off Android, where it does nothing.
 * Web import and Create a free account remember the code on this device
 * first, because the sign-in redirect drops the query string.
 */
export function ImportActions({ code }: { code: string }) {
  const android = useSyncExternalStore(subscribe, readAndroid, () => false);
  const remember = () => rememberPendingImportCode(code);

  if (android) {
    return (
      <div className="flex flex-col gap-3" data-device="android">
        <AuthLinkButton href={androidImportLink(code)} external block aria-describedby={HINT_ID}>
          Open in the Android app
        </AuthLinkButton>
        <p id={HINT_ID} className="min-h-[2.75rem] text-[0.875rem] leading-snug text-ag-mist">
          Opens the app and asks you to check each course before it&apos;s added.
        </p>
        <ul className="flex flex-col gap-x-6 sm:flex-row sm:flex-wrap">
          <li>
            <InlineLink href={webImportPath(code)} className={LINK} onClick={remember}>
              Import on the web instead
            </InlineLink>
          </li>
          <li>
            <InlineLink href="/app" className={LINK}>
              Don&apos;t have the app? Get it for Android
            </InlineLink>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-device="other">
      <AuthLinkButton href={webImportPath(code)} block onClick={remember} aria-describedby={HINT_ID}>
        Import on the web
      </AuthLinkButton>
      <p id={HINT_ID} className="min-h-[2.75rem] text-[0.875rem] leading-snug text-ag-mist">
        You&apos;ll sign in first, then check each course before it&apos;s added.
      </p>
      <ul className="flex flex-col gap-x-6 sm:flex-row sm:flex-wrap">
        <li>
          <InlineLink href="/register" className={LINK} onClick={remember}>
            Create a free account
          </InlineLink>
        </li>
        <li>
          <InlineLink href="/app" className={LINK}>
            Get the Android app
          </InlineLink>
        </li>
      </ul>
    </div>
  );
}

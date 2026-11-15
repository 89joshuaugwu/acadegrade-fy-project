'use client';

import { LinkButton } from '@/components/ui/LinkButton';
import { androidImportLink, rememberPendingImportCode, webImportPath } from '../import-link';

/**
 * The three ways to use a shared course list. The web link remembers the code
 * on this device first, because the sign-in redirect drops the query string.
 */
export function ImportActions({ code }: { code: string }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <LinkButton href={androidImportLink(code)} variant="primary" size="md">
        Open in the Android app
      </LinkButton>
      <LinkButton
        href={webImportPath(code)}
        variant="outline"
        size="md"
        onClick={() => rememberPendingImportCode(code)}
      >
        Import on the web
      </LinkButton>
      <LinkButton href="/register" variant="ghost" size="md">
        Create a free account
      </LinkButton>
    </div>
  );
}

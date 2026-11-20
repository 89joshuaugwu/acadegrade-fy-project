import { InlineLink } from './controls';

/**
 * The app links under the sign-in and create-account forms: the Android page
 * always, the iPhone page only when an iPhone app exists. Never "coming soon".
 */
export function AppLinksLine({ iosUrl }: { iosUrl?: string | null }) {
  const hasIos = Boolean(iosUrl && iosUrl.trim());
  return (
    <p className="flex flex-wrap gap-x-6 gap-y-1 text-[0.875rem]">
      <InlineLink href="/app" className="inline-flex min-h-9 items-center">
        Get the Android app
      </InlineLink>
      {hasIos ? (
        <InlineLink href="/app/download/ios" className="inline-flex min-h-9 items-center">
          Get the iPhone app
        </InlineLink>
      ) : null}
    </p>
  );
}

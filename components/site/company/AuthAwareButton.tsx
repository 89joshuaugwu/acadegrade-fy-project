'use client';

import Link from 'next/link';
import { AUTH_LINKS } from '@/components/public/nav';
import { buttonClass } from '@/components/site/ui';
import { useAuth } from '@/hooks/useAuth';

type Variant = Parameters<typeof buttonClass>[0];

/**
 * The page's one primary action. The server renders the signed-out version;
 * once auth resolves, a signed-in visitor gets "Open dashboard" in the same place.
 */
export function AuthAwareButton({
  href,
  label,
  variant = 'gold',
  size = 'lg',
  signedInHref = AUTH_LINKS.dashboard.href,
  signedInLabel = AUTH_LINKS.dashboard.label,
}: {
  href: string;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  signedInHref?: string;
  signedInLabel?: string;
}) {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return (
    <Link href={signedIn ? signedInHref : href} className={buttonClass(variant, size)}>
      {signedIn ? signedInLabel : label}
    </Link>
  );
}

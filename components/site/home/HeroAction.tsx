'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

/** The hero's main button: sign-up for visitors, the dashboard for signed-in students. */
export function HeroAction() {
  const { user } = useAuth();
  return (
    <Link
      href={user ? '/dashboard' : '/register'}
      className="ag-focus rounded-xl bg-ag-gold px-6 py-4 text-[1rem] font-semibold text-ag-night shadow-[0_12px_40px_-12px_rgba(255,178,63,0.7)] transition hover:brightness-105"
    >
      {user ? 'Open dashboard' : 'Start your free record'}
    </Link>
  );
}

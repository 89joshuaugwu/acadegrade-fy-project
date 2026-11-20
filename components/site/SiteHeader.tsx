'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AcadeGradeMark } from '@/components/public/Logo';
import { AUTH_LINKS, HEADER_LINKS, MENU_EXTRA_LINKS, isCurrentPath } from '@/components/public/nav';

/** Brand v2 header: one dark bar on every public page, solid once you scroll. */
export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-[100] transition-colors duration-300 ${
        scrolled ? 'bg-ag-night/85 backdrop-blur-xl' : 'bg-ag-night'
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-8 px-5 sm:px-8">
        <Link href="/" className="ag-focus flex items-center gap-2.5 rounded-lg" aria-label="AcadeGrade home">
          <AcadeGradeMark size={30} />
          <span className="ag-display text-[1.1875rem] font-bold tracking-[-0.02em] text-white">AcadeGrade</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {HEADER_LINKS.map((link) => {
              const current = isCurrentPath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? 'page' : undefined}
                    className={`ag-focus rounded-lg px-3 py-2 text-[0.9375rem] font-medium transition-colors ${
                      current ? 'text-white' : 'text-ag-mist-night hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Link href={AUTH_LINKS.dashboard.href} className="ag-focus rounded-xl bg-ag-gold px-4 py-2.5 text-[0.9375rem] font-semibold text-ag-night transition hover:brightness-105">
              {AUTH_LINKS.dashboard.label}
            </Link>
          ) : (
            <>
              <Link href={AUTH_LINKS.signIn.href} className="ag-focus rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-white/85 transition-colors hover:text-white">
                {AUTH_LINKS.signIn.label}
              </Link>
              <Link href={AUTH_LINKS.getStarted.href} className="ag-focus rounded-xl bg-ag-gold px-4 py-2.5 text-[0.9375rem] font-semibold text-ag-night transition hover:brightness-105">
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className="ag-focus ml-auto flex h-11 items-center gap-2 rounded-xl px-3 text-[0.9375rem] font-medium text-white md:hidden"
          aria-haspopup="dialog"
        >
          Menu
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setOpen(false);
          menuButtonRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-ag-night p-0 text-white backdrop:bg-black/50"
        aria-label="Menu"
      >
        <div className="flex h-full flex-col px-5 pb-8">
          <div className="flex h-[68px] items-center justify-between">
            <Link href="/" className="ag-focus flex items-center gap-2.5" onClick={() => setOpen(false)}>
              <AcadeGradeMark size={30} />
              <span className="ag-display text-[1.1875rem] font-bold text-white">AcadeGrade</span>
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="ag-focus h-11 rounded-xl px-3 text-[0.9375rem] font-medium">
              Close
            </button>
          </div>
          <nav aria-label="Menu" className="mt-6">
            <ul className="space-y-1">
              {HEADER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setOpen(false)} className="ag-display ag-focus block rounded-lg py-2 text-[2rem] font-bold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-6 space-y-1">
              {[...MENU_EXTRA_LINKS, ...(user ? [] : [AUTH_LINKS.signIn])].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setOpen(false)} className="ag-focus block rounded-lg py-2 text-[1.125rem] text-ag-mist-night">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href={user ? AUTH_LINKS.dashboard.href : AUTH_LINKS.getStarted.href}
            onClick={() => setOpen(false)}
            className="ag-focus mt-auto flex h-14 items-center justify-center rounded-2xl bg-ag-gold text-[1.0625rem] font-semibold text-ag-night"
          >
            {user ? AUTH_LINKS.dashboard.label : 'Start your free record'}
          </Link>
        </div>
      </dialog>
    </header>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface RequirementsDialogProps {
  titleId: string;
  /** Called on Escape. Omit for a dialog that must be answered. */
  onEscape?: () => void;
  children: React.ReactNode;
}

/**
 * Modal shell for account requirements. Unlike the shared Modal it has no
 * close button, because the blocking variant must be answered.
 */
export function RequirementsDialog({ titleId, onEscape, children }: RequirementsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);

  useEffect(() => {
    const host = document.createElement('div');
    host.setAttribute('data-requirements-root', '');
    document.body.appendChild(host);
    setRoot(host);
    return () => { host.remove(); };
  }, []);

  useEffect(() => {
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const background = Array.from(document.body.children).filter((element) => element !== root) as HTMLElement[];
    const previousHidden = background.map((element) => element.getAttribute('aria-hidden'));
    background.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      background.forEach((element, index) => {
        element.inert = false;
        const value = previousHidden[index];
        if (value === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', value);
      });
      previous?.focus?.();
    };
  }, [root]);

  if (!root) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center bg-[var(--acade-scrim)] p-0 sm:items-center sm:p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[34rem] flex-col overflow-hidden rounded-t-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)] focus:outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-[var(--radius-dialog)]"
      >
        {children}
      </div>
    </div>,
    root
  );
}

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Input } from './Input';

let bodyLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) document.body.style.overflow = previousBodyOverflow;
  };
}

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  confirm?: {
    label: string;
    onConfirm: () => void;
    loading?: boolean;
    requireText?: string;
  };
  className?: string;
  size?: 'confirm' | 'form' | 'review';
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  presentation?: 'dialog' | 'sheet';
}

const sizeStyles = {
  confirm: 'max-w-[440px]',
  form: 'max-w-[560px]',
  review: 'max-w-[880px]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirm,
  className,
  size = confirm ? 'confirm' : 'form',
  initialFocusRef,
  presentation = 'dialog',
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descriptionId = `${reactId}-description`;

  const dismiss = useCallback(() => {
    setConfirmationText('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    let root = document.getElementById('acadegrade-overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'acadegrade-overlay-root';
      document.body.appendChild(root);
    }
    setPortalRoot(root);
  }, []);

  useEffect(() => {
    if (!open || !portalRoot) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();
    const background = Array.from(document.body.children).filter(
      (element) => element !== portalRoot
    ) as HTMLElement[];
    const previousAriaHidden = background.map((element) => element.getAttribute('aria-hidden'));
    background.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    const focusTimer = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = initialFocusRef?.current
        ?? panel.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
        ?? getFocusable(panel)[0]
        ?? panel;
      preferred.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (!panelRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      unlock();
      background.forEach((element, index) => {
        element.inert = false;
        const oldValue = previousAriaHidden[index];
        if (oldValue === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', oldValue);
      });
      requestAnimationFrame(() => previousActiveElement.current?.focus());
    };
  }, [dismiss, initialFocusRef, open, portalRoot]);

  if (!portalRoot) return null;

  const confirmationMatches = !confirm?.requireText
    || confirmationText.trim() === confirm.requireText;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
          <motion.button
            type="button"
            tabIndex={-1}
            data-overlay-backdrop
            aria-label={`Close ${title}`}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            className="absolute inset-0 cursor-default bg-[var(--acade-scrim)]"
            onClick={dismiss}
          />

          <div className={cn(
            'pointer-events-none flex min-h-full justify-center',
            presentation === 'sheet' ? 'items-end p-0 sm:items-center sm:p-4' : 'items-center p-4'
          )}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 32 }}
              className={cn(
                'pointer-events-auto relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden',
                'rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)]',
                'focus:outline-none',
                sizeStyles[size],
                presentation === 'sheet' && 'max-w-none rounded-b-none border-b-0 sm:max-w-[560px] sm:rounded-[var(--radius-dialog)] sm:border-b',
                className
              )}
            >
              <header className="flex shrink-0 items-start gap-4 border-b border-[var(--acade-border-subtle)] px-5 py-4 md:px-6">
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-xl font-semibold text-[var(--acade-text)] text-balance">
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">
                      {description}
                    </p>
                  )}
                </div>
                <IconButton aria-label="Close modal" onClick={dismiss} className="-mr-2 -mt-2">
                  <X className="size-5" aria-hidden="true" />
                </IconButton>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                {children}
                {confirm?.requireText && (
                  <div className="mt-5">
                    <Input
                      label={`Type ${confirm.requireText} to confirm`}
                      value={confirmationText}
                      onChange={(event) => setConfirmationText(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>

              {confirm && (
                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--acade-border-subtle)] px-5 py-4 sm:flex-row sm:justify-end md:px-6">
                  <Button variant="ghost" onClick={dismiss}>Cancel</Button>
                  <Button
                    variant="danger"
                    onClick={confirm.onConfirm}
                    loading={confirm.loading}
                    loadingLabel={`${confirm.label}…`}
                    disabled={!confirmationMatches}
                  >
                    {confirm.label}
                  </Button>
                </footer>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    portalRoot
  );
}

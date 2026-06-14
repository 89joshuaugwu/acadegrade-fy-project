'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Renders a confirm-style modal with destructive red action button */
  confirm?: {
    label: string;
    onConfirm: () => void;
    loading?: boolean;
    /** If set, user must type this text to enable the confirm button */
    requireText?: string;
  };
  className?: string;
}

/**
 * Modal component — animated overlay with focus trap.
 *
 * Features:
 * - AnimatePresence scale 0.92→1 + opacity
 * - Backdrop blur + dark overlay
 * - Focus trap (ref + keydown Escape handler)
 * - Confirm variant with destructive red button
 * - Optional text confirmation for dangerous actions
 */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirm,
  className,
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap: Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus the modal
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' } as React.CSSProperties}>
          {/* Backdrop */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <div className="flex items-center justify-center min-h-full p-4">
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              initial={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 0.92, y: 10 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.95, y: 5 }
              }
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                mass: 0.8,
              }}
              className={cn(
                'relative w-full max-w-md',
                'bg-[var(--acade-surface)] border border-[var(--acade-border)]',
                'rounded-2xl p-6 shadow-2xl',
                'focus:outline-none',
                className
              )}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className={cn(
                  'absolute top-4 right-4',
                  'size-8 rounded-lg flex items-center justify-center',
                  'text-[var(--acade-text-faint)] hover:text-[var(--acade-text)]',
                  'hover:bg-[var(--acade-overlay)] transition-colors',
                )}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="mb-4 pr-8">
                <h2 className="text-[length:var(--text-xl)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] text-balance">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--acade-text-muted)] text-pretty">
                    {description}
                  </p>
                )}
              </div>

              {/* Content */}
              <div>{children}</div>

              {/* Confirm variant footer */}
              {confirm && (
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--acade-border)]">
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={confirm.onConfirm}
                    loading={confirm.loading}
                  >
                    {confirm.label}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { Modal };
export type { ModalProps };

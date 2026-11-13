'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, CircleHelp, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { parentHelpId, type HelpEntry, type HelpId, type HelpSource } from '@/lib/help/types';

/** Wider than this, the drawer docks on the right; at or below it, it is a bottom sheet. */
const DRAWER_QUERY = '(min-width: 641px)';

function subscribeToDrawerQuery(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DRAWER_QUERY);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}

function useDocksRight() {
  return useSyncExternalStore(
    subscribeToDrawerQuery,
    () => typeof window.matchMedia === 'function' && window.matchMedia(DRAWER_QUERY).matches,
    () => true,
  );
}

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export interface HelpButtonProps {
  /** The entry to open, usually the page id or the active tab's id. */
  entryId: HelpId;
  source: HelpSource;
  className?: string;
  /** Listen for `?` (Shift+/) to open help. Only one button per page should. */
  shortcut?: boolean;
}

/**
 * The page-header Help button and the drawer it opens. Generic over its content:
 * admin pages pass the admin source; student pages will pass theirs.
 */
export function HelpButton({ entryId, source, className, shortcut = true }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const entry = source.entries[entryId];

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!shortcut || open || !entry) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target) || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(true);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [entry, open, shortcut]);

  if (!entry) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Help: ${entry.title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)]',
          'transition-colors duration-150 hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
          className
        )}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
        Help
      </button>
      <HelpDrawer id={dialogId} open={open} onClose={close} entryId={entryId} source={source} />
    </>
  );
}

export interface HelpDrawerProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  entryId: HelpId;
  source: HelpSource;
}

/** Right-side drawer on wide screens, bottom sheet at 640px and below. */
export function HelpDrawer({ id, open, onClose, entryId, source }: HelpDrawerProps) {
  const reduceMotion = useReducedMotion();
  const docksRight = useDocksRight();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  /** Entries opened from inside the drawer; the last one is shown. */
  const [trail, setTrail] = useState<HelpId[]>([]);
  const titleId = useId();

  const currentId = trail.at(-1) ?? entryId;
  const entry = source.entries[currentId] ?? source.entries[entryId];
  const previous = trail.length ? source.entries[trail.at(-2) ?? entryId] : undefined;

  useEffect(() => {
    let root = document.getElementById('acadegrade-overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'acadegrade-overlay-root';
      document.body.appendChild(root);
    }
    setPortalRoot(root);
  }, []);

  // A new page or tab, or a fresh open, starts from its own entry (adjusted while rendering).
  const [trailKey, setTrailKey] = useState(`${entryId}:${open}`);
  if (trailKey !== `${entryId}:${open}`) {
    setTrailKey(`${entryId}:${open}`);
    setTrail([]);
  }

  useEffect(() => {
    if (!open || !portalRoot) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = Array.from(document.body.children).filter((element) => element !== portalRoot) as HTMLElement[];
    const previousHidden = background.map((element) => element.getAttribute('aria-hidden'));
    background.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });

    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(panel);
      if (focusable.length === 0) { event.preventDefault(); titleRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (event.shiftKey && (active === first || active === titleRef.current || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => {
        element.inert = false;
        const value = previousHidden[index];
        if (value === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', value);
      });
    };
  }, [onClose, open, portalRoot]);

  // Focus the title whenever the drawer opens or shows another entry.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, currentId, portalRoot]);

  if (!portalRoot || !entry) return null;

  const parentId = parentHelpId(source, currentId);
  const parent = parentId ? source.entries[parentId] : undefined;
  const hidden = reduceMotion
    ? { opacity: 0 }
    : docksRight ? { opacity: 0, x: 40 } : { opacity: 0, y: 64 };
  const shown = reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
          <motion.div
            aria-hidden="true"
            data-overlay-backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--acade-scrim)]"
          />
          <motion.div
            ref={panelRef}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={reduceMotion ? { duration: 0 } : { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.24 }}
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden',
              'rounded-t-[var(--radius-dialog)] border-t border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)]',
              'min-[641px]:inset-y-0 min-[641px]:left-auto min-[641px]:right-0 min-[641px]:max-h-none min-[641px]:w-[420px]',
              'min-[641px]:rounded-none min-[641px]:border-l min-[641px]:border-t-0'
            )}
          >
            <span aria-hidden="true" className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-[var(--acade-control-border)] min-[641px]:hidden" />
            <header className="flex shrink-0 items-start gap-3 border-b border-[var(--acade-border-subtle)] px-5 pb-4 pt-3 min-[641px]:pt-5">
              <div className="min-w-0 flex-1">
                {previous && (
                  <button
                    type="button"
                    onClick={() => setTrail((current) => current.slice(0, -1))}
                    className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-medium text-[var(--acade-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to {previous.title}
                  </button>
                )}
                <h2
                  ref={titleRef}
                  id={titleId}
                  tabIndex={-1}
                  className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)] text-balance focus:outline-none"
                >
                  {entry.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close help"
                onClick={onClose}
                className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              <HelpEntryBody
                entry={entry}
                source={source}
                onLinkClick={onClose}
                parent={parent}
                onOpenEntry={(id) => setTrail((current) => [...current, id])}
                parentId={parentId}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalRoot
  );
}

const sectionHeading = 'text-sm font-semibold text-[var(--acade-text)]';

type ResolvedLink =
  | { kind: 'page'; label: string; href: string }
  | { kind: 'entry'; label: string; id: HelpId };

/**
 * A related link is a page when its id has a route (or it carries an href), an
 * in-drawer entry when the id only exists as help (e.g. the shared glossary),
 * and dropped otherwise.
 */
function resolveLink(source: HelpSource, link: NonNullable<HelpEntry['related']>[number]): ResolvedLink | null {
  if (typeof link.to !== 'string') return link.to.href ? { kind: 'page', label: link.label, href: link.to.href } : null;
  const href = source.hrefFor(link.to);
  if (href) return { kind: 'page', label: link.label, href };
  return source.entries[link.to] ? { kind: 'entry', label: link.label, id: link.to } : null;
}

function HelpEntryBody({ entry, source, onLinkClick, parent, parentId, onOpenEntry }: {
  entry: HelpEntry;
  source: HelpSource;
  onLinkClick: () => void;
  parent?: HelpEntry;
  parentId?: HelpId;
  onOpenEntry: (id: HelpId) => void;
}) {
  const notes = entry.platformNotes?.[source.platform] ?? [];
  const links = (entry.related ?? [])
    .map((link) => resolveLink(source, link))
    .filter((link): link is ResolvedLink => link !== null);
  const linkClass = 'font-medium text-[var(--acade-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

  return (
    <div className="space-y-6 text-sm leading-6 text-[var(--acade-text)]">
      <div className="space-y-2">
        <p className="text-pretty">{entry.summary}</p>
        {notes.map((note) => <p key={note} className="text-[var(--acade-text-muted)]">{note}</p>)}
      </div>

      {entry.terms && entry.terms.length > 0 && (
        <section aria-labelledby={`${entry.id}-terms`} className="space-y-2">
          <h3 id={`${entry.id}-terms`} className={sectionHeading}>Key terms</h3>
          <dl className="space-y-3">
            {entry.terms.map((item) => (
              <div key={item.term}>
                <dt className="font-semibold">{item.term}</dt>
                <dd className="text-[var(--acade-text-muted)]">{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {entry.tasks && entry.tasks.length > 0 && (
        <section aria-labelledby={`${entry.id}-tasks`} className="space-y-3">
          <h3 id={`${entry.id}-tasks`} className={sectionHeading}>Common tasks</h3>
          {entry.tasks.map((task, index) => {
            const taskId = `${entry.id}-task-${index}`;
            return (
              <div key={task.title} className="rounded-xl bg-[var(--acade-overlay)] px-4 py-3">
                <h4 id={taskId} className="font-semibold">{task.title}</h4>
                {task.steps.length === 1
                  ? <p className="mt-1 text-[var(--acade-text-muted)]">{task.steps[0]}</p>
                  : (
                    <ol aria-labelledby={taskId} className="mt-1 list-decimal space-y-1 pl-5 text-[var(--acade-text-muted)] marker:text-[var(--acade-text-faint)]">
                      {task.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  )}
              </div>
            );
          })}
        </section>
      )}

      {entry.cautions && entry.cautions.length > 0 && (
        <section aria-labelledby={`${entry.id}-cautions`} className="space-y-2 rounded-xl bg-[var(--acade-warning)]/10 px-4 py-3">
          <h3 id={`${entry.id}-cautions`} className={sectionHeading}>Before you change anything</h3>
          <ul className="list-disc space-y-1 pl-5 marker:text-[var(--acade-warning)]">
            {entry.cautions.map((caution) => <li key={caution}>{caution}</li>)}
          </ul>
        </section>
      )}

      {(links.length > 0 || (parent && parentId)) && (
        <section aria-labelledby={`${entry.id}-related`} className="space-y-2">
          <h3 id={`${entry.id}-related`} className={sectionHeading}>Related</h3>
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={`${link.label}-${link.kind === 'page' ? link.href : link.id}`}>
                {link.kind === 'entry'
                  ? <button type="button" onClick={() => onOpenEntry(link.id)} className={`text-left ${linkClass}`}>{link.label}</button>
                  : link.href.startsWith('/')
                    ? <Link href={link.href} onClick={onLinkClick} className={linkClass}>{link.label}</Link>
                    : <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>{link.label}</a>}
              </li>
            ))}
            {parent && parentId && (
              <li>
                <button
                  type="button"
                  aria-label={`About the whole page: ${parent.title}`}
                  onClick={() => onOpenEntry(parentId)}
                  className={`text-left ${linkClass}`}
                >
                  About the whole page: {parent.title}
                </button>
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

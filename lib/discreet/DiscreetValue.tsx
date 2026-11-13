'use client';

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { readDiscreetMode, setDiscreetMode, subscribeDiscreetMode } from './store';

/** Whether discreet mode is on for this device, and a setter. */
export function useDiscreetMode(): { enabled: boolean; setEnabled: (enabled: boolean) => void } {
  const enabled = useSyncExternalStore(subscribeDiscreetMode, readDiscreetMode, () => false);
  return { enabled, setEnabled: setDiscreetMode };
}

interface ScopeState {
  revealed: boolean;
  setRevealed: (revealed: boolean) => void;
}

const ScopeContext = createContext<ScopeState | null>(null);

/**
 * Groups values that sit inside links, buttons or dense tables. Values in a
 * scope are never interactive themselves; one DiscreetRevealButton reveals the
 * whole group.
 */
export function DiscreetScope({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const value = useMemo(() => ({ revealed, setRevealed }), [revealed]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

/** Hidden presentation: blurred, unselectable, unfocusable, and readable as "hidden". */
function HiddenContent({ children, block }: { children: React.ReactNode; block?: boolean }) {
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      aria-hidden="true"
      inert
      className={cn(
        'pointer-events-none select-none blur-[0.4em] print:blur-none',
        block ? 'block' : 'inline-block'
      )}
    >
      {children}
    </Tag>
  );
}

export interface DiscreetValueProps {
  /** What the value is, for the accessible name: "CGPA", "GPA", "Grade". */
  label: string;
  children: React.ReactNode;
  /** Render as a block (for charts and gauges) instead of inline text. */
  block?: boolean;
  className?: string;
}

/**
 * Shows its children unless discreet mode is on. Outside a DiscreetScope the
 * hidden value is a button ("CGPA hidden, activate to reveal"); inside a scope
 * it is plain text and the scope's DiscreetRevealButton reveals it.
 */
export function DiscreetValue({ label, children, block, className }: DiscreetValueProps) {
  const { enabled } = useDiscreetMode();
  const scope = useContext(ScopeContext);
  const [revealed, setRevealed] = useState(false);

  if (!enabled || (scope ? scope.revealed : revealed)) {
    return block ? <div className={className}>{children}</div> : <span className={className}>{children}</span>;
  }

  if (scope) {
    const Tag = block ? 'div' : 'span';
    return (
      <Tag className={cn(block ? 'block' : 'inline-block', className)}>
        <HiddenContent block={block}>{children}</HiddenContent>
        <span className="sr-only">{label} hidden</span>
      </Tag>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label} hidden, activate to reveal`}
      title="Tap to reveal"
      onClick={() => setRevealed(true)}
      className={cn(
        'rounded-md text-left align-baseline transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        block ? 'block w-full' : 'inline-block',
        className
      )}
    >
      <HiddenContent block={block}>{children}</HiddenContent>
    </button>
  );
}

/** Reveal/hide control for a DiscreetScope. Renders nothing when discreet mode is off. */
export function DiscreetRevealButton({ label, className }: { label: string; className?: string }) {
  const { enabled } = useDiscreetMode();
  const scope = useContext(ScopeContext);
  if (!enabled || !scope) return null;
  const lower = label.toLowerCase();
  return (
    <button
      type="button"
      onClick={() => scope.setRevealed(!scope.revealed)}
      aria-label={scope.revealed ? `Hide ${lower}` : `${label} hidden, activate to reveal`}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        className
      )}
    >
      {scope.revealed
        ? <><EyeOff className="size-4" aria-hidden="true" /> Hide</>
        : <><Eye className="size-4" aria-hidden="true" /> Show</>}
    </button>
  );
}

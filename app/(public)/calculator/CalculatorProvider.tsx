'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ButtonLink } from '@/components/site/ui';
import { textButtonClass } from '@/components/site/tools/controls';
import { useAuth } from '@/hooks/useAuth';
import { readCalculatorHandoff, saveCalculatorHandoff } from '@/lib/handoff/calculator';
import { CALCULATOR_MAX_ROWS, decodeCalculation, encodeCalculation } from '@/components/public/tools/calculator-url';
import {
  computeCalculation,
  defaultRows,
  exampleRows,
  handoffCourses,
  switchMode,
  toEncodedRows,
  type CalcRow,
  type CalculationResult,
  type CalculatorMode,
} from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';

/**
 * One store for the calculator page: the tool panel, the result card, the
 * receipt, the class thresholds, the tool cards and the close all read it.
 * The default rows render on the server (GPA 4.13); a shared ?m=&c= link
 * replaces the rows after mount with the same shape. Every change is written
 * back to the address bar in the same format as always.
 */

let idCounter = 0;
const nextId = () => `row-${idCounter++}`;

interface Flags {
  shared: boolean;
  unreadable: boolean;
  reset: boolean;
}

interface CalculatorState {
  mode: CalculatorMode;
  rows: CalcRow[];
  priorCgpa: string;
  priorUnits: string;
  priorOpen: boolean;
  /** The three default rows are untouched. */
  pristine: boolean;
  exampleLoaded: boolean;
  flags: Flags;
  /** Rows kept for Undo after Clear all. */
  cleared: { rows: CalcRow[] } | null;
}

interface CalculatorContextValue {
  state: CalculatorState;
  result: CalculationResult;
  signedIn: boolean;
  hydrated: boolean;
  setMode: (mode: CalculatorMode) => void;
  updateRow: (id: string, patch: Partial<CalcRow>) => void;
  addRow: () => string | null;
  removeRow: (id: string) => void;
  clearAll: () => void;
  undoClear: () => void;
  loadExample: () => void;
  setPrior: (patch: { priorCgpa?: string; priorUnits?: string }) => void;
  setPriorOpen: (open: boolean) => void;
  save: () => void;
  saving: boolean;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculator(): CalculatorContextValue {
  const value = useContext(CalculatorContext);
  if (!value) throw new Error('useCalculator outside CalculatorProvider');
  return value;
}

const INITIAL: CalculatorState = {
  mode: 'grade',
  rows: defaultRows(),
  priorCgpa: '',
  priorUnits: '',
  priorOpen: false,
  pristine: true,
  exampleLoaded: false,
  flags: { shared: false, unreadable: false, reset: false },
  cleared: null,
};

function writeAddress(state: Pick<CalculatorState, 'mode' | 'rows' | 'priorCgpa' | 'priorUnits'>, empty = false) {
  try {
    const path = window.location.pathname;
    const query = empty ? '' : encodeCalculation({ mode: state.mode, rows: toEncodedRows(state.rows, state.mode), priorCgpa: state.priorCgpa, priorUnits: state.priorUnits });
    window.history.replaceState(window.history.state, '', query ? `${path}?${query}` : path);
  } catch {
    // The calculation stays usable if the address bar can't be written.
  }
}

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<CalculatorState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{ kept: number; blocked: boolean } | null>(null);
  const undoTimer = useRef<number | null>(null);

  // Read a shared link once, on mount.
  useEffect(() => {
    setHydrated(true);
    const decoded = decodeCalculation(window.location.search);
    const hasPrior = Boolean(decoded.priorCgpa || decoded.priorUnits);
    if (!decoded.rows && !decoded.unreadable && !hasPrior && !window.location.search.includes('m=')) return;
    setState((previous) => ({
      ...previous,
      mode: decoded.mode,
      rows: decoded.rows ? decoded.rows.map((row) => ({ id: nextId(), ...row })) : previous.rows,
      priorCgpa: decoded.priorCgpa,
      priorUnits: decoded.priorUnits,
      priorOpen: hasPrior,
      pristine: !decoded.rows,
      flags: { shared: Boolean(decoded.rows), unreadable: decoded.unreadable, reset: decoded.partlyReset },
    }));
  }, []);

  useEffect(() => () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
  }, []);

  // Each change is written back to the address bar once React has applied it.
  const pendingWrite = useRef(false);
  useEffect(() => {
    if (!pendingWrite.current) return;
    pendingWrite.current = false;
    writeAddress(state, state.rows.length === 0 && !state.priorCgpa && !state.priorUnits);
  }, [state]);

  const commit = useCallback((update: (previous: CalculatorState) => CalculatorState) => {
    pendingWrite.current = true;
    setState(update);
  }, []);

  const value = useMemo<CalculatorContextValue>(() => {
    const result = computeCalculation(state);
    return {
      state,
      result,
      signedIn: Boolean(user),
      hydrated,
      saving,
      setMode: (mode) =>
        commit((previous) => (previous.mode === mode ? previous : { ...previous, pristine: false, mode, rows: switchMode(previous.rows, mode) })),
      updateRow: (id, patch) =>
        commit((previous) => ({
          ...previous,
          pristine: false,
          exampleLoaded: false,
          rows: previous.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        })),
      addRow: () => {
        if (state.rows.length >= CALCULATOR_MAX_ROWS) return null;
        const id = nextId();
        commit((previous) => ({
          ...previous,
          pristine: false,
          rows: [...previous.rows, { id, code: '', units: 3, grade: previous.mode === 'grade' ? 'A' : null, scoreText: '' }],
        }));
        return id;
      },
      removeRow: (id) => commit((previous) => ({ ...previous, pristine: false, rows: previous.rows.filter((row) => row.id !== id) })),
      clearAll: () => {
        commit((previous) => ({ ...previous, pristine: false, exampleLoaded: false, cleared: { rows: previous.rows }, rows: [] }));
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setState((previous) => ({ ...previous, cleared: null })), 10000);
      },
      undoClear: () => commit((previous) => (previous.cleared ? { ...previous, rows: previous.cleared.rows, cleared: null } : previous)),
      loadExample: () =>
        commit((previous) => ({ ...previous, rows: exampleRows(nextId), pristine: false, exampleLoaded: true, cleared: null, flags: { shared: false, unreadable: false, reset: false } })),
      setPrior: (patch) => commit((previous) => ({ ...previous, ...patch })),
      setPriorOpen: (open) => setState((previous) => ({ ...previous, priorOpen: open })),
      save: () => {
        if (!result.semester) return;
        trackToolEvent('save_semester_click', { tool: 'calculator' });
        const kept = saveCalculatorHandoff({ mode: state.mode, courses: handoffCourses(state.rows, state.mode) });
        if (!user) {
          setDialog({ kept: kept ? readCalculatorHandoff()?.courses.length ?? 0 : 0, blocked: !kept });
          return;
        }
        setSaving(true);
        router.push(kept ? '/results' : '/dashboard');
      },
    };
  }, [state, user, hydrated, saving, commit, router]);

  return (
    <CalculatorContext.Provider value={value}>
      {children}
      {dialog ? <GuestDialog kept={dialog.kept} blocked={dialog.blocked} withPrior={Boolean(value.result.prior)} onClose={() => setDialog(null)} /> : null}
    </CalculatorContext.Provider>
  );
}

/**
 * "Save these courses to your record": a native dialog, a white card on a
 * dim night backdrop. Esc and the backdrop close it; focus returns to the
 * button that opened it.
 */
function GuestDialog({ kept, blocked, withPrior, onClose }: { kept: number; blocked: boolean; withPrior: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    } else {
      dialog.setAttribute('open', '');
    }
    return () => {
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  const close = () => {
    try {
      ref.current?.close?.();
    } catch {
      // Closing is also handled by unmounting.
    }
    onClose();
  };

  const body = blocked
    ? "This browser isn't keeping data for us, so you'll need to enter these courses again after you sign up. Share the link to yourself first to keep them."
    : `Your ${kept === 1 ? 'course is' : `${kept} courses are`} kept on this device for 24 hours. Create your free record or sign in, then add ${kept === 1 ? 'it' : 'them'} as a semester from Results.`;

  return (
    <dialog
      ref={ref}
      className="ag-dialog"
      aria-labelledby="save-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="ag-site rounded-[24px] bg-white p-6 text-ag-ink shadow-[0_40px_90px_-30px_rgba(14,11,43,0.7)] sm:p-8">
        <h2 id="save-dialog-title" className="ag-display text-[1.625rem] font-bold leading-tight sm:text-[1.875rem]">
          Save these courses to your record
        </h2>
        <p className="mt-4 text-[1rem] leading-relaxed text-ag-ink">{body}</p>
        {withPrior ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ag-mist">
            Your CGPA so far isn&apos;t carried over. You can add past semesters when you set up your record.
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-4">
          <ButtonLink href="/register" variant="night" size="lg" block onClick={onClose}>
            Create your free record
          </ButtonLink>
          <div className="flex items-center justify-between gap-4">
            <Link href="/login" onClick={onClose} className={`${textButtonClass()} inline-flex min-h-11 items-center px-1 text-[1rem]`}>
              Sign in
            </Link>
            <button type="button" className="ag-focus min-h-11 rounded-lg px-3 text-[1rem] font-semibold text-ag-mist transition hover:text-ag-ink" onClick={close}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}


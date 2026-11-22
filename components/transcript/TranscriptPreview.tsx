'use client';

import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { Clock, Lock, SearchX, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import { RecordCard, RecordSkeleton } from '@/app/(public)/share/[shareId]/RecordCard';
import { formatExpiryDate } from '@/app/(public)/share/[shareId]/record-labels';
import type { SharedTranscript } from '@/app/(public)/share/[shareId]/types';
import { DEFAULT_SITE_URL, resolveSiteUrl } from '@/lib/seo/site';
import { parseShareInput, type ParsedShareInput } from '@/lib/share/link';
import { isValidPin } from '@/lib/share/options';
import { INITIAL_PREVIEW_STATE, lockedMessage, previewReducer, type PreviewAction, type PreviewState } from '@/lib/share/preview';
import { fetchSharedTranscript } from '@/lib/share/viewer';
import { ShareChips } from './ShareChips';

const INPUT_ERRORS: Record<Exclude<ParsedShareInput, { ok: true }>['reason'], string> = {
  empty: 'Paste a share link or its ID.',
  'not-a-share-link': 'Paste a link that ends in /share/ and an ID, or just the ID.',
  'other-site': 'That link is not on AcadeGrade. Paste an AcadeGrade share link.',
};

const PIN_ERRORS = {
  format: 'Enter the 4 to 6 digits you were given.',
  incorrect: "That PIN isn't right. Check it and try again.",
} as const;

/** Hosts that serve this site: the one in the address bar, the configured site, and the default. */
export function siteHosts(): string[] {
  const hosts = new Set<string>();
  if (typeof window !== 'undefined') hosts.add(window.location.host);
  for (const origin of [resolveSiteUrl(), DEFAULT_SITE_URL]) {
    try {
      hosts.add(new URL(origin).host);
    } catch {
      // ignore an unreadable origin
    }
  }
  return [...hosts];
}

export interface PreviewRequest {
  id: string;
  /** Changes on every request, so the same link can be opened twice. */
  key: number;
}

interface TranscriptPreviewProps {
  /** Opens the preview for a link from elsewhere on the page (a Shared links row). */
  request?: PreviewRequest | null;
}

/**
 * "Preview a transcript": paste a share link or id and see the record exactly as
 * the person who opens it does, with the PIN step when the link has one. The
 * fetch, PIN header and states are lib/share/viewer.ts and lib/share/preview.ts.
 */
export function TranscriptPreview({ request }: TranscriptPreviewProps) {
  const ids = useId();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(previewReducer<SharedTranscript>, INITIAL_PREVIEW_STATE as PreviewState<SharedTranscript>);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request) dispatch({ type: 'open', id: request.id });
  }, [request]);

  // Every "loading" state fetches without a PIN; the PIN form sends its own request.
  useEffect(() => {
    if (state.kind !== 'loading') return;
    let live = true;
    const id = state.id;
    void fetchSharedTranscript<SharedTranscript>(id).then((result) => {
      if (live) dispatch({ type: 'result', id, result });
    });
    return () => {
      live = false;
    };
  }, [state]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseShareInput(input, { allowedHosts: siteHosts() });
    if (!parsed.ok) {
      setInputError(INPUT_ERRORS[parsed.reason]);
      field.current?.focus();
      return;
    }
    setInputError(null);
    dispatch({ type: 'open', id: parsed.id });
  };

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            ref={field}
            id={`${ids}-link`}
            label="Share link or ID"
            placeholder="acadegrade.vercel.app/share/…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (inputError) setInputError(null);
            }}
            error={inputError ?? undefined}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="sm:mt-[1.6875rem]">
          Preview
        </Button>
      </form>
      <p className="mt-2 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
        Opening a link this way counts as a view on it, like any other visit.
      </p>

      <PreviewDialog state={state} dispatch={dispatch} />
    </>
  );
}

function PreviewDialog({
  state,
  dispatch,
}: {
  state: PreviewState<SharedTranscript>;
  dispatch: React.Dispatch<PreviewAction<SharedTranscript>>;
}) {
  const open = state.kind !== 'idle';
  const close = () => dispatch({ type: 'close' });
  return (
    <Modal
      open={open}
      onClose={close}
      title="Transcript preview"
      description="What the person who opens this link sees."
      size="review"
      className="print:hidden"
    >
      <div aria-live="polite">
        <PreviewBody state={state} dispatch={dispatch} onClose={close} />
      </div>
    </Modal>
  );
}

function Notice({
  icon,
  title,
  children,
  actions,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="mx-auto flex max-w-[30rem] flex-col items-start gap-4 py-4">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-12 items-center justify-center rounded-2xl',
          tone === 'danger' ? 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]' : 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]',
        )}
      >
        {icon}
      </span>
      <div>
        <h3 className="app-display text-[1.375rem] font-bold leading-tight text-[var(--acade-text)]">{title}</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-[var(--acade-text-muted)]">{children}</p>
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div> : null}
    </div>
  );
}

function PreviewBody({
  state,
  dispatch,
  onClose,
}: {
  state: PreviewState<SharedTranscript>;
  dispatch: React.Dispatch<PreviewAction<SharedTranscript>>;
  onClose: () => void;
}) {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'loading':
      return (
        <>
          <p role="status" className="sr-only">Opening the link…</p>
          <RecordSkeleton />
        </>
      );
    case 'pin':
      return <PinStep state={state} dispatch={dispatch} />;
    case 'locked':
      return (
        <Notice icon={<Lock size={22} />} title="This link is locked" tone="danger" actions={<Button variant="outline" size="sm" onClick={onClose}>Close</Button>}>
          {lockedMessage(state.retryAfterSeconds)}
        </Notice>
      );
    case 'unavailable':
      return state.reason === 'expired' ? (
        <Notice icon={<Clock size={22} />} title="This link has expired" actions={<Button variant="outline" size="sm" onClick={onClose}>Close</Button>}>
          It stopped working on the date the student chose. Ask them for a new link.
        </Notice>
      ) : (
        <Notice icon={<SearchX size={22} />} title="We couldn't find this link" actions={<Button variant="outline" size="sm" onClick={onClose}>Close</Button>}>
          It may have been revoked, or the ID is mistyped. Check it and try again.
        </Notice>
      );
    case 'error':
      return (
        <Notice
          icon={<WifiOff size={22} />}
          title="We couldn't open this link"
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'retry' })}>Try again</Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </>
          }
        >
          Check your connection and try again.
        </Notice>
      );
    case 'ready': {
      const transcript = state.transcript;
      const expiry = formatExpiryDate(state.expiresAt);
      return (
        <div className="flex flex-col gap-4">
          {/* The card itself carries the grading scale name in its cumulative summary. */}
          <ShareChips
            expiry={expiry ? `Works until ${expiry}` : null}
            summary={transcript.shareLevel === 'summary'}
            photo={Boolean(transcript.showPhoto && transcript.avatarUrl)}
          />
          <RecordCard transcript={transcript} expiry={expiry} />
        </div>
      );
    }
  }
}

function PinStep({
  state,
  dispatch,
}: {
  state: Extract<PreviewState<SharedTranscript>, { kind: 'pin' }>;
  dispatch: React.Dispatch<PreviewAction<SharedTranscript>>;
}) {
  const ids = useId();
  const [pin, setPin] = useState('');
  const field = useRef<HTMLInputElement>(null);

  // Back on the form after a wrong PIN: the field is empty and focused for the next try.
  useEffect(() => {
    if (!state.checking) field.current?.focus();
  }, [state.checking, state.error]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.checking) return;
    const value = pin.trim();
    // The PIN leaves component state as soon as it is read.
    setPin('');
    if (!isValidPin(value)) {
      dispatch({ type: 'pin-invalid' });
      return;
    }
    dispatch({ type: 'pin-sent' });
    const result = await fetchSharedTranscript<SharedTranscript>(state.id, value);
    dispatch({ type: 'result', id: state.id, result });
  };

  const error = state.error ? PIN_ERRORS[state.error] : null;
  return (
    <div className="mx-auto flex max-w-[26rem] flex-col gap-4 py-4">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
        <Lock size={22} />
      </span>
      <div>
        <h3 id={`${ids}-title`} className="app-display text-[1.375rem] font-bold leading-tight text-[var(--acade-text)]">This link needs a PIN</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-[var(--acade-text-muted)]">Enter the PIN that was set when the link was made.</p>
      </div>
      {/* No action and no field names: the PIN goes only in the X-Share-Pin header. */}
      <form onSubmit={(event) => void submit(event)} noValidate aria-labelledby={`${ids}-title`} className="flex flex-col gap-3">
        <label htmlFor={`${ids}-pin`} className="text-sm font-medium text-[var(--acade-text-muted)]">PIN</label>
        <input
          ref={field}
          id={`${ids}-pin`}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ids}-error` : `${ids}-hint`}
          className={cn(
            'h-14 w-full rounded-[var(--radius-control)] border bg-[var(--acade-deep)] px-4 text-center text-[1.375rem] font-semibold tracking-[0.4em] tabular-nums text-[var(--acade-text)] outline-none focus-visible:ring-2',
            error
              ? 'border-[var(--acade-danger)] focus-visible:ring-[var(--acade-danger)]/25'
              : 'border-[var(--acade-control-border)] focus-visible:border-[var(--acade-primary)] focus-visible:ring-[var(--acade-primary)]/25',
          )}
        />
        {error ? (
          <p id={`${ids}-error`} role="alert" className="text-sm font-medium text-[var(--acade-danger)]">{error}</p>
        ) : (
          <p id={`${ids}-hint`} className="text-[0.8125rem] text-[var(--acade-text-muted)]">4 to 6 digits.</p>
        )}
        <Button type="submit" variant="primary" size="md" loading={state.checking} loadingLabel="Checking…" fullWidth>
          View record
        </Button>
      </form>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { AuthButton, AuthLinkButton, InlineLink, TextField } from '@/components/site/auth/controls';
import { useShake } from '@/components/site/auth/hooks';
import { AuthMessage } from '@/components/site/auth/messages';
import { NoticeActions, NoticeCard, SystemStage } from '@/components/site/system/NoticeCard';
import { isValidPin } from '@/lib/share/options';
import { fetchSharedTranscript } from '@/lib/share/viewer';
import { expiryLine, formatExpiryDate } from './record-labels';
import { RecordCard, RecordSkeleton } from './RecordCard';
import { VisitorStub } from './VisitorStub';
import type { SharedTranscript } from './types';

type ViewState = 'loading' | 'ready' | 'pin' | 'unavailable' | 'error';

const PIN_TITLE_ID = 'share-pin-title';
const PIN_ERROR_ID = 'share-pin-error';

const PIN_MESSAGES = {
  format: 'Enter the 4 to 6 digits the student gave you.',
  incorrect: "That PIN isn't right. Check it with the student and try again.",
} as const;

function lockedMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many wrong PINs. This link is locked for about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Try again later.`;
}

/**
 * The shared transcript (share-transcript.md). The fetch, PIN rules and states
 * are unchanged: the PIN travels only in the X-Share-Pin header; 401
 * PIN_REQUIRED / PIN_INCORRECT ask again; 429 PIN_LOCKED locks the form;
 * 404 and 410 read the same; anything else is a network or server error with
 * Try again. The PDF builder is loaded only when Download PDF is pressed.
 */
export default function ShareTranscriptPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [transcript, setTranscript] = useState<SharedTranscript | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('loading');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLocked, setPinLocked] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const pinField = useRef<HTMLInputElement>(null);
  const { shake, props: shakeProps } = useShake();

  /** Loads the record; the PIN, when given, goes only in the request header. */
  const load = useCallback(async (pin?: string) => {
    const result = await fetchSharedTranscript<SharedTranscript>(shareId, pin);
    if (result.status === 'ok') {
      setTranscript(result.transcript);
      setExpiresAt(result.expiresAt);
      setPinError(null);
      setView('ready');
    } else if (result.status === 'pin-required') {
      setView('pin');
    } else if (result.status === 'pin-incorrect') {
      setPinError(PIN_MESSAGES.incorrect);
      shake();
      setView('pin');
    } else if (result.status === 'locked') {
      setPinLocked(true);
      setPinError(lockedMessage(result.retryAfterSeconds));
      setView('pin');
    } else {
      setView(result.status);
    }
  }, [shareId, shake]);

  useEffect(() => {
    if (!shareId) return;
    void load();
  }, [shareId, load]);

  const handlePinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pinLocked || checkingPin) return;
    const pin = pinInput.trim();
    // The PIN leaves component state as soon as it is sent.
    setPinInput('');
    if (!isValidPin(pin)) {
      setPinError(PIN_MESSAGES.format);
      pinField.current?.focus();
      return;
    }
    setCheckingPin(true);
    try {
      await load(pin);
    } finally {
      setCheckingPin(false);
      pinField.current?.focus();
    }
  };

  const retry = () => {
    setView('loading');
    void load();
  };

  const expiry = formatExpiryDate(expiresAt);

  const handleDownloadPdf = async () => {
    if (!transcript || pdfBusy) return;
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const { downloadTranscriptPdf } = await import('./transcript-pdf');
      await downloadTranscriptPdf(transcript, { expiry });
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  };

  if (view === 'loading') {
    return (
      <MinimalShell mainLabel="Shared record">
        <div className="ag-record-wrap mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-8 sm:py-12">
          <div className="mb-6 h-12" aria-hidden="true" />
          <p role="status" className="sr-only">
            Loading the record…
          </p>
          <RecordSkeleton />
        </div>
      </MinimalShell>
    );
  }

  if (view === 'pin') {
    return (
      <MinimalShell>
        <SystemStage>
          <div {...shakeProps} className={`w-full max-w-[480px] ${shakeProps.className}`}>
            <NoticeCard
              icon="lock"
              titleId={PIN_TITLE_ID}
              title="This record needs a PIN"
              sentence="The student protected this link with a PIN. Ask them for it, then enter it here."
            >
              {/* No `name` and no action: the PIN can never be submitted into a URL. */}
              <form onSubmit={(event) => void handlePinSubmit(event)} className="flex flex-col gap-5" noValidate aria-labelledby={PIN_TITLE_ID}>
                <TextField
                  ref={pinField}
                  id="share-pin"
                  label="PIN"
                  hint="4 to 6 digits."
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={pinLocked}
                  inputClassName="ag-num text-center text-[1.375rem] font-semibold tracking-[0.4em]"
                  aria-invalid={pinError ? true : undefined}
                  aria-describedby={pinError ? PIN_ERROR_ID : undefined}
                />
                {pinError ? (
                  <AuthMessage tone="error" id={PIN_ERROR_ID}>
                    {pinError}
                  </AuthMessage>
                ) : null}
                <AuthButton type="submit" block busy={checkingPin} disabled={pinLocked}>
                  {checkingPin ? 'Checking…' : 'View record'}
                </AuthButton>
                {pinLocked ? <p className="text-[0.875rem] text-ag-mist">Locked for now to protect the student&apos;s record.</p> : null}
              </form>
            </NoticeCard>
          </div>
        </SystemStage>
      </MinimalShell>
    );
  }

  if (view === 'unavailable') {
    // Expired and unknown links read the same on purpose: an old link must not reveal whether a record existed.
    return (
      <MinimalShell>
        <SystemStage>
          <NoticeCard
            icon="clock"
            title="This link has expired"
            sentence="Shared records stop opening after the date the student chose, or when they turn the link off. Ask them to send a new one. If you typed the address, check it."
          >
            <NoticeActions>
              <AuthLinkButton href="/">Go to AcadeGrade</AuthLinkButton>
            </NoticeActions>
          </NoticeCard>
        </SystemStage>
      </MinimalShell>
    );
  }

  if (view === 'error') {
    return (
      <MinimalShell>
        <SystemStage>
          <NoticeCard icon="signal" title="We couldn't open this record" sentence="Check your connection and try again.">
            <NoticeActions>
              <AuthButton onClick={retry}>Try again</AuthButton>
              <InlineLink href="/" className="inline-flex min-h-11 items-center justify-center">
                Go to AcadeGrade
              </InlineLink>
            </NoticeActions>
          </NoticeCard>
        </SystemStage>
      </MinimalShell>
    );
  }

  if (!transcript) return null;

  return (
    <MinimalShell className="ag-print-record">
      <div className="ag-record-wrap mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="ag-print-hide flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[1rem] font-semibold text-ag-ink">Shared with you through AcadeGrade</p>
            {expiry ? <p className="mt-0.5 text-[0.875rem] text-ag-mist">{expiryLine(expiry)}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <AuthButton variant="ghostOnLight" size="md" onClick={() => window.print()} className="flex-1 sm:flex-none">
              Print
            </AuthButton>
            <AuthButton size="md" busy={pdfBusy} onClick={() => void handleDownloadPdf()} className="flex-1 sm:flex-none">
              {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
            </AuthButton>
          </div>
        </div>
        {pdfFailed ? (
          <p role="alert" className="ag-print-hide rounded-xl bg-[#C2361F]/[0.07] px-4 py-3 text-[0.9375rem] text-[#9F2B17]">
            We couldn&apos;t make the PDF. Use Print and choose Save as PDF instead.
          </p>
        ) : null}

        <RecordCard transcript={transcript} expiry={expiry} />

        <VisitorStub />
      </div>
    </MinimalShell>
  );
}

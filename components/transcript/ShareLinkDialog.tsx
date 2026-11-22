'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils/cn';
import { expiryChipLabel } from '@/lib/share/link';
import {
  DEFAULT_SHARE_EXPIRY_DAYS,
  SHARE_EXPIRY_CHOICES,
  isValidPin,
  type ShareExpiryDays,
  type ShareLevel,
} from '@/lib/share/options';
import { ShareChips } from './ShareChips';
import { ShareQr } from './ShareQr';

export interface ShareLinkSettings {
  expiresInDays: ShareExpiryDays;
  level: ShareLevel;
  /** Plain PIN, or null. Sent once and then dropped. */
  pin: string | null;
}

export interface CreatedShareLink {
  shareUrl: string;
  expiresInDays: number;
  expiresAt: Date;
  level: ShareLevel;
  hasPin: boolean;
  showPhoto: boolean;
}

interface ShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
  showPhoto: boolean;
  onShowPhotoChange: (value: boolean) => void;
  hasPhoto: boolean;
  /** Creates the link; resolves null when it failed (the caller shows the error). */
  onCreate: (settings: ShareLinkSettings) => Promise<CreatedShareLink | null>;
}

const EXPIRY_OPTIONS = SHARE_EXPIRY_CHOICES.map((days) => ({
  value: String(days) as `${ShareExpiryDays}`,
  label: days === 1 ? '1 day' : `${days} days`,
}));

const LEVEL_OPTIONS: { value: ShareLevel; label: string }[] = [
  { value: 'full', label: 'Full transcript' },
  { value: 'summary', label: 'Summary only' },
];

const LEVEL_HINT: Record<ShareLevel, string> = {
  full: 'Every course with its scores, grade and points, plus your CGPA.',
  summary: 'Semester GPAs and your CGPA, without course-by-course scores.',
};

const PIN_FORMAT_ERROR = 'Use 4 to 6 digits, or leave the PIN empty.';

/**
 * "Share a link": every link setting in one place, then the new link with its QR
 * code. The PIN leaves this component's state as soon as the request is sent.
 */
export function ShareLinkDialog({ open, onClose, showPhoto, onShowPhotoChange, hasPhoto, onCreate }: ShareLinkDialogProps) {
  const ids = useId();
  const [expiry, setExpiry] = useState<ShareExpiryDays>(DEFAULT_SHARE_EXPIRY_DAYS);
  const [level, setLevel] = useState<ShareLevel>('full');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const copyButton = useRef<HTMLButtonElement>(null);

  // The settings form is replaced by the result: move focus to its main action.
  useEffect(() => {
    if (created) requestAnimationFrame(() => copyButton.current?.focus());
  }, [created]);

  // Each opening starts on the settings step; the last choices are kept, the PIN never is.
  useEffect(() => {
    if (open) {
      setCreated(null);
      setPin('');
      setPinError(null);
      setCopied(false);
    }
  }, [open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const value = pin.trim();
    if (value && !isValidPin(value)) {
      setPinError(PIN_FORMAT_ERROR);
      document.getElementById(`${ids}-pin`)?.focus();
      return;
    }
    setPinError(null);
    setPin('');
    setBusy(true);
    try {
      const result = await onCreate({ expiresInDays: expiry, level, pin: value || null });
      if (result) setCreated(result);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const days = created?.expiresInDays ?? expiry;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? 'Your link is ready' : 'Share a link'}
      description={
        created
          ? `${created.hasPin ? 'Anyone with this link and the PIN' : 'Anyone with this link'} can view your transcript for ${days} ${days === 1 ? 'day' : 'days'}.`
          : 'Choose how long the link works and what it shows. You can delete it at any time.'
      }
      className="print:hidden"
    >
      {created ? (
        <div className="flex flex-col gap-5">
          <ShareChips
            expiry={expiryChipLabel(created.expiresAt)}
            summary={created.level === 'summary'}
            pin={created.hasPin}
            photo={created.showPhoto}
          />
          {created.hasPin ? (
            <p className="rounded-xl bg-[var(--acade-primary-dim)] px-4 py-3 text-[0.875rem] leading-6 text-[var(--acade-text)]">
              Send the PIN separately from the link. It can&apos;t be shown again; if you forget it, delete this link and make a new one.
            </p>
          ) : null}
          <div className="mx-auto rounded-2xl bg-white p-4">
            <ShareQr url={created.shareUrl} size={176} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p id={`${ids}-url-label`} className="text-sm font-medium text-[var(--acade-text-muted)]">
              Link
            </p>
            {/* Wraps instead of scrolling, so the whole link is always visible. */}
            <p
              aria-labelledby={`${ids}-url-label`}
              className="select-all rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 py-3 text-[0.9375rem] font-medium tabular-nums text-[var(--acade-text)] [overflow-wrap:anywhere]"
            >
              {created.shareUrl}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <a
              href={created.shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Open link
            </a>
            <Button ref={copyButton} variant="primary" size="sm" onClick={() => void copy()} data-autofocus>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <p role="status" className="sr-only">{copied ? 'Link copied' : ''}</p>
        </div>
      ) : (
      /* No action and no field names: the PIN can never be submitted into a URL. */
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p aria-hidden="true" className="text-sm font-medium text-[var(--acade-text-muted)]">Link works for</p>
          <SegmentedControl
            aria-label="Link works for"
            value={String(expiry) as `${ShareExpiryDays}`}
            onValueChange={(value) => setExpiry(Number(value) as ShareExpiryDays)}
            options={EXPIRY_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p aria-hidden="true" className="text-sm font-medium text-[var(--acade-text-muted)]">What it shows</p>
          <SegmentedControl
            aria-label="What the link shows"
            value={level}
            onValueChange={setLevel}
            options={LEVEL_OPTIONS}
            className="w-full"
          />
          <p className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{LEVEL_HINT[level]}</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--acade-overlay)] py-1 pl-4 pr-1">
          <div className="min-w-0 py-2">
            <p id={`${ids}-photo`} className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">Include my photo</p>
            <p id={`${ids}-photo-hint`} className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
              {hasPhoto ? 'Also applies to the PDF and the printout.' : 'You have no profile photo yet, so none is shown.'}
            </p>
          </div>
          <Switch checked={showPhoto} onCheckedChange={onShowPhotoChange} aria-labelledby={`${ids}-photo`} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-pin`} className="text-sm font-medium text-[var(--acade-text-muted)]">
            PIN (optional)
          </label>
          <input
            id={`${ids}-pin`}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            placeholder="4 to 6 digits"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
              setPinError(null);
            }}
            aria-invalid={pinError ? true : undefined}
            aria-describedby={pinError ? `${ids}-pin-error ${ids}-pin-note` : `${ids}-pin-note`}
            className={cn(
              'h-12 w-full rounded-[var(--radius-control)] border bg-[var(--acade-deep)] px-4 text-base tracking-[0.3em] text-[var(--acade-text)] outline-none tabular-nums placeholder:tracking-normal placeholder:text-[var(--acade-text-faint)] focus-visible:ring-2',
              pinError
                ? 'border-[var(--acade-danger)] focus-visible:ring-[var(--acade-danger)]/25'
                : 'border-[var(--acade-control-border)] focus-visible:border-[var(--acade-primary)] focus-visible:ring-[var(--acade-primary)]/25',
            )}
          />
          {pinError ? (
            <p id={`${ids}-pin-error`} role="alert" className="text-sm font-medium text-[var(--acade-danger)]">
              {pinError}
            </p>
          ) : null}
          <p id={`${ids}-pin-note`} className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
            The person opening the link must type it. It can&apos;t be shown again, so note it down.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--acade-border-subtle)] pt-5 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" loading={busy} loadingLabel="Creating link…">
            Create link
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}

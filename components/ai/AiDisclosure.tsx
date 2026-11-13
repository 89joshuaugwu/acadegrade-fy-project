'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Flag, Info, ThumbsDown, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils/cn';
import type { AiFeature } from './aiAccess';
import { AI_REPORT_NOTE_MAX, AI_REPORT_REASONS, sendAiFeedback, type AiReportReason } from './aiFeedback';

export const AI_DISCLAIMER = "AI-generated. It can be wrong and isn't official academic advice.";

const FAILED = "Couldn't send that right now. Please try again later.";

const chip = cn(
  'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-medium text-[var(--acade-text-muted)]',
  'transition-colors duration-150 hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
  'aria-pressed:bg-[var(--acade-overlay)] aria-pressed:text-[var(--acade-text)]'
);

/**
 * The line under every AI output: the disclaimer, optional helpful/not-helpful
 * ratings and a Report action (Play AI-Generated Content policy; G8).
 */
export function AiDisclosure({ feature, className, ratings = true }: { feature: AiFeature; className?: string; ratings?: boolean }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const closeReport = useCallback(() => setReportOpen(false), []);

  const rate = async (kind: 'helpful' | 'not_helpful') => {
    if (!user || rating) return;
    setRating(kind);
    const ok = await sendAiFeedback(() => user.getIdToken(), { feature, kind });
    if (!ok) {
      setRating(null);
      toast.error(FAILED);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="flex items-start gap-2 text-sm leading-6 text-[var(--acade-text-muted)]">
        <Info className="mt-1 size-4 shrink-0" aria-hidden="true" />
        <span>{AI_DISCLAIMER}</span>
      </p>
      {user && (
        <div className="-ml-3 flex flex-wrap items-center gap-1 sm:ml-0" role="group" aria-label="Feedback on this AI response">
          {ratings && (
            <>
              <button type="button" className={chip} aria-pressed={rating === 'helpful'} disabled={rating !== null && rating !== 'helpful'} onClick={() => void rate('helpful')}>
                <ThumbsUp className="size-4" aria-hidden="true" />Helpful
              </button>
              <button type="button" className={chip} aria-pressed={rating === 'not_helpful'} disabled={rating !== null && rating !== 'not_helpful'} onClick={() => void rate('not_helpful')}>
                <ThumbsDown className="size-4" aria-hidden="true" />Not helpful
              </button>
            </>
          )}
          <button type="button" className={chip} aria-haspopup="dialog" onClick={() => setReportOpen(true)}>
            <Flag className="size-4" aria-hidden="true" />Report
          </button>
        </div>
      )}
      {user && (
        <AiReportDialog
          open={reportOpen}
          onClose={closeReport}
          onSubmit={(reason, note) => sendAiFeedback(() => user.getIdToken(), { feature, kind: 'report', reason, note })}
        />
      )}
    </div>
  );
}

function AiReportDialog({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: AiReportReason, note: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState<AiReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const legendId = useId();

  // Stable, so the Modal's focus and scroll-lock effect does not re-run on every keystroke.
  const close = useCallback(() => {
    if (sendingRef.current) return;
    setReason(null);
    setNote('');
    onClose();
  }, [onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason || sending) return;
    setSending(true);
    sendingRef.current = true;
    const ok = await onSubmit(reason, note);
    sendingRef.current = false;
    setSending(false);
    if (ok) {
      toast.success('Thanks. Your report was sent.');
      setReason(null);
      setNote('');
      onClose();
    } else {
      toast.error(FAILED);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Report this AI response"
      description="Tell us what is wrong. We store the reason and your note, not your results."
      size="confirm"
      presentation="sheet"
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset aria-labelledby={legendId} className="space-y-2">
          <legend id={legendId} className="text-sm font-medium text-[var(--acade-text-muted)]">Reason</legend>
          <div className="grid grid-cols-2 gap-2">
            {AI_REPORT_REASONS.map(option => (
              <label
                key={option.value}
                className={cn(
                  'relative flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-medium transition-colors',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acade-primary)]',
                  reason === option.value
                    ? 'border-[var(--acade-primary)] bg-[var(--acade-primary)]/10 text-[var(--acade-text)]'
                    : 'border-[var(--acade-control-border)] text-[var(--acade-text-muted)] hover:border-[var(--acade-primary)]'
                )}
              >
                <input
                  type="radio"
                  name="ai-report-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="size-4 accent-[var(--acade-primary)]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Textarea
          label="Note (optional)"
          hint={`${note.length} of ${AI_REPORT_NOTE_MAX} characters`}
          maxLength={AI_REPORT_NOTE_MAX}
          value={note}
          onChange={event => setNote(event.target.value.slice(0, AI_REPORT_NOTE_MAX))}
          className="min-h-[96px]"
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={sending}>Cancel</Button>
          <Button type="submit" disabled={!reason} loading={sending} loadingLabel="Sending report…">Send report</Button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { HelpButton } from '@/components/help/HelpDrawer';
import { STUDENT_HELP, studentHelpSource } from '@/lib/help/student-help';
import { Modal } from '@/components/ui/Modal';
import { useRecordType } from '@/hooks/useRecordType';
import { RECORD_TYPE_COPY } from '@/lib/records/navigation';
import { RECORD_TYPES, type RecordType } from '@/types/records';
import { cn } from '@/lib/utils/cn';

interface RecordTypeSectionProps {
  /** Switches users/{uid}.recordType; never deletes anything. */
  onSwitch: (next: RecordType) => Promise<void>;
  /** The edit_profile kill switch. */
  disabled?: boolean;
  /** False when the account has no university details yet (it started as O-level or JAMB). */
  hasUniversityProfile: boolean;
}

/**
 * Settings, "Record type": what the account tracks. Switching keeps every
 * record (university semesters, O-level sittings, the aggregate), so switching
 * back brings them all back. It always asks first.
 */
export function RecordTypeSection({ onSwitch, disabled = false, hasUniversityProfile }: RecordTypeSectionProps) {
  const current = useRecordType();
  const [choice, setChoice] = useState<RecordType>(current);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = confirming ? choice : current;
  const needsUniversity = choice === 'tertiary' && !hasUniversityProfile;

  const confirm = async () => {
    setSaving(true);
    try {
      await onSwitch(choice);
      toast.success(`Now tracking ${RECORD_TYPE_COPY[choice].phrase}`);
      setConfirming(false);
    } catch {
      toast.error("Couldn't switch. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="section-record-type" aria-labelledby="record-type-title" className="relative scroll-mt-24 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="record-type-title" className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">Record type</h2>
        <HelpButton entryId={STUDENT_HELP.recordType} source={studentHelpSource} />
      </div>
      <p className="mt-1 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
        What this account tracks. Switching never deletes anything: your other records are kept for when you switch back.
      </p>
      <div role="radiogroup" aria-labelledby="record-type-title" className="mt-5 grid gap-3">
        {RECORD_TYPES.map((type) => (
          <label
            key={type}
            className={cn(
              'flex gap-3 rounded-xl border border-[var(--acade-border)] p-4 transition-colors',
              disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-[var(--acade-control-border)]',
              'has-[input:checked]:border-[var(--acade-primary)] has-[input:checked]:bg-[var(--acade-primary-dim)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--acade-primary)]',
            )}
          >
            <input
              type="radio"
              name="record-type"
              value={type}
              checked={selected === type}
              disabled={disabled}
              onChange={() => {
                if (type === current) return;
                setChoice(type);
                setConfirming(true);
              }}
              className="peer sr-only"
            />
            <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--acade-control-border)] peer-checked:border-[var(--acade-primary)] peer-checked:[&>span]:scale-100">
              <span className="size-2.5 scale-0 rounded-full bg-[var(--acade-primary)] transition-transform" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-semibold text-[var(--acade-text)]">
                {RECORD_TYPE_COPY[type].title}
                {type === current ? <span className="ml-2 text-[0.8125rem] font-medium text-[var(--acade-success)]">Current</span> : null}
              </span>
              <span className="block text-[0.875rem] text-[var(--acade-text-muted)]">{RECORD_TYPE_COPY[type].line}</span>
            </span>
          </label>
        ))}
      </div>
      {disabled ? (
        <p className="mt-3 text-[0.875rem] text-[var(--acade-text-muted)]">Profile changes are paused for maintenance. Try again later.</p>
      ) : null}

      <Modal
        open={confirming}
        onClose={() => (saving ? undefined : setConfirming(false))}
        title={`Switch to ${RECORD_TYPE_COPY[choice].title}?`}
        description="Your dashboard and menu change to match. Nothing you have saved is deleted."
        size="confirm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[0.9375rem] leading-relaxed text-[var(--acade-text-muted)]">
            {current === 'tertiary'
              ? 'Your semesters, courses and CGPA stay saved. Switch back any time to see them again.'
              : 'Your O-level grades and aggregate details stay saved. Switch back any time to see them again.'}
            {needsUniversity ? ' Next, you will add where you study (university, department, level) to start your record.' : ''}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void confirm()} loading={saving} loadingLabel="Switching…">Switch</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

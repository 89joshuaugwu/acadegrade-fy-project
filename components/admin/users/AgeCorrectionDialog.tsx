'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';

export type AgeStatus = 'adult' | 'minor';

const CHOICES: Array<{ value: AgeStatus; label: string; effect: string }> = [
  { value: 'adult', label: 'Adult (18 or over)', effect: 'AI and scanning are allowed once they have allowed AI processing.' },
  { value: 'minor', label: 'Under 18', effect: 'AI and result scanning are blocked on every platform until they say they have turned 18.' },
];

/**
 * Support-only age correction (`POST /api/admin/users {action:'set-age'}`).
 * Students cannot change adult → minor themselves; this is that path.
 */
export function AgeCorrectionDialog({ student, onClose, onSubmit }: {
  student: { uid: string; fullName: string; email: string } | null;
  onClose: () => void;
  onSubmit: (input: { uid: string; ageStatus: AgeStatus; reason: string }) => Promise<void>;
}) {
  const [choice, setChoice] = useState<AgeStatus | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groupId = useId();

  // Modal re-runs its focus effect when onClose changes, so keep it stable while typing.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => { setChoice(null); setReason(''); setError(null); onCloseRef.current(); }, []);
  const ready = choice !== null && reason.trim().length >= 3 && !saving;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!student || !choice || !ready) return;
    setSaving(true); setError(null);
    try {
      await onSubmit({ uid: student.uid, ageStatus: choice, reason: reason.trim() });
      setChoice(null); setReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The age was not changed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={student !== null}
      onClose={close}
      title={`Correct the age for ${student?.fullName || student?.email || 'this student'}`}
      description="Use this only when the student or a guardian has contacted support. The change applies at once and is recorded in the audit log."
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset aria-labelledby={`${groupId}-legend`} className="space-y-2">
          <legend id={`${groupId}-legend`} className="text-sm font-medium text-[var(--acade-text)]">Age</legend>
          {CHOICES.map((item) => (
            <label key={item.value} className="flex cursor-pointer gap-3 rounded-xl border border-[var(--acade-border)] p-3 has-[:checked]:border-[var(--acade-primary)] has-[:checked]:bg-[var(--acade-primary-dim)]">
              <input
                type="radio"
                name={`${groupId}-age`}
                value={item.value}
                checked={choice === item.value}
                onChange={() => setChoice(item.value)}
                className="mt-1 size-4 accent-[var(--acade-primary)]"
              />
              <span className="text-sm">
                <span className="block font-medium text-[var(--acade-text)]">{item.label}</span>
                <span className="block text-[var(--acade-text-muted)]">{item.effect}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Textarea
          label="Reason"
          rows={3}
          required
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="Required. Say who asked and how, e.g. a support email from a parent."
        />
        {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--acade-border-subtle)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={!ready} loading={saving} loadingLabel="Saving…">Save age correction</Button>
        </div>
      </form>
    </Modal>
  );
}

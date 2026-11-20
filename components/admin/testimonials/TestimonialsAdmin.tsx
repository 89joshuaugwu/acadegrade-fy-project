'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatusChip } from '@/components/admin/StatusChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { ErrorState } from '@/components/shared';
import { DateField } from '@/components/ui/DateTimeFields';
import {
  DEFAULT_COUNT_THRESHOLD, MIN_APPROVED_TO_SHOW, TESTIMONIAL_LEVELS, TESTIMONIAL_MAX_WORDS, countWords,
  type AdminTestimonial, type TestimonialInput, type TestimonialStatus,
} from '@/lib/testimonials/testimonials';

const EMPTY: TestimonialInput = { quote: '', firstName: '', level: '300L', department: '', university: '', consentDate: '' };
const STATUS_TEXT: Record<TestimonialStatus, string> = { draft: 'Draft', approved: 'Approved', hidden: 'Hidden' };
const selectClass = 'mt-1 min-h-11 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]';

type Editor = { mode: 'create' } | { mode: 'edit'; id: string } | null;
type Confirm = { action: 'delete'; row: AdminTestimonial } | null;

/** Admin > Testimonials: real, consented student quotes and the student-count threshold (01 §8). */
export function TestimonialsAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminTestimonial[]>([]);
  const [threshold, setThreshold] = useState(String(DEFAULT_COUNT_THRESHOLD));
  const [savedThreshold, setSavedThreshold] = useState(DEFAULT_COUNT_THRESHOLD);
  const [minimum, setMinimum] = useState(MIN_APPROVED_TO_SHOW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState<TestimonialInput>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const token = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/testimonials', { headers: { Authorization: `Bearer ${await token()}` } });
      if (!response.ok) throw new Error('list');
      const body = await response.json() as { testimonials?: AdminTestimonial[]; countThreshold?: number; minimumToShow?: number };
      setRows(Array.isArray(body.testimonials) ? body.testimonials : []);
      const value = typeof body.countThreshold === 'number' ? body.countThreshold : DEFAULT_COUNT_THRESHOLD;
      setSavedThreshold(value);
      setThreshold(String(value));
      if (typeof body.minimumToShow === 'number') setMinimum(body.minimumToShow);
    } catch {
      setError('Testimonials did not load. Nothing was changed.');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { void load(); }, [load]);

  async function send(payload: Record<string, unknown>) {
    const response = await fetch('/api/admin/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; testimonial?: AdminTestimonial; countThreshold?: number };
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The change was not saved.');
    return body;
  }

  const approved = rows.filter((row) => row.status === 'approved').length;
  const words = countWords(draft.quote);

  function openEditor(next: Editor, row?: AdminTestimonial) {
    setEditor(next);
    setFormError(null);
    setDraft(row ? { quote: row.quote, firstName: row.firstName, level: row.level, department: row.department, university: row.university, consentDate: row.consentDate } : EMPTY);
  }

  async function saveEditor(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    if (words > TESTIMONIAL_MAX_WORDS) { setFormError(`Keep the quote to ${TESTIMONIAL_MAX_WORDS} words or fewer.`); return; }
    setBusy('editor'); setFormError(null);
    try {
      const body = editor.mode === 'create'
        ? await send({ action: 'create', data: draft })
        : await send({ action: 'update', id: editor.id, data: draft });
      const saved = body.testimonial;
      if (saved) setRows((current) => (editor.mode === 'create' ? [saved, ...current] : current.map((row) => (row.id === saved.id ? saved : row))));
      toast.success(editor.mode === 'create' ? 'Quote saved as a draft.' : 'Quote updated.');
      setEditor(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'The quote was not saved.');
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(row: AdminTestimonial, action: 'approve' | 'hide') {
    setBusy(`${action}-${row.id}`);
    try {
      const body = await send({ action, id: row.id });
      if (body.testimonial) setRows((current) => current.map((item) => (item.id === row.id ? body.testimonial! : item)));
      toast.success(action === 'approve' ? 'Approved. It can now appear on the public site.' : 'Hidden from the public site.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The quote was not updated.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm) return;
    setBusy('delete');
    try {
      await send({ action: 'delete', id: confirm.row.id });
      setRows((current) => current.filter((row) => row.id !== confirm.row.id));
      toast.success('Quote deleted.');
      setConfirm(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The quote was not deleted.');
    } finally {
      setBusy(null);
    }
  }

  const thresholdValue = Number(threshold);
  const thresholdValid = /^\d+$/.test(threshold.trim()) && Number.isInteger(thresholdValue) && thresholdValue <= 1_000_000;

  async function saveThreshold(event: React.FormEvent) {
    event.preventDefault();
    if (!thresholdValid || busy) return;
    setBusy('threshold');
    try {
      const body = await send({ action: 'threshold', value: thresholdValue });
      const value = typeof body.countThreshold === 'number' ? body.countThreshold : thresholdValue;
      setSavedThreshold(value);
      setThreshold(String(value));
      toast.success('Threshold saved.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The threshold was not saved.');
    } finally {
      setBusy(null);
    }
  }

  const edit = (patch: Partial<TestimonialInput>) => { setDraft((current) => ({ ...current, ...patch })); setFormError(null); };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Testimonials"
        description="Real quotes from students who agreed to be quoted, and when the public site may show the student count. Nothing here is public until you approve it."
        helpId="admin.testimonials"
        actions={<Button size="sm" onClick={() => openEditor({ mode: 'create' })}>Add a quote</Button>}
      />

      <Card padding="lg">
        <section aria-labelledby="proof-visibility-title" className="space-y-3 text-sm">
          <h2 id="proof-visibility-title" className="text-lg font-semibold text-[var(--acade-text)]">On the public site</h2>
          <p className="text-[var(--acade-text)]">
            {approved >= minimum
              ? `The "What students say" section is showing ${approved} approved ${approved === 1 ? 'quote' : 'quotes'}.`
              : `The "What students say" section is hidden: ${approved} of ${minimum} approved quotes needed.`}
          </p>
          <p className="text-[var(--acade-text-muted)]">
            To see the design with sample quotes, open the <a href="/?preview=proof" className="font-medium text-[var(--acade-primary)] underline underline-offset-2">home page preview</a> while signed in. Samples never appear to visitors.
          </p>
          <form onSubmit={saveThreshold} className="flex flex-wrap items-end gap-3 pt-2">
            <div className="w-48">
              <Input
                id="proof-threshold"
                label="Show the student count from"
                inputMode="numeric"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                hint={`Registered students. Saved: ${savedThreshold.toLocaleString('en-GB')}.`}
                error={thresholdValid ? undefined : 'Enter a whole number from 0 to 1,000,000.'}
              />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={!thresholdValid || thresholdValue === savedThreshold} loading={busy === 'threshold'} loadingLabel="Saving…">Save threshold</Button>
          </form>
        </section>
      </Card>

      {error ? (
        <ErrorState title="Testimonials could not be loaded" description={error} onRetry={() => { void load(); }} />
      ) : loading ? (
        <div role="status" aria-label="Loading testimonials" className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20" />)}</div>
      ) : rows.length === 0 ? (
        <p role="status" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-10 text-center text-sm text-[var(--acade-text-muted)]">
          No quotes yet. Add one when a student agrees to be quoted.
        </p>
      ) : (
        <ul aria-label="Quotes" className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[var(--radius-surface)] bg-[var(--acade-surface)] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-sm text-[var(--acade-text)]">&ldquo;{row.quote}&rdquo;</p>
                  <p className="text-xs text-[var(--acade-text-muted)]">
                    {row.firstName}, {row.level} {row.department}, {row.university} · consent {row.consentDate}
                  </p>
                </div>
                <StatusChip state={row.status === 'approved' ? 'verified' : row.status === 'hidden' ? 'off' : 'configured'} detail={STATUS_TEXT[row.status]} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === 'approved'
                  ? <Button size="sm" variant="outline" aria-label={`Hide the quote from ${row.firstName}`} loading={busy === `hide-${row.id}`} loadingLabel="Hiding…" onClick={() => { void changeStatus(row, 'hide'); }}>Hide</Button>
                  : <Button size="sm" variant="outline" aria-label={`Approve the quote from ${row.firstName}`} loading={busy === `approve-${row.id}`} loadingLabel="Approving…" onClick={() => { void changeStatus(row, 'approve'); }}>Approve</Button>}
                <Button size="sm" variant="ghost" aria-label={`Edit the quote from ${row.firstName}`} onClick={() => openEditor({ mode: 'edit', id: row.id }, row)}>Edit</Button>
                <Button size="sm" variant="ghost" aria-label={`Delete the quote from ${row.firstName}`} onClick={() => setConfirm({ action: 'delete', row })}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editor !== null} onClose={() => { if (!busy) setEditor(null); }} title={editor?.mode === 'edit' ? 'Edit quote' : 'Add a quote'}>
        <form onSubmit={saveEditor} className="space-y-4">
          <Textarea
            id="testimonial-quote"
            label="Quote"
            rows={3}
            value={draft.quote}
            onChange={(event) => edit({ quote: event.target.value })}
            hint={`${words} of ${TESTIMONIAL_MAX_WORDS} words. Use the student's own words, without quotation marks.`}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="testimonial-first-name" label="First name" value={draft.firstName} maxLength={40} onChange={(event) => edit({ firstName: event.target.value })} hint="First name only." />
            <label className="block text-sm text-[var(--acade-text)]">Level
              <select className={selectClass} value={draft.level} onChange={(event) => edit({ level: event.target.value })}>
                {TESTIMONIAL_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <Input id="testimonial-department" label="Department" value={draft.department} maxLength={80} onChange={(event) => edit({ department: event.target.value })} />
            <Input id="testimonial-university" label="University" value={draft.university} maxLength={120} onChange={(event) => edit({ university: event.target.value })} />
            <DateField id="testimonial-consent" label="Consent date" value={draft.consentDate} onChange={(value) => edit({ consentDate: value })} hint="The day the student agreed to be quoted." />
          </div>
          <p className="text-sm text-[var(--acade-text-muted)]">New quotes are saved as drafts. Approve one to let the public site show it.</p>
          {formError && <p role="alert" className="text-sm text-[var(--acade-danger)]">{formError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={busy === 'editor'}>Cancel</Button>
            <Button type="submit" loading={busy === 'editor'} loadingLabel="Saving…">{editor?.mode === 'edit' ? 'Save changes' : 'Save as draft'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={confirm !== null} onClose={() => { if (!busy) setConfirm(null); }} title="Delete this quote?" size="confirm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--acade-text)]">It is removed from the public site and from this list. Use this when a student withdraws consent. This cannot be undone.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy === 'delete'}>Cancel</Button>
            <Button variant="danger" loading={busy === 'delete'} loadingLabel="Deleting…" onClick={() => { void remove(); }}>Delete quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

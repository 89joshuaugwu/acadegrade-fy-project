'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
  SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS, SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN, type SupportCategory, type SupportStatus,
} from '@/lib/support/tickets';

interface StudentTicket {
  id: string;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  createdAt: string | null;
  replies: { message: string; at: string | null }[];
}

const STATUS_TEXT: Record<SupportStatus, string> = { open: 'Sent', waiting: 'Answered', closed: 'Closed' };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Settings > Help and support (web): "Report a problem" and "Your requests".
 * Hidden when the admin switches `support` off. Text only; never ask for passwords.
 * Place it on the settings page: `<SupportRequestsCard />`.
 */
export function SupportRequestsCard() {
  const { user } = useAuth();
  const { isFeatureDisabled, loading: settingsLoading } = usePlatformSettings();
  const [category, setCategory] = useState<SupportCategory | ''>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [tickets, setTickets] = useState<StudentTicket[] | null>(null);
  const [listError, setListError] = useState(false);
  const selectId = useId();

  const loadTickets = useCallback(async () => {
    if (!user) return;
    setListError(false);
    try {
      const res = await fetch('/api/support/tickets', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error('list');
      const body = await res.json() as { tickets?: StudentTicket[] };
      setTickets(Array.isArray(body.tickets) ? body.tickets : []);
    } catch {
      setListError(true);
    }
  }, [user]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  if (settingsLoading || isFeatureDisabled('support')) return null;

  const trimmed = message.trim();
  const valid = category !== '' && trimmed.length >= SUPPORT_MESSAGE_MIN && trimmed.length <= SUPPORT_MESSAGE_MAX;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !valid) return;
    setSending(true);
    setFormError(null);
    setSent(false);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ category, message: trimmed, platform: 'web', route: window.location.pathname.slice(0, 120) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Your request could not be sent.');
      setCategory('');
      setMessage('');
      setSent(true);
      void loadTickets();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Your request could not be sent.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="support-title" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
      <h2 id="support-title" className="flex items-center gap-2 text-base font-semibold text-[var(--acade-text)]">
        <LifeBuoy className="size-4" aria-hidden="true" />Help and support
      </h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Tell us what went wrong. We reply in your AcadeGrade inbox and by email.</p>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-[var(--acade-text)]">What is it about?</label>
          <select
            id={selectId}
            value={category}
            onChange={(event) => setCategory(event.target.value as SupportCategory | '')}
            className="h-12 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 text-sm text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none"
          >
            <option value="">Choose one</option>
            {SUPPORT_CATEGORIES.map((id) => <option key={id} value={id}>{SUPPORT_CATEGORY_LABELS[id]}</option>)}
          </select>
        </div>
        <Textarea
          label="Describe the problem"
          rows={4}
          maxLength={SUPPORT_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          hint={`At least ${SUPPORT_MESSAGE_MIN} characters. Do not include your password or any code we sent you.`}
        />
        {formError ? <p role="alert" className="text-sm text-[var(--acade-danger)]">{formError}</p> : null}
        {sent ? <p role="status" className="text-sm text-[var(--acade-success)]">Sent. We will reply in your inbox.</p> : null}
        <Button type="submit" disabled={!valid} loading={sending} loadingLabel="Sending…">Send request</Button>
      </form>

      <div className="mt-6 border-t border-[var(--acade-border-subtle)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--acade-text)]">Your requests</h3>
        {listError ? (
          <p className="mt-2 text-sm text-[var(--acade-text-muted)]">
            Your requests could not be loaded.{' '}
            <button type="button" className="underline underline-offset-2" onClick={() => { void loadTickets(); }}>Try again</button>
          </p>
        ) : tickets === null ? (
          <p role="status" className="mt-2 text-sm text-[var(--acade-text-muted)]">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--acade-text-muted)]">You have not sent any requests.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-xl border border-[var(--acade-border-subtle)] p-3 text-sm">
                <p className="flex flex-wrap justify-between gap-2 text-xs text-[var(--acade-text-muted)]">
                  <span>{SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category} · {when(ticket.createdAt)}</span>
                  <span>{STATUS_TEXT[ticket.status] ?? ticket.status}</span>
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[var(--acade-text)]">{ticket.message}</p>
                {ticket.replies.map((reply, index) => (
                  <p key={`${reply.at}-${index}`} className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[var(--acade-primary-dim)] p-2 text-[var(--acade-text)]">
                    <span className="block text-xs text-[var(--acade-text-muted)]">AcadeGrade support · {when(reply.at)}</span>
                    {reply.message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

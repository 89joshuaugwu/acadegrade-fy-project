'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { ErrorState } from '@/components/shared';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_REPLY_MAX, type SupportCategory, type SupportStatus } from '@/lib/support/tickets';

export interface AdminTicket {
  id: string;
  uid: string | null;
  /** 'public': sent from the public Support form without signing in. Older rows may omit it. */
  source?: 'account' | 'public';
  email: string | null;
  name: string | null;
  category: SupportCategory;
  message: string;
  platform: 'web' | 'android';
  appVersion: string | null;
  route: string | null;
  status: SupportStatus;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  purgeAt: string | null;
  replies: { message: string; at: string | null; actorEmail: string | null }[];
}

const STATUS_OPTIONS: { value: SupportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'closed', label: 'Closed' },
];

const isPublic = (ticket: AdminTicket) => ticket.source === 'public';
/** Where the request came from, for the list and the detail line. */
const origin = (ticket: AdminTicket) => (isPublic(ticket) ? 'Not signed in' : ticket.platform === 'android' ? 'Android' : 'Web');

const when = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

/** Admin > Support inbox: requests from Settings, Help and support (web and Android). */
export function SupportInbox() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SupportStatus>('open');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const token = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const load = useCallback(async (cursor?: string) => {
    if (!user) return;
    if (cursor) setLoadingMore(true); else { setLoading(true); setError(null); }
    try {
      const params = new URLSearchParams({ status });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/support?${params.toString()}`, { headers: { Authorization: `Bearer ${await token()}` } });
      if (!res.ok) throw new Error('list');
      const body = await res.json() as { tickets?: AdminTicket[]; nextCursor?: string | null };
      const rows = Array.isArray(body.tickets) ? body.tickets : [];
      setTickets((current) => (cursor ? [...current, ...rows.filter((row) => !current.some((existing) => existing.id === row.id))] : rows));
      setNextCursor(body.nextCursor ?? null);
    } catch {
      if (cursor) toast.error('More requests could not be loaded.');
      else setError('The support inbox did not respond. No requests were changed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [status, token, user]);

  useEffect(() => { setSelectedId(null); void load(); }, [load]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  async function act(action: 'reply' | 'close' | 'reopen') {
    if (!selected) return;
    setBusy(action);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ action, ticketId: selected.id, ...(action === 'reply' ? { message: reply.trim() } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The request was not updated.');
      const updated = body.ticket as AdminTicket | undefined;
      if (action === 'reply') {
        setReply('');
        if (isPublic(selected)) toast[body.emailSent ? 'success' : 'error'](body.emailSent ? 'Reply sent by email.' : 'The reply was saved, but the email could not be sent.');
        else toast.success(body.emailSent ? 'Reply sent to their inbox and email.' : 'Reply sent to their inbox. The email could not be sent.');
      } else {
        toast.success(action === 'close' ? 'Request closed.' : 'Request reopened.');
      }
      // The request moves to another tab when its status changes.
      if (updated && updated.status !== status) {
        setTickets((current) => current.filter((ticket) => ticket.id !== updated.id));
        setSelectedId(null);
      } else if (updated) {
        setTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The request was not updated.');
    } finally {
      setBusy(null);
    }
  }

  const replyValid = reply.trim().length > 0 && reply.trim().length <= SUPPORT_REPLY_MAX;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support inbox"
        description="Requests students send from Settings, Help and support on the website and the Android app, and from the public Support page by people who cannot sign in. Closed requests are deleted 180 days after closing."
        helpId="admin.support"
      />

      <SegmentedControl aria-label="Request status" value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />

      {error ? (
        <ErrorState title="Support requests could not be loaded" description={error} onRetry={() => { void load(); }} />
      ) : loading ? (
        <div role="status" aria-label="Loading requests" className="space-y-3">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-20" />)}
        </div>
      ) : tickets.length === 0 ? (
        <p role="status" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-10 text-center text-sm text-[var(--acade-text-muted)]">
          {status === 'open' ? 'No open requests. Nice.' : status === 'waiting' ? 'No requests are waiting on a student.' : 'No closed requests.'}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="overflow-hidden rounded-[var(--radius-surface)] bg-[var(--acade-surface)]">
                  <button
                    type="button"
                    aria-pressed={ticket.id === selectedId}
                    onClick={() => { setSelectedId(ticket.id); setReply(''); }}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--acade-overlay)]/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)] aria-pressed:bg-[var(--acade-primary-dim)]"
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-[var(--acade-text)]">{ticket.name || ticket.email || (isPublic(ticket) ? 'Not signed in' : 'Student')}</span>
                      <span className="shrink-0 text-xs text-[var(--acade-text-muted)]">{when(ticket.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--acade-text-muted)]">
                      {SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category} · {origin(ticket)}
                      {ticket.replies.length ? ` · ${ticket.replies.length} repl${ticket.replies.length === 1 ? 'y' : 'ies'}` : ''}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-[var(--acade-text)]">{ticket.message}</span>
                  </button>
                </li>
              ))}
            </ul>
            {nextCursor ? (
              <Button variant="outline" size="sm" loading={loadingMore} loadingLabel="Loading more requests" onClick={() => { void load(nextCursor); }}>Load more</Button>
            ) : null}
          </div>

          <section aria-label="Selected request" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
            {!selected ? (
              <p className="text-sm text-[var(--acade-text-muted)]">Choose a request to read it and reply.</p>
            ) : (
              <div className="space-y-5 text-sm">
                <div>
                  <h2 className="text-base font-semibold text-[var(--acade-text)]">{SUPPORT_CATEGORY_LABELS[selected.category] ?? selected.category}</h2>
                  <p className="mt-1 break-words text-[var(--acade-text-muted)]">
                    {selected.name || (isPublic(selected) ? 'No name given' : 'Student')} · {selected.email || 'no email'} · {origin(selected)}
                    {selected.appVersion ? ` ${selected.appVersion}` : ''}{selected.route ? ` · on ${selected.route}` : ''} · {when(selected.createdAt)}
                  </p>
                </div>
                {isPublic(selected) ? (
                  <p role="note" className="rounded-lg bg-[var(--acade-warning)]/10 px-3 py-2 text-[var(--acade-text)]">
                    Sent without signing in, so the email address is not verified. Before changing or deleting an account, check that this address matches the account&apos;s email.
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words rounded-xl bg-[var(--acade-deep)] p-4 text-[var(--acade-text)]">{selected.message}</p>

                {selected.replies.length > 0 ? (
                  <ol className="space-y-3" aria-label="Replies">
                    {selected.replies.map((item, index) => (
                      <li key={`${item.at}-${index}`} className="rounded-xl border border-[var(--acade-border-subtle)] p-3">
                        <p className="text-xs text-[var(--acade-text-muted)]">{item.actorEmail ?? 'Support'} · {when(item.at)}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[var(--acade-text)]">{item.message}</p>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {selected.status !== 'closed' ? (
                  <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (replyValid) void act('reply'); }}>
                    <Textarea
                      label="Reply"
                      rows={5}
                      maxLength={SUPPORT_REPLY_MAX}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      hint={isPublic(selected)
                        ? 'Plain text, sent by email only (they are not signed in). Never ask for a password or code.'
                        : 'Plain text. The student gets it in their AcadeGrade inbox and by email. Never ask for a password or code.'}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="ghost" loading={busy === 'close'} loadingLabel="Closing…" onClick={() => { void act('close'); }}>Close request</Button>
                      <Button type="submit" disabled={!replyValid || busy !== null} loading={busy === 'reply'} loadingLabel="Sending…">Send reply</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[var(--acade-text-muted)]">Closed {when(selected.closedAt)}. Deleted after {when(selected.purgeAt)}.</p>
                    <Button variant="outline" size="sm" loading={busy === 'reopen'} loadingLabel="Reopening…" onClick={() => { void act('reopen'); }}>Reopen</Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

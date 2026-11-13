'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { postAdminSettings } from './api';

const MAX_LENGTH = 500;

/**
 * Settings → Announcements. Saving the banner and notifying students are two
 * separate actions; sending always asks first and warns about repeats.
 */
export function AnnouncementSettings({ initial, getToken }: { initial: string; getToken: () => Promise<string> }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<'save' | 'remove' | 'send' | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [lastSent, setLastSent] = useState<{ text: string; at: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmed = text.trim();
  const changed = trimmed !== saved.trim();
  const repeat = lastSent !== null && lastSent.text === trimmed;

  async function run(kind: 'save' | 'remove' | 'send', action: (token: string) => Promise<void>) {
    setBusy(kind); setError(null); setNotice(null);
    try { await action(await getToken()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'That did not work. Try again.'); }
    finally { setBusy(null); }
  }

  const saveBanner = () => run('save', async (token) => {
    await postAdminSettings(token, { field: 'announcementBanner', value: trimmed });
    setSaved(trimmed); setText(trimmed);
    setNotice('Banner saved. It shows on the student website.');
  });

  const removeBanner = () => run('remove', async (token) => {
    await postAdminSettings(token, { field: 'announcementBanner', value: null });
    setSaved(''); setText('');
    setNotice('Banner removed.');
  });

  const send = () => {
    setConfirmSend(false);
    return run('send', async (token) => {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: 'all', title: 'New Announcement', message: trimmed, type: 'broadcast', event: 'adminAnnouncement' }),
      });
      if (!response.ok) throw new Error('The notification was not sent.');
      setLastSent({ text: trimmed, at: new Date() });
      setNotice('Notification sent to every student.');
    });
  };

  const time = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Card padding="lg">
      <section aria-labelledby="announcement-title" className="space-y-5">
        <div>
          <h2 id="announcement-title" className="text-lg font-semibold text-[var(--acade-text)]">Announcement</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">The banner shows on the student website. A notification reaches every student&apos;s inbox and phone.</p>
        </div>

        <Input
          label="Banner text"
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => { setText(event.target.value); setError(null); setNotice(null); }}
          placeholder="Scheduled maintenance this Friday at 11 PM"
          hint={`${trimmed.length} of ${MAX_LENGTH} characters.`}
        />

        <section aria-label="Banner preview" className="overflow-hidden rounded-xl border border-[var(--acade-border)]">
          <p className="border-b border-[var(--acade-border-subtle)] bg-[var(--acade-overlay)] px-4 py-2 text-xs font-medium text-[var(--acade-text-muted)]">Preview on the student website</p>
          {trimmed ? (
            <div className="flex items-start gap-3 border-b border-[var(--acade-gold)]/20 bg-[var(--acade-gold)]/10 px-4 py-3 text-[var(--acade-gold)]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium leading-tight">{trimmed}</p>
            </div>
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--acade-text-muted)]">No banner. Students see nothing here.</p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button loading={busy === 'save'} loadingLabel="Saving…" disabled={!changed || !trimmed || busy !== null} onClick={() => { void saveBanner(); }}>Save banner</Button>
          <Button variant="outline" disabled={!trimmed || busy !== null} loading={busy === 'send'} loadingLabel="Sending…" onClick={() => setConfirmSend(true)}>Send as notification…</Button>
          <Button variant="ghost" className="sm:ml-auto" disabled={!saved || busy !== null} loading={busy === 'remove'} loadingLabel="Removing…" onClick={() => { void removeBanner(); }}>Remove banner</Button>
        </div>

        <div className="space-y-1 text-sm">
          {error && <p role="alert" className="text-[var(--acade-danger)]">{error}</p>}
          <p role="status" className="text-[var(--acade-text-muted)]">
            {notice ?? (changed ? 'The banner text has unsaved changes.' : '')}
          </p>
          {lastSent && <p className="text-[var(--acade-text-muted)]">Last sent at {time(lastSent.at)}: &ldquo;{lastSent.text}&rdquo;</p>}
        </div>
      </section>

      <Modal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title="Send to every student?"
        description={`Send '${trimmed}' to every student's inbox and phone? Students who turned off admin broadcasts are skipped. This cannot be undone.`}
        confirm={{ label: 'Send notification', onConfirm: () => { void send(); }, loading: busy === 'send' }}
      >
        {repeat && lastSent
          ? <p className="rounded-xl bg-[var(--acade-warning)]/10 px-3 py-2 text-sm text-[var(--acade-text)]">You already sent this exact text at {time(lastSent.at)}. Sending again notifies everyone a second time.</p>
          : <p className="text-sm text-[var(--acade-text-muted)]">This does not change the banner.</p>}
      </Modal>
    </Card>
  );
}

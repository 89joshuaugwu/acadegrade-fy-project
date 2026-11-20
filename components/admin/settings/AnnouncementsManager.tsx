'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { DateTimeField } from '@/components/ui/DateTimeFields';
import { Checkbox } from '@/components/admin/ui/Checkbox';
import { ANNOUNCEMENT_AUDIENCE_MAX, ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from '@/lib/announcements/shared';

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  audience: { universities?: string[]; levels?: number[] };
  startsAt: string | null;
  endsAt: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  showAsBanner: boolean;
  push: boolean;
  sentAt: string | null;
}

const LEVELS = [100, 200, 300, 400, 500, 600, 700];
const STATUS_TEXT: Record<AdminAnnouncement['status'], string> = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published', archived: 'Archived' };

interface Draft {
  id: string | null;
  title: string;
  body: string;
  linkUrl: string;
  universities: string;
  levels: number[];
  startsAt: string;
  endsAt: string;
  showAsBanner: boolean;
  push: boolean;
}

const EMPTY: Draft = { id: null, title: '', body: '', linkUrl: '', universities: '', levels: [], startsAt: '', endsAt: '', showAsBanner: false, push: false };

/** ISO -> value for <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function audienceText(audience: AdminAnnouncement['audience']) {
  const parts = [
    audience.universities?.length ? audience.universities.join(', ') : null,
    audience.levels?.length ? audience.levels.map((level) => `${level}L`).join(', ') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Everyone';
}

/**
 * Settings > Announcements: targeted and scheduled announcements. They appear in
 * every matching student's inbox (web and Android), optionally as the banner,
 * and optionally as one push sent to FCM topics (no per-student scan).
 */
export function AnnouncementsManager({ getToken, onBackfillState }: Readonly<{
  getToken: () => Promise<string>;
  onBackfillState?: (completedOnce: boolean) => void;
}>) {
  const [items, setItems] = useState<AdminAnnouncement[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const levelsId = useId();

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/admin/announcements', { headers: { Authorization: `Bearer ${await getToken()}` } });
      if (!res.ok) throw new Error('list');
      const body = await res.json() as { announcements?: AdminAnnouncement[]; topicsBackfill?: { completedOnce?: boolean } };
      setItems(Array.isArray(body.announcements) ? body.announcements : []);
      onBackfillState?.(body.topicsBackfill?.completedOnce === true);
    } catch {
      setLoadError(true);
      setItems([]);
    }
  }, [getToken, onBackfillState]);

  useEffect(() => { void load(); }, [load]);

  const universities = draft.universities.split('\n').map((line) => line.trim()).filter(Boolean);
  const audienceCount = universities.length + draft.levels.length;
  const valid = draft.title.trim().length > 0 && draft.title.trim().length <= ANNOUNCEMENT_TITLE_MAX
    && draft.body.trim().length > 0 && draft.body.trim().length <= ANNOUNCEMENT_BODY_MAX
    && audienceCount <= ANNOUNCEMENT_AUDIENCE_MAX;

  const payload = () => ({
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title.trim(),
    body: draft.body.trim(),
    linkUrl: draft.linkUrl.trim() || null,
    audience: { universities, levels: draft.levels },
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    showAsBanner: draft.showAsBanner,
    push: draft.push,
  });

  async function send(action: 'save' | 'publish' | 'schedule' | 'archive', announcement: Record<string, unknown>) {
    setBusy(action); setError(null); setNotice(null);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ action, announcement }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'That did not work. Try again.');
      const saved = body.announcement as AdminAnnouncement;
      setItems((current) => [saved, ...(current ?? []).filter((item) => item.id !== saved.id)]);
      if (action === 'archive') setNotice('Archived. Students no longer see it.');
      else if (action === 'publish') setNotice(body.pushed ? 'Published and push sent. Delivery can take a few minutes.' : 'Published. Students see it in their inbox now.');
      else if (action === 'schedule') setNotice('Scheduled. It goes out during the daily run (03:00 to 03:59 UTC) on or after the start time.');
      else setNotice('Draft saved.');
      if (action !== 'save') setDraft(EMPTY); else setDraft((current) => ({ ...current, id: saved.id }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Try again.');
    } finally {
      setBusy(null);
    }
  }

  const edit = (item: AdminAnnouncement) => {
    setNotice(null); setError(null);
    setDraft({
      id: item.id, title: item.title, body: item.body, linkUrl: item.linkUrl ?? '',
      universities: (item.audience.universities ?? []).join('\n'), levels: item.audience.levels ?? [],
      startsAt: item.status === 'scheduled' ? toLocalInput(item.startsAt) : '', endsAt: toLocalInput(item.endsAt),
      showAsBanner: item.showAsBanner, push: item.push,
    });
  };

  const toggleLevel = (level: number) => setDraft((current) => ({
    ...current,
    levels: current.levels.includes(level) ? current.levels.filter((value) => value !== level) : [...current.levels, level].sort((a, b) => a - b),
  }));

  return (
    <Card padding="lg">
      <section aria-labelledby="announcements-title" className="space-y-5">
        <div>
          <h2 id="announcements-title" className="text-lg font-semibold text-[var(--acade-text)]">Targeted announcements</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
            Shows in the inbox of every matching student on the website and Android. Leave the audience empty for everyone.
            Never put grades or personal details in an announcement.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (valid) void send('save', payload()); }}>
          <Input label="Title" value={draft.title} maxLength={ANNOUNCEMENT_TITLE_MAX} onChange={(event) => setDraft({ ...draft, title: event.target.value })} hint={`${draft.title.trim().length} of ${ANNOUNCEMENT_TITLE_MAX} characters.`} />
          <Textarea label="Message" rows={3} value={draft.body} maxLength={ANNOUNCEMENT_BODY_MAX} onChange={(event) => setDraft({ ...draft, body: event.target.value })} hint={`${draft.body.trim().length} of ${ANNOUNCEMENT_BODY_MAX} characters.`} />
          <Input label="Link (optional)" value={draft.linkUrl} onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })} placeholder="/results or https://…" hint="An app page such as /results, or an https:// address." />
          <Textarea label="Universities (optional, one per line)" rows={2} value={draft.universities} onChange={(event) => setDraft({ ...draft, universities: event.target.value })} hint="Spelled exactly as in the Academic catalogue." />
          <fieldset aria-labelledby={`${levelsId}-legend`}>
            <legend id={`${levelsId}-legend`} className="mb-2 text-sm font-medium text-[var(--acade-text)]">Levels (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <Checkbox
                  key={level}
                  checked={draft.levels.includes(level)}
                  onChange={() => toggleLevel(level)}
                  label={`${level}L`}
                  className="min-h-12 rounded-[12px] border border-[var(--acade-border)] px-3 has-[:checked]:border-[var(--acade-primary)] has-[:checked]:bg-[var(--acade-primary-dim)]"
                />
              ))}
            </div>
            <p className={audienceCount > ANNOUNCEMENT_AUDIENCE_MAX ? 'mt-2 text-sm text-[var(--acade-danger)]' : 'mt-2 text-sm text-[var(--acade-text-muted)]'}>
              {audienceCount} of {ANNOUNCEMENT_AUDIENCE_MAX} universities and levels combined (a push can target at most {ANNOUNCEMENT_AUDIENCE_MAX}).
            </p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField label="Start (for scheduling)" value={draft.startsAt} onChange={(value) => setDraft({ ...draft, startsAt: value })} hint="Scheduled items go out in the daily run, 03:00 to 03:59 UTC." />
            <DateTimeField label="End (optional)" value={draft.endsAt} onChange={(value) => setDraft({ ...draft, endsAt: value })} hint="After this it disappears from inboxes and the banner." />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Checkbox checked={draft.showAsBanner} onChange={(event) => setDraft({ ...draft, showAsBanner: event.target.checked })} label="Show as the website banner" />
            <Checkbox checked={draft.push} onChange={(event) => setDraft({ ...draft, push: event.target.checked })} label="Also send a push notification" />
          </div>

          {error ? <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-[var(--acade-text-muted)]">{notice}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={!valid || busy !== null} loading={busy === 'save'} loadingLabel="Saving…">Save draft</Button>
            <Button type="button" disabled={!valid || busy !== null} loading={busy === 'publish'} loadingLabel="Publishing…" onClick={() => setConfirmPublish(true)}>Publish now…</Button>
            <Button type="button" variant="outline" disabled={!valid || !draft.startsAt || busy !== null} loading={busy === 'schedule'} loadingLabel="Scheduling…" onClick={() => { void send('schedule', payload()); }}>Schedule</Button>
            {draft.id || draft.title ? <Button type="button" variant="ghost" className="sm:ml-auto" onClick={() => setDraft(EMPTY)}>New announcement</Button> : null}
          </div>
        </form>

        <div className="border-t border-[var(--acade-border-subtle)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--acade-text)]">Recent announcements</h3>
          {items === null ? (
            <p role="status" className="mt-2 text-sm text-[var(--acade-text-muted)]">Loading…</p>
          ) : loadError ? (
            <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Announcements could not be loaded. <button type="button" className="underline underline-offset-2" onClick={() => { void load(); }}>Try again</button></p>
          ) : items.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--acade-text-muted)]">No announcements yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--acade-border-subtle)]">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--acade-text)]">{item.title}</p>
                    <p className="text-xs text-[var(--acade-text-muted)]">
                      {STATUS_TEXT[item.status]} · {audienceText(item.audience)} · {item.status === 'scheduled' ? `from ${when(item.startsAt)}` : when(item.startsAt)}
                      {item.endsAt ? ` until ${when(item.endsAt)}` : ''}{item.sentAt ? ' · push sent' : item.push ? ' · push on publish' : ''}{item.showAsBanner ? ' · banner' : ''}
                    </p>
                  </div>
                  {item.status !== 'archived' ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => edit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => { void send('archive', { id: item.id }); }}>Archive</Button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title="Publish this announcement?"
        description={`'${draft.title.trim()}' goes to ${audienceText({ universities, levels: draft.levels }).toLowerCase() === 'everyone' ? 'every student' : audienceText({ universities, levels: draft.levels })} now.${draft.push ? ' A push notification is sent once and cannot be recalled.' : ''}`}
        confirm={{ label: 'Publish', onConfirm: () => { setConfirmPublish(false); void send('publish', { ...payload(), startsAt: null }); }, loading: busy === 'publish' }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">Students who turned off admin broadcasts get no push but still see it in their inbox. Topic changes can take up to a day to reach every phone.</p>
      </Modal>
    </Card>
  );
}

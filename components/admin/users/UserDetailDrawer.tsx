'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, EyeOff, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { formatCgpa } from '@/lib/cgpa/academicRules';

interface UserDetail {
  profile: {
    uid: string; fullName: string | null; email: string | null; matric: string | null; university: string | null;
    department: string | null; programme: string | null; currentLevel: number | null; createdAt: string | null;
    lastActiveAt: string | null; disabled: boolean; ageStatus: 'adult' | 'minor' | 'unknown';
    aiConsent: boolean | null; marketingConsent: boolean | null;
    /** Name of the student's grading scale; absent from older servers (5-point). */
    gradingScale?: string;
  };
  academic: { semesterCount: number; completedCount: number };
  devices: { count: number };
  usage: { features?: { id: string; label?: string; freeDailyLimit?: number; freeRemaining?: number }[] } | null;
  coins: { balance: number; earnedToday: number; ledger: { type: string; amount: number; feature?: string; at: string | null; balanceAfter: number }[] };
}

interface RevealedGrades { semesters: { label: string; gpa: number; creditLoaded: number; isComplete: boolean }[]; cgpa: number }

type Mode = 'view' | 'reveal' | 'grant' | 'signout' | 'delete';

const REASON_MIN = 5;
const REASON_MAX = 300;

const dateText = (iso: string | null, fallback: string) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : fallback);
const answerText = (value: boolean | null) => (value === null ? 'Not answered' : value ? 'Yes' : 'No');
const AGE_TEXT = { adult: 'Adult', minor: 'Under 18', unknown: 'Not answered' } as const;
const LEDGER_TEXT: Record<string, string> = { earn: 'Earned', spend: 'Spent', refund: 'Refunded', grant: 'Granted by support' };

/**
 * One student's account, opened from Admin > Users. Grades stay hidden until an
 * admin gives a reason (audited). Grants, sign-out and deletion each need an
 * explicit confirmation step inside the drawer; the server re-checks everything.
 */
export function UserDetailDrawer({ uid, getToken, onClose, onDeleted }: Readonly<{
  uid: string | null;
  getToken: () => Promise<string>;
  onClose: () => void;
  onDeleted: (uid: string) => void;
}>) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('1');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [grades, setGrades] = useState<RevealedGrades | null>(null);

  // Modal re-runs its focus effect when onClose changes; keep it stable.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => onCloseRef.current(), []);

  const resetForms = () => { setReason(''); setAmount('1'); setConfirmEmail(''); setActionError(null); };
  const switchMode = (next: Mode) => { resetForms(); setNotice(null); setMode(next); };

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('detail');
      setDetail(await res.json() as UserDetail);
    } catch {
      setLoadError('This account could not be loaded. Nothing was changed.');
    } finally {
      setLoading(false);
    }
  }, [uid, getToken]);

  useEffect(() => {
    setDetail(null); setGrades(null); setMode('view'); setNotice(null); resetForms();
    if (uid) void load();
  }, [uid, load]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...body, uid }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'The change was not made.');
      return json;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The change was not made.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const reasonValid = reason.trim().length >= REASON_MIN && reason.trim().length <= REASON_MAX;
  const amountNumber = Number(amount);
  const amountValid = Number.isInteger(amountNumber) && amountNumber >= 1 && amountNumber <= 10;
  const emailMatches = Boolean(detail?.profile.email) && confirmEmail.trim().toLowerCase() === detail?.profile.email?.trim().toLowerCase();

  const title = detail?.profile.fullName || detail?.profile.email || 'Student account';
  const profile = detail?.profile;

  const reasonField = (hint: string) => (
    <Textarea label="Reason" rows={3} required maxLength={REASON_MAX} value={reason} onChange={(event) => setReason(event.target.value)} hint={hint} />
  );
  const formActions = (submitLabel: string, enabled: boolean, variant: 'primary' | 'danger' = 'primary') => (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={() => switchMode('view')}>Back</Button>
      <Button type="submit" variant={variant} disabled={!enabled} loading={busy} loadingLabel="Working…">{submitLabel}</Button>
    </div>
  );

  return (
    <Modal open={uid !== null} onClose={close} title={title} description={profile?.email ?? undefined} size="review">
      {loading && !detail ? (
        <div role="status" aria-label="Loading account" className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : loadError ? (
        <div role="alert" className="space-y-3 text-sm text-[var(--acade-danger)]">
          <p>{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => { void load(); }}>Try again</Button>
        </div>
      ) : detail && profile ? (
        <div className="space-y-6 text-sm">
          {notice ? <p role="status" className="rounded-xl bg-[var(--acade-success-dim)] p-3 text-[var(--acade-success)]">{notice}</p> : null}

          {mode === 'view' && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                {[
                  ['Email', profile.email ?? '—'],
                  ['Matric', profile.matric ?? '—'],
                  ['Level', profile.currentLevel ? `${profile.currentLevel}L` : '—'],
                  ['University', profile.university ?? '—'],
                  ['Department', profile.department ?? '—'],
                  ['Programme', profile.programme ?? '—'],
                  ['Grading scale', profile.gradingScale ?? '5-point (with E)'],
                  ['Joined', dateText(profile.createdAt, 'Unknown')],
                  ['Last active', dateText(profile.lastActiveAt, 'Never seen')],
                  ['Sign-in', profile.disabled ? 'Disabled' : 'Enabled'],
                  ['Age', AGE_TEXT[profile.ageStatus] ?? 'Not answered'],
                  ['AI processing', answerText(profile.aiConsent)],
                  ['Marketing email', answerText(profile.marketingConsent)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-[var(--acade-text-muted)]">{label}</dt>
                    <dd className="break-words text-[var(--acade-text)]">{value}</dd>
                  </div>
                ))}
              </dl>

              <section aria-labelledby="drawer-academic" className="rounded-xl border border-[var(--acade-border)] p-4">
                <h3 id="drawer-academic" className="font-semibold text-[var(--acade-text)]">Academic record</h3>
                <p className="mt-1 text-[var(--acade-text-muted)]">
                  {detail.academic.semesterCount} semester{detail.academic.semesterCount === 1 ? '' : 's'}, {detail.academic.completedCount} complete.{' '}
                  <span className="inline-flex items-center gap-1"><EyeOff className="size-3.5" aria-hidden="true" />Grades are hidden.</span>
                </p>
                {grades ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left">
                      <caption className="sr-only">Revealed semester results</caption>
                      <thead className="text-xs text-[var(--acade-text-muted)]">
                        <tr><th scope="col" className="py-1 pr-3 font-medium">Semester</th><th scope="col" className="py-1 pr-3 text-right font-medium">GPA</th><th scope="col" className="py-1 pr-3 text-right font-medium">Units</th><th scope="col" className="py-1 font-medium">Status</th></tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {grades.semesters.map((semester, index) => (
                          <tr key={`${semester.label}-${index}`} className="border-t border-[var(--acade-border-subtle)]">
                            <th scope="row" className="py-1 pr-3 font-normal">{semester.label}</th>
                            <td className="py-1 pr-3 text-right">{formatCgpa(semester.gpa)}</td>
                            <td className="py-1 pr-3 text-right">{semester.creditLoaded}</td>
                            <td className="py-1">{semester.isComplete ? 'Complete' : 'In progress'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 font-semibold text-[var(--acade-text)]">Cumulative: {formatCgpa(grades.cgpa)}</p>
                  </div>
                ) : (
                  <Button className="mt-3" variant="outline" size="sm" onClick={() => switchMode('reveal')}>Reveal grades…</Button>
                )}
              </section>

              <section aria-labelledby="drawer-coins" className="rounded-xl border border-[var(--acade-border)] p-4">
                <h3 id="drawer-coins" className="font-semibold text-[var(--acade-text)]">Coins and AI use</h3>
                <p className="mt-1 text-[var(--acade-text-muted)]">
                  Balance {detail.coins.balance}, earned today {detail.coins.earnedToday}. {detail.devices.count} device{detail.devices.count === 1 ? '' : 's'} registered for notifications.
                </p>
                {(detail.usage?.features ?? []).length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(detail.usage?.features ?? []).map((feature) => (
                      <li key={feature.id} className="rounded-full border border-[var(--acade-border)] px-2.5 py-1 text-xs text-[var(--acade-text-muted)]">
                        {feature.label ?? feature.id}: {feature.freeRemaining ?? '?'} of {feature.freeDailyLimit ?? '?'} free left today
                      </li>
                    ))}
                  </ul>
                ) : null}
                {detail.coins.ledger.length === 0 ? (
                  <p className="mt-3 text-[var(--acade-text-muted)]">No coin activity yet.</p>
                ) : (
                  <div className="mt-3 max-h-56 overflow-y-auto">
                    <table className="w-full text-left">
                      <caption className="sr-only">Recent coin activity, newest first</caption>
                      <thead className="text-xs text-[var(--acade-text-muted)]">
                        <tr><th scope="col" className="py-1 pr-3 font-medium">When</th><th scope="col" className="py-1 pr-3 font-medium">What</th><th scope="col" className="py-1 pr-3 text-right font-medium">Coins</th><th scope="col" className="py-1 text-right font-medium">Balance</th></tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {detail.coins.ledger.map((entry, index) => (
                          <tr key={`${entry.at}-${index}`} className="border-t border-[var(--acade-border-subtle)]">
                            <td className="py-1 pr-3">{entry.at ? new Date(entry.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="py-1 pr-3">{LEDGER_TEXT[entry.type] ?? entry.type}{entry.feature ? ` (${entry.feature})` : ''}</td>
                            <td className="py-1 pr-3 text-right">{entry.type === 'spend' ? `−${entry.amount}` : `+${entry.amount}`}</td>
                            <td className="py-1 text-right">{entry.balanceAfter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="flex flex-wrap gap-2 border-t border-[var(--acade-border-subtle)] pt-4">
                <Button variant="outline" size="sm" onClick={() => switchMode('grant')}><Coins className="size-4" aria-hidden="true" />Grant coins…</Button>
                <Button variant="outline" size="sm" onClick={() => switchMode('signout')}><LogOut className="size-4" aria-hidden="true" />Sign out everywhere…</Button>
                <Button variant="danger" size="sm" onClick={() => switchMode('delete')}><Trash2 className="size-4" aria-hidden="true" />Delete account…</Button>
              </div>
            </>
          )}

          {mode === 'reveal' && (
            <form className="space-y-4" onSubmit={async (event) => {
              event.preventDefault();
              if (!reasonValid) return;
              const result = await act({ action: 'reveal-grades', reason: reason.trim() }) as RevealedGrades | null;
              if (result) { setGrades(result); setMode('view'); resetForms(); }
            }}>
              <p className="text-[var(--acade-text-muted)]">Grades are private. Say why you need to see them; your reason and the time are kept in the audit log.</p>
              {reasonField('5 to 300 characters, e.g. the support request you are answering.')}
              {actionError ? <p role="alert" className="text-[var(--acade-danger)]">{actionError}</p> : null}
              {formActions('Reveal grades', reasonValid)}
            </form>
          )}

          {mode === 'grant' && (
            <form className="space-y-4" onSubmit={async (event) => {
              event.preventDefault();
              if (!reasonValid || !amountValid) return;
              const result = await act({ action: 'grant-coins', amount: amountNumber, reason: reason.trim() }) as { granted: number; balance: number } | null;
              if (result) {
                setDetail((current) => current ? { ...current, coins: { ...current.coins, balance: result.balance } } : current);
                setNotice(`Granted ${result.granted} coin${result.granted === 1 ? '' : 's'}. New balance: ${result.balance}.`);
                setMode('view'); resetForms();
                void load();
              }
            }}>
              <p className="text-[var(--acade-text-muted)]">Goodwill coins, for example after an outage. Up to 10 per grant and 100 a month for each admin. Coins are not money and never go to accounts that cannot use AI.</p>
              <Input label="Coins (1 to 10)" type="number" inputMode="numeric" min={1} max={10} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
              {reasonField('5 to 300 characters. Kept in the audit log.')}
              {actionError ? <p role="alert" className="text-[var(--acade-danger)]">{actionError}</p> : null}
              {formActions('Grant coins', reasonValid && amountValid)}
            </form>
          )}

          {mode === 'signout' && (
            <div className="space-y-4">
              <p className="text-[var(--acade-text-muted)]">This signs the student out on the web and every Android device within about an hour, and stops push notifications until they sign in again. Their data is kept.</p>
              {actionError ? <p role="alert" className="text-[var(--acade-danger)]">{actionError}</p> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => switchMode('view')}>Back</Button>
                <Button variant="danger" loading={busy} loadingLabel="Signing out…" onClick={async () => {
                  const result = await act({ action: 'sign-out-all' });
                  if (result) {
                    setDetail((current) => current ? { ...current, devices: { count: 0 } } : current);
                    setNotice('Signed out of every device.');
                    setMode('view');
                  }
                }}>Sign out of every device</Button>
              </div>
            </div>
          )}

          {mode === 'delete' && (
            <form className="space-y-4" onSubmit={async (event) => {
              event.preventDefault();
              if (!emailMatches) return;
              const result = await act({ action: 'delete-account', confirmEmail: confirmEmail.trim() });
              if (result && uid) onDeleted(uid);
            }}>
              <p className="text-[var(--acade-danger)]">This permanently deletes the account, every semester and result, coins, share links and notifications. It cannot be undone.</p>
              <Input
                label={`Type the student's email (${profile.email ?? ''}) to confirm`}
                value={confirmEmail}
                autoComplete="off"
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
              {actionError ? <p role="alert" className="text-[var(--acade-danger)]">{actionError}</p> : null}
              {formActions('Delete account permanently', emailMatches, 'danger')}
            </form>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

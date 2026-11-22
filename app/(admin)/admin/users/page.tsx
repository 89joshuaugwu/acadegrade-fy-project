'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, UserX, UserCheck, Mail, PanelRightOpen, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AgeCorrectionDialog, type AgeStatus } from '@/components/admin/users/AgeCorrectionDialog';
import { UserDetailDrawer } from '@/components/admin/users/UserDetailDrawer';
import { cn } from '@/lib/utils/cn';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import toast from 'react-hot-toast';

interface UserRecord {
  uid: string;
  fullName: string;
  email: string;
  matric: string;
  department: string;
  currentLevel: number;
  cgpa: number;
  pi: number;
  /** The student's grading scale name and top point (absent from older servers: 5-point). */
  gradingScale?: string;
  gradingScaleMax?: number;
  semesterCount: number;
  disabled: boolean;
  /** From the admin users API: 'unknown' for accounts that have not answered yet. */
  ageStatus?: AgeStatus | 'unknown';
  aiConsent?: boolean | null;
  createdAt: string | null;
}

const COLUMNS = 'md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_4rem_4.5rem_4.5rem_7rem]';

const initials = (name: string, email: string) => {
  const parts = (name && name !== 'Unknown' ? name : email).split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const AGE_LABEL: Record<string, string> = { adult: 'Adult', minor: 'Under 18', unknown: 'Not answered' };
const consentText = (value: boolean | null | undefined) => (value === true ? 'Allowed' : value === false ? 'Not allowed' : 'Not answered');

function StatusPill({ disabled, className }: { disabled: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-4',
        disabled
          ? 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]'
          : 'bg-[var(--acade-success-dim)] text-[var(--acade-success)]',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', disabled ? 'bg-[var(--acade-danger)]' : 'bg-[var(--acade-success)]')} aria-hidden="true" />
      {disabled ? 'Disabled' : 'Active'}
    </span>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<UserRecord | null>(null);
  const [correctAge, setCorrectAge] = useState<UserRecord | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  /** Results of an exact server search; null while browsing the loaded list. */
  const [exactResults, setExactResults] = useState<UserRecord[] | null>(null);
  const [detailUid, setDetailUid] = useState<string | null>(null);

  const submitAgeCorrection = async ({ uid, ageStatus, reason }: { uid: string; ageStatus: AgeStatus; reason: string }) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // `reason` is stored in the audit record summary.
      body: JSON.stringify({ action: 'set-age', uid, ageStatus, reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(data?.error || 'The age was not changed.');
    }
    toast.success(ageStatus === 'minor' ? 'Age corrected to under 18.' : 'Age corrected to adult.');
    setCorrectAge(null);
  };

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setExactResults(null);
    try {
      const token = await user.getIdToken();
      // Newest 50 first; "Load more" continues from nextCursor.
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('User list request failed.');
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch (err) {
      console.error(err);
      setError('The user service did not respond. No accounts were changed.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMore = async () => {
    if (!user || !nextCursor) return;
    setLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users?cursor=${encodeURIComponent(nextCursor)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('more');
      const data = await res.json();
      const more: UserRecord[] = Array.isArray(data.users) ? data.users : [];
      setUsers((prev) => [...prev, ...more.filter((row) => !prev.some((existing) => existing.uid === row.uid))]);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      toast.error('More accounts could not be loaded. Try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  /** Exact email or matric lookup across every account (not only the loaded pages). */
  const searchExact = async () => {
    const q = searchQuery.trim();
    if (!user || !q) return;
    setSearching(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('search');
      const data = await res.json();
      setExactResults(Array.isArray(data.users) ? data.users : []);
    } catch {
      toast.error('The search did not complete. Try again.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied.');
    } catch {
      toast.error('Copy failed. Select the email and copy it manually.');
    }
  };

  const filteredUsers = useMemo(() => {
    if (exactResults) return exactResults;
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => u.fullName.toLowerCase().includes(q) || u.matric.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery, exactResults]);

  const handleToggleDisable = async (targetUid: string, currentlyDisabled: boolean) => {
    setActionLoading(targetUid);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: currentlyDisabled ? 'enable' : 'disable', uid: targetUid }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, disabled: !currentlyDisabled } : u));
        setExactResults(prev => prev ? prev.map(u => u.uid === targetUid ? { ...u, disabled: !currentlyDisabled } : u) : prev);
        toast.success(currentlyDisabled ? 'Sign-in enabled.' : 'Sign-in disabled.');
      } else {
        toast.error('Failed to update user status.');
      }
    } catch (err) {
      toast.error('Error updating user.');
    } finally {
      setActionLoading(null);
    }
  };

  const baseDescription = 'Find a student account and turn its sign-in off or on.';

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Users" description={baseDescription} helpId="admin.users" />
        <ErrorState title="Users could not be loaded" description={error} onRetry={() => { void loadUsers(); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Users" description={baseDescription} helpId="admin.users" />
        <div role="status" aria-label="Loading accounts" aria-busy="true" className="space-y-3 rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-5">
          <Skeleton className="h-12 w-full rounded-[12px]" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-[12px]" />)}
        </div>
      </div>
    );
  }

  const disabledCount = users.filter((u) => u.disabled).length;
  const minorCount = users.filter((u) => u.ageStatus === 'minor').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description={`${baseDescription} Showing ${users.length} account${users.length !== 1 ? 's' : ''}, newest first.`}
        helpId="admin.users"
      />

      <Panel
        title="Accounts"
        description={
          <span>
            <span className="tabular-nums">{users.length}</span> loaded
            {disabledCount ? <>, <span className="tabular-nums">{disabledCount}</span> with sign-in off</> : null}
            {minorCount ? <>, <span className="tabular-nums">{minorCount}</span> under 18</> : null}.
            {' '}Typing filters this list; Find looks up an exact email or matric number across every account.
          </span>
        }
        padded={false}
      >
        {/* Search: typing filters the loaded accounts; Enter looks up an exact email or matric across all accounts. */}
        <form
          role="search"
          className="flex flex-col gap-2 px-5 pb-4 pt-4 sm:flex-row sm:px-6"
          onSubmit={(event) => { event.preventDefault(); void searchExact(); }}
        >
          <div className="relative min-w-0 flex-1">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
            <input
              type="search"
              aria-label="Search users"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setExactResults(null); }}
              placeholder="Search by name, matric or email"
              className="h-12 w-full rounded-[12px] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] pl-11 pr-4 text-[0.9375rem] text-[var(--acade-text)] transition-colors placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
          <Button type="submit" variant="outline" size="md" loading={searching} loadingLabel="Searching all accounts" disabled={!searchQuery.trim()} className="shrink-0">
            Find exact email or matric
          </Button>
        </form>
        {exactResults ? (
          <p role="status" className="mx-5 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] bg-[var(--acade-primary-dim)] px-4 py-2.5 text-sm text-[var(--acade-text)] sm:mx-6">
            {exactResults.length === 0 ? 'No account has exactly that email or matric number.' : `Exact match across all accounts.`}{' '}
            <button type="button" className="min-h-8 font-semibold text-[var(--acade-primary)] underline underline-offset-2 hover:no-underline" onClick={() => { setExactResults(null); setSearchQuery(''); }}>Back to the list</button>
          </p>
        ) : null}

        {/* Column labels (tablet and up) */}
        <div className={cn('hidden gap-3 border-y border-[var(--acade-border-subtle)] bg-[var(--acade-overlay)] px-6 py-2.5 text-[0.8125rem] font-medium text-[var(--acade-text-muted)] md:grid', COLUMNS)} aria-hidden="true">
          <span>Student</span>
          <span>Matric</span>
          <span>Department</span>
          <span className="text-right">Level</span>
          <span className="text-right">CGPA</span>
          <span className="text-right">PI</span>
          <span className="pl-2">Status</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div role="status" className="border-t border-[var(--acade-border-subtle)] px-6 py-14 text-center text-sm text-[var(--acade-text-muted)] md:border-t-0">
            {searchQuery ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          <ul className="border-t border-[var(--acade-border-subtle)] md:border-t-0">
            {filteredUsers.map(u => {
              const expanded = expandedUid === u.uid;
              return (
                <li key={u.uid} className="border-b border-[var(--acade-border-subtle)] last:border-b-0">
                  {/* Row */}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedUid(expanded ? null : u.uid)}
                    className={cn(
                      'grid w-full grid-cols-[minmax(0,1fr)] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--acade-primary)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)] sm:px-6',
                      COLUMNS,
                      expanded && 'bg-[color-mix(in_srgb,var(--acade-primary)_6%,transparent)]',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold', u.disabled ? 'bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]' : 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]')}>
                        {initials(u.fullName, u.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[0.9375rem] font-semibold text-[var(--acade-text)]">{u.fullName}</span>
                          {u.ageStatus === 'minor' ? <span className="shrink-0 rounded-full bg-[var(--acade-gold-dim)] px-2 py-0.5 text-xs font-medium text-[var(--acade-warning)]">Under 18</span> : null}
                          {u.disabled && <StatusPill disabled className="shrink-0 md:hidden" />}
                        </div>
                        <p className="hidden truncate text-[0.8125rem] text-[var(--acade-text-muted)] md:block">{u.email}</p>
                        {/* Small screens hide the columns; keep their facts on a second line. */}
                        <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--acade-text-muted)] tabular-nums md:hidden">
                          {u.department || 'No department'}, {u.currentLevel}L, CGPA {formatCgpa(u.cgpa)}{u.gradingScaleMax && u.gradingScaleMax !== 5 ? ` of ${u.gradingScaleMax}` : ''}
                        </p>
                      </div>
                      <ChevronDown size={18} aria-hidden="true" className={cn('shrink-0 text-[var(--acade-text-muted)] transition-transform md:hidden', expanded && 'rotate-180')} />
                    </div>
                    <span className="hidden truncate text-sm tabular-nums text-[var(--acade-text-muted)] md:block">{u.matric}</span>
                    <span className="hidden truncate text-sm text-[var(--acade-text-muted)] md:block">{u.department}</span>
                    <span className="hidden text-right text-sm tabular-nums text-[var(--acade-text-muted)] md:block">{u.currentLevel}L</span>
                    <span title={u.gradingScale ? `Grading scale: ${u.gradingScale}` : undefined} className="hidden text-right text-[0.9375rem] font-semibold tabular-nums text-[var(--acade-text)] md:block">{formatCgpa(u.cgpa)}{u.gradingScaleMax && u.gradingScaleMax !== 5 ? <span className="text-[0.8125rem] font-normal text-[var(--acade-text-muted)]"> /{u.gradingScaleMax}</span> : null}</span>
                    <span className="hidden text-right text-sm tabular-nums text-[var(--acade-text-muted)] md:block">{formatCgpa(u.pi)}</span>
                    <span className="hidden items-center justify-between gap-2 pl-2 md:flex">
                      <StatusPill disabled={u.disabled} />
                      <ChevronDown size={16} aria-hidden="true" className={cn('shrink-0 text-[var(--acade-text-muted)] transition-transform', expanded && 'rotate-180')} />
                    </span>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 bg-[color-mix(in_srgb,var(--acade-primary)_4%,transparent)] px-5 pb-5 pt-1 sm:px-6">
                          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-border-subtle)] text-sm md:grid-cols-4">
                            {[
                              { label: 'Email', value: u.email, wide: true },
                              { label: 'Matric', value: u.matric, mobileOnly: true },
                              { label: 'Semesters', value: String(u.semesterCount) },
                              { label: 'Joined', value: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A' },
                              { label: 'Age', value: AGE_LABEL[u.ageStatus ?? 'unknown'] ?? 'Not answered' },
                              { label: 'AI processing', value: consentText(u.aiConsent) },
                            ].map((item) => (
                              <div key={item.label} className={cn('min-w-0 bg-[var(--acade-surface)] px-4 py-3', item.wide && 'col-span-2 md:col-span-1', item.mobileOnly && 'md:hidden')}>
                                <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">{item.label}</dt>
                                <dd className="mt-0.5 break-all font-medium tabular-nums text-[var(--acade-text)]">{item.value}</dd>
                              </div>
                            ))}
                          </dl>

                          {/* Actions: everyday ones first, the sign-in switch kept apart on the right. */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="primary" size="sm" onClick={() => setDetailUid(u.uid)}>
                                <PanelRightOpen size={16} aria-hidden="true" />
                                Details and support actions…
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { void copyEmail(u.email); }}>
                                <Mail size={16} aria-hidden="true" />
                                Copy email
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setCorrectAge(u)}>
                                <CalendarClock size={16} aria-hidden="true" />
                                Correct age…
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              loading={actionLoading === u.uid}
                              onClick={() => u.disabled ? handleToggleDisable(u.uid, true) : setConfirmDisable(u)}
                              className={u.disabled
                                ? undefined
                                : 'border-[color-mix(in_srgb,var(--acade-danger)_45%,transparent)] text-[var(--acade-danger)] hover:border-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] hover:text-[var(--acade-danger)]'}
                            >
                              {u.disabled ? <UserCheck size={16} aria-hidden="true" /> : <UserX size={16} aria-hidden="true" />}
                              {u.disabled ? 'Enable sign-in' : 'Disable sign-in…'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {!exactResults && nextCursor ? (
        <div className="flex justify-center">
          <Button variant="outline" size="md" loading={loadingMore} loadingLabel="Loading more accounts" onClick={() => { void loadMore(); }}>
            Load more
          </Button>
        </div>
      ) : null}

      <UserDetailDrawer
        uid={detailUid}
        getToken={async () => { if (!user) throw new Error('Your admin session is unavailable.'); return user.getIdToken(); }}
        onClose={() => setDetailUid(null)}
        onDeleted={(uid) => {
          setUsers(prev => prev.filter(u => u.uid !== uid));
          setExactResults(prev => prev ? prev.filter(u => u.uid !== uid) : prev);
          setDetailUid(null);
        }}
      />

      <AgeCorrectionDialog student={correctAge} onClose={() => setCorrectAge(null)} onSubmit={submitAgeCorrection} />

      <Modal
        open={confirmDisable !== null}
        onClose={() => setConfirmDisable(null)}
        title={`Turn off sign-in for ${confirmDisable?.fullName || confirmDisable?.email || 'this student'}?`}
        description="They will be signed out of web and Android and cannot sign back in until you enable them. Their data is kept."
        confirm={{
          label: 'Disable sign-in',
          loading: confirmDisable !== null && actionLoading === confirmDisable.uid,
          onConfirm: () => {
            if (!confirmDisable) return;
            const target = confirmDisable;
            setConfirmDisable(null);
            void handleToggleDisable(target.uid, false);
          },
        }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">{confirmDisable?.email}</p>
      </Modal>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, UserX, UserCheck, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AgeCorrectionDialog, type AgeStatus } from '@/components/admin/users/AgeCorrectionDialog';
import { cn } from '@/lib/utils/cn';
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
  semesterCount: number;
  disabled: boolean;
  createdAt: string | null;
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

  const submitAgeCorrection = async ({ uid, ageStatus, reason }: { uid: string; ageStatus: AgeStatus; reason: string }) => {
    if (!user) throw new Error('Your admin session is unavailable.');
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // `reason` is sent for the record; the current API accepts and ignores it.
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
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('User list request failed.');
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.error(err);
      setError('The user service did not respond. No accounts were changed.');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => u.fullName.toLowerCase().includes(q) || u.matric.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

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

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Users" description="Find a student account and turn its sign-in off or on." helpId="admin.users" />
        <ErrorState title="Users could not be loaded" description={error} onRetry={() => { void loadUsers(); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description={`Find a student account and turn its sign-in off or on. ${users.length} registered user${users.length !== 1 ? 's' : ''}.`}
        helpId="admin.users"
      />

      {/* Search */}
      <div className="relative">
        <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
        <input
          type="search"
          aria-label="Search users"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, matric, or email..."
          className="w-full h-12 pl-12 pr-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--acade-text-faint)] focus:outline-none focus:border-[var(--acade-primary)] transition-colors"
        />
      </div>

      {/* Users Table */}
      <Card variant="default" padding="none" className="overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 px-5 py-3 bg-[var(--acade-overlay)]/30 border-b border-[var(--acade-border)] text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
          <span>Name</span>
          <span>Matric</span>
          <span>Department</span>
          <span>Level</span>
          <span>CGPA</span>
          <span>PI</span>
          <span>Status</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div role="status" className="p-12 text-center text-[var(--acade-text-muted)]">
            {searchQuery ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          filteredUsers.map(u => (
            <div key={u.uid}>
              {/* Row */}
              <button
                type="button"
                aria-expanded={expandedUid === u.uid}
                onClick={() => setExpandedUid(expandedUid === u.uid ? null : u.uid)}
                className={cn(
                  "w-full grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1.2fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 px-5 py-4 text-left border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-overlay)]/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)]",
                  expandedUid === u.uid && "bg-[var(--acade-overlay)]/10"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] truncate">{u.fullName}</span>
                    {expandedUid === u.uid ? <ChevronUp size={14} aria-hidden="true" className="text-[var(--acade-text-muted)] shrink-0" /> : <ChevronDown size={14} aria-hidden="true" className="text-[var(--acade-text-muted)] shrink-0" />}
                    {u.disabled && <span className="shrink-0 rounded-full border border-[var(--acade-danger)]/30 bg-[var(--acade-danger)]/10 px-2 py-0.5 text-xs font-medium text-[var(--acade-danger)] md:hidden">Disabled</span>}
                  </div>
                  {/* Small screens hide the columns; keep their facts on a second line. */}
                  <p className="mt-1 truncate text-xs text-[var(--acade-text-muted)] md:hidden">
                    {u.department || 'No department'} · {u.currentLevel}L · CGPA {u.cgpa.toFixed(2)}
                  </p>
                </div>
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:block">{u.matric}</span>
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hidden md:block truncate">{u.department}</span>
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:block">{u.currentLevel}L</span>
                <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] hidden md:block">{u.cgpa.toFixed(2)}</span>
                <span className="text-[length:var(--text-sm)] text-[var(--acade-gold)] font-[family-name:var(--font-geist-mono)] hidden md:block">{u.pi.toFixed(2)}</span>
                <span className="hidden md:block">
                  <Badge variant={u.disabled ? 'status' : 'status'} className={u.disabled ? 'bg-[var(--acade-danger)]/10 text-[var(--acade-danger)] border-[var(--acade-danger)]/30' : 'bg-[var(--acade-success)]/10 text-[var(--acade-success)] border-[var(--acade-success)]/30'}>
                    {u.disabled ? 'Disabled' : 'Active'}
                  </Badge>
                </span>
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedUid === u.uid && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-b border-[var(--acade-border)]"
                  >
                    <div className="p-5 bg-[var(--acade-overlay)]/5 space-y-4">
                      {/* Mobile-visible details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[length:var(--text-sm)]">
                        <div>
                          <span className="text-[var(--acade-text-muted)] block text-[length:var(--text-xs)]">Email</span>
                          <span className="text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] text-[length:var(--text-xs)] break-all">{u.email}</span>
                        </div>
                        <div className="md:hidden">
                          <span className="text-[var(--acade-text-muted)] block text-[length:var(--text-xs)]">Matric</span>
                          <span className="text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{u.matric}</span>
                        </div>
                        <div>
                          <span className="text-[var(--acade-text-muted)] block text-[length:var(--text-xs)]">Semesters</span>
                          <span className="text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{u.semesterCount}</span>
                        </div>
                        <div>
                          <span className="text-[var(--acade-text-muted)] block text-[length:var(--text-xs)]">Joined</span>
                          <span className="text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] text-[length:var(--text-xs)]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                          variant={u.disabled ? 'primary' : 'danger'}
                          size="sm"
                          loading={actionLoading === u.uid}
                          onClick={() => u.disabled ? handleToggleDisable(u.uid, true) : setConfirmDisable(u)}
                        >
                          {u.disabled ? <UserCheck size={14} aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
                          {u.disabled ? 'Enable sign-in' : 'Disable sign-in…'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { void copyEmail(u.email); }}>
                          <Mail size={14} aria-hidden="true" />
                          Copy email
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCorrectAge(u)}>
                          Correct age…
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </Card>

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

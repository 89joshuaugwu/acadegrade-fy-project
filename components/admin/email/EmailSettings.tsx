'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Kind = 'general' | 'otp';
type Account = { kind: Kind; configured: boolean; email: string | null };
const kinds: Kind[] = ['general', 'otp'];
const emptyAccounts: Record<Kind, Account> = {
  general: { kind: 'general', configured: false, email: null },
  otp: { kind: 'otp', configured: false, email: null },
};

export function EmailSettings() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState(emptyAccounts);
  const [emails, setEmails] = useState<Record<Kind, string>>({ general: '', otp: '' });
  const [passwords, setPasswords] = useState<Record<Kind, string>>({ general: '', otp: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void (async () => {
      try {
        const response = await fetch('/api/admin/email', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        if (!response.ok) throw new Error('Could not load email accounts.');
        const data = await response.json() as { accounts: Account[] };
        if (!mounted) return;
        const next = { ...emptyAccounts };
        const nextEmails = { general: '', otp: '' };
        for (const account of data.accounts) {
          if (account.kind === 'general' || account.kind === 'otp') {
            next[account.kind] = account;
            nextEmails[account.kind] = account.email ?? '';
          }
        }
        setAccounts(next);
        setEmails(nextEmails);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Could not load email accounts.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  async function request(body: Record<string, unknown>) {
    if (!user) throw new Error('Sign in as an administrator to manage email.');
    const response = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { error?: string; account?: Account };
    if (!response.ok) throw new Error(data.error || 'Email operation failed.');
    return data;
  }

  async function run(kind: Kind, operation: 'save' | 'verify') {
    setBusy(`${kind}-${operation}`);
    setNotice(null);
    setError(null);
    try {
      const data = await request(operation === 'save'
        ? { operation, kind, email: emails[kind], appPassword: passwords[kind] }
        : { operation, kind });
      if (operation === 'save' && data.account) {
        setAccounts((current) => ({ ...current, [kind]: data.account! }));
        setPasswords((current) => ({ ...current, [kind]: '' }));
      }
      setNotice(`${kind === 'otp' ? 'OTP' : 'General'} email ${operation === 'save' ? 'saved. Verify the Gmail login before relying on it.' : 'login verified.'}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Email operation failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="email-delivery-title" className="space-y-4">
      <div>
        <h2 id="email-delivery-title" className="flex items-center gap-2 text-xl font-bold text-[var(--acade-text)]"><Mail size={20} /> Email delivery</h2>
        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Manage separate Gmail App Passwords for regular messages and one-time codes. Saved passwords are never shown again.</p>
      </div>
      {notice && <p role="status" className="text-sm text-[var(--acade-success)]">{notice}</p>}
      {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
      {loading && <p role="status" className="text-sm text-[var(--acade-text-muted)]">Loading email accounts...</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {kinds.map((kind) => {
          const label = kind === 'otp' ? 'OTP' : 'General';
          return (
            <Card key={kind} variant="default" padding="lg">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-[var(--acade-text)]">{label} email</h3>
                  <p className="text-sm text-[var(--acade-text-muted)]">{accounts[kind].configured ? `Saved sender: ${accounts[kind].email}` : 'No managed account saved yet.'}</p>
                </div>
                <Input label={`${label} sender email`} type="email" autoComplete="off" disabled={loading} value={emails[kind]} onChange={(event) => setEmails((current) => ({ ...current, [kind]: event.target.value }))} />
                <Input label={`${label} Gmail App Password`} type="password" autoComplete="new-password" disabled={loading} value={passwords[kind]} onChange={(event) => setPasswords((current) => ({ ...current, [kind]: event.target.value }))} hint="Use a Gmail App Password, not your regular Google password." />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={loading || !!busy || !emails[kind] || !passwords[kind]} onClick={() => void run(kind, 'save')}>Save {label} email</Button>
                  <Button size="sm" variant="outline" disabled={loading || !!busy} onClick={() => void run(kind, 'verify')}>Verify Gmail login</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

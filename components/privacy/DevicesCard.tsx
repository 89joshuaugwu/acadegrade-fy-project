'use client';

import { useMemo, useState } from 'react';
import { MonitorSmartphone, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { auth } from '@/lib/firebase/client';

interface DeviceRecord { platform?: string; label?: string; appVersion?: string; addedAt?: number; lastSeenAt?: number }

interface DevicesCardProps {
  /** The signed-in user's profile document (reads `fcmDevices`). */
  profile: unknown;
  getToken: () => Promise<string>;
}

const when = (ms: number | undefined) => (typeof ms === 'number' && Number.isFinite(ms)
  ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'unknown');

async function postDevices(token: string, body: unknown) {
  const response = await fetch('/api/user/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Request failed');
}

/**
 * Settings > Security and data: devices that receive notifications, remove one, or sign out everywhere (E4).
 * Sign out everywhere revokes refresh tokens; an already-issued sign-in can last up to an hour, so the copy says so.
 */
export function DevicesCard({ profile, getToken }: Readonly<DevicesCardProps>) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const devices = useMemo(() => {
    const map = (profile as { fcmDevices?: Record<string, DeviceRecord> } | null)?.fcmDevices;
    if (!map || typeof map !== 'object') return [];
    return Object.entries(map)
      .filter(([id, value]) => /^[0-9a-f]{16}$/.test(id) && value && typeof value === 'object' && !removed.includes(id))
      .sort(([, a], [, b]) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0));
  }, [profile, removed]);

  async function remove(id: string) {
    setBusy(id);
    try {
      await postDevices(await getToken(), { action: 'remove', deviceId: id });
      setRemoved((current) => [...current, id]);
      toast.success('Device removed. It no longer gets notifications.');
    } catch {
      toast.error('Could not remove that device. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function signOutAll() {
    setBusy('all');
    try {
      await postDevices(await getToken(), { action: 'sign-out-all' });
      toast.success('Signed out everywhere.');
      try { await auth.signOut(); } catch { /* the server already revoked the sessions */ }
      window.location.assign('/login');
    } catch {
      toast.error('Could not sign out other devices. Please try again.');
      setBusy(null);
      setConfirmAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4">
      <div className="min-w-0">
        <h4 className="flex items-center gap-2 text-[length:var(--text-sm)] font-bold text-[var(--acade-text)]"><MonitorSmartphone size={16} aria-hidden="true" /> Devices</h4>
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
          Devices that get notifications from your account. A device that has notifications off is not listed.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">No devices are listed yet. A device appears here after it turns notifications on.</p>
      ) : (
        <ul className="divide-y divide-[var(--acade-border)]" aria-label="Devices">
          {devices.map(([id, device]) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">
                  <Smartphone size={14} aria-hidden="true" />
                  <span className="truncate">{device.label || (device.platform === 'android' ? 'Android phone' : 'Browser')}</span>
                </p>
                <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                  {device.platform === 'android' ? 'Android app' : 'Website'}{device.appVersion ? ` ${device.appVersion}` : ''}, added {when(device.addedAt)}, last seen {when(device.lastSeenAt)}
                </p>
              </div>
              <Button variant="outline" size="sm" aria-label={`Remove ${device.label || 'device'}`} loading={busy === id} loadingLabel="Removing" disabled={busy !== null} onClick={() => void remove(id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--acade-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] sm:pr-4">
          Sign out everywhere signs you out here now. Your other devices are signed out within an hour.
        </p>
        <Button variant="danger" size="sm" onClick={() => setConfirmAll(true)} disabled={busy !== null} className="w-full sm:w-auto">Sign out everywhere</Button>
      </div>

      <Modal
        open={confirmAll}
        onClose={() => { if (busy !== 'all') setConfirmAll(false); }}
        title="Sign out everywhere?"
        description="You will be signed out here now, and on your other devices within an hour. Your results are not affected."
        confirm={{ label: 'Sign out everywhere', onConfirm: () => { void signOutAll(); }, loading: busy === 'all' }}
      >
        <p className="text-sm leading-6 text-[var(--acade-text-muted)]">Use this if you lost a phone or left your account open on a shared computer.</p>
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';

export const SIGN_OUT_COPY = {
  title: 'Sign out?',
  body: "You'll need to sign in again to see your results on this device.",
  confirm: 'Sign out',
} as const;

interface SignOutDialogProps {
  open: boolean;
  onClose: () => void;
  uid?: string | null;
}

/**
 * Asks before a student-initiated sign-out. Focus starts on Cancel and Escape
 * cancels (both handled by Modal). Forced sign-outs (expired sessions, account
 * deletion, sign out everywhere) call signOut directly and never show this.
 */
export function SignOutDialog({ open, onClose, uid }: SignOutDialogProps) {
  const [busy, setBusy] = useState(false);

  async function confirmSignOut() {
    setBusy(true);
    try {
      if (uid) await removeNotificationToken(uid);
      await signOut();
      onClose();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      title={SIGN_OUT_COPY.title}
      description={SIGN_OUT_COPY.body}
      confirm={{
        label: SIGN_OUT_COPY.confirm,
        onConfirm: () => { void confirmSignOut(); },
        loading: busy,
        initialFocus: 'cancel',
      }}
    />
  );
}

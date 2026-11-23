'use client';

import { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * The confirmation every admin "Sign out" goes through. It is the shared Modal with its own footer so
 * the safe choice, Cancel, takes focus first. Forced sign-outs (expired session, not an admin) never
 * come here.
 */
export function AdminSignOutDialog({ open, busy = false, onCancel, onConfirm }: {
  open: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title="Sign out?"
      description="You'll need to sign in again to manage AcadeGrade on this device."
      size="confirm"
      initialFocusRef={cancelRef}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={busy} loadingLabel="Signing out…">Sign out</Button>
      </div>
    </Modal>
  );
}

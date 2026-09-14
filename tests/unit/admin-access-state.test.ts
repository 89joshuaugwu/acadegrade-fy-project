import { describe, expect, it } from 'vitest';
import { canRenderAdminContent, getAdminVerificationTarget } from '@/lib/admin/access-state';

describe('admin access state', () => {
  it('never reuses approval from another account', () => {
    expect(canRenderAdminContent({ status: 'allowed', uid: 'admin-a' }, 'admin-b')).toBe(false);
    expect(canRenderAdminContent({ status: 'allowed', uid: 'admin-a' }, 'admin-a')).toBe(true);
  });

  it('starts a fresh verification whenever the authenticated UID changes', () => {
    expect(getAdminVerificationTarget({ status: 'allowed', uid: 'admin-a' }, 'admin-b')).toBe('admin-b');
    expect(getAdminVerificationTarget({ status: 'allowed', uid: 'admin-a' }, 'admin-a')).toBeNull();
  });
});

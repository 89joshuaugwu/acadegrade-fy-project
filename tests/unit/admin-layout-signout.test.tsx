import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => router,
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ loading: false, user: { uid: 'admin-1', email: 'admin@acadegrade.example', getIdToken: () => Promise.resolve('token') } }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
const firebaseAuth = vi.hoisted(() => ({ signOut: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/firebase/auth', () => firebaseAuth);
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/layout/AdminShell', () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import AdminLayout from '@/app/(admin)/layout';

afterEach(() => { vi.unstubAllGlobals(); });

describe('Admin layout sign-out', () => {
  it('asks before signing out when the admin check could not finish', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<AdminLayout><p>Content</p></AdminLayout>);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    const confirm = await screen.findByRole('dialog', { name: 'Sign out?' });
    await waitFor(() => expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/admin/login');
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ auth: { user: { uid: 'a', email: 'admin@test.example', getIdToken: async () => 'tok' } } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { SupportInbox } from '@/components/admin/support/SupportInbox';

vi.setConfig({ testTimeout: 15000 });

const base = {
  name: null, category: 'account', message: 'I cannot sign in and the reset code never arrives.', platform: 'web', appVersion: null,
  route: '/support', status: 'open', createdAt: '2026-11-17T08:00:00.000Z', updatedAt: null, closedAt: null, purgeAt: null, replies: [],
};

describe('Admin > Support inbox: public requests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tickets: [
        { ...base, id: 'p1', uid: null, source: 'public', email: 'locked@test.example' },
        { ...base, id: 't1', uid: 'ada', source: 'account', email: 'ada@test.example', name: 'Ada', platform: 'android' },
      ],
      nextCursor: null,
    }), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('labels them "Not signed in", shows the email, warns that it is unverified and says replies go by email only', async () => {
    const user = userEvent.setup();
    render(<SupportInbox />);
    const publicRow = await screen.findByRole('button', { name: /locked@test\.example/ });
    expect(publicRow).toHaveTextContent('My account or sign-in · Not signed in');
    expect(screen.getByRole('button', { name: /Ada/ })).toHaveTextContent('Android');

    await user.click(publicRow);
    const detail = screen.getByRole('region', { name: 'Selected request' });
    expect(detail).toHaveTextContent('No name given · locked@test.example · Not signed in');
    expect(within(detail).getByRole('note')).toHaveTextContent('email address is not verified');
    expect(within(detail).getByText(/sent by email only/)).toBeInTheDocument();
  });
});

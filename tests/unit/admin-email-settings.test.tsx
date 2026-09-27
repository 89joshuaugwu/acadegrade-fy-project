import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'admin', getIdToken: async () => 'admin-token' } }) }));
import { EmailSettings } from '@/components/admin/email/EmailSettings';

describe('admin email settings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(
      init?.method === 'POST'
        ? { account: { kind: 'general', email: 'sender@example.com', configured: true } }
        : { accounts: [{ kind: 'general', configured: false, email: null }, { kind: 'otp', configured: false, email: null }] },
    ), { status: 200 })));
  });

  it('saves a General account without keeping its app password in the form', async () => {
    const user = userEvent.setup();
    render(<EmailSettings />);
    await screen.findByRole('heading', { name: 'Email delivery' });
    await waitFor(() => expect(screen.queryByText('Loading email accounts...')).not.toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: 'General sender email' }), 'sender@example.com');
    await user.type(screen.getByLabelText('General Gmail App Password'), 'PRIVATE_APP_PASSWORD');
    expect(screen.getByRole('textbox', { name: 'General sender email' })).toHaveValue('sender@example.com');
    expect(screen.getByRole('button', { name: 'Save General email' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Save General email' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('General email saved'));
    expect(screen.getByLabelText('General Gmail App Password')).toHaveValue('');
    expect(screen.queryByText('PRIVATE_APP_PASSWORD')).not.toBeInTheDocument();
  });
});

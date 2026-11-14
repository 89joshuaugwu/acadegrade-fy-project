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

  it('shows Off, Configured, Verified and Problem chips from the server status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ accounts: [
      { kind: 'general', configured: true, email: 'a@example.com', status: { ok: true, verifiedAt: '2026-11-14T10:00:00.000Z', checkedAt: '2026-11-14T10:00:00.000Z', source: 'saved' } },
      { kind: 'otp', configured: true, email: 'b@example.com', status: { ok: false, verifiedAt: null, checkedAt: '2026-11-14T10:00:00.000Z', source: 'saved', error: 'Gmail rejected this login.' } },
    ] }), { status: 200 })));
    render(<EmailSettings />);
    await waitFor(() => expect(screen.queryByText('Loading email accounts...')).not.toBeInTheDocument());
    expect(screen.getByLabelText('General email status')).toHaveTextContent('Verified 14 Nov 2026');
    expect(screen.getByLabelText('OTP email status')).toHaveTextContent('Problem: Gmail rejected this login.');
    expect(screen.getAllByText('Sending with the account saved here.')).toHaveLength(2);
  });

  it('shows Off when nothing is saved and Configured when saved but unchecked', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ accounts: [
      { kind: 'general', configured: true, email: 'a@example.com', status: null },
      { kind: 'otp', configured: false, email: null, status: null },
    ] }), { status: 200 })));
    render(<EmailSettings />);
    await waitFor(() => expect(screen.queryByText('Loading email accounts...')).not.toBeInTheDocument());
    expect(screen.getByLabelText('General email status')).toHaveTextContent('Configured');
    expect(screen.getByLabelText('OTP email status')).toHaveTextContent('Off: no account saved here');
  });
});

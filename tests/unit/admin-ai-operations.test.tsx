import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'admin-1', email: 'admin@acadegrade.example', getIdToken: mocks.getIdToken },
  }),
}));

import AdminAiOperationsPage from '@/app/(admin)/admin/ai/page';

const providers = {
  groq: { models: ['llama-3.3-70b-versatile'], capabilities: ['text'] },
  openrouter: { models: ['openrouter/free', 'google/gemma-4-31b-it:free'], capabilities: ['text'] },
  gemini: { models: ['gemini-3.1-flash-lite'], capabilities: ['text', 'multimodal'] },
};

describe('Admin AI Operations page', () => {
  beforeEach(() => {
    mocks.getIdToken.mockResolvedValue('admin-token');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/admin/ai' && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify({ providers }), { status: 200 });
      }
      return new Response(JSON.stringify({
        secret: { secretId: 'groq-primary', providerId: 'groq', state: 'active', version: 1 },
      }), { status: 200 });
    }));
  });

  it('writes a key without ever rendering or pre-filling its plaintext value', async () => {
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);

    expect(await screen.findByRole('heading', { name: 'AI Operations' })).toBeInTheDocument();
    expect(screen.getByText('gemini-3.1-flash-lite')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose how each AI feature runs' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Academic insights execution mode' })).toHaveValue('disabled');
    expect(screen.getByRole('button', { name: 'Save and activate routing' })).toBeEnabled();

    const keyInput = screen.getByLabelText('Groq API key');
    expect(keyInput).toHaveValue('');
    await user.type(keyInput, 'gsk_sensitive-value');
    await user.click(screen.getByRole('button', { name: 'Save Groq key' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved as'));
    expect(screen.getByRole('status')).toHaveTextContent('alue');
    expect(keyInput).toHaveValue('');
    expect(screen.queryByDisplayValue('gsk_sensitive-value')).not.toBeInTheDocument();
    expect(screen.queryByText('gsk_sensitive-value')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/admin/ai', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      body: JSON.stringify({
        operation: 'upsert-secret',
        providerId: 'groq',
        secretId: 'groq-primary',
        value: 'gsk_sensitive-value',
      }),
    }));
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn() },
  user: { uid: 'u1', getIdToken: vi.fn(async () => 'token') },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: mocks.toast }));

import { AI_DISCLAIMER, AiDisclosure } from '@/components/ai/AiDisclosure';

// Dialog tests render a portal and motion; allow for a loaded machine.
vi.setConfig({ testTimeout: 15000 });

describe('AiDisclosure', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('labels the output as AI-generated with the exact disclaimer', () => {
    render(<AiDisclosure feature="insights" />);
    expect(AI_DISCLAIMER).toBe("AI-generated. It can be wrong and isn't official academic advice.");
    expect(screen.getByText(AI_DISCLAIMER)).toBeInTheDocument();
  });

  it('reports a response with a reason and an optional note', async () => {
    const user = userEvent.setup();
    render(<AiDisclosure feature="forecast" />);
    await user.click(screen.getByRole('button', { name: /report/i }));
    const dialog = await screen.findByRole('dialog', { name: /report this ai response/i });
    for (const reason of ['Inaccurate', 'Offensive', 'Unsafe', 'Other']) {
      expect(screen.getByRole('radio', { name: reason })).toBeInTheDocument();
    }
    const send = screen.getByRole('button', { name: /send report/i });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Inaccurate' }));
    await user.click(screen.getByLabelText(/note/i));
    await user.paste('Wrong semester count');
    await user.click(send);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai/report');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ feature: 'forecast', kind: 'report', reason: 'inaccurate', note: 'Wrong semester count' });
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer token' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it('caps the note at 500 characters and omits an empty note', async () => {
    const user = userEvent.setup();
    render(<AiDisclosure feature="whatif" />);
    await user.click(screen.getByRole('button', { name: /report/i }));
    const note = await screen.findByLabelText(/note/i);
    expect(note).toHaveAttribute('maxLength', '500');
    await user.click(screen.getByRole('radio', { name: 'Other' }));
    await user.click(screen.getByRole('button', { name: /send report/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ feature: 'whatif', kind: 'report', reason: 'other' });
  });

  it('fails quietly with a toast when the report endpoint is not deployed', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));
    const user = userEvent.setup();
    render(<AiDisclosure feature="insights" />);
    await user.click(screen.getByRole('button', { name: /report/i }));
    await user.click(await screen.findByRole('radio', { name: 'Unsafe' }));
    await user.click(screen.getByRole('button', { name: /send report/i }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
  });

  it('records helpful and not-helpful ratings once', async () => {
    const user = userEvent.setup();
    render(<AiDisclosure feature="insights" />);
    await user.click(screen.getByRole('button', { name: 'Helpful' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ feature: 'insights', kind: 'helpful' });
    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Not helpful' })).toBeDisabled();
  });
});

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ fetch: vi.fn(), user: { uid: 'user-1', getIdToken: async () => 'id-token' } as { uid: string; getIdToken: () => Promise<string> } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user ? { ...state.user } : null }) }));
import { FeatureCredits } from '@/components/ai/FeatureCredits';

describe('feature credit display', () => {
  beforeEach(() => { vi.stubGlobal('fetch', state.fetch); state.fetch.mockReset(); });
  it('shows server counts without treating the daily balance as immediately available', async () => {
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1, features: [{ id: 'insights', label: 'Written Analysis', freeDailyLimit: 3, freeRemaining: 2, freeResetAt: null, availableNow: 0, retryAfterSeconds: 100, cooldownUntil: null }] }) });
    render(<FeatureCredits feature="insights" />);
    expect(await screen.findByText('2 of 3 free credits remaining')).toBeInTheDocument();
    expect(screen.getByText(/Cooldown or short-window limit/)).toBeInTheDocument();
    expect(screen.queryByText(/20 free/)).not.toBeInTheDocument();
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
  it('does not fabricate a balance when the summary is unavailable', async () => {
    state.fetch.mockRejectedValue(new Error('offline'));
    render(<FeatureCredits feature="ocr" />);
    expect(await screen.findByText(/Credit balance unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/free credits remaining/)).not.toBeInTheDocument();
  });
  it('does not refetch for a recreated auth object with the same account', async () => {
    state.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ checkedAt: 1, features: [{ id: 'ocr', label: 'Result scanner', freeDailyLimit: 20, freeRemaining: 18, freeResetAt: null, availableNow: 5, retryAfterSeconds: 0, cooldownUntil: null }] }) }).mockImplementation(() => new Promise(() => {}));
    const view = render(<FeatureCredits feature="ocr" />);
    await screen.findByText('18 of 20 free credits remaining');
    await act(async () => { view.rerender(<FeatureCredits feature="ocr" />); });
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
});

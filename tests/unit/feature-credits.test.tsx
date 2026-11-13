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
    expect(screen.getByText(/Short-window limit is active/)).toBeInTheDocument();
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
  it('reports the Written Analysis regeneration cooldown separately from availability', async () => {
    const until = Date.UTC(2026, 10, 13, 18, 30);
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1, features: [{ id: 'insights', label: 'Written Analysis', freeDailyLimit: 3, freeRemaining: 3, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: until }] }) });
    render(<FeatureCredits feature="insights" />);
    expect(await screen.findByText(/2 available now/)).toBeInTheDocument();
    expect(screen.getByText(/Regeneration available at/)).toHaveTextContent(`Regeneration available at ${new Date(until).toLocaleString()}.`);
  });
  it('keeps the credit counts when the regeneration cooldown is active (server no longer zeroes availableNow)', async () => {
    const until = Date.UTC(2026, 10, 13, 20, 0);
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1, features: [{ id: 'insights', label: 'Written Analysis', freeDailyLimit: 3, freeRemaining: 3, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: until }] }) });
    render(<FeatureCredits feature="insights" />);
    expect(await screen.findByText('3 of 3 free credits remaining')).toBeInTheDocument();
    expect(screen.queryByText(/Short-window limit is active/)).not.toBeInTheDocument();
  });
  it('shows nothing when the account is not allowed to use AI (the page shows the notice)', async () => {
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1, age: { status: 'minor', aiAllowed: false, aiConsent: null },
      features: [{ id: 'forecast', label: 'Forecast', freeDailyLimit: 8, freeRemaining: 8, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: null }] }) });
    const view = render(<FeatureCredits feature="forecast" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await vi.waitFor(() => expect(state.fetch).toHaveBeenCalled());
    await vi.waitFor(() => expect(view.container).toBeEmptyDOMElement());
  });
  it('shows the server-owned coin balance and price as Android-only, without a web spend flow', async () => {
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1,
      coins: { enabled: true, balance: 5, balanceCap: 30, coinsPerAd: 2, earnedToday: 4, dailyEarnCap: 10, earnRemaining: 6, resetAtUTC: 2 },
      features: [{ id: 'ocr', label: 'Result scanning', freeDailyLimit: 20, freeRemaining: 0, freeResetAt: null, availableNow: 0, retryAfterSeconds: 9, cooldownUntil: null, coin: { enabled: true, price: 3, usesToday: 1, dailyUseCap: 5 } }] }) });
    render(<FeatureCredits feature="ocr" />);
    expect(await screen.findByText(/Coin balance: 5/)).toHaveTextContent('An extra Result scanning request costs 3 coins in the Android app after free credits run out (1 of 5 coin-funded uses today).');
    expect(screen.queryByRole('button', { name: /coin|watch|ad/i })).not.toBeInTheDocument();
  });
  it('omits coins when they are off or the feature is not offered for coins', async () => {
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ checkedAt: 1, coins: null,
      features: [{ id: 'forecast', label: 'Forecast', freeDailyLimit: 8, freeRemaining: 8, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: null, coin: null }] }) });
    render(<FeatureCredits feature="forecast" />);
    await screen.findByText('8 of 8 free credits remaining');
    expect(screen.queryByText(/coin/i)).not.toBeInTheDocument();
  });
});

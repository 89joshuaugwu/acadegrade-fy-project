import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'a', getIdToken: async () => 'tok' } }) }));

import { AiFeedbackStats } from '@/components/admin/ai/AiFeedbackStats';

const stats = {
  days: 30, total: 4, truncated: false,
  byFeature: { insights: { helpful: 2, notHelpful: 1, reports: 0 } },
  byModel: [{ providerId: 'groq', modelId: 'llama', helpful: 2, notHelpful: 1, reports: 0, helpfulRate: 2 / 3 }],
  notHelpfulReasons: { inaccurate: 1 },
  reports: [{ feature: 'forecast', reason: 'offensive', note: 'rude reply', platform: 'android', modelId: null, createdAt: '2026-11-10T00:00:00.000Z' }],
};

describe('AiFeedbackStats', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('shows per-feature, per-model, reason and report summaries', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }));
    render(<AiFeedbackStats />);
    expect(await screen.findByText('groq / llama')).toBeInTheDocument();
    expect(screen.getByText('67% helpful (3 ratings), 0 reports')).toBeInTheDocument();
    expect(screen.getByText('Inaccurate: 1')).toBeInTheDocument();
    expect(screen.getByText('rude reply')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/admin/ai/feedback?days=30');
  });

  it('refetches for another period and survives a bad response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ secret: {} }), { status: 200 }));
    render(<AiFeedbackStats />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: '7 days' }));
    await vi.waitFor(() => expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe('/api/admin/ai/feedback?days=7'));
  });
});

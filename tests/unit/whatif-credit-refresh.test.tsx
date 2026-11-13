import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'u', getIdToken: async () => 'token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
import { WhatIfCalculator } from '@/components/ai/WhatIfCalculator';

describe('What-if credit refresh signal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each([
    ['success', new Response(JSON.stringify({ feasibilityNote: 'Doable.' }), { status: 200 })],
    ['free limit', new Response(JSON.stringify({ error: 'limit', retryAfterSeconds: 60 }), { status: 429 })],
  ])('notifies once after a %s response without restarting its debounce', async (_name, response) => {
    const fetcher = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetcher);
    const settled = vi.fn();
    const view = render(<WhatIfCalculator currentCGPA={3.5} totalCredits={100} initialRemainingSemesters={2} onRequestSettled={() => settled()} />);
    // A new inline callback on every render must not reset the 5-second debounce.
    view.rerender(<WhatIfCalculator currentCGPA={3.5} totalCredits={100} initialRemainingSemesters={2} onRequestSettled={() => settled()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledTimes(1);
  });
});

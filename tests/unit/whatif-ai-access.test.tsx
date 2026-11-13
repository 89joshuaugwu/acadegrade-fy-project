import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'u', getIdToken: async () => 'token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { WhatIfCalculator } from '@/components/ai/WhatIfCalculator';
import { AGE_RESTRICTED_NOTICE } from '@/components/ai/aiAccess';

describe('What-if AI access and display', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('shows the current CGPA with the shared 2-decimal rounding', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<WhatIfCalculator currentCGPA={1.005} totalCredits={100} initialRemainingSemesters={2} />);
    // (1.005).toFixed(2) is "1.00"; the shared half-up rounding shows 1.01.
    expect(screen.getByText(/^Current:/)).toHaveTextContent('Current: 1.01');
  });

  it('names the target slider and the number fields', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<WhatIfCalculator currentCGPA={3} totalCredits={100} initialRemainingSemesters={2} />);
    expect(screen.getByRole('slider', { name: 'Target CGPA' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Remaining semesters' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Units per semester' })).toBeInTheDocument();
  });

  it('makes no AI request and keeps the maths when AI is not allowed', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} initialCreditLoad={18} aiBlock={{ kind: 'age-restricted', message: AGE_RESTRICTED_NOTICE }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText('3.93')).toBeInTheDocument();
    expect(screen.getByText(AGE_RESTRICTED_NOTICE)).toBeInTheDocument();
  });

  it('reports a server age block and stops asking for AI guidance', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'x', code: 'AGE_RESTRICTED' }), { status: 403 }));
    vi.stubGlobal('fetch', fetcher);
    const onAiBlocked = vi.fn();
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} onAiBlocked={onAiBlocked} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    expect(onAiBlocked).toHaveBeenCalledWith(expect.objectContaining({ kind: 'age-restricted' }));
  });

  it('labels AI guidance as AI-generated with a report action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ feasibilityNote: 'Doable with steady Bs.' }), { status: 200 })));
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5200); });
    expect(screen.getByText(/Doable with steady Bs\./)).toBeInTheDocument();
    expect(screen.getByText("AI-generated. It can be wrong and isn't official academic advice.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument();
  });
});

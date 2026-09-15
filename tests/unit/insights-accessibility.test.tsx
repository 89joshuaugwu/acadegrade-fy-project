import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InsightsPage from '@/app/(student)/insights/page';

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  queryCollection: vi.fn(),
  reducedMotion: false,
  user: { uid: 'student-1', getIdToken: vi.fn() },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { fullName: 'Ada Student', gradeMode: 'cgpa', courseDuration: 4 } }),
}));

vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: () => true }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mocks.reducedMotion,
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
  queryCollection: mocks.queryCollection,
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock('@/components/charts/ForecastChart', () => ({ ForecastChart: () => <div /> }));
vi.mock('@/components/ai/WhatIfCalculator', () => ({ WhatIfCalculator: () => <div>What-if calculator</div> }));
vi.mock('@/components/ai/InsightCard', () => ({ InsightCard: () => <div /> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe('Insights tabs accessibility and motion preferences', () => {
  beforeEach(() => {
    mocks.reducedMotion = false;
    mocks.queryCollection.mockReset().mockResolvedValue([]);
    mocks.getDocument.mockReset().mockResolvedValue(null);
  });

  it('connects tabs to panels and supports automatic arrow, Home, and End navigation', async () => {
    const user = userEvent.setup();
    render(<InsightsPage />);

    const forecast = await screen.findByRole('tab', { name: 'Forecast' });
    const whatIf = screen.getByRole('tab', { name: 'What-If' });
    const risk = screen.getByRole('tab', { name: 'Risk Analysis' });
    const analysis = screen.getByRole('tab', { name: 'Written Analysis' });

    expect(forecast).toHaveAttribute('id', 'insights-tab-forecast');
    expect(forecast).toHaveAttribute('aria-controls', 'insights-panel-forecast');
    expect(forecast).toHaveAttribute('tabindex', '0');
    expect(whatIf).toHaveAttribute('tabindex', '-1');

    const forecastPanel = screen.getByRole('tabpanel');
    expect(forecastPanel).toHaveAttribute('id', 'insights-panel-forecast');
    expect(forecastPanel).toHaveAttribute('aria-labelledby', 'insights-tab-forecast');

    forecast.focus();
    await user.keyboard('{ArrowRight}');
    expect(whatIf).toHaveFocus();
    expect(whatIf).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'insights-panel-whatif');

    await user.keyboard('{End}');
    expect(analysis).toHaveFocus();
    expect(analysis).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(forecast).toHaveFocus();
    expect(forecast).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(analysis).toHaveFocus();
    expect(risk).toHaveAttribute('tabindex', '-1');
  });

  it('removes scanner and pulse animation classes when reduced motion is requested', async () => {
    mocks.reducedMotion = true;
    mocks.queryCollection.mockImplementation(() => new Promise(() => undefined));

    render(<InsightsPage />);

    expect(screen.getByTestId('insights-scanner')).toHaveAttribute('data-animated', 'false');
    expect(screen.getByTestId('insights-loading-glow')).not.toHaveClass('animate-pulse');
    expect(screen.getByAltText('AcadeMind')).not.toHaveClass('animate-pulse');
    expect(screen.getByText('Analyzing academic records...')).not.toHaveClass('animate-pulse');
  });

  it('keeps the loading treatment animated when reduced motion is not requested', async () => {
    mocks.queryCollection.mockImplementation(() => new Promise(() => undefined));

    render(<InsightsPage />);

    await waitFor(() => expect(screen.getByTestId('insights-scanner')).toHaveAttribute('data-animated', 'true'));
    expect(screen.getByTestId('insights-loading-glow')).toHaveClass('animate-pulse');
  });
});

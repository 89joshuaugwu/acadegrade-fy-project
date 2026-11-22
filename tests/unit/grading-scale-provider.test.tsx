import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GradingScaleProvider, useGradingScale } from '@/hooks/useGradingScale';

function Probe() {
  const { scale, setting } = useGradingScale();
  return <p>{scale.id}:{scale.maxPoint}:{setting?.id ?? 'none'}</p>;
}

describe('useGradingScale', () => {
  it('is the 5-point scale outside the student app', () => {
    render(<Probe />);
    expect(screen.getByText('ng5:5:none')).toBeInTheDocument();
  });

  it('resolves the stored setting', () => {
    render(<GradingScaleProvider setting={{ id: 'nbte4' }}><Probe /></GradingScaleProvider>);
    expect(screen.getByText('nbte4:4:nbte4')).toBeInTheDocument();
  });

  it('fails open to the 5-point scale for a broken setting', () => {
    render(<GradingScaleProvider setting={{ id: 'custom', custom: { maxPoint: 99 } }}><Probe /></GradingScaleProvider>);
    expect(screen.getByText('ng5:5:custom')).toBeInTheDocument();
  });
});

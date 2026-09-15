import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductTour, type ProductTourStep } from '@/components/onboarding/ProductTour';

const steps: ProductTourStep[] = [
  { targetId: 'missing-target', title: 'Missing', description: 'This is skipped.' },
  { targetId: 'standing', title: 'Academic standing', description: 'Read your current position.' },
];

describe('ProductTour', () => {
  it('skips missing targets and completes without forcing the highlighted action', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <div id="standing">Standing</div>
        <ProductTour
          tourId="dashboard"
          version={1}
          eligible
          completedVersion={0}
          steps={steps}
          onComplete={onComplete}
        />
      </>
    );

    expect(await screen.findByRole('dialog', { name: 'Academic standing' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish tour' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('dashboard', 1));
  });

  it('stays closed when the current version is already complete', () => {
    render(
      <ProductTour
        tourId="dashboard"
        version={1}
        eligible
        completedVersion={1}
        steps={[{ title: 'Welcome', description: 'Already seen.' }]}
        onComplete={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

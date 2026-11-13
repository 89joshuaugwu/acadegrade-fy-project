import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DiscreetToggle } from '@/components/privacy/DiscreetToggle';
import { readDiscreetMode, setDiscreetMode } from '@/lib/discreet';

afterEach(() => act(() => setDiscreetMode(false)));

describe('DiscreetToggle', () => {
  it('is a pressed-state button that switches discreet mode for this device', () => {
    render(<DiscreetToggle />);
    const toggle = screen.getByRole('button', { name: 'Discreet mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(readDiscreetMode()).toBe(true);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(readDiscreetMode()).toBe(false);
  });
});

import Link from 'next/link';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DISCREET_STORAGE_KEY,
  DiscreetRevealButton,
  DiscreetScope,
  DiscreetValue,
  readDiscreetMode,
  setDiscreetMode,
} from '@/lib/discreet';

describe('discreet mode storage', () => {
  beforeEach(() => localStorage.clear());

  it('is off by default and persists per device', () => {
    expect(readDiscreetMode()).toBe(false);
    setDiscreetMode(true);
    expect(localStorage.getItem(DISCREET_STORAGE_KEY)).toBe('1');
    expect(readDiscreetMode()).toBe(true);
    setDiscreetMode(false);
    expect(readDiscreetMode()).toBe(false);
  });

  it('treats unavailable storage as off instead of throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readDiscreetMode()).toBe(false);
    expect(() => setDiscreetMode(true)).not.toThrow();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('DiscreetValue', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => act(() => setDiscreetMode(false)));

  it('shows the value normally when discreet mode is off', () => {
    render(<p>CGPA <DiscreetValue label="CGPA">4.21</DiscreetValue></p>);
    expect(screen.getByText('4.21')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the value behind an accessible reveal button until activated', () => {
    act(() => setDiscreetMode(true));
    render(<DiscreetValue label="CGPA">4.21</DiscreetValue>);

    const reveal = screen.getByRole('button', { name: 'CGPA hidden, activate to reveal' });
    expect(screen.getByText('4.21')).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(reveal);
    expect(screen.queryByRole('button', { name: /activate to reveal/ })).not.toBeInTheDocument();
    expect(screen.getByText('4.21')).not.toHaveAttribute('aria-hidden');
  });

  it('reacts when discreet mode is switched on elsewhere on the page', () => {
    render(<DiscreetValue label="GPA">3.50</DiscreetValue>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    act(() => setDiscreetMode(true));
    expect(screen.getByRole('button', { name: 'GPA hidden, activate to reveal' })).toBeInTheDocument();
  });

  it('inside a scope, values are non-interactive and one button reveals them all', () => {
    act(() => setDiscreetMode(true));
    render(
      <DiscreetScope>
        <DiscreetRevealButton label="Grades" />
        <Link href="/results/1"><DiscreetValue label="Grade">A</DiscreetValue></Link>
        <Link href="/results/2"><DiscreetValue label="Grade">B</DiscreetValue></Link>
      </DiscreetScope>
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByText('Grade hidden')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Grades hidden, activate to reveal' }));
    expect(screen.getByText('A')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByText('B')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('button', { name: 'Hide grades' })).toBeInTheDocument();
  });

  it('renders no reveal button for a scope when discreet mode is off', () => {
    render(<DiscreetScope><DiscreetRevealButton label="Grades" /><DiscreetValue label="Grade">A</DiscreetValue></DiscreetScope>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

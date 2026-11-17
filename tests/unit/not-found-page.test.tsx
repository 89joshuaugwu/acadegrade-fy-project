import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';

describe('404 page', () => {
  it('explains the problem and offers ways back', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: /can.t find that page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /open the calculator/i })).toHaveAttribute('href', '/calculator');
    expect(screen.getByRole('link', { name: /go to your dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('is kept out of search results', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});

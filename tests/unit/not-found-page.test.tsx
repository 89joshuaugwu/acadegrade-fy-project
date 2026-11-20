import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';
import { shortenRequestedPath } from '@/components/site/system/RequestedPath';
import { notFoundPhoto, readSlotPhoto } from '@/components/site/system/not-found-photo';
import { photoFor } from '@/lib/public/page-photos';

describe('404 page', () => {
  it('explains the problem and offers ways back', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: /can.t find that page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to the home page/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /open the cgpa calculator/i })).toHaveAttribute('href', '/calculator');
    expect(screen.getByRole('link', { name: /go to your dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('shows a result row that found no matching course', () => {
    const { container } = render(<NotFound />);
    const row = screen.getByRole('row', { name: /404 No page at this address 0/ });
    expect(row).toBeInTheDocument();
    expect(screen.getByText('no grade')).toBeInTheDocument();
    expect(screen.getByText('Pages found')).toBeInTheDocument();
    // Without a router (or JavaScript) the meta line still reads sensibly.
    expect(container.textContent).toContain('Requested: this address');
    expect(container.textContent).not.toMatch(/ERROR 404/);
  });

  it("shows the 'notfound' slot image when filled, else only the card, and never a credit", () => {
    const slot = photoFor('notfound');
    const { container } = render(<NotFound />);
    if (slot) {
      expect(notFoundPhoto()).toEqual(expect.objectContaining({ src: slot.src, alt: slot.alt }));
      expect(screen.getByAltText(slot.alt)).toHaveAttribute('loading', 'lazy');
    } else {
      expect(notFoundPhoto()).toBeNull();
      expect(container.querySelector('img')).toBeNull();
    }
    expect(container.textContent).not.toMatch(/Photograph/);
  });

  it('can read a slot photo later without page changes', () => {
    const photo = readSlotPhoto({ src: { webp: { 320: '/images/x-320.webp', 640: '/images/x-640.webp' } }, alt: 'A pinned paper notice', creditId: 'c1' });
    expect(photo).toEqual({ src: '/images/x-640.webp', alt: 'A pinned paper notice', creditId: 'c1' });
    expect(readSlotPhoto(null)).toBeNull();
    expect(readSlotPhoto({ src: '/x.webp' })).toBeNull();
  });

  it('shortens the requested path and drops the query', () => {
    expect(shortenRequestedPath('/resluts?x=1')).toBe('/resluts');
    expect(shortenRequestedPath(null)).toBe('this address');
    const long = shortenRequestedPath(`/${'a'.repeat(60)}`);
    expect(long).toHaveLength(40);
    expect(long.endsWith('…')).toBe(true);
  });

  it('is kept out of search results', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});

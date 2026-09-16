import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ABOUT_CONTENT } from '@/lib/about/content';

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <header /> }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => <footer /> }));
vi.mock('@/components/shared/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => children,
}));

import AboutPage from '@/app/(public)/about/page';

describe('AboutPage public scale', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ about: DEFAULT_ABOUT_CONTENT }),
    }));
  });

  it('caps the hero and section typography for wide desktop layouts', async () => {
    render(<AboutPage />);

    const heroHeading = await screen.findByRole('heading', {
      level: 1,
      name: DEFAULT_ABOUT_CONTENT.headline,
    });
    const principlesHeading = screen.getByRole('heading', {
      level: 2,
      name: 'Clarity before complexity.',
    });

    expect(heroHeading).toHaveClass('text-[clamp(2.5rem,5vw,4rem)]');
    expect(heroHeading).toHaveAttribute('data-public-text-motion', 'directional');
    expect(heroHeading).toHaveAttribute('aria-label', DEFAULT_ABOUT_CONTENT.headline);
    expect(principlesHeading).toHaveClass('text-[clamp(2rem,3vw,2.75rem)]');
    expect(principlesHeading).toHaveAttribute('data-public-text-motion', 'typed');
    expect(principlesHeading).toHaveAttribute('aria-label', 'Clarity before complexity.');
    expect(screen.getByRole('link', { name: /build your academic record/i })).toHaveClass('marketing-edge-cta');
  });

  it('keeps the complete expressive copy available in the rendered HTML', async () => {
    const { container } = render(<AboutPage />);

    await screen.findByRole('heading', {
      level: 1,
      name: DEFAULT_ABOUT_CONTENT.headline,
    });

    expect(container.querySelector('[data-public-text-motion="directional"]')?.textContent)
      .toBe(DEFAULT_ABOUT_CONTENT.headline);
    expect(container.querySelector('[data-public-text-motion="typed"]')?.textContent)
      .toBe('Clarity before complexity.');
  });
});

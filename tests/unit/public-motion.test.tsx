import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootAgMotion } from '@/components/motion/boot';
import { CountUp, CountUpText } from '@/components/motion/CountUp';
import { Parallax } from '@/components/motion/Parallax';
import { Reveal, reveal } from '@/components/motion/Reveal';
import { Words } from '@/components/motion/Words';

/**
 * The public-site motion kit must never hide or blank content where it cannot
 * run: old browsers, crawlers and jsdom have no IntersectionObserver (and
 * sometimes no matchMedia). Everything renders final and visible there.
 */

type MotionWindow = { __agMo?: boolean; IntersectionObserver?: unknown; matchMedia?: unknown };
const w = window as unknown as MotionWindow;
const originalIO = w.IntersectionObserver;
const originalMatchMedia = w.matchMedia;

beforeEach(() => {
  delete w.__agMo;
  document.documentElement.classList.remove('ag-mo');
  delete w.IntersectionObserver;
});

afterEach(() => {
  if (originalIO) w.IntersectionObserver = originalIO;
  else delete w.IntersectionObserver;
  w.matchMedia = originalMatchMedia;
  delete w.__agMo;
  document.documentElement.classList.remove('ag-mo');
});

describe('public motion without IntersectionObserver', () => {
  it('the runtime leaves the page alone (no html.ag-mo, so nothing is hidden)', () => {
    expect(() => bootAgMotion()).not.toThrow();
    expect(document.documentElement.classList.contains('ag-mo')).toBe(false);
  });

  it('the runtime also bails out when matchMedia is missing', () => {
    w.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    delete w.matchMedia;
    expect(() => bootAgMotion()).not.toThrow();
    expect(document.documentElement.classList.contains('ag-mo')).toBe(false);
  });

  it('CountUp and CountUpText render the final value straight away', () => {
    render(
      <div>
        <CountUp value={4.67} decimals={2} from={3.5} />
        <CountUpText text="18+" />
        <CountUpText text="1, 7, 30" />
      </div>,
    );
    expect(screen.getAllByText('4.67').length).toBeGreaterThan(0);
    expect(screen.queryByText('3.50')).toBeNull();
    expect(screen.getAllByText('18+').length).toBeGreaterThan(0);
    expect(screen.getByText('1, 7, 30')).toBeTruthy();
  });

  it('CountUp stays final even when the runtime class is present but the browser cannot observe', () => {
    document.documentElement.classList.add('ag-mo');
    render(<CountUp value={6} />);
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('Parallax, Reveal and Words render their content at rest', () => {
    delete w.matchMedia;
    render(
      <Parallax>
        <Reveal variant="pop">
          <h2 {...reveal('words')}>
            <Words>Results day, sorted.</Words>
          </h2>
        </Reveal>
      </Parallax>,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Results day, sorted.');
    expect(heading.getAttribute('data-mo')).toBe('words');
    expect(heading.hasAttribute('data-mo-in')).toBe(false);
    expect(heading.closest('[data-mo="pop"]')).not.toBeNull();
  });
});

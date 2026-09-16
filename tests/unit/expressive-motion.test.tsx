import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReplayTypingText } from '@/components/marketing/LandingMotion';

describe('ReplayTypingText', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('types the visible copy, holds it, then starts the replay without changing its accessible name', () => {
    vi.useFakeTimers();
    const text = 'A clear next step.';
    const { container } = render(
      <ReplayTypingText text={text} typeIntervalMs={10} replayDelayMs={100} />
    );

    const paragraph = screen.getByLabelText(text);
    const output = container.querySelector('[data-typing-output]');
    expect(paragraph).toHaveAccessibleName(text);
    expect(output).toHaveTextContent('');

    act(() => vi.advanceTimersByTime(text.length * 10));
    expect(output).toHaveTextContent(text);

    act(() => vi.advanceTimersByTime(99));
    expect(output).toHaveTextContent(text);

    act(() => vi.advanceTimersByTime(1));
    expect(output).toHaveTextContent('');
  });

  it('shows the complete text and never starts a replay when reduced motion is requested', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const text = 'Your full insight remains readable.';
    const { container } = render(<ReplayTypingText text={text} />);
    expect(container.querySelector('[data-typing-output]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-typing-fallback]')).toHaveTextContent(text);
    expect(container.querySelector('[data-typing-fallback]')).not.toHaveClass('invisible');
  });

  it('server-renders a visible, fully labelled fallback before client motion is active', () => {
    const text = 'Static insight for no-JS readers.';
    const markup = renderToStaticMarkup(<ReplayTypingText text={text} />);

    expect(markup).toContain(`aria-label="${text}"`);
    expect(markup).toContain('data-typing-fallback=""');
    expect(markup).toContain(text);
    expect(markup).not.toContain('data-typing-output');
    expect(markup).not.toContain('invisible');
  });
});

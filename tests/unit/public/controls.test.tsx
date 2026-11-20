import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, LinkButton } from '@/components/public/Button';

describe('Button and LinkButton', () => {
  it('is one square ink button with a hidden hover stripe', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save this semester</Button>);
    const button = screen.getByRole('button', { name: 'Save this semester' });
    expect(button.className).toBe('pg-btn');
    expect(button.querySelector('.pg-btn__stripe')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('stays focusable but swallows clicks when disabled or busy, and keeps its label while busy', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button disabled onClick={onClick}>Sign in</Button>);
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    rerender(<Button busy onClick={onClick}>Sign in</Button>);
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('.pg-spinner')).not.toBeNull();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has a paper tone, a small size and a full width', () => {
    render(
      <Button tone="paper" size="sm" block>
        Create your free record
      </Button>
    );
    expect(screen.getByRole('button').className).toBe('pg-btn pg-btn--paper pg-btn--sm pg-btn--block');
  });

  it('links like a button, with a plain anchor for route handlers', () => {
    render(
      <>
        <LinkButton href="/register">Start your free record</LinkButton>
        <LinkButton href="/app/download/android" external>
          Download for Android
        </LinkButton>
      </>
    );
    expect(screen.getByRole('link', { name: 'Start your free record' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Download for Android' })).toHaveAttribute('href', '/app/download/android');
  });
});

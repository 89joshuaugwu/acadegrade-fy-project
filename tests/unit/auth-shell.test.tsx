import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it } from 'vitest';
import { AuthDivider, AuthProgress, AuthShell } from '@/components/auth';
import { Button, Input } from '@/components/ui';

function renderWithTheme(ui: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      {ui}
    </ThemeProvider>
  );
}

describe('AuthShell', () => {
  it('provides one labelled main region while leaving form behaviour to its children', () => {
    renderWithTheme(
      <AuthShell
        eyebrow="Student access"
        title="Welcome back"
        description="Sign in to continue to your academic record."
      >
        <form aria-label="Sign in form">
          <Input id="email" type="email" label="Email address" />
          <Button type="submit">Sign in</Button>
        </form>
      </AuthShell>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAccessibleName('Welcome back');
    expect(within(main).getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(within(main).getByRole('form', { name: 'Sign in form' })).toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
  });

  it('keeps brand, theme choice, proof, and support navigation accessible', () => {
    renderWithTheme(
      <AuthShell
        title="Create your account"
        description="Build a clear record of your degree."
        support={<a href="/help">Get help</a>}
      >
        <p>Registration fields</p>
      </AuthShell>
    );

    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('link', { name: 'AcadeGrade home' })
    );
    expect(screen.getByRole('link', { name: 'AcadeGrade home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('radiogroup', { name: 'Choose colour theme' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'See your whole degree clearly' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Authentication support' })).toContainElement(
      screen.getByRole('link', { name: 'Get help' })
    );
  });

  it('accepts route-specific proof copy without changing the form area', () => {
    renderWithTheme(
      <AuthShell
        title="Reset your password"
        description="We will help you regain access."
        proofTitle="Your record stays yours"
        proofDescription="Account recovery does not alter saved academic results."
        proofItems={['Protected recovery', 'No result changes']}
      >
        <p>Recovery fields</p>
      </AuthShell>
    );

    const proof = screen.getByRole('complementary', { name: 'Your record stays yours' });
    expect(within(proof).getByText('Account recovery does not alter saved academic results.')).toBeInTheDocument();
    expect(within(proof).getByText('Protected recovery')).toBeInTheDocument();
    expect(within(proof).getByText('No result changes')).toBeInTheDocument();
  });
});

describe('AuthDivider', () => {
  it('announces the alternative path without exposing decorative rules', () => {
    render(<AuthDivider>Or continue with</AuthDivider>);

    const separator = screen.getByRole('separator', { name: 'Or continue with' });
    expect(separator).toHaveTextContent('Or continue with');
  });
});

describe('AuthProgress', () => {
  it('identifies the current registration phase and exposes progress text', () => {
    render(
      <AuthProgress
        label="Registration progress"
        currentStep={2}
        steps={['Account', 'Academic details', 'Record setup']}
      />
    );

    const progress = screen.getByRole('navigation', { name: 'Registration progress' });
    expect(within(progress).getByText('Step 2 of 3')).toBeInTheDocument();
    expect(within(progress).getAllByRole('listitem')[1]).toHaveAttribute(
      'aria-current',
      'step'
    );
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthShell } from '@/components/public/shells/AuthShell';
import {
  AuthButton,
  ChoiceCards,
  ChoicePills,
  CodeField,
  GoogleButton,
  NumberStepper,
  OrDivider,
  PasswordField,
  TextField,
  clampWhole,
  normaliseCode,
} from '@/components/site/auth/controls';
import { AuthMessage, AuthNoticeLine, AuthPending, CooldownNotice, HandoffNote } from '@/components/site/auth/messages';
import { FilledSoFar, StepActions, StepFrame, StepProgress, filledSegments, stepLine } from '@/components/site/auth/steps';
import { saveCalculatorHandoff, CALCULATOR_HANDOFF_KEY } from '@/lib/handoff/calculator';
import { photoFor } from '@/lib/public/page-photos';

afterEach(() => sessionStorage.removeItem(CALCULATOR_HANDOFF_KEY));

describe('AuthShell as the auth pages use it', () => {
  it('provides one labelled main region while leaving form behaviour to its children', () => {
    render(
      <AuthShell title="Welcome back" sentence="Sign in to see your record and pick up where you left off." photo="auth.login">
        <form aria-label="Sign in form">
          <button type="submit">Sign in</button>
        </form>
      </AuthShell>
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAccessibleName('Welcome back');
    expect(main).toHaveAttribute('id', 'content');
    expect(within(main).getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(within(main).getByRole('form', { name: 'Sign in form' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AcadeGrade home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#content');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('keeps a way back, support and privacy on every auth page', () => {
    render(
      <AuthShell title="Welcome back" reassurance="Signing in never changes your saved results.">
        <form aria-label="Sign in with email" />
      </AuthShell>
    );
    expect(screen.getByRole('link', { name: 'Back to site' })).toHaveAttribute('href', '/');
    const links = screen.getByRole('navigation', { name: 'Help and site links' });
    expect(within(links).getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(within(links).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy');
  });

  it('shows the slot photo on desktop only, art-directed so phones download nothing', () => {
    const { container } = render(
      <AuthShell title="Welcome back" photo="auth.login" reassurance="Signing in never changes your saved results.">
        <div />
      </AuthShell>
    );
    const slot = photoFor('auth.login');
    expect(slot).not.toBeNull();
    const sources = container.querySelectorAll('figure picture source');
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((source) => {
      expect(source).toHaveAttribute('media', '(min-width: 1024px)');
      expect(source.getAttribute('sizes')).toBeTruthy();
    });
    const img = screen.getByAltText(slot!.alt);
    expect(img.getAttribute('src')).toMatch(/^data:image\/gif/);
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img.getAttribute('style') ?? '').not.toMatch(/filter/);
    expect(screen.getByRole('figure')).toHaveTextContent('Signing in never changes your saved results.');
  });

  it('draws the panel without a picture when no slot is given', () => {
    const { container } = render(
      <AuthShell title="Create your free record" reassurance="About two minutes.">
        <div />
      </AuthShell>
    );
    expect(container.querySelector('picture, img')).toBeNull();
    expect(screen.getByText('About two minutes.')).toBeInTheDocument();
  });

  it('carries a StepProgress above the h1 with the honest step list', () => {
    render(
      <AuthShell title="Create your free record" progress={<StepProgress steps={['Your account', 'Where you study', 'Your record']} current={2} label="Registration progress" />}>
        <div />
      </AuthShell>
    );
    const progress = screen.getByRole('navigation', { name: 'Registration progress' });
    const items = within(progress).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Your account, complete');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).toHaveTextContent('Your record, upcoming');
  });
});

describe('StepProgress', () => {
  it('fills up to the current step and every segment when done', () => {
    expect(filledSegments(4, 1)).toEqual([true, false, false, false]);
    expect(filledSegments(4, 4)).toEqual([true, true, true, true]);
    expect(filledSegments(3, 9)).toEqual([true, true, true]);
    expect(filledSegments(3, 1, true)).toEqual([true, true, true]);
    expect(stepLine(['Your account', 'Where you study', 'Your record', 'Past semesters'], 2)).toBe('Step 2 of 4');
    expect(stepLine(['Your email', 'The code', 'New password'], 9)).toBe('Step 3 of 3');
    const { container } = render(<StepProgress label="Password recovery progress" steps={['Your email', 'The code', 'New password']} current={2} />);
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(2);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });
});

describe('OrDivider', () => {
  it('announces the alternative path without exposing the rules', () => {
    render(<OrDivider label="or sign in with email" />);
    expect(screen.getByRole('separator', { name: 'or sign in with email' })).toBeInTheDocument();
  });
});

describe('AuthNoticeLine', () => {
  it('sets the link inside the sentence and makes errors alerts', () => {
    render(<AuthNoticeLine notice={{ tone: 'error', text: "That email and password don't match. Check both, or reset your password.", link: { href: '/forgot-password', label: 'reset your password' } }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("That email and password don't match. Check both, or reset your password.");
    expect(within(alert).getByRole('link', { name: 'reset your password' })).toHaveAttribute('href', '/forgot-password');
  });

  it('runs the Start again action from inside the sentence', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<AuthNoticeLine notice={{ tone: 'error', text: 'This reset took longer than 15 minutes. Start again to get a new code.', action: 'start-again' }} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    expect(onAction).toHaveBeenCalledWith('start-again');
  });

  it('keeps neutral and status lines polite and renders nothing without a notice', () => {
    const { container, rerender } = render(<AuthNoticeLine notice={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<AuthNoticeLine notice={{ tone: 'neutral', text: 'Google sign-in was closed before it finished.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Google sign-in was closed before it finished.');
  });

  it('hides the ticking countdown from screen readers until it ends', () => {
    const { rerender } = render(<CooldownNotice seconds={42} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('You asked for a code a moment ago. You can ask again in 0:42.');
    expect(within(alert).getByText('You can ask again in 0:42.')).toHaveAttribute('aria-hidden', 'true');
    rerender(<CooldownNotice seconds={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('You can ask for a new code now.');
  });

  it('AuthMessage uses alert for errors and status otherwise', () => {
    render(
      <>
        <AuthMessage tone="error">That email and password don&apos;t match.</AuthMessage>
        <AuthMessage tone="status">Checking your sign-in…</AuthMessage>
      </>
    );
    expect(screen.getByRole('alert')).toHaveTextContent("That email and password don't match.");
    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in…');
  });
});

describe('AuthPending', () => {
  it('shows quiet blocks and one polite status line', () => {
    render(<AuthPending text="Checking your sign-in…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in…');
  });
});

describe('HandoffNote', () => {
  it('renders nothing without a calculator handoff', () => {
    render(<HandoffNote flow="login" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('counts the courses and says they are kept in this tab', async () => {
    saveCalculatorHandoff({ mode: 'grade', courses: [{ code: 'CSC 101', units: 3, grade: 'A' }, { code: 'MTH 101', units: 2, grade: 'B' }] });
    render(<HandoffNote flow="register" />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your 2 calculator courses are kept in this browser tab. After you finish, add them as your first semester from Results.'
    );
  });
});

describe('StepFrame', () => {
  it('moves focus to the new step heading when asked', () => {
    render(
      <StepFrame heading="Where you study" sentence="Pick from the list." focusOnMount>
        <StepActions onBack={() => undefined}>
          <button type="button">Continue</button>
        </StepActions>
      </StepFrame>
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Where you study' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('can be a named form so Enter submits the step', () => {
    render(<StepFrame heading="Your email" formLabel="Request a verification code"><input aria-label="Email" /></StepFrame>);
    expect(screen.getByRole('form', { name: 'Request a verification code' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your email' })).not.toHaveFocus();
  });
});

describe('Auth form controls', () => {
  it('TextField labels above, links error and hint, and marks the field invalid', () => {
    render(<TextField label="Email" type="email" hint="We send the code here" error="Enter your email" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter your email We send the code here');
  });

  it('TextField passes a ref through (react-hook-form register)', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<TextField label="Name" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('PasswordField toggles Show and Hide without submitting', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordField label="Password" autoComplete="current-password" />
      </form>
    );
    const input = screen.getByLabelText('Password', { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveTextContent('Hide');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('AuthButton stays focusable but swallows clicks while disabled or busy', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<AuthButton disabled onClick={onClick}>Sign in</AuthButton>);
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    rerender(<AuthButton busy onClick={onClick}>Sign in</AuthButton>);
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<AuthButton onClick={onClick}>Sign in</AuthButton>);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('GoogleButton shows its busy label and swallows clicks', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<GoogleButton onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<GoogleButton onClick={onClick} busy />);
    await userEvent.click(screen.getByRole('button', { name: 'Opening Google…' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('CodeField keeps six digits from a pasted line and checks once at the sixth', () => {
    expect(normaliseCode('Your code is 482 913.')).toBe('482913');
    expect(normaliseCode('12345678')).toBe('123456');
    const onComplete = vi.fn();
    render(<CodeField onComplete={onComplete} />);
    const input = screen.getByRole('textbox', { name: 'Verification code' });
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    fireEvent.paste(input, { clipboardData: { getData: () => 'Code: 482 913' } });
    expect(input).toHaveValue('482913');
    expect(onComplete).toHaveBeenCalledWith('482913');
    fireEvent.change(input, { target: { value: '482913' } });
    expect(onComplete).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: '48291' } });
    fireEvent.change(input, { target: { value: '482917' } });
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('ChoicePills are a labelled radiogroup of native radios with accessible names', async () => {
    const onChange = vi.fn();
    render(
      <ChoicePills
        name="spill"
        label="Extra semesters"
        value="0"
        onChange={onChange}
        options={[
          { value: '0', label: '0', accessibleName: 'No extra semesters' },
          { value: '1', label: '1', accessibleName: '1 extra semester' },
        ]}
      />
    );
    expect(screen.getByRole('radiogroup', { name: 'Extra semesters' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'No extra semesters' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '1 extra semester' }));
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('ChoiceCards are a radiogroup of titled cards', async () => {
    const onChange = vi.fn();
    render(
      <ChoiceCards
        name="setup"
        label="How to start your record"
        value={null}
        onChange={onChange}
        options={[
          { value: 'scratch', title: 'Start with this semester', line: 'Add results as they come out.' },
          { value: 'complete', title: 'Add my past semesters now', line: 'Enter earlier results.' },
        ]}
      />
    );
    expect(screen.getByRole('radiogroup', { name: 'How to start your record' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Add my past semesters now/ }));
    expect(onChange).toHaveBeenCalledWith('complete');
  });

  it('NumberStepper clamps whole numbers and steps with keys kept out of the tab order', async () => {
    expect(clampWhole(7, 1, 6)).toBe(6);
    expect(clampWhole(0, 1, 6)).toBe(1);
    expect(clampWhole(2.6, 1, 6)).toBe(3);
    expect(clampWhole(Number.NaN, 1, 6)).toBe(1);
    const onChange = vi.fn();
    const { container } = render(<NumberStepper label="Length of your programme" unit="years" min={1} max={10} value={4} onChange={onChange} hint="4 for most degrees" />);
    const input = screen.getByRole('spinbutton', { name: 'Length of your programme' });
    expect(input).toHaveValue(4);
    expect(input).toHaveAccessibleDescription('4 for most degrees');
    const keys = container.querySelectorAll('button[aria-hidden="true"]');
    expect(keys).toHaveLength(2);
    expect(keys[1]).toHaveAttribute('tabindex', '-1');
    await userEvent.click(keys[1]);
    expect(onChange).toHaveBeenLastCalledWith(5);
    fireEvent.change(input, { target: { value: '42' } });
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(screen.getByText('years')).toBeInTheDocument();
  });

  it('FilledSoFar lists finished steps and renders nothing when empty', () => {
    const { container, rerender } = render(<FilledSoFar lines={[{ label: 'Email', value: 'ada@example.org' }]} />);
    expect(screen.getByRole('region', { name: 'Filled in so far' })).toHaveTextContent('ada@example.org');
    rerender(<FilledSoFar lines={[]} />);
    expect(container.textContent).toBe('');
  });
});

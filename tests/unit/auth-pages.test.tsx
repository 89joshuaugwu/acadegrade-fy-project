import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  getDocument: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, uid: null, loading: false, error: null }),
}));

vi.mock('@/lib/firebase/auth', () => ({
  signInWithEmail: mocks.signInWithEmail,
  signInWithGoogle: mocks.signInWithGoogle,
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@/components/ui/MobileAppDownload', () => ({
  MobileAppDownload: () => <p>Mobile app available</p>,
}));

import LoginPage from '@/app/(public)/login/page';
import ForgotPasswordPage from '@/app/(public)/forgot-password/page';
import RegisterPage from '@/app/(public)/register/page';

function renderPage(ui: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      {ui}
    </ThemeProvider>
  );
}

describe('LoginPage presentation and behavior', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.push.mockReset();
    mocks.signInWithEmail.mockReset();
    mocks.signInWithGoogle.mockReset();
    mocks.getDocument.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.getDocument.mockResolvedValue(null);
  });

  it('uses the shared accessible auth presentation around the existing sign-in choices', () => {
    renderPage(<LoginPage />);

    const main = screen.getByRole('main', { name: 'Welcome back' });
    expect(main.closest('.auth-expressive')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Know where you stand before the next result' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Choose colour theme' })).toBeInTheDocument();
    expect(within(main).getByRole('form', { name: 'Sign in with email' })).toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register');
  });

  it('normalizes credentials and routes a complete profile to the dashboard', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockResolvedValue({ user: { uid: 'student-1' } });
    mocks.getDocument.mockImplementation(async (path: string) => {
      if (path === 'config/settings') return null;
      return {
        fullName: 'Ada Student',
        email: 'ada@example.com',
        matric: 'ESUT/2022/001',
        university: 'ESUT Agbani',
        department: 'Computer Science',
        programme: 'Bachelor of Science',
        entrySession: '2022/2023',
        currentLevel: 400,
      };
    });

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), ' ADA@EXAMPLE.COM ');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mocks.signInWithEmail).toHaveBeenCalledWith('ada@example.com', 'correct-password');
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Welcome back!');
  });

  it('keeps incomplete authenticated accounts in profile completion', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockResolvedValue({ user: { uid: 'student-2' } });
    mocks.getDocument.mockResolvedValue(null);

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/register'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Finish setting up your profile to continue.');
  });

  it('keeps authentication failures inline and in the existing toast channel', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockRejectedValue(new Error('invalid credentials'));

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(mocks.toastError).toHaveBeenCalledWith('Invalid email or password');
    expect(mocks.replace).not.toHaveBeenCalledWith('/dashboard');
  });
});

describe('ForgotPasswordPage presentation and behavior', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.push.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    vi.unstubAllGlobals();
  });

  it('uses the shared shell and exposes the current recovery phase', () => {
    renderPage(<ForgotPasswordPage />);

    expect(screen.getByRole('main', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Recovery without losing your progress' })).toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Password recovery progress' });
    expect(within(progress).getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Request a verification code' })).toBeInTheDocument();
  });

  it('submits the email phase with Enter and preserves the reset OTP request contract', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    const email = screen.getByRole('textbox', { name: 'Email Address' });
    await user.type(email, 'student@example.com{Enter}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', type: 'reset' }),
    });
    expect(await screen.findByRole('form', { name: 'Verify your code' })).toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Verification code sent to your email!');
  });

  it('preserves verify and password-reset payloads across all recovery phases', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email Address' }), 'student@example.com{Enter}');

    const otp = await screen.findByRole('textbox', { name: 'Verification Code (OTP)' });
    await user.type(otp, '123456{Enter}');

    const newPassword = await screen.findByLabelText('New Password');
    await user.type(newPassword, 'new-password');
    await user.type(screen.getByLabelText('Confirm Password'), 'new-password{Enter}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', type: 'reset', code: '123456' }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        code: '123456',
        newPassword: 'new-password',
      }),
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Password reset');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Password reset successfully!');
  });
});

describe('RegisterPage presentation', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.push.mockReset();
    mocks.getDocument.mockReset();
    mocks.getDocument.mockResolvedValue(null);
    sessionStorage.clear();
  });

  it('uses the shared auth shell and exposes the current registration phase', async () => {
    renderPage(<RegisterPage />);

    expect(await screen.findByRole('main', { name: 'Create your academic record' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Create your academic record' }).closest('.auth-expressive')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Build a record you can trust' })).toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Registration progress' });
    expect(within(progress).getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Your Account' })).toBeInTheDocument();
  });
});

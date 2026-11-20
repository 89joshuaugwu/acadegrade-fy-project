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

import LoginPage from '@/app/(public)/login/page';
import ForgotPasswordPage from '@/app/(public)/forgot-password/page';
import RegisterPage from '@/app/(public)/register/page';
import { metadata as loginMetadata } from '@/app/(public)/login/layout';
import { metadata as registerMetadata } from '@/app/(public)/register/layout';
import { metadata as resetMetadata } from '@/app/(public)/forgot-password/layout';

function renderPage(ui: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      {ui}
    </ThemeProvider>
  );
}

function firebaseError(code: string) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

describe('auth page metadata', () => {
  it('titles each page and keeps it out of search', () => {
    expect(loginMetadata.title).toBe('Sign in');
    expect(registerMetadata.title).toBe('Create your account');
    expect(resetMetadata.title).toBe('Reset your password');
    for (const metadata of [loginMetadata, registerMetadata, resetMetadata]) {
      expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
      expect(typeof metadata.description).toBe('string');
    }
  });
});

describe('LoginPage presentation and behavior', () => {
  beforeEach(() => {
    mocks.getDocument.mockResolvedValue(null);
  });

  it('puts Google first, the email form below, and every way out on the page', () => {
    renderPage(<LoginPage />);

    const main = screen.getByRole('main', { name: 'Welcome back' });
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveTextContent('Signing in never changes your saved results.');
    expect(screen.getByRole('link', { name: 'AcadeGrade home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Back to site' })).toHaveAttribute('href', '/');
    expect(within(screen.getByRole('navigation', { name: 'Help and site links' })).getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(within(main).getByRole('form', { name: 'Sign in with email' })).toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('placeholder', 'you@example.com');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Get the Android app' })).toHaveAttribute('href', '/app');
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mocks.signInWithEmail).toHaveBeenCalledWith('ada@example.com', 'correct-password');
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Welcome back.');
  });

  it('returns a complete profile to a checked ?next= path, never off the site', async () => {
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
    window.history.replaceState(null, '', `/login?next=${encodeURIComponent('/settings#delete-account')}`);
    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/settings#delete-account'));
    window.history.replaceState(null, '', '/');
  });

  it('keeps incomplete authenticated accounts in profile completion', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockResolvedValue({ user: { uid: 'student-2' } });
    mocks.getDocument.mockResolvedValue(null);

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/register'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Finish setting up your account to continue.');
  });

  it('shows a wrong password inline with a reset link instead of a toast', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockRejectedValue(firebaseError('auth/invalid-credential'));

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("That email and password don't match. Check both, or reset your password.");
    expect(within(alert).getByRole('link', { name: 'reset your password' })).toHaveAttribute('href', '/forgot-password');
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalledWith('/dashboard');
  });

  it('says plainly when there are too many tries or no connection', async () => {
    const user = userEvent.setup();
    mocks.signInWithEmail.mockRejectedValueOnce(firebaseError('auth/too-many-requests'));

    renderPage(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many tries. Wait a few minutes, or reset your password.');

    mocks.signInWithEmail.mockRejectedValueOnce(firebaseError('auth/network-request-failed'));
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No connection. Check your data and try again.'));
  });

  it('validates the fields in words before calling Firebase', async () => {
    const user = userEvent.setup();
    renderPage(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(mocks.signInWithEmail).not.toHaveBeenCalled();
  });

  it('sends a closed Google popup to a neutral line', async () => {
    const user = userEvent.setup();
    mocks.signInWithGoogle.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    renderPage(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(screen.getByText('Google sign-in was closed before it finished.')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends visitors to maintenance with a checked return path', async () => {
    window.history.replaceState(null, '', '/login?from=calc');
    mocks.getDocument.mockImplementation(async (path: string) => (path === 'config/settings' ? { maintenanceMode: true } : null));
    renderPage(<LoginPage />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/maintenance?next=%2Flogin%3Ffrom%3Dcalc'));
    window.history.replaceState(null, '', '/');
  });
});

describe('ForgotPasswordPage presentation and behavior', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the auth shell and exposes the current recovery phase of three', () => {
    renderPage(<ForgotPasswordPage />);

    expect(screen.getByRole('main', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Password recovery progress' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(3);
    expect(within(progress).getAllByRole('listitem')[0]).toHaveTextContent('Your email, current step');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Request a verification code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('submits the email phase with Enter and preserves the reset OTP request contract', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com{Enter}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', type: 'reset' }),
    });
    expect(await screen.findByRole('form', { name: 'Verify your code' })).toBeInTheDocument();
    // The same answer for every email: the page never says whether the account exists.
    expect(screen.getByText(/If that email has an account, we've sent a 6-digit code to/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Check your email' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Send a new code in 1:00' })).toBeDisabled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('checks the email before sending anything', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'not-an-email{Enter}');
    expect(await screen.findByText('Enter a valid email address, like you@example.com')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves verify and password-reset payloads, checking a pasted code on its own', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com{Enter}');

    const otp = await screen.findByRole('textbox', { name: 'Verification code' });
    await user.click(otp);
    await user.paste('Your AcadeGrade code is 123 456.');

    const newPassword = await screen.findByLabelText('New password');
    expect(screen.getByText('Code accepted. Use at least 8 characters. You have 15 minutes to save it.')).toBeInTheDocument();
    await user.type(newPassword, 'new-password');
    await user.type(screen.getByLabelText('Type it again'), 'new-password{Enter}');

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
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed');
    expect(screen.getByRole('link', { name: 'Sign in now' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Remember it?')).not.toBeInTheDocument();
  });

  it('keeps a wrong code on screen and never resends it automatically', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Invalid OTP' }) });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com{Enter}');
    const otp = await screen.findByRole('textbox', { name: 'Verification code' });
    await user.type(otp, '111111');

    expect(await screen.findByRole('alert')).toHaveTextContent("That code isn't right. Check the latest email from AcadeGrade.");
    expect(otp).toHaveValue('111111');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('offers Start again when the reset session has expired, keeping the email', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Reset session expired. Please request a new code.' }) });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ForgotPasswordPage />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'student@example.com{Enter}');
    await user.type(await screen.findByRole('textbox', { name: 'Verification code' }), '123456');
    await user.type(await screen.findByLabelText('New password'), 'new-password');
    await user.type(screen.getByLabelText('Type it again'), 'new-password{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This reset took longer than 15 minutes. Start again to get a new code.');
    await user.click(within(alert).getByRole('button', { name: 'Start again' }));
    expect(await screen.findByRole('textbox', { name: 'Email' })).toHaveValue('student@example.com');
  });
});

describe('RegisterPage presentation', () => {
  beforeEach(() => {
    mocks.getDocument.mockResolvedValue(null);
    sessionStorage.clear();
  });

  it('uses the auth shell and exposes the current registration phase', async () => {
    renderPage(<RegisterPage />);

    const main = await screen.findByRole('main', { name: 'Create your free record' });
    expect(main).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Registration progress' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(4);
    expect(within(progress).getAllByRole('listitem')[0]).toHaveTextContent('Your account, current step');
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Your answers stay in this tab until you finish. Passwords are never stored.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('drops the developer placeholder and uses sentence case labels', async () => {
    renderPage(<RegisterPage />);
    const name = await screen.findByRole('textbox', { name: 'Full name' });
    expect(name).not.toHaveAttribute('placeholder');
    expect(screen.queryByPlaceholderText('joshuazaza')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Matric number' })).toHaveAttribute('placeholder', 'e.g. 2021/243567');
    expect(screen.getByLabelText('Type the password again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email me a code' })).toBeInTheDocument();
  });

  it('sends a code, verifies a pasted line without a tap, and moves to Where you study', async () => {
    const user = userEvent.setup();
    // Answer by URL: the academic catalogue loader fetches too.
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => (url === '/api/auth/otp/verify' ? { verificationToken: 'ticket' } : {}),
    }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<RegisterPage />);
    await user.type(await screen.findByRole('textbox', { name: 'Full name' }), 'Ada Obi');
    await user.type(screen.getByRole('textbox', { name: 'Matric number' }), '2021/243567');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-password');
    await user.type(screen.getByLabelText('Type the password again'), 'long-password');
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/send', expect.objectContaining({
      body: JSON.stringify({ email: 'ada@example.com', type: 'registration' }),
    })));
    await user.click(await screen.findByRole('textbox', { name: 'Verification code' }));
    await user.paste('Your code is 482 913');

    expect(await screen.findByRole('heading', { level: 2, name: 'Where you study' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/verify', expect.objectContaining({
      body: JSON.stringify({ email: 'ada@example.com', type: 'registration', code: '482913' }),
    }));
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Registration progress' })).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/^Email checked\./)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'University' })).toHaveValue('');
    expect(screen.getByRole('region', { name: 'Filled in so far' })).toHaveTextContent('Ada Obi, 2021/243567, ada@example.com');
    vi.unstubAllGlobals();
  });

  it('shows the paused screen when sign-ups are switched off', async () => {
    mocks.getDocument.mockImplementation(async (path: string) => (path === 'config/settings' ? { disableSignups: true } : null));
    renderPage(<RegisterPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Registration is paused' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});

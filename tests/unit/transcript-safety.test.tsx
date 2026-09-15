import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TranscriptPage from '@/app/(student)/transcript/page';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  user: { uid: 'student-1', photoURL: null, getIdToken: vi.fn() },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      fullName: 'Ada Student',
      matric: 'AG/001',
      currentLevel: 300,
      department: 'Computer Science',
      programme: 'BSc Computer Science',
    },
  }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  queryCollection: mocks.queryCollection,
  deleteDocument: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@/components/cgpa/CGPAArc', () => ({
  CGPAArc: () => <div data-testid="cgpa-arc" />,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('Transcript safety states', () => {
  beforeEach(() => {
    mocks.queryCollection.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks the transcript preview and export actions when loading fails, then allows retry', async () => {
    const user = userEvent.setup();
    mocks.queryCollection
      .mockRejectedValueOnce(new Error('Firestore unavailable'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    render(<TranscriptPage />);

    const alert = await screen.findByRole('alert');
    expect(screen.getByRole('heading', { name: /couldn't load your transcript/i })).toBeInTheDocument();
    expect(alert).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.queryByText('STUDENT UNOFFICIAL TRANSCRIPT')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print html/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(mocks.queryCollection).toHaveBeenCalledTimes(3));
    expect(await screen.findByText(/no completed semesters yet/i)).toBeInTheDocument();
  });

  it('shows a truthful empty-record state instead of a zero-value transcript', async () => {
    mocks.queryCollection.mockResolvedValue([]);

    render(<TranscriptPage />);

    expect(await screen.findByText(/no completed semesters yet/i)).toBeInTheDocument();
    expect(screen.getByText(/complete a semester/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to results/i })).toHaveAttribute('href', '/results');
    expect(screen.queryByText('STUDENT UNOFFICIAL TRANSCRIPT')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it('keeps the transcript preview and export actions available after a successful load', async () => {
    mocks.queryCollection
      .mockResolvedValueOnce([{
        id: 'semester-1',
        label: 'Year 3 — First Semester',
        session: '2025/2026',
        level: 300,
        semester: 1,
        gpa: 4.2,
        pi: 4.1,
        creditLoaded: 18,
        isComplete: true,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    render(<TranscriptPage />);

    expect(await screen.findByText('STUDENT UNOFFICIAL TRANSCRIPT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print html/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });
});

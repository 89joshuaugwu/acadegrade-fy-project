import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SettingsPage from '@/app/(student)/settings/page';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      fullName: 'Ada Student',
      matric: 'AG/001',
      currentLevel: 300,
      department: 'Computer Science',
      programme: 'BSc Computer Science',
      notificationPreferences: {},
    },
  }),
}));

vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: () => false }),
}));

vi.mock('@/lib/firebase/client', () => ({
  auth: { currentUser: null },
}));

vi.mock('@/lib/firebase/firestore', () => ({
  updateDocument: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  updatePassword: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  GoogleAuthProvider: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('Student settings accessibility', () => {
  it('uses one semantic avatar upload button without nested interactive controls', () => {
    render(<SettingsPage />);

    const uploadButton = screen.getByRole('button', { name: /upload profile picture/i });
    expect(uploadButton).toHaveClass('h-24', 'w-24');
    expect(uploadButton.querySelector('button')).toBeNull();
    expect(uploadButton.querySelector('input')).toBeNull();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('provides 48px segmented controls with explicit selected state', () => {
    render(<SettingsPage />);

    const scratch = screen.getByRole('button', { name: 'Scratch' });
    const complete = screen.getByRole('button', { name: 'Complete' });
    const cgpa = screen.getByRole('button', { name: 'CGPA' });

    expect(scratch).toHaveClass('h-12');
    expect(complete).toHaveClass('h-12');
    expect(cgpa).toHaveClass('h-12');
    expect(scratch).toHaveAttribute('aria-pressed', 'true');
    expect(complete).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps mobile setting rows stacked and labels every notification switch', () => {
    render(<SettingsPage />);

    const recordModeGroup = screen.getByRole('group', { name: /record mode/i });
    expect(recordModeGroup.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    expect(recordModeGroup).toHaveClass('grid', 'grid-cols-2', 'sm:flex');

    const semesterSwitch = screen.getByRole('switch', { name: /semester saved successfully/i });
    expect(semesterSwitch).toHaveClass('h-12');
    expect(semesterSwitch.closest('[data-setting-row]')).toHaveClass('min-h-16');
  });
});

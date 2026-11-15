import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: nav.replace, push: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { ImportCodeLauncher } from '@/app/(student)/results/ImportCodeLauncher';
import { pickImportTarget } from '@/app/(student)/results/import-target';
import { rememberPendingImportCode } from '@/app/(public)/c/import-link';

const sem = (id: string, level: number, semester: number, isComplete: boolean) =>
  ({ id, level, semester, isComplete, label: id }) as any;

beforeEach(() => {
  nav.replace.mockReset();
  localStorage.clear();
  window.history.replaceState({}, '', '/results');
});

describe('pickImportTarget', () => {
  it('chooses the latest in-progress semester', () => {
    const list = [sem('a', 100, 1, true), sem('b', 200, 1, false), sem('c', 200, 2, false), sem('d', 300, 1, true)];
    expect(pickImportTarget(list)?.id).toBe('c');
  });

  it('returns null when every semester is complete or there are none', () => {
    expect(pickImportTarget([sem('a', 100, 1, true)])).toBeNull();
    expect(pickImportTarget([])).toBeNull();
  });
});

describe('ImportCodeLauncher', () => {
  it('opens the latest in-progress semester with the code from ?importCode=', async () => {
    window.history.replaceState({}, '', '/results?importCode=abc123');
    render(<ImportCodeLauncher semesters={[sem('a', 100, 1, true), sem('b', 100, 2, false)]} />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/results/b?importCode=ABC123'));
  });

  it('uses a code remembered before sign-in, once', async () => {
    rememberPendingImportCode('XYZ789');
    const { unmount } = render(<ImportCodeLauncher semesters={[sem('b', 100, 2, false)]} />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/results/b?importCode=XYZ789'));
    unmount();
    nav.replace.mockReset();
    render(<ImportCodeLauncher semesters={[sem('b', 100, 2, false)]} />);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('ignores malformed codes and does nothing without a code', () => {
    window.history.replaceState({}, '', '/results?importCode=bad');
    render(<ImportCodeLauncher semesters={[sem('b', 100, 2, false)]} />);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('explains instead of redirecting when no semester is in progress', async () => {
    window.history.replaceState({}, '', '/results?importCode=ABC123');
    const { findByRole } = render(<ImportCodeLauncher semesters={[sem('a', 100, 1, true)]} />);
    expect(await findByRole('status')).toHaveTextContent(/no semester in progress/i);
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

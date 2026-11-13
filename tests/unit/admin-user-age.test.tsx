import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'admin-1', email: 'admin@example.com', getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import AdminUsersPage from '@/app/(admin)/admin/users/page';

// Full-page renders are slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const student = {
  uid: 'student-1', fullName: 'Ada Obi', email: 'ada@example.com', matric: 'CSC/21/001', department: 'Computer Science',
  currentLevel: 300, cgpa: 4.2, pi: 4.1, semesterCount: 5, disabled: false, createdAt: '2026-01-01T00:00:00.000Z',
};

function mockFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const body = String(input) === '/api/admin/users' && !init?.method ? { users: [student] } : { success: true, ageStatus: 'minor' };
    return { ok: true, status: 200, json: async () => body } as Response;
  });
}
const writes = (spy: ReturnType<typeof mockFetch>) => spy.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init!.body)));

describe('admin users: age correction', () => {
  it('corrects an age only with a chosen status, a reason and a confirmation', async () => {
    const spy = mockFetch();
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await user.click(await screen.findByRole('button', { name: /Ada Obi/ }, { timeout: 5000 }));
    await user.click(screen.getByRole('button', { name: 'Correct age…' }));
    const dialog = screen.getByRole('dialog', { name: 'Correct the age for Ada Obi' });
    const save = within(dialog).getByRole('button', { name: 'Save age correction' });
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: /under 18/i }));
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('textbox', { name: 'Reason' }));
    await user.paste('Parent emailed support');
    expect(save).toBeEnabled();
    expect(writes(spy)).toHaveLength(0);
    await user.click(save);
    await waitFor(() => expect(writes(spy)).toEqual([{ action: 'set-age', uid: 'student-1', ageStatus: 'minor', reason: 'Parent emailed support' }]));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('explains what each choice does to AI access', async () => {
    mockFetch();
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await user.click(await screen.findByRole('button', { name: /Ada Obi/ }, { timeout: 5000 }));
    await user.click(screen.getByRole('button', { name: 'Correct age…' }));
    const dialog = screen.getByRole('dialog', { name: 'Correct the age for Ada Obi' });
    expect(dialog).toHaveTextContent(/Under 18.*AI and result scanning are blocked/);
    expect(within(dialog).getByRole('radio', { name: /adult/i })).toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { UserDetailDrawer } from '@/components/admin/users/UserDetailDrawer';

vi.setConfig({ testTimeout: 20_000 });

const DETAIL = {
  profile: {
    uid: 'stu', fullName: 'Ada Obi', email: 'ada@example.com', matric: 'CSC/1', university: 'Uni', department: 'CSC', programme: 'BSc',
    currentLevel: 300, createdAt: '2026-01-01T00:00:00.000Z', lastActiveAt: null, disabled: false,
    ageStatus: 'adult', aiConsent: true, marketingConsent: null, gradingScale: 'Polytechnic 4-point (NBTE)',
  },
  academic: { semesterCount: 3, completedCount: 2 },
  devices: { count: 2 },
  usage: { features: [{ id: 'insights', label: 'Written Analysis', freeDailyLimit: 2, freeRemaining: 1 }], checkedAt: 0 },
  coins: { balance: 4, earnedToday: 2, ledger: [{ type: 'earn', amount: 2, at: '2026-11-13T10:00:00.000Z', balanceAfter: 4 }] },
};

let posts: Record<string, unknown>[] = [];
function mockFetch(postResponse: (body: Record<string, unknown>) => { ok: boolean; status?: number; body: unknown } = () => ({ ok: true, body: { success: true } })) {
  posts = [];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push(body);
      const result = postResponse(body);
      return { ok: result.ok, status: result.status ?? (result.ok ? 200 : 400), json: async () => result.body } as Response;
    }
    expect(String(input)).toBe('/api/admin/users/stu');
    return { ok: true, status: 200, json: async () => DETAIL } as Response;
  });
}

const renderDrawer = (onDeleted = vi.fn()) => {
  render(<UserDetailDrawer uid="stu" getToken={async () => 't'} onClose={vi.fn()} onDeleted={onDeleted} />);
  return onDeleted;
};

beforeEach(() => { posts = []; });

describe('UserDetailDrawer', () => {
  it.each([{ success: true }, null, { profile: null }, { profile: 'x' }])('shows the load error, not a crash, when the reply has no profile: %o', async (reply) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ ok: true, status: 200, json: async () => reply }) as Response);
    renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Student account' });
    await within(dialog).findByText('This account could not be loaded. Nothing was changed.');
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('shows the account without grades', async () => {
    mockFetch();
    renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Ada Obi' });
    await within(dialog).findByText('CSC/1');
    expect(dialog).toHaveTextContent('Never seen');
    expect(dialog).toHaveTextContent(/2 devices/);
    expect(dialog).toHaveTextContent(/Grades are hidden/);
    expect(dialog).toHaveTextContent('Grading scalePolytechnic 4-point (NBTE)');
    expect(dialog).not.toHaveTextContent(/CGPA \d/);
  });

  it('reveal needs a reason of at least 5 characters, then shows the grades', async () => {
    mockFetch(() => ({ ok: true, body: { semesters: [{ label: '100L First', gpa: 4.25, creditLoaded: 20, isComplete: true }], cgpa: 4.25 } }));
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Ada Obi' });
    await user.click(await within(dialog).findByRole('button', { name: 'Reveal grades…' }));
    const submit = within(dialog).getByRole('button', { name: 'Reveal grades' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'abc');
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'de support');
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(posts).toEqual([{ action: 'reveal-grades', uid: 'stu', reason: 'abcde support' }]));
    expect(await within(dialog).findByText('100L First')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('4.25');
  });

  it('grant asks for an amount of 1-10 and a reason, and shows server refusals', async () => {
    mockFetch(() => ({ ok: false, status: 409, body: { error: 'You can grant 100 coins a month; 0 left', code: 'CAP_REACHED' } }));
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Ada Obi' });
    await user.click(await within(dialog).findByRole('button', { name: 'Grant coins…' }));
    const submit = within(dialog).getByRole('button', { name: 'Grant coins' });
    const amount = within(dialog).getByRole('spinbutton', { name: /Coins/ });
    await user.clear(amount);
    await user.type(amount, '11');
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Outage on 12 Nov');
    expect(submit).toBeDisabled();
    await user.clear(amount);
    await user.type(amount, '3');
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(posts).toEqual([{ action: 'grant-coins', uid: 'stu', amount: 3, reason: 'Outage on 12 Nov' }]));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You can grant 100 coins a month; 0 left');
  });

  it('delete needs the email typed exactly', async () => {
    mockFetch();
    const user = userEvent.setup();
    const onDeleted = renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Ada Obi' });
    await user.click(await within(dialog).findByRole('button', { name: 'Delete account…' }));
    const submit = within(dialog).getByRole('button', { name: 'Delete account permanently' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: /Type the student's email/ }), 'ada@example.co');
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: /Type the student's email/ }), 'm');
    expect(submit).toBeEnabled();
    expect(posts).toEqual([]);
    await user.click(submit);
    await waitFor(() => expect(posts).toEqual([{ action: 'delete-account', uid: 'stu', confirmEmail: 'ada@example.com' }]));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('stu'));
  });

  it('sign out everywhere asks for confirmation first', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await screen.findByRole('dialog', { name: 'Ada Obi' });
    await user.click(await within(dialog).findByRole('button', { name: 'Sign out everywhere…' }));
    expect(posts).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out of every device' }));
    await waitFor(() => expect(posts).toEqual([{ action: 'sign-out-all', uid: 'stu' }]));
  });
});

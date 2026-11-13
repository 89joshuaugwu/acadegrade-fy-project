import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'admin-1', email: 'admin@example.com', getIdToken: async () => 'admin-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import AdminAuditPage from '@/app/(admin)/admin/audit/page';

type Reply = { status: number; body: unknown };
let replies: Array<(url: string) => Reply>;

function respond(reply: Reply) {
  return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
}

const fetchMock = () => vi.mocked(fetch);
const auditUrls = () => fetchMock().mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/admin/audit'));
const rowsOf = () => within(screen.getByRole('table', { name: 'Admin changes' })).getAllByRole('row').slice(1);

beforeEach(() => {
  replies = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const next = replies.shift();
    return respond(next ? next(url) : { status: 200, body: { entries: [] } });
  }));
});

/** The server's shape (docs/server-compliance-contracts.md, section 8). */
const first = {
  entries: [
    {
      id: 'a1', actorUid: 'u1', actorEmail: 'ops@acadegrade.com', action: 'settings.update', target: 'config/settings',
      summary: 'Maintenance mode turned on', before: { maintenanceMode: false, disableSignups: false }, after: { maintenanceMode: true, disableSignups: false },
      createdAt: '2026-11-13T14:02:00.000Z', createdAtMs: Date.parse('2026-11-13T14:02:00.000Z'),
    },
    {
      id: 'a2', actorUid: 'u2', actorEmail: 'lead@acadegrade.com', action: 'ai.set-secret-state', target: '_ai_secrets/groq-primary',
      summary: 'Key disabled', before: null, after: null,
      createdAt: { _seconds: Date.parse('2026-11-13T13:00:00.000Z') / 1000, _nanoseconds: 0 }, createdAtMs: Date.parse('2026-11-13T13:00:00.000Z'),
    },
  ],
  nextCursor: Date.parse('2026-11-13T13:00:00.000Z'),
};

describe('Admin audit log page', () => {
  it('reads the newest page of entries with the admin token and shows each change', async () => {
    replies.push(() => ({ status: 200, body: first }));
    render(<AdminAuditPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Audit log' })).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Admin changes' });
    const rows = rowsOf();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('ops@acadegrade.com');
    expect(rows[0]).toHaveTextContent('settings.update');
    expect(rows[0]).toHaveTextContent('config/settings');
    expect(rows[0]).toHaveTextContent('Maintenance mode turned on');
    expect(within(rows[0]).getByText(/13 Nov 2026/).closest('time')).toHaveAttribute('dateTime', '2026-11-13T14:02:00.000Z');
    expect(within(rows[1]).getByText(/13 Nov 2026/).closest('time')).toHaveAttribute('dateTime', '2026-11-13T13:00:00.000Z');
    expect(auditUrls()).toEqual(['/api/admin/audit?limit=50']);
    expect(fetchMock().mock.calls[0][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }));
    expect(fetchMock().mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
  });

  it('shows only the changed keys, before and after, in a collapsed section', async () => {
    replies.push(() => ({ status: 200, body: first }));
    render(<AdminAuditPage />);
    await screen.findByRole('table', { name: 'Admin changes' });
    const [changed, plain] = rowsOf();
    const disclosure = within(changed).getByText('1 change').closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    expect(disclosure).toHaveTextContent('maintenanceMode: false → true');
    expect(disclosure).not.toHaveTextContent('disableSignups');
    expect(within(plain).queryByText(/change/)).not.toBeInTheDocument();
  });

  it('reads a timestamp object when the entry has no millisecond time', async () => {
    replies.push(() => ({ status: 200, body: { entries: [
      { id: 'b1', actorEmail: 'lead@acadegrade.com', action: 'users.disable', target: 'users/student-1', createdAt: { _seconds: 1763042520, _nanoseconds: 0 } },
    ] } }));
    render(<AdminAuditPage />);
    await screen.findByRole('table', { name: 'Admin changes' });
    expect(rowsOf()[0].querySelector('time')).toHaveAttribute('dateTime', new Date(1763042520 * 1000).toISOString());
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('loads older entries with the cursor and keeps the ones already shown', async () => {
    replies.push(() => ({ status: 200, body: first }));
    replies.push(() => ({ status: 200, body: { entries: [{ id: 'a3', actorEmail: 'ops@acadegrade.com', action: 'usage.update', target: 'config/usage', summary: 'Coins on', createdAtMs: Date.parse('2026-11-12T09:00:00.000Z') }], nextCursor: null } }));
    const user = userEvent.setup();
    render(<AdminAuditPage />);
    await user.click(await screen.findByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(3));
    expect(auditUrls()[1]).toBe(`/api/admin/audit?limit=50&cursor=${first.nextCursor}`);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('filters by action on the server and starts again from the newest page', async () => {
    replies.push(() => ({ status: 200, body: first }));
    replies.push(() => ({ status: 200, body: { entries: [] } }));
    const user = userEvent.setup();
    render(<AdminAuditPage />);
    await screen.findByRole('table', { name: 'Admin changes' });
    await user.type(screen.getByRole('textbox', { name: 'Action' }), 'settings.update');
    expect(auditUrls()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(auditUrls()).toHaveLength(2));
    expect(auditUrls()[1]).toBe('/api/admin/audit?limit=50&action=settings.update');
    expect(await screen.findByText('No entries match these filters.')).toBeInTheDocument();
  });

  it('filters by admin among the loaded entries without asking the server', async () => {
    replies.push(() => ({ status: 200, body: first }));
    const user = userEvent.setup();
    render(<AdminAuditPage />);
    await screen.findByRole('table', { name: 'Admin changes' });
    expect(screen.getByText('Matches the entries already loaded.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Admin' }), 'LEAD@');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(1));
    expect(rowsOf()[0]).toHaveTextContent('lead@acadegrade.com');
    expect(auditUrls()).toHaveLength(1);
    expect(auditUrls().some((url) => url.includes('actor='))).toBe(false);
    expect(screen.getByText(/1 of 2 loaded entries shown/)).toBeInTheDocument();
  });

  it('explains the missing database index when an action filter fails', async () => {
    replies.push(() => ({ status: 200, body: first }));
    replies.push(() => ({ status: 500, body: { error: 'FAILED_PRECONDITION' } }));
    const user = userEvent.setup();
    render(<AdminAuditPage />);
    await screen.findByRole('table', { name: 'Admin changes' });
    await user.type(screen.getByRole('textbox', { name: 'Action' }), 'users.disable');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Filtering by action needs a database index. Ask the developer to create it (the server logs a link).');
  });

  it('says the log is not available yet when the endpoint does not exist', async () => {
    replies.push(() => ({ status: 404, body: { error: 'Not found' } }));
    render(<AdminAuditPage />);
    expect(await screen.findByText("The audit log isn't available yet. It will appear here once the server records admin changes.")).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Action' })).not.toBeInTheDocument();
  });

  it('offers a retry when the log fails to load', async () => {
    replies.push(() => ({ status: 500, body: { error: 'Boom' } }));
    replies.push(() => ({ status: 200, body: first }));
    const user = userEvent.setup();
    render(<AdminAuditPage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/audit log could not be loaded/i);
    expect(alert).not.toHaveTextContent(/database index/);
    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('table', { name: 'Admin changes' })).toBeInTheDocument();
  });

  it('shows an honest empty state when nothing has been recorded', async () => {
    render(<AdminAuditPage />);
    expect(await screen.findByText('No admin changes have been recorded yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

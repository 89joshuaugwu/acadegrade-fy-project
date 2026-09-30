import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import AcademicCatalogPage from '@/app/(admin)/admin/academic-catalog/page';

const initial = { revision: 1, entries: [
  { id: 'uni-1', kind: 'university', name: 'University of Lagos', status: 'active', source: 'default' },
  { id: 'dept-1', kind: 'department', name: 'Computer Science', status: 'active', source: 'admin' },
  { id: 'prog-1', kind: 'programme', name: 'Software Engineering', status: 'archived', source: 'admin' },
] };

beforeEach(() => { vi.restoreAllMocks(); });

describe('AcademicCatalogPage', () => {
  it('loads pending suggestions with bearer auth and shows an empty queue', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => ({
      ok: true,
      json: async () => String(url).endsWith('/suggestions') ? { suggestions: [] } : initial,
    } as Response));
    render(<AcademicCatalogPage />);
    expect(await screen.findByText(/no pending suggestions/i)).toBeInTheDocument();
    expect(screen.queryByText(/planned for a later update/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/academic-catalog/suggestions', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('approves a suggestion and refreshes the catalog snapshot', async () => {
    const suggestion = { id: 'suggestion-1', kind: 'department', name: 'Mathematics', status: 'pending', uid: 'student-1', createdAt: '2026-09-30T10:00:00.000Z' };
    const refreshed = { revision: 2, entries: [...initial.entries, { id: 'dept-2', kind: 'department', name: 'Mathematics', status: 'active', source: 'admin' }] };
    let catalogGets = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).endsWith('/suggestions')) return { ok: true, json: async () => options?.method === 'PATCH' ? { status: 'approved' } : { suggestions: [suggestion] } } as Response;
      catalogGets += 1;
      return { ok: true, json: async () => catalogGets === 1 ? initial : refreshed } as Response;
    });
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve Mathematics/i }));
    await waitFor(() => expect(screen.queryByText('Mathematics')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/academic-catalog/suggestions', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ id: 'suggestion-1', action: 'approve' }) }));
    expect(catalogGets).toBe(2);
    await user.click(screen.getByRole('tab', { name: /departments/i }));
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
  });

  it('rejects a suggestion without refreshing the catalog', async () => {
    const suggestion = { id: 'suggestion-2', kind: 'programme', name: 'Chemistry', status: 'pending', uid: 'student-2', createdAt: '2026-09-30T10:00:00.000Z' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => ({
      ok: true,
      json: async () => String(url).endsWith('/suggestions') ? options?.method === 'PATCH' ? { status: 'rejected' } : { suggestions: [suggestion] } : initial,
    } as Response));
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    expect(await screen.findByText('Chemistry')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reject Chemistry/i }));
    await waitFor(() => expect(screen.queryByText('Chemistry')).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/admin/academic-catalog')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/academic-catalog/suggestions', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ id: 'suggestion-2', action: 'reject' }) }));
  });

  it('shows a retryable suggestions error and keeps the catalog available', async () => {
    let suggestionsGets = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
      if (String(url).endsWith('/suggestions')) {
        suggestionsGets += 1;
        return suggestionsGets === 1 ? { ok: false, json: async () => ({ error: 'Queue unavailable' }) } as Response : { ok: true, json: async () => ({ suggestions: [] }) } as Response;
      }
      return { ok: true, json: async () => initial } as Response;
    });
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Queue unavailable');
    expect(screen.getByText('University of Lagos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry suggestions/i }));
    expect(await screen.findByText(/no pending suggestions/i)).toBeInTheDocument();
  });
  it('loads with bearer auth and filters by kind, status, and search', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => initial } as Response);
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    expect(await screen.findByText('University of Lagos')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/academic-catalog', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
    await user.click(screen.getByRole('tab', { name: /Departments/i }));
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.queryByText('University of Lagos')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'absent');
    expect(screen.getByText(/no matching/i)).toBeInTheDocument();
  });

  it('adds an entry and uses the PATCH snapshot', async () => {
    const updated = { revision: 2, entries: [...initial.entries, { id: 'uni-2', kind: 'university', name: 'Bayero University', status: 'active', source: 'admin' }] };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => ({ ok: true, json: async () => String(url).endsWith('/suggestions') ? { suggestions: [] } : options?.method === 'PATCH' ? updated : initial } as Response));
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    await screen.findByText('University of Lagos');
    await user.click(screen.getByRole('button', { name: /add university/i }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Bayero University');
    await user.click(screen.getByRole('button', { name: 'Save university' }));
    expect(await screen.findByText('Bayero University')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/academic-catalog', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'add', kind: 'university', name: 'Bayero University' }) }));
  });

  it('edits, archives, and restores entries', async () => {
    const renamed = { revision: 2, entries: initial.entries.map(entry => entry.id === 'uni-1' ? { ...entry, name: 'Lagos University' } : entry) };
    const archived = { revision: 3, entries: renamed.entries.map(entry => entry.id === 'uni-1' ? { ...entry, status: 'archived' } : entry) };
    const restored = { revision: 4, entries: renamed.entries };
    const snapshots = [initial, renamed, archived, restored];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => ({ ok: true, json: async () => String(url).endsWith('/suggestions') ? { suggestions: [] } : snapshots.shift() } as Response));
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    const row = await screen.findByText('University of Lagos');
    await user.click(within(row.closest('li')!).getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Lagos University');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const renamedRow = (await screen.findByText('Lagos University')).closest('li')!;
    await user.click(within(renamedRow).getByRole('button', { name: /archive/i }));
    await user.click(screen.getByRole('button', { name: 'Archive entry' }));
    await waitFor(() => expect(screen.queryByText('Lagos University')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /archived/i }));
    await user.click(within(screen.getByText('Lagos University').closest('li')!).getByRole('button', { name: /restore/i }));
    await waitFor(() => expect(screen.queryByText('Lagos University')).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url, options]) => url === '/api/admin/academic-catalog' && (options as RequestInit)?.method === 'PATCH').map(([, options]) => JSON.parse((options as RequestInit).body as string))).toEqual([
      { action: 'edit', id: 'uni-1', name: 'Lagos University' },
      { action: 'archive', id: 'uni-1' },
      { action: 'restore', id: 'uni-1' },
    ]);
  });

  it('shows a retryable loading error', async () => {
    let catalogGets = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
      if (String(url).endsWith('/suggestions')) return { ok: true, json: async () => ({ suggestions: [] }) } as Response;
      catalogGets += 1;
      return catalogGets === 1 ? { ok: false, json: async () => ({ error: 'Unavailable' }) } as Response : { ok: true, json: async () => initial } as Response;
    });
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('University of Lagos')).toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import AcademicCatalogPage from '@/app/(admin)/admin/academic-catalog/page';

vi.setConfig({ testTimeout: 20_000 });

const ESUT = 'Enugu State University of Science and Technology, Enugu';
const catalog = { revision: 3, entries: [
  { id: 'u-esut', kind: 'university', name: ESUT, status: 'active', source: 'default', aliases: ['ESUT'] },
  { id: 'u-lag', kind: 'university', name: 'University of Lagos, Lagos', status: 'active', source: 'default' },
  { id: 'd-cs', kind: 'department', name: 'Computer Science', status: 'active', source: 'default' },
  { id: 'p-bsc', kind: 'programme', name: 'Bachelor of Science (B.Sc.)', status: 'active', source: 'default' },
] };
const suggestion = { id: 'sug-1', kind: 'university', name: 'ESUT Agbani', status: 'pending', uid: 'student-1', suggestedBy: 'Chidi O.', createdAt: '2026-11-20T10:00:00.000Z' };
const typed = { rows: [
  { kind: 'university', name: 'ESUT Agbani', normalizedName: 'esut agbani', count: 13 },
  { kind: 'programme', name: 'B.Sc Computer Science', normalizedName: 'b.sc computer science', count: 2 },
], scanned: 40, truncated: false, generatedAt: '2026-11-22T10:00:00.000Z' };

function route() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = url.startsWith('/api/admin/academic-catalog/typed-names?') ? { students: [{ uid: 'student-1', displayName: 'Chidi O.' }], total: 13 }
      : url.endsWith('/typed-names') ? (method === 'GET' ? typed : { status: 'ignored' })
      : url.endsWith('/suggestions') ? { suggestions: [suggestion] }
      : url.endsWith('/assign') ? { assignmentId: 'as-1', entryName: ESUT, departmentName: null, changedCount: 13, aliasAdded: true, aliasNote: null, truncated: false }
      : url.endsWith('/assign/undo') ? { assignmentId: 'as-1', restoredCount: 13, keptCount: 0, aliasRemoved: true }
      : catalog;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
}
const posts = (spy: ReturnType<typeof route>, path: string) => spy.mock.calls
  .filter(([url, init]) => String(url) === path && init?.method && init.method !== 'GET')
  .map(([, init]) => JSON.parse(String(init!.body)));

beforeEach(() => { vi.restoreAllMocks(); });

describe('AcademicCatalogPage: Assign', () => {
  it('names the student and links to their admin drawer', async () => {
    route();
    render(<AcademicCatalogPage />);
    const queue = await screen.findByRole('list', { name: 'Pending suggestions' });
    expect(within(queue).getByRole('link', { name: 'Chidi O.' })).toHaveAttribute('href', '/admin/users?uid=student-1');
    expect(within(queue).queryByText(/student-1/)).not.toBeInTheDocument();
  });

  it('assigns a suggestion to a picked entry, updating everyone by default, then undoes it', async () => {
    const spy = route();
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    const queue = await screen.findByRole('list', { name: 'Pending suggestions' });
    await user.click(within(queue).getByRole('button', { name: 'Assign ESUT Agbani' }));
    const panel = screen.getByRole('group', { name: 'Assign “ESUT Agbani”' });
    expect(within(panel).getByRole('checkbox', { name: /also update every other student who typed this name/i })).toBeChecked();
    const save = within(panel).getByRole('button', { name: 'Assign' });
    expect(save).toBeDisabled();
    await user.type(within(panel).getByRole('combobox', { name: 'University in the catalogue' }), 'esut');
    await user.click(within(panel).getByRole('option', { name: new RegExp(ESUT) }));
    await user.click(save);
    await waitFor(() => expect(posts(spy, '/api/admin/academic-catalog/assign')).toEqual([{ suggestionId: 'sug-1', entryId: 'u-esut', updateAll: true }]));
    const done = await screen.findByRole('status', { name: 'Assigned' });
    expect(done).toHaveTextContent(`“ESUT Agbani” now points to ${ESUT}. 13 profiles updated.`);
    expect(within(queue).queryByText('ESUT Agbani')).not.toBeInTheDocument();
    await user.click(within(done).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(posts(spy, '/api/admin/academic-catalog/assign/undo')).toEqual([{ assignmentId: 'as-1' }]));
    expect(await screen.findByText(/13 profiles put back/)).toBeInTheDocument();
  });
});

describe('AcademicCatalogPage: names typed by students', () => {
  it('lists typed names with counts and pre-fills a programme split', async () => {
    const spy = route();
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    const table = await screen.findByRole('table', { name: 'Names typed by students' });
    const row = within(table).getByRole('row', { name: /B\.Sc Computer Science/ });
    expect(row).toHaveTextContent('2');
    await user.click(within(row).getByRole('button', { name: 'Assign B.Sc Computer Science' }));
    const panel = screen.getByRole('group', { name: 'Assign “B.Sc Computer Science”' });
    expect(within(panel).getByRole('combobox', { name: 'Programme in the catalogue' })).toHaveValue('Bachelor of Science (B.Sc.)');
    expect(within(panel).getByRole('combobox', { name: 'Department (optional)' })).toHaveValue('Computer Science');
    await user.click(within(panel).getByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(posts(spy, '/api/admin/academic-catalog/assign')).toEqual([
      { kind: 'programme', name: 'B.Sc Computer Science', entryId: 'p-bsc', departmentEntryId: 'd-cs', updateAll: true },
    ]));
  });

  it('shows students on demand, ignores a name and adds one as a new entry', async () => {
    const spy = route();
    const user = userEvent.setup();
    render(<AcademicCatalogPage />);
    const table = await screen.findByRole('table', { name: 'Names typed by students' });
    const row = within(table).getByRole('row', { name: /ESUT Agbani/ });
    await user.click(within(row).getByRole('button', { name: 'Show students for ESUT Agbani' }));
    expect(await within(table).findByRole('link', { name: 'Chidi O.' })).toHaveAttribute('href', '/admin/users?uid=student-1');
    await user.click(within(row).getByRole('button', { name: 'Ignore ESUT Agbani' }));
    await waitFor(() => expect(posts(spy, '/api/admin/academic-catalog/typed-names')).toEqual([{ action: 'ignore', kind: 'university', name: 'ESUT Agbani' }]));
    const programmeRow = within(table).getByRole('row', { name: /B\.Sc Computer Science/ });
    await user.click(within(programmeRow).getByRole('button', { name: 'Add B.Sc Computer Science as a new entry' }));
    await waitFor(() => expect(posts(spy, '/api/admin/academic-catalog')).toEqual([{ action: 'add', kind: 'programme', name: 'B.Sc Computer Science' }]));
  });

  it('says so when no typed names are waiting', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => ({
      ok: true, status: 200,
      json: async () => String(input).endsWith('/typed-names') ? { rows: [], scanned: 12, truncated: false } : String(input).endsWith('/suggestions') ? { suggestions: [] } : catalog,
    } as Response));
    render(<AcademicCatalogPage />);
    expect(await screen.findByText('Every name on the 12 profiles checked is in the catalogue.')).toBeInTheDocument();
  });
});

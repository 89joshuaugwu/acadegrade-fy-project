import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PortalPastePanel } from '@/app/(student)/results/[semesterId]/PortalPastePanel';
import { mapPortalRow } from '@/app/(student)/results/[semesterId]/import-mapping';

const SAMPLE = 'CSC 201  Data Structures  3  68  B\nMTH 205  Numerical Methods  2\nnot a course line here 99';

describe('mapPortalRow', () => {
  it('uses the pasted letter grade and leaves CA and exam empty', () => {
    expect(mapPortalRow({ code: 'CSC 201', title: 'Data Structures', units: 3, caScore: null, examScore: null, grade: 'B' }))
      .toEqual({ code: 'CSC 201', title: 'Data Structures', units: 3, caScore: null, examScore: null, grade: 'B' });
  });

  it('works out a grade from a pasted total score and omits it when there is neither', () => {
    expect(mapPortalRow({ code: 'CSC 201', title: '', units: 3, caScore: null, examScore: null, totalScore: 72 }).grade).toBe('A');
    expect(mapPortalRow({ code: 'MTH 205', title: '', units: 2, caScore: null, examScore: null })).not.toHaveProperty('grade');
  });
});

describe('PortalPastePanel', () => {
  it('starts with nothing to add', () => {
    render(<PortalPastePanel onImport={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Add courses for review/ })).toBeDisabled();
  });

  it('previews parsed courses and unreadable lines, then hands rows to the import callback only on click', async () => {
    const onImport = vi.fn();
    render(<PortalPastePanel onImport={onImport} />);
    await userEvent.click(screen.getByLabelText(/Paste your results text/));
    await userEvent.paste(SAMPLE);
    expect(screen.getByRole('status')).toHaveTextContent(/2 courses found/);
    expect(screen.getByRole('status')).toHaveTextContent(/1 line could not be read/);
    expect(onImport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Add 2 courses for review/ }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const rows = onImport.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ code: 'CSC 201', units: 3, caScore: null, examScore: null, grade: 'B' });
  });

  it('says so when nothing can be read', async () => {
    render(<PortalPastePanel onImport={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/Paste your results text/));
    await userEvent.paste('hello world');
    expect(screen.getByRole('status')).toHaveTextContent(/No courses found yet/);
    expect(screen.getByRole('button', { name: /Add courses for review/ })).toBeDisabled();
  });
});

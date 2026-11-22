import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { GradingScaleSection } from '@/components/settings/GradingScaleSection';
import { GradingScaleProvider } from '@/hooks/useGradingScale';
import type { SwitchSemester } from '@/lib/cgpa/scaleSwitch';

const semesters: SwitchSemester[] = [
  {
    id: 's1',
    label: '100L First',
    courses: [
      { id: 'c1', code: 'CSC 101', title: 'Intro', units: 3, caScore: 25, examScore: 47, totalScore: 72, grade: 'A' },
      { id: 'c2', code: 'MTH 101', title: 'Maths', units: 3, caScore: null, examScore: null, totalScore: null, grade: 'E', estimated: true },
    ],
  },
];

function setup(setting: unknown = undefined) {
  const onApply = vi.fn().mockResolvedValue(undefined);
  const loadSemesters = vi.fn().mockResolvedValue(semesters);
  render(
    <GradingScaleProvider setting={setting}>
      <GradingScaleSection loadSemesters={loadSemesters} onApply={onApply} />
    </GradingScaleProvider>
  );
  return { onApply, loadSemesters };
}

describe('Settings: grading scale', () => {
  it('lists the ready-made scales with their bands and marks the one in use', () => {
    setup();
    const group = screen.getByRole('radiogroup', { name: 'Grading scale' });
    const options = within(group).getAllByRole('radio');
    expect(options.map((option) => option.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(within(options[2]).getByText('Polytechnic 4-point (NBTE)')).toBeInTheDocument();
    expect(within(options[2]).getByText(/AB 70\+/)).toBeInTheDocument();
    expect(within(options[2]).getByText(/Distinction 3\.50/)).toBeInTheDocument();
    expect(within(options[0]).getByText('In use')).toBeInTheDocument();
  });

  it('previews a switch and saves only after confirmation', async () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole('radio', { name: /Polytechnic 4-point/ }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(/3\.00/);
    expect(dialog).toHaveTextContent('Your CGPA would change from 3.00 to 2.75');
    expect(dialog).toHaveTextContent('Your class would change from Second Class Lower (2:2) to Lower Credit');
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Switch scale' }));
    });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual({ id: 'nbte4' });
    expect(onApply.mock.calls[0][1][0]).toMatchObject({ id: 's1', gpa: 2.75 });
  });

  it('lists courses whose letters are not on the new scale', async () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: /5-point \(no E\)/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent('MTH 101'));
    expect(dialog).toHaveTextContent('E is not on this scale');
  });

  it('lets the student switch back to the 5-point scale', async () => {
    const { onApply } = setup({ id: 'nbte4' });
    fireEvent.click(screen.getByRole('radio', { name: /5-point \(with E\)/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent('from 2.75 to 3.00'));
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Switch scale' }));
    });
    expect(onApply.mock.calls[0][0]).toEqual({ id: 'ng5' });
  });

  it('checks a custom scale inline before previewing it', async () => {
    const { onApply, loadSemesters } = setup();
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    const editor = screen.getByRole('group', { name: 'Custom scale' });
    fireEvent.change(within(editor).getByLabelText('Band 1 minimum score'), { target: { value: '' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Preview change' }));
    expect(await within(editor).findByText('Minimum scores must be between 0 and 100.')).toBeInTheDocument();
    expect(loadSemesters).not.toHaveBeenCalled();

    fireEvent.change(within(editor).getByLabelText('Band 1 minimum score'), { target: { value: '70' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Preview change' }));
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: 'Switch scale' }));
    });
    expect(onApply.mock.calls[0][0]).toMatchObject({ id: 'custom', custom: { maxPoint: 5 } });
  });

  it('edits NCE class boundaries with inline checks', async () => {
    setup({ id: 'nce5' });
    const editor = screen.getByRole('group', { name: 'NCE class boundaries' });
    fireEvent.change(within(editor).getByLabelText('Credit starts at'), { target: { value: '4.6' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Preview change' }));
    expect(await within(editor).findByText('Credit must start below Distinction.')).toBeInTheDocument();
  });
});

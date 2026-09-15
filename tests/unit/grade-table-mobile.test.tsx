import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GradeTable } from '@/components/cgpa/GradeTable';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

const course = {
  code: 'CSC 401',
  title: 'Software Engineering',
  units: 3,
  caScore: 24,
  examScore: 55,
} as const;

describe('GradeTable mobile editor', () => {
  it('provides a stacked mobile course editor with a programmatic label for every control', () => {
    render(<GradeTable editable initialCourses={[course]} />);

    const mobileEditor = screen.getByRole('region', { name: 'Mobile course editor' });

    expect(mobileEditor).toHaveClass('md:hidden');
    expect(within(mobileEditor).getByRole('group', { name: 'Course 1: CSC 401' })).toBeInTheDocument();
    expect(within(mobileEditor).getByRole('textbox', { name: 'Course 1 code' })).toHaveClass('min-h-11');
    expect(within(mobileEditor).getByRole('textbox', { name: 'Course 1 title' })).toHaveClass('min-h-11');
    expect(within(mobileEditor).getByRole('spinbutton', { name: 'Course 1 units' })).toHaveClass('min-h-11');
    expect(within(mobileEditor).getByRole('spinbutton', { name: 'Course 1 CA score out of 30' })).toHaveClass('min-h-11');
    expect(within(mobileEditor).getByRole('spinbutton', { name: 'Course 1 exam score out of 70' })).toHaveClass('min-h-11');
    expect(within(mobileEditor).getByRole('combobox', { name: 'Course 1 letter grade' })).toHaveClass('min-h-11');

    const removeButton = within(mobileEditor).getByRole('button', { name: 'Remove CSC 401' });
    expect(removeButton).toHaveClass('min-h-11', 'min-w-11');
    expect(removeButton).not.toHaveClass('opacity-0');
  });

  it('edits and removes courses through the mobile controls without changing the save contract', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<GradeTable editable initialCourses={[course]} onSave={onSave} />);

    const mobileEditor = screen.getByRole('region', { name: 'Mobile course editor' });
    const codeInput = within(mobileEditor).getByRole('textbox', { name: 'Course 1 code' });
    await user.clear(codeInput);
    await user.type(codeInput, 'mth 402');
    await user.clear(within(mobileEditor).getByRole('spinbutton', { name: 'Course 1 CA score out of 30' }));
    await user.type(within(mobileEditor).getByRole('spinbutton', { name: 'Course 1 CA score out of 30' }), '20');
    await user.click(screen.getByRole('button', { name: 'Save Semester' }));

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'MTH 402', title: 'Software Engineering', units: 3, caScore: 20, examScore: 55 }),
    ]);

    await user.click(within(mobileEditor).getByRole('button', { name: 'Remove MTH 402' }));
    await user.click(screen.getByRole('button', { name: 'Save Semester' }));
    expect(onSave).toHaveBeenLastCalledWith([]);
  });

  it('keeps the desktop table and gives its editable controls accessible names', () => {
    render(<GradeTable editable initialCourses={[course]} />);

    const desktopEditor = screen.getByRole('region', { name: 'Desktop course editor' });
    expect(desktopEditor).toHaveClass('hidden', 'md:block');
    expect(within(desktopEditor).getByRole('textbox', { name: 'Course 1 code' })).toBeInTheDocument();
    expect(within(desktopEditor).getByRole('textbox', { name: 'Course 1 title' })).toBeInTheDocument();
    expect(within(desktopEditor).getByRole('spinbutton', { name: 'Course 1 units' })).toBeInTheDocument();
    expect(within(desktopEditor).getByRole('spinbutton', { name: 'Course 1 CA score out of 30' })).toBeInTheDocument();
    expect(within(desktopEditor).getByRole('spinbutton', { name: 'Course 1 exam score out of 70' })).toBeInTheDocument();
    expect(within(desktopEditor).getByRole('combobox', { name: 'Course 1 letter grade' })).toBeInTheDocument();
  });
});

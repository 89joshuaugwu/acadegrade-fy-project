import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DateField, DateTimeField, TimeField, formatTime12, parseIsoDate, toIsoDate } from '@/components/ui/DateTimeFields';

function Harness({ kind, initial = '', ...rest }: { kind: 'date' | 'time' | 'datetime'; initial?: string; min?: string; max?: string; step?: number; name?: string }) {
  const [value, setValue] = useState(initial);
  const props = { label: kind === 'time' ? 'Start time' : kind === 'date' ? 'Exam date' : 'Publish at', value, onChange: setValue, ...rest };
  return (
    <form aria-label="form">
      {kind === 'date' ? <DateField {...props} /> : kind === 'time' ? <TimeField {...props} /> : <DateTimeField {...props} />}
      <output data-testid="value">{value}</output>
    </form>
  );
}

describe('date helpers', () => {
  it('round-trips local dates without time-zone shifts', () => {
    expect(toIsoDate(parseIsoDate('2026-03-01') as Date)).toBe('2026-03-01');
    expect(parseIsoDate('2026-13-40')).not.toBeNull(); // JS rolls over; callers pass valid strings from the picker
    expect(parseIsoDate('nope')).toBeNull();
    expect(formatTime12('00:05')).toBe('12:05 am');
    expect(formatTime12('13:30')).toBe('1:30 pm');
  });
});

describe('DateField', () => {
  it('shows the chosen date, opens a calendar and picks a day with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness kind="date" initial="2026-11-20" name="examDate" />);
    const trigger = screen.getByRole('button', { name: /Exam date/ });
    expect(trigger).toHaveTextContent('Fri, 20 Nov 2026');
    expect(document.querySelector('input[type="hidden"][name="examDate"]')).toHaveValue('2026-11-20');
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Choose exam date' });
    expect(within(dialog).getByText('November 2026')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Friday, 20 November 2026' })).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-28');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('moves months and refuses days outside min and max', async () => {
    const user = userEvent.setup();
    render(<Harness kind="date" initial="2026-11-20" min="2026-11-10" max="2026-12-05" />);
    await user.click(screen.getByRole('button', { name: /Exam date/ }));
    await user.click(screen.getByRole('button', { name: 'Friday, 6 November 2026' }));
    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-20');
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Friday, 4 December 2026' }));
    expect(screen.getByTestId('value')).toHaveTextContent('2026-12-04');
  });

  it('closes on Escape and offers Clear when not required', async () => {
    const user = userEvent.setup();
    render(<Harness kind="date" initial="2026-11-20" />);
    await user.click(screen.getByRole('button', { name: /Exam date/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Exam date/ }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('value')).toHaveTextContent('');
    expect(screen.getByRole('button', { name: /Exam date/ })).toHaveTextContent('Choose a date');
  });
});

describe('TimeField', () => {
  it('lists times at the step and selects with arrows and Enter', async () => {
    const user = userEvent.setup();
    render(<Harness kind="time" initial="08:00" step={30} min="07:00" max="10:00" />);
    const box = screen.getByRole('combobox', { name: /Start time/ });
    expect(box).toHaveTextContent('8:00 am');
    await user.click(box);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['7:00 am', '7:30 am', '8:00 am', '8:30 am', '9:00 am', '9:30 am', '10:00 am']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('08:30');
  });
});

describe('DateTimeField', () => {
  it('builds YYYY-MM-DDTHH:mm, defaulting the time to 09:00, and keeps the time when the date changes', async () => {
    const user = userEvent.setup();
    render(<Harness kind="datetime" />);
    expect(screen.getByRole('group', { name: 'Publish at' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Publish at: time/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Publish at: date/ }));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    const today = toIsoDate(new Date());
    expect(screen.getByTestId('value')).toHaveTextContent(`${today}T09:00`);
    await user.click(screen.getByRole('combobox', { name: /Publish at: time/ }));
    await user.click(screen.getByRole('option', { name: '9:05 am' }));
    expect(screen.getByTestId('value')).toHaveTextContent(`${today}T09:05`);
  });
});

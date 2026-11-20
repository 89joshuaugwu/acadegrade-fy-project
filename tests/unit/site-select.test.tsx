import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SelectV2 } from '@/components/site/Select';

const OPTIONS = [
  { value: 'account', label: 'Account and sign-in' },
  { value: 'results', label: 'Results and CGPA' },
  { value: 'academind', label: 'AcadeMind', hint: 'Analysis, forecast and what-if' },
  { value: 'other', label: 'Something else' },
];

function Harness({ searchable = false, initial = '' }: { searchable?: boolean; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <form aria-label="support">
      <SelectV2 label="Topic" name="topic" options={OPTIONS} value={value} onChange={setValue} searchable={searchable} required />
      <output data-testid="value">{value}</output>
    </form>
  );
}

describe('SelectV2 (brand v2 dropdown)', () => {
  it('is a labelled combobox that posts its value through a hidden input', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: /Topic/ });
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box).toHaveTextContent('Choose one');
    await user.click(box);
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('option', { name: /AcadeMind/ }));
    expect(screen.getByTestId('value')).toHaveTextContent('academind');
    expect(document.querySelector('input[type="hidden"][name="topic"]')).toHaveValue('academind');
    expect(box).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('works from the keyboard: arrows, type-ahead, Enter and Escape', async () => {
    const user = userEvent.setup();
    render(<Harness initial="account" />);
    const box = screen.getByRole('combobox', { name: /Topic/ });
    box.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('results');
    await user.keyboard('{Enter}s{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('other');
    await user.keyboard('{Enter}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByTestId('value')).toHaveTextContent('other');
  });

  it('filters when searchable', async () => {
    const user = userEvent.setup();
    render(<Harness searchable />);
    await user.click(screen.getByRole('combobox', { name: /Topic/ }));
    await user.keyboard('cgpa');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('results');
  });
});

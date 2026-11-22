import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SuggestField, matchSuggestions } from '@/components/site/auth/SuggestField';

const ESUT = 'Enugu State University of Science and Technology, Enugu';
const names = ['University of Lagos, Lagos', ESUT];
const aliases = { [ESUT]: ['ESUT', 'ESUT Agbani'], 'University of Lagos, Lagos': ['UNILAG'] };

function Harness({ onPick }: { onPick: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <SuggestField label="University" suggestions={names} aliases={aliases} current={value} onChange={(event) => setValue(event.target.value)} onPick={onPick} />;
}

describe('SuggestField alias search', () => {
  it('matchSuggestions uses aliases and keeps the 8-item cap', () => {
    expect(matchSuggestions(names, 'esut agbani', 8, aliases)).toEqual([ESUT]);
    // The value already in the field is not offered again.
    expect(matchSuggestions(['Law', 'Law Enforcement'], ' law ')).toEqual(['Law Enforcement']);
    expect(matchSuggestions(Array.from({ length: 20 }, (_, index) => `Uni ${index}`), 'uni')).toHaveLength(8);
  });

  it('offers the listed university when a student types its short name', () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const input = screen.getByRole('combobox', { name: 'University' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'UNILAG' } });
    const option = screen.getByRole('option', { name: 'University of Lagos, Lagos' });
    fireEvent.mouseDown(option);
    expect(onPick).toHaveBeenCalledWith('University of Lagos, Lagos');
  });
});

describe('SuggestField without an aliases prop', () => {
  it('falls back to the bundled alias seeds', () => {
    render(<SuggestField label="University" suggestions={names} current="ESUT" onChange={() => undefined} onPick={() => undefined} />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'University' }));
    expect(screen.getByRole('option', { name: ESUT })).toBeTruthy();
  });
});

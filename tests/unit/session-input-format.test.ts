import { describe, expect, it } from 'vitest';
import { formatSessionInput, parseAcademicSession } from '@/lib/academic/timeline';

describe('formatSessionInput (iPhone number pads have no "/")', () => {
  it('adds the slash after the first year', () => {
    expect(formatSessionInput('20222023')).toBe('2022/2023');
    expect(formatSessionInput('20222')).toBe('2022/2');
    expect(parseAcademicSession(formatSessionInput('20222023'))).toBe(2022);
  });

  it('keeps a typed slash and normalises other separators', () => {
    expect(formatSessionInput('2022/2023')).toBe('2022/2023');
    expect(formatSessionInput('2022-2023')).toBe('2022/2023');
    expect(formatSessionInput('2022 / 2023')).toBe('2022/2023');
  });

  it('leaves a partial first year alone and caps at two years', () => {
    expect(formatSessionInput('202')).toBe('202');
    expect(formatSessionInput('2022')).toBe('2022');
    expect(formatSessionInput('202220235')).toBe('2022/2023');
    expect(formatSessionInput('')).toBe('');
  });
});

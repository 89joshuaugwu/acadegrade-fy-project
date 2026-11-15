import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/PublicShell', () => ({
  PublicHeader: () => <nav>Public header</nav>,
  PublicFooter: () => <footer>Public footer</footer>,
}));

import DegreeClassCheckerPage, { metadata as degreeMeta } from '@/app/(public)/tools/degree-class-checker/page';
import RequiredGpaPage from '@/app/(public)/tools/required-gpa/page';
import CarryOverImpactPage from '@/app/(public)/tools/carry-over-impact/page';
import WeightedAveragePage from '@/app/(public)/tools/weighted-average/page';
import { TOOL_PATHS } from '@/app/(public)/tools/tools-config';
import { PUBLIC_SITEMAP_ROUTES } from '@/lib/seo/site';
import { carryOverImpact, checkDegreeClass, requiredGpa, weightedAverageFromRows } from '@/app/(public)/tools/tool-math';

const pages = [
  ['degree class checker', DegreeClassCheckerPage],
  ['required GPA', RequiredGpaPage],
  ['carry-over impact', CarryOverImpactPage],
  ['weighted average', WeightedAveragePage],
] as const;

describe('free tool pages', () => {
  it('lists all four tools in the public sitemap routes', () => {
    expect(TOOL_PATHS).toHaveLength(4);
    for (const path of TOOL_PATHS) expect(PUBLIC_SITEMAP_ROUTES).toContain(path);
  });

  it('gives each page a canonical path', () => {
    expect(String(degreeMeta.alternates?.canonical)).toMatch(/\/tools\/degree-class-checker$/);
  });

  it.each(pages)('%s renders a heading, an honest not-official note and FAQ JSON-LD', (_name, Page) => {
    const { container } = render(<Page />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/not an official result/i)).toBeInTheDocument();
    const ld = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(ld!.textContent!);
    expect(parsed['@type']).toBe('FAQPage');
    expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toMatch(/verified|certified/i);
  });

  it('classifies a typed CGPA', async () => {
    render(<DegreeClassCheckerPage />);
    await userEvent.type(screen.getByLabelText('Your CGPA'), '4.496');
    expect(screen.getByRole('status')).toHaveTextContent(/First Class/);
  });

  it('shows a required GPA and refuses unreachable targets', async () => {
    render(<RequiredGpaPage />);
    await userEvent.type(screen.getByLabelText('Current CGPA'), '3.40');
    await userEvent.type(screen.getByLabelText('Target CGPA'), '3.50');
    await userEvent.type(screen.getByLabelText('Units completed'), '90');
    await userEvent.type(screen.getByLabelText('Units remaining'), '60');
    expect(screen.getByRole('status')).toHaveTextContent('3.65');
    await userEvent.clear(screen.getByLabelText('Target CGPA'));
    await userEvent.type(screen.getByLabelText('Target CGPA'), '5');
    expect(screen.getByRole('status')).toHaveTextContent(/out of reach/);
  });
});

describe('tool maths', () => {
  it('checks the degree class on the rounded CGPA and reports the gap', () => {
    expect(checkDegreeClass(4.495)?.band.shortLabel).toBe('1st');
    expect(checkDegreeClass(3.49)).toMatchObject({ gap: 0.01 });
    expect(checkDegreeClass(3.49)?.next?.shortLabel).toBe('2:1');
    expect(checkDegreeClass(5)?.next).toBeNull();
    expect(checkDegreeClass(5.1)).toBeNull();
    expect(checkDegreeClass(null)).toBeNull();
  });

  it('computes required GPA, secured and unreachable cases', () => {
    expect(requiredGpa({ currentCgpa: 3.4, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 })).toMatchObject({ status: 'needed', required: 3.65 });
    expect(requiredGpa({ currentCgpa: 4.8, completedUnits: 90, remainingUnits: 10, targetCgpa: 3 })).toMatchObject({ status: 'secured' });
    expect(requiredGpa({ currentCgpa: 2, completedUnits: 100, remainingUnits: 10, targetCgpa: 4.5 })).toMatchObject({ status: 'unreachable' });
    expect(requiredGpa({ currentCgpa: 2, completedUnits: 100, remainingUnits: 0, targetCgpa: 3 })).toEqual({ status: 'invalid' });
  });

  it('shows both carry-over rules', () => {
    const impact = carryOverImpact({ currentCgpa: 3, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' });
    expect(impact).toEqual({ before: 3, bothAttemptsCount: 3.1, replacesFailure: 3.25 });
    expect(carryOverImpact({ currentCgpa: 3, completedUnits: 2, failedUnits: 3, retakeGrade: 'A' })).toBeNull();
  });

  it('averages scores by units and skips incomplete rows', () => {
    const result = weightedAverageFromRows([
      { score: '80', units: '3' },
      { score: '60', units: '1' },
      { score: '120', units: '2' },
      { score: '', units: '' },
    ]);
    expect(result.average).toBe(75);
    expect(result.includedUnits).toBe(4);
    expect(result.skippedRows).toBe(1);
  });
});

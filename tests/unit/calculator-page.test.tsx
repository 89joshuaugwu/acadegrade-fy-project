import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/calculator',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, uid: null, loading: false, error: null }) }));

import CalculatorPage, { metadata } from '@/app/(public)/calculator/page';
import { CALCULATOR_FAQS } from '@/app/(public)/calculator/calculator-content';

const EXAMPLE_SCORE_C =
  'W3siYyI6IkNTQyAzMDEiLCJ1IjozLCJzIjo3Nn0seyJjIjoiQ1NDIDMwMyIsInUiOjMsInMiOjY1fSx7ImMiOiJNVEggMzAxIiwidSI6MywicyI6NTZ9LHsiYyI6IkNTQyAzMDUiLCJ1IjoyLCJzIjo3Mn0seyJjIjoiR1NUIDMxMSIsInUiOjIsInMiOjYxfV0=';

const status = () => screen.getByRole('status');

beforeEach(() => {
  window.history.replaceState(null, '', '/calculator');
});

describe('CGPA calculator page', () => {
  it('renders the default slip with GPA 4.13 and the letter-grade mode', async () => {
    render(<CalculatorPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Work out your GPA and CGPA' })).toBeInTheDocument();
    const modes = screen.getByRole('radiogroup', { name: /what does your slip show/i });
    expect(within(modes).getByRole('radio', { name: /letter grades/i })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Course code, course 1' })).toBeInTheDocument();
    // A text field with role="spinbutton" (no native number spinners), so its value is text.
    expect(screen.getByRole('spinbutton', { name: 'Units for course 1' })).toHaveValue('3');
    expect(screen.getByRole('spinbutton', { name: 'Units for course 3' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('radiogroup', { name: 'Grade for course 1' })).toBeInTheDocument();
    expect(screen.getAllByText('4.13').length).toBeGreaterThan(0);
    expect(screen.getByText(/semester gpa 4\.13 · pi 4\.13 · 8 units · 3 courses/i)).toBeInTheDocument();
    expect(status()).toHaveTextContent('Semester GPA 4.13. PI 4.13.');
  });

  it('switches to scores without inventing any', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('radio', { name: /scores out of 100/i }));
    const scores = screen.getAllByRole('textbox', { name: /score for course \d, out of 100/i });
    expect(scores).toHaveLength(3);
    scores.forEach((input) => expect(input).toHaveValue(''));
    expect(screen.getByText(/counted: 0 of 3 courses/i)).toBeInTheDocument();
    expect(window.location.search).toContain('m=score');
  });

  it('opens a shared score link and shows GPA 4.15, PI 3.30 and the weighted average link', async () => {
    window.history.replaceState(null, '', `/calculator?m=score&c=${encodeURIComponent(EXAMPLE_SCORE_C)}`);
    render(<CalculatorPage />);
    expect(await screen.findByDisplayValue('CSC 301')).toBeInTheDocument();
    expect(screen.getByText(/semester gpa 4\.15 · pi 3\.30 · 13 units · 5 courses/i)).toBeInTheDocument();
    expect(screen.getByText(/these courses came from a shared link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /weighted average score/i })).toHaveAttribute('href', `/tools/weighted-average?c=${encodeURIComponent(EXAMPLE_SCORE_C)}`);
    expect(screen.getByText('65.9 from these scores')).toBeInTheDocument();
  });

  it('works out the CGPA so far: 4.47 over 74 units gives 4.42, 0.08 to First Class', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: /load an example slip/i }));
    await user.type(screen.getByLabelText('CGPA before this semester'), '4.47');
    await user.type(screen.getByLabelText('Units before this semester'), '74');
    expect(screen.getByText('0.08 to First Class')).toBeInTheDocument();
    await waitFor(() => expect(status()).toHaveTextContent('CGPA 4.42, Second Class Upper.'));
    expect(window.location.search).toContain('pc=4.47&pu=74');
    expect(screen.getByRole('link', { name: /degree class checker/i })).toHaveAttribute('href', '/tools/degree-class-checker?cgpa=4.42');
  });

  it('flags a carry-over and links to the carry-over tool with prefill', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: /load an example slip/i }));
    const mth = screen.getByRole('radiogroup', { name: 'Grade for MTH 301' });
    await user.click(within(mth).getByRole('radio', { name: 'F' }));
    expect(screen.getByText('1 carry-over on this slip: MTH 301.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see what a retake would do/i })).toHaveAttribute('href', '/tools/carry-over-impact?current=3.46&done=13&failed=3');
  });

  it('shows a score error on blur only and keeps computing the valid rows', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('radio', { name: /scores out of 100/i }));
    const first = screen.getByRole('textbox', { name: 'Score for course 1, out of 100' });
    await user.type(first, '105');
    expect(screen.queryByText('Enter a score from 0 to 100.')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('Enter a score from 0 to 100.')).toBeInTheDocument();
  });

  it('steps units with the keyboard on the custom stepper (no native spinner), clamped to 1 to 6', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    const units = screen.getByRole('spinbutton', { name: 'Units for course 3' });
    expect(units).toHaveAttribute('type', 'text');
    units.focus();
    await user.keyboard('{ArrowUp}');
    expect(units).toHaveValue('3');
    expect(units).toHaveAttribute('aria-valuenow', '3');
    // A, B, B... the third row is now a 3-unit C: (15 + 12 + 9) ÷ 9 = 4.00.
    expect(screen.getByText(/semester gpa 4\.00 · pi 4\.00 · 9 units · 3 courses/i)).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(units).toHaveValue('6');
    await user.keyboard('{ArrowUp}');
    expect(units).toHaveValue('6');
    await user.keyboard('{Home}');
    expect(units).toHaveValue('1');
  });

  it('adds a row with focus in its code field, and removes rows', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: 'Add a course' }));
    expect(screen.getByRole('textbox', { name: 'Course code, course 4' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remove course 4' }));
    expect(screen.queryByRole('textbox', { name: 'Course code, course 4' })).not.toBeInTheDocument();
  });

  it('clears every course with an Undo, then restores them', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: /clear all courses/i }));
    expect(screen.getByText('No courses on this slip.')).toBeInTheDocument();
    expect(screen.getByText('No courses counted yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a course' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /save to your record/i })[0]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Add at least one complete course to save.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText(/8 units · 3 courses/)).toBeInTheDocument();
  });

  it('says when a link cannot be read', async () => {
    window.history.replaceState(null, '', '/calculator?m=grade&c=%%%');
    await act(async () => {
      render(<CalculatorPage />);
    });
    expect(screen.getByText("This link couldn't be read, so the calculator started fresh.")).toBeInTheDocument();
  });

  it('carries metadata and JSON-LD that match the page', () => {
    expect(String(metadata.alternates?.canonical)).toMatch(/\/calculator$/);
    expect(metadata.title).toBe('CGPA calculator for Nigerian universities');
    const { container } = render(<CalculatorPage />);
    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent!));
    expect(blocks.map((block) => block['@type'])).toEqual(['WebApplication', 'FAQPage', 'BreadcrumbList']);
    const faq = blocks[1];
    expect(faq.mainEntity).toHaveLength(6);
    faq.mainEntity.forEach((entry: { name: string; acceptedAnswer: { text: string } }, index: number) => {
      expect(entry.name).toBe(CALCULATOR_FAQS[index].question);
      expect(container.textContent).toContain(entry.acceptedAnswer.text);
    });
    expect(container.textContent).not.toMatch(/beta|coming soon|illustrative/i);
  });
});

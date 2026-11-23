import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, uid: null, loading: false, error: null }) }));

import WaecCreditCheckerPage, { metadata as waecMeta } from '@/app/(public)/tools/waec-credit-checker/page';
import AdmissionAggregatePage, { metadata as admissionMeta } from '@/app/(public)/tools/admission-aggregate/page';
import { ADMISSION_EXAMPLE, WAEC_EXAMPLE, admissionView, waecView } from '@/app/(public)/tools/records-model';
import { getTool } from '@/app/(public)/tools/tools-config';
import { encodeAdmissionLink, encodeOlevelLink } from '@/components/public/tools/records-url';

const pages = [
  ['WAEC credit checker', WaecCreditCheckerPage, '/register?type=olevel'],
  ['admission aggregate', AdmissionAggregatePage, '/register?type=admission'],
] as const;

const jsonLd = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent!));
const status = () => screen.getByRole('status');

beforeEach(() => {
  window.history.replaceState(null, '', '/tools');
});

describe('record tool pages', () => {
  it('give each page a canonical path without parameters', () => {
    expect(String(waecMeta.alternates?.canonical)).toMatch(/\/tools\/waec-credit-checker$/);
    expect(String(admissionMeta.alternates?.canonical)).toMatch(/\/tools\/admission-aggregate$/);
  });

  it.each(pages)('%s: one h1, its own hero facts and headings, JSON-LD, sign-up CTA, no scale picker or native controls', (_name, Page, register) => {
    const { container } = render(<Page />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const blocks = jsonLd(container);
    expect(blocks.map((block) => block['@type'])).toEqual(['WebApplication', 'FAQPage', 'BreadcrumbList']);
    expect(blocks[1].mainEntity).toHaveLength(6);
    for (const entry of blocks[1].mainEntity) expect(container.textContent).toContain(entry.acceptedAnswer.text);
    expect(container.textContent).not.toMatch(/5-point|same scale|coming soon|verified|certified/i);
    expect(screen.queryByRole('combobox', { name: /grading scale/i })).toBeNull();
    expect(container.querySelector('select, input[type="checkbox"], input[type="number"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Save to a free record' })).toHaveAttribute('href', register);
    expect(screen.getByRole('link', { name: 'CGPA calculator' })).toHaveAttribute('href', '/calculator');
    expect(screen.getAllByRole('link', { name: 'All free tools' })[0]).toHaveAttribute('href', '/tools');
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('WAEC credit checker', () => {
  it('combines two sittings: best grade per subject, credits and the English and Maths rule', () => {
    const first = waecView({ sittings: [WAEC_EXAMPLE.sittings[0]], required: [] });
    expect(first.credits).toBe(5);
    expect(first.meets).toBe(false);
    expect(first.missing).toEqual(['Mathematics']);
    const both = waecView(WAEC_EXAMPLE);
    expect(both.credits).toBe(6);
    expect(both.meets).toBe(true);
    expect(both.rows.find((row) => row.subjectId === 'mathematics')).toMatchObject({ grade: 'C6', sitting: 2, credit: true });
    expect(both.announce).toBe('6 credits. You have five credits including English Language and Mathematics.');
    const course = waecView({ ...WAEC_EXAMPLE, required: ['physics'] });
    expect(course.meets).toBe(false);
    expect(course.missing).toEqual(['Physics']);
  });

  it('shows the example and its verdict', async () => {
    const user = userEvent.setup();
    render(<WaecCreditCheckerPage />);
    expect(screen.getByText("Estimate only. Check your school's requirements.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try an example' }));
    await waitFor(() => expect(status()).toHaveTextContent('6 credits. You have five credits including English Language and Mathematics.'));
    const maths = screen.getByRole('radiogroup', { name: 'Grade for Mathematics, second sitting' });
    expect(within(maths).getByRole('radio', { name: 'C6, credit' })).toBeChecked();
  });

  it('finds a subject by its short name and picks it from the keyboard', async () => {
    const user = userEvent.setup();
    render(<WaecCreditCheckerPage />);
    const field = screen.getByRole('combobox', { name: 'Subject 3, first sitting' });
    await user.type(field, 'f/maths');
    expect(screen.getByRole('option', { name: 'Further Mathematics' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('Further Mathematics');
    const grades = screen.getByRole('radiogroup', { name: 'Grade for Further Mathematics, first sitting' });
    await user.click(within(grades).getByRole('radio', { name: 'B2, credit' }));
    expect(within(grades).getByRole('radio', { name: 'B2, credit' })).toBeChecked();
  });

  it('flags a subject typed twice in one sitting, on blur', async () => {
    const user = userEvent.setup();
    render(<WaecCreditCheckerPage />);
    const field = screen.getByRole('combobox', { name: 'Subject 3, first sitting' });
    await user.type(field, 'Eng Lang');
    expect(screen.queryByText(/already in this sitting/i)).toBeNull();
    await user.tab();
    expect(screen.getByText('English Language is already in this sitting.')).toBeInTheDocument();
  });

  it('opens a shared link and keeps the address in step with the fields', async () => {
    window.history.replaceState(null, '', `/tools/waec-credit-checker?${encodeOlevelLink(WAEC_EXAMPLE)}`);
    render(<WaecCreditCheckerPage />);
    await waitFor(() => expect(status()).toHaveTextContent(/^6 credits/));
    expect(screen.getByRole('combobox', { name: 'Subject 1, second sitting' })).toHaveValue('Mathematics');
    expect(window.location.search).toContain('s2=neco.2025');
  });
});

describe('admission aggregate', () => {
  it('works out the aggregate with its steps and the post-UTME needed', () => {
    const view = admissionView(ADMISSION_EXAMPLE);
    expect(view.aggregate).toBe(68.1);
    expect(view.steps.map((step) => step.working)).toEqual(['268 ÷ 400 × 50', '16 points ÷ 20 × 20', '62 ÷ 100 × 30']);
    expect(view.steps.map((step) => step.value)).toEqual(['33.50', '16.00', '18.60']);
    expect(view.targetLine).toBe('To reach 70, you need 68.34 out of 100 in post-UTME.');
    const partial = admissionView({ ...ADMISSION_EXAMPLE, formula: 'utme-post', postScore: '', target: '' });
    expect(partial.aggregate).toBeNull();
    expect(partial.partial).toBe(33.5);
    expect(partial.missingLine).toBe('Add your post-UTME score to finish.');
  });

  it('always shows the estimate note and works from typed scores', async () => {
    const user = userEvent.setup();
    render(<AdmissionAggregatePage />);
    expect(screen.getAllByText("Estimate only. Check your school's formula.").length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('UTME score'), '268');
    await user.type(screen.getByLabelText('Post-UTME score'), '62');
    await waitFor(() => expect(status()).toHaveTextContent('Aggregate 64.50 out of 100.'));
    expect(screen.getByText('268 ÷ 400 × 50')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Target aggregate'), '70');
    expect(screen.getAllByText('To reach 70, you need 73.00 out of 100 in post-UTME.')).toHaveLength(2);
  });

  it('explains an out-of-range UTME score on blur', async () => {
    const user = userEvent.setup();
    render(<AdmissionAggregatePage />);
    await user.type(screen.getByLabelText('UTME score'), '420');
    expect(screen.queryByText('Enter a UTME score from 0 to 400.')).toBeNull();
    await user.tab();
    expect(screen.getByText('Enter a UTME score from 0 to 400.')).toBeInTheDocument();
  });

  it('switches formula from the keyboard and asks for O-level grades', async () => {
    const user = userEvent.setup();
    render(<AdmissionAggregatePage />);
    const first = screen.getByRole('radio', { name: /^UTME and post-UTME/ });
    expect(first).toBeChecked();
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /^UTME, O-level and post-UTME/ })).toBeChecked();
    expect(screen.getByRole('radiogroup', { name: 'Grade for English Language' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /O-level points/ })).toBeInTheDocument();
  });

  it('opens a shared link', async () => {
    window.history.replaceState(null, '', `/tools/admission-aggregate?${encodeAdmissionLink(ADMISSION_EXAMPLE)}`);
    render(<AdmissionAggregatePage />);
    await waitFor(() => expect(status()).toHaveTextContent('Aggregate 68.10 out of 100.'));
    expect(screen.getByLabelText('UTME score')).toHaveValue('268');
    expect(getTool('admission-aggregate').facts).toContain('UTME, post-UTME and O-level');
  });
});

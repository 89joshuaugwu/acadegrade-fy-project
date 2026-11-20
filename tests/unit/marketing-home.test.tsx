import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, proofState, contactState } = vi.hoisted(() => ({
  authState: { user: null as { uid: string; getIdToken: () => Promise<string> } | null, uid: null as string | null, loading: false, error: null },
  proofState: { value: { testimonials: null, count: null, preview: false } as Record<string, unknown> },
  contactState: { value: null as string | null },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {} }));
vi.mock('@/lib/site/contact', async () => {
  const actual = await vi.importActual<typeof import('@/lib/site/contact-email')>('@/lib/site/contact-email');
  return { ...actual, getContactEmail: async () => contactState.value };
});
vi.mock('@/lib/public/proof', async () => {
  const types = await vi.importActual<typeof import('@/lib/public/home-data-types')>('@/lib/public/home-data-types');
  return {
    ...types,
    resolvePublicProof: async () => proofState.value,
    sampleProof: () => ({ testimonials: [...types.SAMPLE_TESTIMONIALS], count: { ...types.SAMPLE_COUNT }, preview: true }),
  };
});

import HomePage, { metadata } from '@/app/(public)/page';
import { CALCULATOR_HANDOFF_KEY } from '@/lib/handoff/calculator';
import { HOME_FAQ } from '@/lib/public/home';

/** Reduced motion on, so the CGPA figure jumps instead of tweening. */
function preferStill() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

async function renderHome() {
  return render(await HomePage());
}

function gradeKey(course: string, grade: string) {
  const group = screen.getByRole('group', { name: new RegExp(`^Grade for ${course}`) });
  return within(group).getByRole('radio', { name: grade });
}

function gauge() {
  return screen.getByRole('img', { name: /^CGPA / });
}

beforeEach(() => {
  Object.assign(authState, { user: null, uid: null, loading: false, error: null });
  proofState.value = { testimonials: null, count: null, preview: false };
  contactState.value = null;
  sessionStorage.clear();
  preferStill();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('home page (brand v2): first screen', () => {
  it('answers what it is in one h1 and one sentence, with one primary action', async () => {
    await renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Know exactly where your degree stands.' })).toBeInTheDocument();
    expect(screen.getByText(/turns your results into GPA, CGPA and degree class in seconds/)).toBeInTheDocument();
    const starts = screen.getAllByRole('link', { name: 'Start your free record' });
    expect(starts.length).toBeGreaterThanOrEqual(1);
    for (const link of starts) expect(link).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Try the CGPA calculator' })).toHaveAttribute('href', '/calculator');
  });

  it('renders inside the public shell: no own header, footer or nested main', async () => {
    const { container } = await renderHome();
    expect(container.querySelector('main')).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(container.innerHTML).not.toMatch(/Smiling Student|heroimage2|heroimage3|mobile-app-images|images\/campus/);
  });
});

describe('home page: the live demo runs the real engine', () => {
  it('loads the example semester at CGPA 4.43, Second Class Upper, GPA 4.15 over 13 units', async () => {
    await renderHome();
    expect(gauge()).toHaveAccessibleName('CGPA 4.43 of 5.00, Second Class Upper');
    expect(screen.getByRole('table', { name: /Example semester/ })).toBeInTheDocument();
    expect(screen.getByText('Second Class Upper', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('4.15')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('tells the 4.49 then 4.53 First Class story and announces it politely', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderHome();
    await user.click(gradeKey('MTH 301', 'A'));
    expect(gauge()).toHaveAccessibleName('CGPA 4.49 of 5.00, Second Class Upper');
    await user.click(gradeKey('CSC 303', 'A'));
    expect(gauge()).toHaveAccessibleName('CGPA 4.53 of 5.00, First Class');
    expect(screen.getByText('First Class', { selector: 'p' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toMatch(/4\.53/);
  });

  it('counts a carry-over when a course is set to F', async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.click(gradeKey('MTH 301', 'F'));
    expect(screen.getByText('Carry-overs')).toBeInTheDocument();
  });

  it('offers Save this semester after a change and writes the existing calculator handoff', async () => {
    const user = userEvent.setup();
    await renderHome();
    expect(screen.queryByRole('link', { name: 'Save this semester' })).toBeNull();
    await user.click(gradeKey('MTH 301', 'A'));
    const save = screen.getByRole('link', { name: 'Save this semester' });
    expect(save).toHaveAttribute('href', '/register');
    await user.click(save);
    const stored = sessionStorage.getItem(CALCULATOR_HANDOFF_KEY);
    expect(stored).toBeTruthy();
    expect(stored).toContain('MTH 301');
  });

  it('gives a signed-in student Open dashboard instead', async () => {
    Object.assign(authState, { user: { uid: 'u1', getIdToken: async () => 't' }, uid: 'u1' });
    const user = userEvent.setup();
    await renderHome();
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard');
    await user.click(gradeKey('MTH 301', 'A'));
    expect(screen.queryByRole('link', { name: 'Save this semester' })).toBeNull();
  });
});

describe('home page: sections', () => {
  it('has a heading on every section, with #how-it-works kept for old links', async () => {
    const { container } = await renderHome();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Built on the 5‑point scale your university uses.',
      'Everything after results day, in one place.',
      'Results day, sorted.',
      "Reminders that work when the network doesn't.",
      'Built by a student who has lived through results day.',
      'Questions, answered.',
      'Your next result is coming. Know what it means the moment it lands.',
    ]);
    expect(container.querySelector('#how-it-works')).not.toBeNull();
  });

  it('shows the five classes and six grade bands of the 5-point scale', async () => {
    await renderHome();
    for (const name of ['Pass', 'Third Class', 'Second Class Lower', 'Second Class Upper', 'First Class']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    for (const grade of ['70–100', '60–69', '50–59', '45–49', '40–44', '0–39']) expect(screen.getByText(grade, { exact: false })).toBeInTheDocument();
  });

  it('leaves out What students say without real approved quotes', async () => {
    await renderHome();
    expect(screen.queryByRole('heading', { name: 'What students say.' })).toBeNull();
  });

  it('shows What students say with real approved quotes', async () => {
    proofState.value = {
      testimonials: [
        { id: 'a', quote: 'Real quote one.', firstName: 'Ada', level: '300L', department: 'Law', university: 'UNILAG' },
        { id: 'b', quote: 'Real quote two.', firstName: 'Bayo', level: '200L', department: 'Physics', university: 'OAU' },
        { id: 'c', quote: 'Real quote three.', firstName: 'Chi', level: '400L', department: 'Nursing', university: 'UNN' },
      ],
      count: null,
      preview: false,
    };
    await renderHome();
    expect(screen.getByRole('heading', { name: 'What students say.' })).toBeInTheDocument();
    expect(screen.getByText(/Real quote two\./)).toBeInTheDocument();
  });

  it('introduces the founder without a portrait and links the story', async () => {
    await renderHome();
    expect(screen.getByText(/I studied Computer Science at ESUT/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read our story' })).toHaveAttribute('href', '/about');
  });

  it('answers the FAQ in disclosures, matched word for word by the FAQPage JSON-LD', async () => {
    const { container } = await renderHome();
    expect(container.querySelectorAll('details.ag-faq')).toHaveLength(HOME_FAQ.length);
    const json = container.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
    for (const item of HOME_FAQ) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
      expect(json).toContain(item.question);
    }
  });

  it('ends with the gold closing band and its two actions', async () => {
    await renderHome();
    const closing = screen.getByRole('heading', { name: /Your next result is coming/ }).closest('section') as HTMLElement;
    expect(within(closing).getByRole('link', { name: 'Start your free record' })).toHaveAttribute('href', '/register');
    expect(within(closing).getByRole('link', { name: 'Get the Android app' })).toHaveAttribute('href', '/app');
  });

  it('keeps production positioning: no development traces', async () => {
    const { container } = await renderHome();
    expect(container.textContent).not.toMatch(/coming soon|beta|lorem|final year project|school project/i);
  });

  it('sets the planned title, description and canonical', () => {
    expect(metadata.title).toEqual({ absolute: 'AcadeGrade: CGPA, GPA and degree class for Nigerian universities' });
    expect(String(metadata.description)).toMatch(/GPA, CGPA and degree class/);
    expect(String(metadata.alternates?.canonical)).toMatch(/^https:\/\/[^/]+\/?$/);
  });
});

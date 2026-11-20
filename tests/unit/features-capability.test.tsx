import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * /features after the public redesign (docs/public-redesign/pages/features.md).
 * Moved here from marketing-home.test.tsx by the home lane; rewritten by the
 * Product lane for the new page. The old expectations (the AcadeMind PNG
 * logo, "Transcripts ready to export and share", "PDF and HTML export")
 * belonged to the retired page. Updated for brand v2 (docs/brand-v2): the
 * caption under the CGPA is a sentence, not a middle-dot meta string.
 */

const { authState } = vi.hoisted(() => ({ authState: { user: null as null | { uid: string }, uid: null, loading: false, error: null } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => false, loading: false }) }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {} }));

import FeaturesPage, { metadata } from '@/app/(public)/features/page';

beforeEach(() => {
  authState.user = null;
});

describe('/features', () => {
  it('answers the first question with one action and no old shell', () => {
    const { container } = render(<FeaturesPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'From result slip to plan.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create your free record' })[0]).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Try the calculator first' })).toHaveAttribute('href', '/calculator');
    expect(screen.getByRole('link', { name: 'Get the Android app' })).toHaveAttribute('href', '/app');
    expect(container.querySelector('main')).toBeNull();
    expect(container.querySelector('nav[aria-label="Main"]')).toBeNull();
    expect(container).not.toHaveTextContent(/illustrative|coming soon|\bbeta\b|unlock|journey/i); // taste-skill-ignore: asserting the words are absent
  });

  it('indexes every capability in the contents sheet, with where it works', () => {
    render(<FeaturesPage />);
    const sheet = screen.getByRole('navigation', { name: "What's in AcadeGrade" });
    expect(within(sheet).getByRole('link', { name: 'Result scanner, 18 and over' })).toHaveAttribute('href', '#scanner');
    expect(within(sheet).getByRole('link', { name: 'Transcript and share links, Web and Android' })).toHaveAttribute('href', '#transcript');
    expect(within(sheet).getAllByRole('link')).toHaveLength(8);
    for (const id of ['record', 'scanner', 'academind', 'timetable', 'planning', 'transcript', 'sharing', 'privacy']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('shows the receipt that adds up to 4.43 and the degree goal of 4.67', () => {
    render(<FeaturesPage />);
    const receipt = screen.getByRole('table', { name: 'How the example CGPA adds up' });
    expect(receipt).toHaveTextContent('GPA 4.15');
    expect(receipt).toHaveTextContent('PI 3.30');
    expect(receipt).toHaveTextContent('CGPA: 385 ÷ 87');
    expect(receipt).toHaveTextContent('4.43');
    expect(document.getElementById('record-caption')).toHaveTextContent('CGPA after 87 units. Second Class Upper, 0.07 to First Class.');
    expect(screen.getAllByText('4.67').length).toBeGreaterThan(0);
  });

  it('explains transcripts and sharing with the real share options', () => {
    render(<FeaturesPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'A transcript you can share safely' })).toBeInTheDocument();
    expect(screen.getByText('Links last 1, 7 or 30 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make your transcript' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('heading', { level: 3, name: 'Course codes for classmates' }).closest('li')).toHaveAttribute('id', 'sharing');
  });

  it('names AcadeMind for its features and never calls the timetable builder AI', () => {
    render(<FeaturesPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'AcadeMind reads your record' })).toBeInTheDocument();
    const timetable = document.getElementById('timetable') as HTMLElement;
    expect(timetable).toHaveTextContent('Build with AcadeMind');
    expect(timetable).not.toHaveTextContent(/\bAI\b|smart|machine learning/);
  });

  it('swaps the actions for signed-in students', () => {
    authState.user = { uid: 'u1' };
    render(<FeaturesPage />);
    expect(screen.getAllByRole('link', { name: 'Open dashboard' })[0]).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Make your transcript' })).toHaveAttribute('href', '/transcript');
  });

  it('has the page metadata and breadcrumb JSON-LD', () => {
    const { container } = render(<FeaturesPage />);
    expect(metadata.title).toBe('Features');
    expect(String(metadata.alternates?.canonical)).toMatch(/\/features$/);
    const json = JSON.parse(container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');
    expect(json['@type']).toBe('BreadcrumbList');
    expect(json.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Home', 'Features']);
  });
});

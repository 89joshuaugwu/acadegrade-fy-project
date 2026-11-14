import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN_LEGAL } from '@/lib/legal/builtin';
import { parseLegalMarkup } from '@/lib/legal/markup';
import { renderLegalSections } from '@/lib/legal/render';
import { formatLegalDate, nextLegalVersion } from '@/lib/legal/versions';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const EXPECTED_SECTIONS = {
  terms: ['agreement', 'account', 'unofficial-records', 'ai-output', 'coins', 'acceptable-use', 'content', 'deletion', 'availability', 'changes', 'law-contact'],
  privacy: ['who-we-are', 'information-we-handle', 'how-we-use-data', 'ai-and-scanning', 'sharing', 'transfers', 'retention-security', 'ads-cookies', 'children', 'choices', 'complaints', 'security-breaches', 'changes-contact'],
} as const;

function renderBuiltin(id: 'terms' | 'privacy', email: string | null) {
  const { sections } = parseLegalMarkup(BUILTIN_LEGAL[id].body);
  return render(<div>{renderLegalSections(sections, email).map((section) => (
    <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.content}</section>
  ))}</div>).container;
}

describe.each(['terms', 'privacy'] as const)('built-in %s text', (id) => {
  it('parses cleanly and keeps every section, in order', () => {
    const parsed = parseLegalMarkup(BUILTIN_LEGAL[id].body);
    expect(parsed.issues).toEqual([]);
    expect(parsed.sections.map((section) => section.id)).toEqual(EXPECTED_SECTIONS[id]);
  });

  it('never contains an email address (the contact token is used instead)', () => {
    expect(BUILTIN_LEGAL[id].body).not.toMatch(/@/);
    expect(BUILTIN_LEGAL[id].body).toContain('{{contact');
  });

  it('renders the contact token as a mailto link, or the support page when no email is published', () => {
    const withEmail = renderBuiltin(id, 'hello@example.org');
    expect(withEmail.querySelector('a[href^="mailto:hello@example.org"]')).not.toBeNull();
    const without = renderBuiltin(id, null);
    expect(without.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(without.textContent).toContain('the AcadeGrade support page');
  });
});

describe('built-in text details', () => {
  it('privacy keeps its two tables and an external regulator link opening safely', () => {
    const container = renderBuiltin('privacy', null);
    expect(container.querySelectorAll('table')).toHaveLength(2);
    expect(container.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
    const ndpc = container.querySelector('a[href="https://ndpc.gov.ng"]');
    expect(ndpc).toHaveAttribute('rel', 'noopener noreferrer');
    expect(ndpc).toHaveAttribute('target', '_blank');
    expect(container.querySelector('a[href="#cookie-choices"]')).not.toBeNull();
  });

  it('terms keeps the coins rules and the governing-law sentence', () => {
    const text = renderBuiltin('terms', null).textContent ?? '';
    expect(text).toMatch(/Coins are not money and have no cash value/);
    expect(text).toMatch(/governed by the laws of the Federal Republic of Nigeria/);
  });

  it('is versioned and dated for the first published scheme', () => {
    for (const id of ['terms', 'privacy'] as const) {
      expect(BUILTIN_LEGAL[id].version).toBe('2026-11-13');
      expect(formatLegalDate(BUILTIN_LEGAL[id].effectiveDate)).toBe('13 November 2026');
    }
  });
});

describe('legal version helpers', () => {
  it('builds the next version id from the current one', () => {
    const now = new Date('2026-11-14T10:00:00Z');
    expect(nextLegalVersion('2026-11-13', now)).toBe('2026-11-14');
    expect(nextLegalVersion('2026-11-14', now)).toBe('2026-11-14.2');
    expect(nextLegalVersion('2026-11-14.2', now)).toBe('2026-11-14.3');
    expect(nextLegalVersion('garbage', now)).toBe('2026-11-14');
  });

  it('formats an ISO effective date and leaves anything else alone', () => {
    expect(formatLegalDate('2026-11-13')).toBe('13 November 2026');
    expect(formatLegalDate('2027-01-05')).toBe('5 January 2027');
    expect(formatLegalDate('not a date')).toBe('not a date');
  });
});

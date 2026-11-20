import { afterEach, describe, expect, it, vi } from 'vitest';
import { REGISTRATION_TICKET_TTL_MS, issueRegistrationTicket } from '@/lib/auth/registration-ticket';
import { requiredGpa } from '@/app/(public)/tools/tool-math';
import { afterSignInPath, buildMaintenanceRedirect, buildSignInRedirect, safeNextPath } from '@/lib/public/maintenance-redirect';

afterEach(() => { vi.unstubAllEnvs(); });

describe('registration email-check window (register.md §13.1)', () => {
  it('lasts 30 minutes after the code is accepted', () => {
    vi.stubEnv('REGISTRATION_TICKET_SECRET', 's'.repeat(40));
    expect(REGISTRATION_TICKET_TTL_MS).toBe(30 * 60 * 1000);
    const { payload } = issueRegistrationTicket('ada@test.example');
    expect(payload.expiresAt - payload.issuedAt).toBe(30 * 60 * 1000);
  });
});

describe('required GPA rounds the needed average up (tool-required-gpa.md §13.1)', () => {
  it('rounds 4.65225 up to 4.66, never down', () => {
    // (4.5 × 150 − 4.4 × 90 − ...) chosen so the exact need is 4.65225: 4.65225 × 40 = 186.09.
    const outcome = requiredGpa({ currentCgpa: 4.5, completedUnits: 100, remainingUnits: 40, targetCgpa: (4.5 * 100 + 186.09) / 140 });
    expect(outcome).toMatchObject({ status: 'needed', required: 4.66 });
  });

  it('keeps exact two-decimal answers exact despite floating-point noise', () => {
    expect(requiredGpa({ currentCgpa: 3.4, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 })).toMatchObject({ status: 'needed', required: 3.65 });
    expect(requiredGpa({ currentCgpa: 3.38, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 })).toMatchObject({ status: 'needed', required: 3.68 });
    expect(requiredGpa({ currentCgpa: 4.2, completedUnits: 90, remainingUnits: 60, targetCgpa: 4.5 })).toMatchObject({ status: 'needed', required: 4.95 });
  });

  it('rounds a small remainder up to the next hundredth', () => {
    // Exact need 3.6510 → 3.66.
    const outcome = requiredGpa({ currentCgpa: 3.4, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 + 0.06 / 150 });
    expect(outcome).toMatchObject({ status: 'needed', required: 3.66 });
  });

  it('never rounds a reachable need above 5.00', () => {
    const outcome = requiredGpa({ currentCgpa: 4.0, completedUnits: 100, remainingUnits: 100, targetCgpa: 4.4999 });
    expect(outcome.status).toBe('needed');
    if (outcome.status === 'needed') expect(outcome.required).toBeLessThanOrEqual(5);
  });
});

describe('maintenance return path (maintenance.md §5.4)', () => {
  it('accepts same-site paths with their query', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/results/abc?importCode=XYZ')).toBe('/results/abc?importCode=XYZ');
    expect(safeNextPath('/login')).toBe('/login');
  });

  it('falls back to / for anything unsafe or missing', () => {
    for (const bad of [
      null, undefined, '', 'dashboard', 'https://evil.example', '//evil.example', '/\\evil.example', '/\\/evil',
      '/maintenance', '/maintenance?next=/x', '/maintenance/', '/MAINTENANCE', '/ok\nnext', '/ok\\path', `/${'a'.repeat(600)}`,
      ['/dashboard'], 42,
    ]) {
      expect(safeNextPath(bad as never), String(bad)).toBe('/');
    }
  });

  it('builds the redirect with an encoded next, or none for the home page', () => {
    expect(buildMaintenanceRedirect('/login')).toBe('/maintenance?next=%2Flogin');
    expect(buildMaintenanceRedirect('/register')).toBe('/maintenance?next=%2Fregister');
    expect(buildMaintenanceRedirect('/results/abc?importCode=XYZ')).toBe('/maintenance?next=%2Fresults%2Fabc%3FimportCode%3DXYZ');
    expect(buildMaintenanceRedirect('/')).toBe('/maintenance');
    expect(buildMaintenanceRedirect('//evil.example')).toBe('/maintenance');
    expect(buildMaintenanceRedirect('/maintenance')).toBe('/maintenance');
  });

  it('round-trips through URLSearchParams', () => {
    const href = buildMaintenanceRedirect('/semesters/s1?tab=courses&x=1');
    const next = new URL(href, 'https://app.test').searchParams.get('next');
    expect(safeNextPath(next)).toBe('/semesters/s1?tab=courses&x=1');
  });
});

describe('sign-in return path (?next=)', () => {
  it('returns to a safe same-site path, else the dashboard', () => {
    expect(afterSignInPath(`?next=${encodeURIComponent('/settings#delete-account')}`)).toBe('/settings#delete-account');
    expect(afterSignInPath('?next=/results/abc?x=1')).toBe('/results/abc?x=1');
    expect(afterSignInPath('')).toBe('/dashboard');
    for (const bad of ['//evil.example', 'https://evil.example', '/\\evil.example', '/login', '/register?x=1', '/', '/maintenance']) {
      expect(afterSignInPath(`?next=${encodeURIComponent(bad)}`), bad).toBe('/dashboard');
    }
  });

  it('builds the sign-in redirect with a checked path', () => {
    expect(buildSignInRedirect('/settings#help')).toBe('/login?next=%2Fsettings%23help');
    expect(buildSignInRedirect('/')).toBe('/login');
    expect(buildSignInRedirect('//evil.example')).toBe('/login');
  });
});

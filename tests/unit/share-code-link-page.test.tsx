import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, disabled: [] as string[] }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/platform/settings-server', () => ({
  getPlatformSettings: async () => ({
    maintenanceMode: false,
    disabledFeatures: state.disabled,
    announcementBanner: null,
    ageGate: { enforceUnknown: true },
  }),
}));

import SharedCodePage, { metadata, revalidate } from '@/app/(public)/c/[code]/page';
import { loadSharedCourseList } from '@/app/(public)/c/[code]/share-code';
import {
  androidImportLink,
  isAndroidDevice,
  normaliseImportCode,
  rememberPendingImportCode,
  takePendingImportCode,
  webImportPath,
} from '@/app/(public)/c/import-link';

let store: ReturnType<typeof queryTestDb>;

const sharedDoc = {
  code: 'ABC123',
  authorId: 'secret-author-uid',
  useCount: 14,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  courses: [
    { code: 'CSC 301', title: 'Data Structures', units: 3, caScore: 25 },
    { code: 'MTH 305', title: 'Numerical Methods', units: 2 },
  ],
};

async function renderPage(code: string) {
  const ui = await SharedCodePage({ params: Promise.resolve({ code }) });
  return render(ui);
}

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function useUserAgent(ua: string) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.disabled = [];
  localStorage.clear();
});

describe('share-code link page', () => {
  it('caches for five minutes and is never indexed', async () => {
    expect(revalidate).toBe(300);
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('rejects codes that do not match ^[A-Z0-9]{6}$ without reading Firestore', async () => {
    const spy = vi.spyOn(store.db, 'collection');
    for (const code of ['ABC12', 'ABC1234', 'ABC-12', '../x', '']) {
      expect(await loadSharedCourseList(code)).toEqual({ status: 'invalid' });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts a lowercase code from a typed URL', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    expect(await loadSharedCourseList('abc123')).toMatchObject({ status: 'ok', code: 'ABC123' });
  });

  it('shows only course code, title and units, never the author or scores', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    const { container } = await renderPage('ABC123');
    expect(screen.getByText('CSC 301')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.getByText('Numerical Methods')).toBeInTheDocument();
    expect(container.textContent).toContain('5 units');
    expect(container.textContent).not.toContain('secret-author-uid');
    expect(container.textContent).not.toMatch(/useCount|14 imports|25/);
  });

  it('on Android, leads with the app link and keeps web import as a text link', async () => {
    useUserAgent(ANDROID_UA);
    store.docs.set('shareCodes/ABC123', sharedDoc);
    await renderPage('ABC123');
    expect(await screen.findByRole('link', { name: /Open in the Android app/ })).toHaveAttribute('href', 'acadegrade://import-code?code=ABC123');
    const web = screen.getByRole('link', { name: /Import on the web instead/ });
    expect(web).toHaveAttribute('href', '/results?importCode=ABC123');
    expect(screen.getByRole('link', { name: /Get it for Android/ })).toHaveAttribute('href', '/app');
    await userEvent.setup().click(web);
    expect(takePendingImportCode()).toBe('ABC123');
  });

  it.each([['desktop', DESKTOP_UA], ['iPhone', IPHONE_UA]])('on %s, offers web import and no deep link anywhere', async (_name, ua) => {
    useUserAgent(ua);
    store.docs.set('shareCodes/ABC123', sharedDoc);
    const { container } = await renderPage('ABC123');
    expect(screen.getByRole('link', { name: 'Import on the web' })).toHaveAttribute('href', '/results?importCode=ABC123');
    expect(screen.getByRole('link', { name: /Create a free account/ })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /Get the Android app/ })).toHaveAttribute('href', '/app');
    expect(container.innerHTML).not.toContain('acadegrade://');
    expect(screen.queryByRole('link', { name: /Open in the Android app/ })).not.toBeInTheDocument();
  });

  it('remembers the code when a visitor creates an account first', async () => {
    useUserAgent(DESKTOP_UA);
    store.docs.set('shareCodes/ABC123', sharedDoc);
    await renderPage('ABC123');
    await userEvent.setup().click(screen.getByRole('link', { name: /Create a free account/ }));
    expect(takePendingImportCode()).toBe('ABC123');
  });

  it('shows the totals in the meta line and the foot bar', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    const { container } = await renderPage('ABC123');
    expect(screen.getByRole('heading', { level: 1, name: 'Shared course list' })).toBeInTheDocument();
    expect(container.textContent).toContain('Shared by a classmate. 2 courses, 5 units.');
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(container.textContent).toContain('Scores stay private');
  });

  it('shows a paused state without courses when share_code is switched off', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    state.disabled = ['share_code'];
    const { container } = await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /Course sharing is paused/ })).toBeInTheDocument();
    expect(container.textContent).not.toContain('CSC 301');
  });

  it('treats a disabled or missing code as unavailable', async () => {
    store.docs.set('shareCodes/ABC123', { ...sharedDoc, disabled: true });
    expect(await loadSharedCourseList('ABC123')).toEqual({ status: 'not_found' });
    expect(await loadSharedCourseList('ZZZ999')).toEqual({ status: 'not_found' });
    await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /This code isn.t available/ })).toBeInTheDocument();
  });

  it('shows a retry message when Firestore cannot be read', async () => {
    state.db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('offline'); } }) }) };
    expect(await loadSharedCourseList('ABC123')).toEqual({ status: 'unavailable' });
    await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /couldn.t load/i })).toBeInTheDocument();
  });

  it('drops malformed course rows and caps the list at 100', async () => {
    store.docs.set('shareCodes/ABC123', {
      ...sharedDoc,
      courses: [
        ...Array.from({ length: 120 }, (_, index) => ({ code: `CSC ${100 + index}`, title: 'T', units: 2 })),
        { code: 42, title: null, units: 'x' },
      ],
    });
    const result = await loadSharedCourseList('ABC123');
    expect(result.status === 'ok' && result.courses.length).toBe(100);
  });
});

describe('import link helpers', () => {
  it('detects Android from client hints or the user agent', () => {
    expect(isAndroidDevice({ userAgent: ANDROID_UA })).toBe(true);
    expect(isAndroidDevice({ userAgent: DESKTOP_UA, userAgentData: { platform: 'Android' } })).toBe(true);
    expect(isAndroidDevice({ userAgent: DESKTOP_UA, userAgentData: { platform: 'Windows' } })).toBe(false);
    expect(isAndroidDevice({ userAgent: IPHONE_UA })).toBe(false);
    expect(isAndroidDevice(null)).toBe(false);
  });

  it('normalises only six-character letter and digit codes', () => {
    expect(normaliseImportCode(' abc123 ')).toBe('ABC123');
    expect(normaliseImportCode('ABC12')).toBeNull();
    expect(normaliseImportCode(null)).toBeNull();
    expect(androidImportLink('ABC123')).toBe('acadegrade://import-code?code=ABC123');
    expect(webImportPath('ABC123')).toBe('/results?importCode=ABC123');
  });

  it('remembers a pending code across sign-in and hands it out once', () => {
    rememberPendingImportCode('ABC123', 1_000);
    expect(takePendingImportCode(2_000)).toBe('ABC123');
    expect(takePendingImportCode(3_000)).toBeNull();
  });

  it('forgets a pending code after a day', () => {
    rememberPendingImportCode('ABC123', 0);
    expect(takePendingImportCode(24 * 60 * 60 * 1000 + 1)).toBeNull();
  });
});

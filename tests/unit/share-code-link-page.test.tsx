import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('@/components/layout/PublicShell', () => ({
  PublicHeader: () => <nav>Public header</nav>,
  PublicFooter: () => <footer>Public footer</footer>,
}));

import SharedCodePage, { metadata, revalidate } from '@/app/(public)/c/[code]/page';
import { loadSharedCourseList } from '@/app/(public)/c/[code]/share-code';
import {
  androidImportLink,
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

  it('offers the Android app, web import after sign-in and registration', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    await renderPage('ABC123');
    expect(screen.getByRole('link', { name: /Open in the Android app/ })).toHaveAttribute('href', 'acadegrade://import-code?code=ABC123');
    expect(screen.getByRole('link', { name: /Import on the web/ })).toHaveAttribute('href', '/results?importCode=ABC123');
    expect(screen.getByRole('link', { name: /Create a free account/ })).toHaveAttribute('href', '/register');
  });

  it('shows a paused state without courses when share_code is switched off', async () => {
    store.docs.set('shareCodes/ABC123', sharedDoc);
    state.disabled = ['share_code'];
    const { container } = await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /Course code sharing is paused/ })).toBeInTheDocument();
    expect(container.textContent).not.toContain('CSC 301');
  });

  it('treats a disabled or missing code as unavailable', async () => {
    store.docs.set('shareCodes/ABC123', { ...sharedDoc, disabled: true });
    expect(await loadSharedCourseList('ABC123')).toEqual({ status: 'not_found' });
    expect(await loadSharedCourseList('ZZZ999')).toEqual({ status: 'not_found' });
    await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /This code is not available/ })).toBeInTheDocument();
  });

  it('shows a retry message when Firestore cannot be read', async () => {
    state.db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('offline'); } }) }) };
    expect(await loadSharedCourseList('ABC123')).toEqual({ status: 'unavailable' });
    await renderPage('ABC123');
    expect(screen.getByRole('heading', { name: /could not load/i })).toBeInTheDocument();
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

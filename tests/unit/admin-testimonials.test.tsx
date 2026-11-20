import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any, requireAdmin: vi.fn(), audit: vi.fn(),
  // Stable, like the real hook, so the screen loads once.
  auth: { user: { uid: 'a', email: 'admin@test.example', getIdToken: async () => 'tok' } },
}));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { GET, POST } from '@/app/api/admin/testimonials/route';
import { getApprovedTestimonials, getProofCountThreshold } from '@/lib/testimonials/server';
import {
  DEFAULT_COUNT_THRESHOLD, TESTIMONIAL_MAX_WORDS, TestimonialValidationError, countWords, parseCountThreshold, parseTestimonialInput, publicTestimonialView,
} from '@/lib/testimonials/testimonials';
import { PROOF_SAMPLE_TESTIMONIALS } from '@/lib/public/proof-samples';
import AdminTestimonialsPage from '@/app/(admin)/admin/testimonials/page';

vi.setConfig({ testTimeout: 15000 });

const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
const GOOD = { quote: 'It told me what I needed for a 2:1.', firstName: 'Ngozi', level: '300L', department: 'Economics', university: 'University of Nigeria, Nsukka', consentDate: '2026-11-10' };
let store: ReturnType<typeof queryTestDb>;
const post = (body: unknown) => POST(new Request('https://app.test/api/admin/testimonials', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const get = () => GET(new Request('https://app.test/api/admin/testimonials', { headers: { Authorization: 'Bearer t' } }));

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
});

describe('testimonial validation', () => {
  it('accepts a complete entry and strips pasted quotation marks', () => {
    expect(parseTestimonialInput({ ...GOOD, quote: '“It told me what I needed.”' }, '2026-11-17')).toMatchObject({ quote: 'It told me what I needed.' });
  });

  it('enforces 25 words, first name only, a known level and a past consent date', () => {
    const long = Array.from({ length: TESTIMONIAL_MAX_WORDS + 1 }, (_, index) => `w${index}`).join(' ');
    const bad = [
      { ...GOOD, quote: long },
      { ...GOOD, quote: '' },
      { ...GOOD, firstName: 'Ngozi Okafor' },
      { ...GOOD, firstName: '' },
      { ...GOOD, level: '800L' },
      { ...GOOD, department: '' },
      { ...GOOD, university: '' },
      { ...GOOD, consentDate: '2026-02-30' },
      { ...GOOD, consentDate: '2026-11-18' },
      { ...GOOD, consentDate: '' },
    ];
    for (const body of bad) expect(() => parseTestimonialInput(body, '2026-11-17'), JSON.stringify(body)).toThrow(TestimonialValidationError);
    expect(countWords(Array.from({ length: 25 }, () => 'w').join(' '))).toBe(25);
  });

  it('accepts a whole-number threshold only', () => {
    expect(parseCountThreshold(250)).toBe(250);
    for (const value of [-1, 1.5, '100', null, 2_000_000]) expect(() => parseCountThreshold(value)).toThrow(TestimonialValidationError);
  });

  it('exposes only approved, still-valid quotes and never the consent date', () => {
    expect(publicTestimonialView('a', { ...GOOD, status: 'draft' })).toBeNull();
    expect(publicTestimonialView('a', { ...GOOD, status: 'approved', quote: '' })).toBeNull();
    const view = publicTestimonialView('a', { ...GOOD, status: 'approved' });
    expect(view).toEqual({ id: 'a', quote: GOOD.quote, firstName: 'Ngozi', level: '300L', department: 'Economics', university: GOOD.university });
  });

  it('keeps the SAMPLE fixtures within the same rules and clearly separate from real data', () => {
    expect(PROOF_SAMPLE_TESTIMONIALS).toHaveLength(3);
    for (const sample of PROOF_SAMPLE_TESTIMONIALS) {
      expect(sample.id).toMatch(/^sample-/);
      expect(countWords(sample.quote)).toBeLessThanOrEqual(TESTIMONIAL_MAX_WORDS);
      expect(sample.university).toBeNull();
    }
  });
});

describe('/api/admin/testimonials', () => {
  it('creates drafts, approves, hides, edits and deletes, auditing each action', async () => {
    const created = await post({ action: 'create', data: GOOD });
    expect(created.status).toBe(201);
    const { testimonial } = await created.json();
    expect(testimonial).toMatchObject({ status: 'draft', firstName: 'Ngozi' });
    const id = testimonial.id as string;
    expect(store.docs.get(`public_testimonials/${id}`)).toMatchObject({ status: 'draft', createdBy: ADMIN.email });

    expect(await (await post({ action: 'approve', id })).json()).toMatchObject({ testimonial: { status: 'approved' } });
    expect(store.docs.get(`public_testimonials/${id}`).approvedAt).toBeInstanceOf(Date);
    expect(await (await post({ action: 'update', id, data: { ...GOOD, department: 'Statistics' } })).json()).toMatchObject({ testimonial: { status: 'approved', department: 'Statistics' } });
    expect(await (await post({ action: 'hide', id })).json()).toMatchObject({ testimonial: { status: 'hidden' } });
    expect((await post({ action: 'delete', id })).status).toBe(200);
    expect(store.paths('public_testimonials/')).toEqual([]);

    expect(state.audit.mock.calls.map(([entry]) => entry.action)).toEqual([
      'testimonials.create', 'testimonials.approve', 'testimonials.update', 'testimonials.hide', 'testimonials.delete',
    ]);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ actorEmail: ADMIN.email, target: `public_testimonials/${id}` }));
  });

  it('rejects invalid entries and unknown ids without writing or auditing', async () => {
    expect((await post({ action: 'create', data: { ...GOOD, firstName: 'Two Names' } })).status).toBe(400);
    expect((await post({ action: 'approve', id: 'missing' })).status).toBe(404);
    expect((await post({ action: 'publish', id: 'x' })).status).toBe(400);
    expect(store.paths('public_testimonials/')).toEqual([]);
    expect(state.audit).not.toHaveBeenCalled();
  });

  it('sets the count threshold in config/proof, audited, and lists everything for the admin', async () => {
    expect((await post({ action: 'threshold', value: 250 })).status).toBe(200);
    expect(store.docs.get('config/proof')).toMatchObject({ countThreshold: 250, updatedBy: ADMIN.email });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'testimonials.threshold', before: { countThreshold: 100 }, after: { countThreshold: 250 } }));
    expect((await post({ action: 'threshold', value: -5 })).status).toBe(400);

    store.docs.set('public_testimonials/x', { ...GOOD, status: 'hidden', createdAt: new Date('2026-11-12T00:00:00Z') });
    const body = await (await get()).json();
    expect(body).toMatchObject({ countThreshold: 250, minimumToShow: 3, testimonials: [{ id: 'x', status: 'hidden' }] });
  });

  it('requires an admin', async () => {
    const { AdminAuthorizationError } = await import('@/lib/api/admin-auth');
    state.requireAdmin.mockRejectedValueOnce(new AdminAuthorizationError(403));
    expect((await get()).status).toBe(403);
  });
});

describe('server reads for public pages', () => {
  it('returns approved quotes only, newest approval first, and the threshold with its default', async () => {
    store.docs.set('public_testimonials/a', { ...GOOD, status: 'approved', approvedAt: new Date('2026-11-10T00:00:00Z') });
    store.docs.set('public_testimonials/b', { ...GOOD, firstName: 'Bola', status: 'approved', approvedAt: new Date('2026-11-12T00:00:00Z') });
    store.docs.set('public_testimonials/c', { ...GOOD, status: 'draft' });
    store.docs.set('public_testimonials/d', { ...GOOD, status: 'hidden' });
    expect((await getApprovedTestimonials()).map((row) => row.id)).toEqual(['b', 'a']);
    expect(await getProofCountThreshold()).toBe(DEFAULT_COUNT_THRESHOLD);
    store.docs.set('config/proof', { countThreshold: 40 });
    expect(await getProofCountThreshold()).toBe(40);
  });

  it('never throws on a read failure', async () => {
    state.db = { collection: () => { throw new Error('down'); } };
    expect(await getApprovedTestimonials()).toEqual([]);
    expect(await getProofCountThreshold()).toBe(DEFAULT_COUNT_THRESHOLD);
  });
});

describe('Admin > Testimonials screen', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        if (body.action === 'approve') return new Response(JSON.stringify({ success: true, testimonial: { id: 'q1', ...GOOD, status: 'approved', createdAt: null, updatedAt: null, approvedAt: null } }), { status: 200 });
        return new Response(JSON.stringify({ success: true, countThreshold: body.value }), { status: 200 });
      }
      return new Response(JSON.stringify({
        testimonials: [{ id: 'q1', ...GOOD, status: 'draft', createdAt: null, updatedAt: null, approvedAt: null }],
        countThreshold: 100, minimumToShow: 3,
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows each quote with its status, says why the section is hidden, and approves', async () => {
    const user = userEvent.setup();
    render(<AdminTestimonialsPage />);
    const list = await screen.findByRole('list', { name: 'Quotes' });
    expect(within(list).getByText(/It told me what I needed/)).toBeInTheDocument();
    expect(screen.getByText(/hidden: 0 of 3 approved quotes needed/)).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: 'Approve the quote from Ngozi' }));
    await waitFor(() => expect(within(list).getByRole('button', { name: 'Hide the quote from Ngozi' })).toBeInTheDocument());
    const approve = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(approve![1].body))).toEqual({ action: 'approve', id: 'q1' });
  });

  it('saves the threshold', async () => {
    const user = userEvent.setup();
    render(<AdminTestimonialsPage />);
    const field = await screen.findByRole('textbox', { name: 'Show the student count from' });
    await user.clear(field);
    await user.type(field, '150');
    await user.click(screen.getByRole('button', { name: 'Save threshold' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST' && JSON.parse(String(init.body)).value === 150)).toBe(true));
  });
});

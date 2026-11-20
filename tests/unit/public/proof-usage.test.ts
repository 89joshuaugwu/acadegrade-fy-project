import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db, usage } = vi.hoisted(() => ({
  db: {
    fail: false,
    quotes: [] as { id: string; quote: string; firstName: string; level: string; department: string; university: string | null }[],
    metrics: undefined as Record<string, unknown> | undefined,
    threshold: 100,
  },
  usage: { fail: false },
}));

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn }));

vi.mock('@/lib/testimonials/server', () => ({
  getApprovedTestimonials: async () => (db.fail ? [] : db.quotes),
  getProofCountThreshold: async () => db.threshold,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => {
          if (db.fail) throw new Error('offline');
          return { data: () => db.metrics };
        },
      }),
    }),
  },
}));

vi.mock('@/lib/usage/server', async () => {
  const policy = await vi.importActual<typeof import('@/lib/usage/policy')>('@/lib/usage/policy');
  return {
    inspectStoredUsagePolicy: async () => {
      if (usage.fail) throw new Error('offline');
      return policy.inspectUsagePolicy({ dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 0 } });
    },
  };
});

import {
  DEFAULT_COUNT_THRESHOLD,
  PROOF_MIN_TESTIMONIALS,
  isProofPreviewDeployment,
  readPublicProof,
  resolvePublicProof,
  sampleProof,
  selectCount,
  selectTestimonials,
} from '@/lib/public/proof';
import { readPublicUsage, toPublicUsage } from '@/lib/public/usage-public';

const approved = (n: number) => ({ id: `q${n}`, quote: `Quote ${n}`, firstName: 'Ada', level: '300L', department: 'Law', university: 'UNN' });

beforeEach(() => {
  db.fail = false;
  db.quotes = [];
  db.metrics = undefined;
  db.threshold = 100;
  usage.fail = false;
});

describe('public proof (real quotes and counts only)', () => {
  it('hides the section with fewer than three approved quotes', () => {
    expect(PROOF_MIN_TESTIMONIALS).toBe(3);
    const items = [approved(1), approved(2)];
    expect(selectTestimonials(items)).toBeNull();
    expect(selectTestimonials([...items, null, approved(3)])).toHaveLength(3);
  });

  it('defaults the threshold to 100', () => {
    expect(DEFAULT_COUNT_THRESHOLD).toBe(100);
  });

  it('shows the count only at or above the threshold, with universities when recorded', () => {
    expect(selectCount({ totalUsers: 20 }, 100)).toBeNull();
    expect(selectCount({ totalUsers: 1240 }, 100)).toEqual({ students: 1240, universities: null });
    expect(selectCount({ totalUsers: 1240, universityCount: 38 }, 100)).toEqual({ students: 1240, universities: 38 });
    expect(selectCount({ totalUsers: 'many' }, 100)).toBeNull();
  });

  it('reads stored proof and fails closed on a storage error', async () => {
    db.quotes = [approved(1), approved(2), approved(3)];
    db.metrics = { totalUsers: 20 };
    const proof = await readPublicProof();
    expect(proof.testimonials).toHaveLength(3);
    expect(proof.count).toBeNull();
    expect(proof.preview).toBe(false);

    db.threshold = 10;
    expect((await readPublicProof()).count).toEqual({ students: 20, universities: null });

    db.fail = true;
    expect(await readPublicProof()).toEqual({ testimonials: null, count: null, preview: false });
  });

  it('shows marked samples only on preview deployments', async () => {
    expect(isProofPreviewDeployment({ VERCEL_ENV: 'preview' })).toBe(true);
    expect(isProofPreviewDeployment({ VERCEL_ENV: 'production' })).toBe(false);
    const preview = await resolvePublicProof({ VERCEL_ENV: 'preview' });
    expect(preview.preview).toBe(true);
    expect(preview.testimonials?.every((item) => item.sample)).toBe(true);
    expect(preview.count?.sample).toBe(true);
    expect(sampleProof().testimonials).toHaveLength(3);
    const production = await resolvePublicProof({ VERCEL_ENV: 'production' });
    expect(production.preview).toBe(false);
    expect(production.testimonials).toBeNull();
  });
});

describe('public usage allowances', () => {
  it('returns only what public pages need', async () => {
    const value = await readPublicUsage();
    expect(value?.dailyLimits).toEqual({ insights: 3, forecast: 8, whatif: 20, ocr: 0 });
    expect(value?.coins.enabled).toBe(false);
    expect(Object.keys(value!.coins.features)).toEqual(['insights', 'forecast', 'whatif', 'ocr']);
    expect(Object.keys(value!.coins.features.insights)).toEqual(['enabled', 'price', 'dailyUseCap']);
  });

  it('is null when config/usage cannot be read', async () => {
    usage.fail = true;
    expect(await readPublicUsage()).toBeNull();
  });

  it('maps a policy without leaking other fields', async () => {
    const { defaultUsagePolicy } = await import('@/lib/usage/policy');
    const mapped = toPublicUsage(defaultUsagePolicy());
    expect(Object.keys(mapped)).toEqual(['dailyLimits', 'coins']);
    expect(Object.keys(mapped.coins)).toEqual(['enabled', 'coinsPerAd', 'dailyEarnCap', 'features']);
  });
});

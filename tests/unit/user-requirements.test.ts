import { describe, expect, it } from 'vitest';
import {
  AI_CONSENT_VERSION,
  DEFAULT_LEGAL_VERSION,
  RequirementError,
  computeAnswerUpdate,
  parseAnswers,
  pendingRequirements,
  readLegalVersions,
} from '@/lib/user/requirements';

const legal = { termsVersion: 'v2', privacyVersion: 'p2' };
const now = new Date('2026-11-13T10:00:00Z');
const ids = (data: unknown, versions = legal) => pendingRequirements(data, versions).map((item) => item.id);

describe('legal versions', () => {
  it('defaults both versions when config/legal is absent or invalid', () => {
    expect(readLegalVersions(undefined)).toEqual({ termsVersion: DEFAULT_LEGAL_VERSION, privacyVersion: DEFAULT_LEGAL_VERSION });
    expect(readLegalVersions({ termsVersion: '', privacyVersion: 7 })).toEqual({ termsVersion: DEFAULT_LEGAL_VERSION, privacyVersion: DEFAULT_LEGAL_VERSION });
    expect(readLegalVersions({ termsVersion: '2027-01-01', privacyVersion: 'p9' })).toEqual({ termsVersion: '2027-01-01', privacyVersion: 'p9' });
  });
});

describe('pending requirements', () => {
  it('lists everything except AI consent for an old account with no fields at all', () => {
    expect(ids(undefined)).toEqual(['age', 'terms', 'privacy', 'marketing_consent']);
    expect(ids({ fullName: 'Old', matric: 'M1' })).toEqual(['age', 'terms', 'privacy', 'marketing_consent']);
  });

  it('describes each item with blocking level, version and copy', () => {
    const items = pendingRequirements({ ageStatus: 'adult' }, legal);
    expect(items).toEqual([
      { id: 'terms', blocking: 'app', version: 'v2', title: expect.any(String), description: expect.any(String) },
      { id: 'privacy', blocking: 'app', version: 'p2', title: expect.any(String), description: expect.any(String) },
      { id: 'ai_consent', blocking: 'ai', version: AI_CONSENT_VERSION, title: expect.any(String), description: expect.stringMatching(/Gemini.*Groq.*OpenRouter/s) },
      { id: 'marketing_consent', blocking: 'none', title: expect.any(String), description: expect.any(String) },
    ]);
    expect(pendingRequirements(undefined, legal)[0]).toEqual({ id: 'age', blocking: 'ai', title: expect.any(String), description: expect.any(String) });
  });

  it('clears items once answered and re-prompts terms/privacy when a version is bumped', () => {
    const answered = {
      ageStatus: 'adult',
      consents: {
        terms: { version: 'v2', at: now }, privacy: { version: 'p2', at: now },
        ai: { granted: true, version: AI_CONSENT_VERSION, at: now }, marketing: { granted: false, at: now },
      },
    };
    expect(ids(answered)).toEqual([]);
    expect(ids(answered, { termsVersion: 'v3', privacyVersion: 'p2' })).toEqual(['terms']);
  });

  it('never asks minors for AI consent and does not re-ask after a withdrawal', () => {
    expect(ids({ ageStatus: 'minor' })).not.toContain('ai_consent');
    expect(ids({ ageStatus: 'adult', consents: { ai: { granted: false, at: now } } })).not.toContain('ai_consent');
  });
});

describe('answer parsing', () => {
  it('accepts the documented shape and rejects unknown keys or values', () => {
    expect(parseAnswers({ answers: { age: 'adult', terms: { version: 'v2' }, aiConsent: false, marketingConsent: true } }))
      .toEqual({ age: 'adult', terms: { version: 'v2' }, aiConsent: false, marketingConsent: true });
    expect(() => parseAnswers({ answers: { age: 'teen' } })).toThrow(RequirementError);
    expect(() => parseAnswers({ answers: { surprise: true } })).toThrow(RequirementError);
    expect(() => parseAnswers({})).toThrow(RequirementError);
    expect(() => parseAnswers({ answers: {} })).toThrow(RequirementError);
  });
});

describe('recording answers', () => {
  it('records age with ageDeclaredAt for an unknown account', () => {
    expect(computeAnswerUpdate({}, { age: 'minor' }, legal, now)).toEqual({ ageStatus: 'minor', ageDeclaredAt: now });
  });

  it('records the one-way upgrade with ageUpgradedAt and keeps the first declaration time', () => {
    const declared = new Date('2026-01-01');
    expect(computeAnswerUpdate({ ageStatus: 'minor', ageDeclaredAt: declared }, { age: 'adult' }, legal, now))
      .toEqual({ ageStatus: 'adult', ageUpgradedAt: now });
  });

  it('is idempotent for the same age and refuses adult -> minor with 409', () => {
    expect(computeAnswerUpdate({ ageStatus: 'adult' }, { age: 'adult' }, legal, now)).toEqual({});
    try {
      computeAnswerUpdate({ ageStatus: 'adult' }, { age: 'minor' }, legal, now);
      throw new Error('expected a conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(RequirementError);
      expect(error).toMatchObject({ status: 409, code: 'AGE_CHANGE_REQUIRES_SUPPORT' });
    }
  });

  it('records consents with versions and timestamps while keeping the others', () => {
    const existing = { ageStatus: 'adult', consents: { marketing: { granted: true, at: new Date('2026-01-01') } } };
    expect(computeAnswerUpdate(existing, { terms: { version: 'v2' }, privacy: { version: 'p2' }, aiConsent: true }, legal, now)).toEqual({
      consents: {
        marketing: { granted: true, at: new Date('2026-01-01') },
        terms: { version: 'v2', at: now },
        privacy: { version: 'p2', at: now },
        ai: { granted: true, version: AI_CONSENT_VERSION, at: now },
      },
    });
  });

  it('allows withdrawing AI consent and opting out of marketing', () => {
    const existing = { ageStatus: 'adult', consents: { ai: { granted: true, version: AI_CONSENT_VERSION, at: now } } };
    expect(computeAnswerUpdate(existing, { aiConsent: false, marketingConsent: false }, legal, now)).toEqual({
      consents: { ai: { granted: false, version: AI_CONSENT_VERSION, at: now }, marketing: { granted: false, at: now } },
    });
  });

  it('rejects a stale terms or privacy version with 409 VERSION_MISMATCH', () => {
    expect(() => computeAnswerUpdate({}, { terms: { version: 'v1' } }, legal, now)).toThrow(expect.objectContaining({ status: 409, code: 'VERSION_MISMATCH' }));
    expect(() => computeAnswerUpdate({}, { privacy: { version: 'p1' } }, legal, now)).toThrow(expect.objectContaining({ code: 'VERSION_MISMATCH' }));
  });

  it('refuses AI consent from a minor, including in the same request as the age answer', () => {
    expect(() => computeAnswerUpdate({ ageStatus: 'minor' }, { aiConsent: true }, legal, now)).toThrow(expect.objectContaining({ status: 403, code: 'AGE_RESTRICTED' }));
    expect(() => computeAnswerUpdate({}, { age: 'minor', aiConsent: true }, legal, now)).toThrow(expect.objectContaining({ code: 'AGE_RESTRICTED' }));
    expect(computeAnswerUpdate({}, { age: 'adult', aiConsent: true }, legal, now)).toMatchObject({ ageStatus: 'adult', consents: { ai: { granted: true } } });
  });
});

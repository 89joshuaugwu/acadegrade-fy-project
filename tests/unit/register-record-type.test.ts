import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  verify: vi.fn(),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: {
    verifyIdToken: state.verify,
    getUser: state.getUser,
    getUserByEmail: state.getUserByEmail,
    updateUser: state.updateUser,
    createUser: state.createUser,
    deleteUser: state.deleteUser,
  },
  adminRtdb: { ref: () => ({ transaction: vi.fn() }) },
  adminMessaging: { sendEachForMulticast: vi.fn() },
}));
vi.mock('@/lib/email/mailer', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), welcomeEmail: () => '<p>hi</p>' }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));
vi.mock('@/lib/auth/registration-ticket', () => ({
  verifyRegistrationTicket: () => ({ email: 'alice@test.example', jti: 'ticket-1' }),
}));

import { POST as finalize } from '@/app/api/auth/register/finalize/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { messageForFinalizeError } from '@/lib/public/auth-copy';

let store: ReturnType<typeof queryTestDb>;

const send = (body: unknown, auth = true) => finalize(new NextRequest('https://app.test/api/auth/register/finalize', {
  method: 'POST',
  headers: { ...(auth ? { Authorization: 'Bearer good' } : {}), 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

const tertiaryBody = (extra: Record<string, unknown> = {}) => ({
  authMethod: 'google',
  profile: {
    fullName: 'Alice Ade', matric: 'ABC/123', email: 'alice@test.example', university: 'Test University',
    department: 'Computer Science', programme: 'B.Sc Computer Science', courseDuration: 4, currentLevel: 100,
    entrySession: '2024/2025', recordMode: 'fromScratch',
  },
  ...extra,
});

const schoolBody = (recordType: 'olevel' | 'admission', extra: Record<string, unknown> = {}) => ({
  authMethod: 'google',
  recordType,
  profile: { fullName: 'Chidi Okeke', email: 'alice@test.example' },
  ...extra,
});

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example', email_verified: true });
  state.getUser.mockReset().mockResolvedValue({ providerData: [{ providerId: 'google.com' }], photoURL: null });
  state.getUserByEmail.mockReset().mockResolvedValue({ uid: 'alice' });
  state.updateUser.mockReset().mockResolvedValue(undefined);
  state.createUser.mockReset();
  state.deleteUser.mockReset().mockResolvedValue(undefined);
});

describe('finalize: record types (Phase 2b)', () => {
  it('creates an O-level account without matric, academic fields or past semesters', async () => {
    const response = await send(schoolBody('olevel'));
    expect(response.status).toBe(201);
    const user = store.docs.get('users/alice');
    expect(user).toMatchObject({ fullName: 'Chidi Okeke', email: 'alice@test.example', recordType: 'olevel', setupComplete: true });
    expect(user).not.toHaveProperty('matric');
    expect(user).not.toHaveProperty('university');
    expect(user).not.toHaveProperty('entrySession');
    expect(store.paths('_matric_numbers')).toEqual([]);
    expect(store.paths('users/alice/semesters')).toEqual([]);
    expect(store.docs.get('analytics/alice')).toMatchObject({ cgpa: 0 });
    expect(isStudentProfileComplete(user)).toBe(true);
  });

  it('creates an admission account and ignores any academic fields sent with it', async () => {
    const response = await send(schoolBody('admission', { pastSemesters: [{ level: 100, semester: 1, session: '2024/2025' }] }));
    expect(response.status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ recordType: 'admission' });
    expect(store.paths('users/alice/semesters')).toEqual([]);
  });

  it('keeps old clients unchanged: no recordType is stored for a tertiary request', async () => {
    expect((await send(tertiaryBody())).status).toBe(201);
    expect(store.docs.get('users/alice')).not.toHaveProperty('recordType');
    expect(store.docs.get('users/alice')).toMatchObject({ matric: 'ABC/123' });
  });

  it('accepts an explicit tertiary recordType with the full profile', async () => {
    expect((await send(tertiaryBody({ recordType: 'tertiary' }))).status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ matric: 'ABC/123' });
  });

  it('rejects an unknown record type', async () => {
    const response = await send(schoolBody('olevel', { recordType: 'primary' }));
    expect(response.status).toBe(400);
    expect(store.paths('users')).toEqual([]);
  });

  it('still requires a name and email for O-level accounts', async () => {
    expect((await send({ authMethod: 'google', recordType: 'olevel', profile: { email: 'alice@test.example' } })).status).toBe(400);
  });

  it('409 RECORD_TYPE_NEEDS_UPDATE: an old client cannot overwrite an O-level account (Google)', async () => {
    const existing = { fullName: 'Chidi Okeke', email: 'alice@test.example', recordType: 'olevel', setupComplete: true };
    store.docs.set('users/alice', { ...existing });
    const response = await send(tertiaryBody());
    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.code).toBe('RECORD_TYPE_NEEDS_UPDATE');
    expect(json.error).toBe('This account tracks WAEC or JAMB results. Update AcadeGrade from the website to open it, or sign in on the website.');
    expect(store.docs.get('users/alice')).toEqual(existing);
    expect(store.paths('_matric_numbers')).toEqual([]);
  });

  it('409 RECORD_TYPE_NEEDS_UPDATE for an admission account on the email path, before the password changes', async () => {
    store.docs.set('_registration_tickets/ticket-1', { email: 'alice@test.example', used: false, expiresAt: { toMillis: () => Date.now() + 60_000 } });
    store.docs.set('users/alice', { fullName: 'Chidi', email: 'alice@test.example', recordType: 'admission', setupComplete: true });
    const response = await send({ ...tertiaryBody(), authMethod: 'email', verificationToken: 'x'.repeat(48), password: 'longenough1' }, false);
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('RECORD_TYPE_NEEDS_UPDATE');
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(store.docs.get('users/alice')).toMatchObject({ recordType: 'admission' });
  });

  it('a tertiary account that is not set up yet can still be finished by an old client', async () => {
    store.docs.set('users/alice', { email: 'alice@test.example', recordType: 'tertiary' });
    expect((await send(tertiaryBody())).status).toBe(201);
  });

  it('a finished O-level account cannot be set up twice', async () => {
    store.docs.set('users/alice', { fullName: 'Chidi Okeke', email: 'alice@test.example', recordType: 'olevel', setupComplete: true });
    const response = await send(schoolBody('olevel'));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('setup-complete');
  });
});

describe('profile completeness by record type', () => {
  it('needs only a name and email for O-level and admission accounts', () => {
    expect(isStudentProfileComplete({ fullName: 'A B', email: 'a@b.c', recordType: 'olevel' })).toBe(true);
    expect(isStudentProfileComplete({ fullName: 'A B', email: 'a@b.c', recordType: 'admission', setupComplete: true })).toBe(true);
    expect(isStudentProfileComplete({ fullName: 'A B', email: 'a@b.c', recordType: 'olevel', setupComplete: false })).toBe(false);
    expect(isStudentProfileComplete({ email: 'a@b.c', recordType: 'olevel' })).toBe(false);
  });

  it('keeps the tertiary rule for accounts without a record type', () => {
    expect(isStudentProfileComplete({ fullName: 'A B', email: 'a@b.c' })).toBe(false);
    expect(isStudentProfileComplete({ fullName: 'A B', email: 'a@b.c', recordType: 'tertiary' })).toBe(false);
  });
});

describe('finalize error copy', () => {
  it('shows the server sentence for RECORD_TYPE_NEEDS_UPDATE', () => {
    expect(messageForFinalizeError('RECORD_TYPE_NEEDS_UPDATE', 'Server sentence.')).toMatchObject({ tone: 'error', text: 'Server sentence.' });
  });
});

describe('registration form schema by record type', () => {
  it('an O-level registration needs no matric, university or timeline', async () => {
    const { schemaFor } = await import('@/app/(public)/register/schema');
    const result = schemaFor('olevel').safeParse({
      recordType: 'olevel', authMethod: 'google', fullName: 'Chidi Okeke', email: 'chidi@test.example', age: 'minor', termsAccepted: true,
    });
    expect(result.success).toBe(true);
  });

  it('still checks the password pair for email sign-up', async () => {
    const { schemaFor } = await import('@/app/(public)/register/schema');
    const result = schemaFor('admission').safeParse({
      recordType: 'admission', authMethod: 'email', fullName: 'Chidi Okeke', email: 'chidi@test.example', password: 'longenough1', confirmPassword: 'different1', age: 'adult', termsAccepted: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('confirmPassword');
  });

  it('keeps the tertiary rules (matric required) when no type or tertiary is chosen', async () => {
    const { schemaFor, formSchema } = await import('@/app/(public)/register/schema');
    expect(schemaFor(undefined)).toBe(formSchema);
    expect(schemaFor('tertiary')).toBe(formSchema);
    const result = formSchema.safeParse({ authMethod: 'google', fullName: 'Chidi Okeke', email: 'chidi@test.example', age: 'adult', termsAccepted: true });
    expect(result.success).toBe(false);
  });

  it('builds the O-level finalize body without academic fields', async () => {
    const { finalizeProfileFor } = await import('@/app/(public)/register/schema');
    expect(finalizeProfileFor({ recordType: 'olevel', fullName: ' Chidi ', email: 'chidi@test.example', matric: 'X/1', university: 'U' } as never)).toEqual({
      recordType: 'olevel', profile: { fullName: ' Chidi ', email: 'chidi@test.example' },
    });
  });
});

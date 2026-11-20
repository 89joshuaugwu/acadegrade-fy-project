import { z } from 'zod';
import type { StudentLevel, PastSemesterEntry } from '@/types/user';
import { buildAcademicSlots, parseAcademicSession } from '@/lib/academic/timeline';

/*
 * The registration form's rules, unchanged from before the redesign; only
 * the messages were rewritten (register.md §5). Step triggers validate the
 * fields of one step against the full schema, as before.
 */

const SESSION_MESSAGE = 'Use two years in a row, for example 2022/2023';

export const step1Base = z.object({
  authMethod: z.enum(['email', 'google']),
  fullName: z.string().trim().min(2, 'Enter your full name').max(100, 'That name is too long'),
  matric: z.string().trim().min(4, 'Enter your matric number').max(64, 'That matric number is too long').regex(
    /^[A-Za-z0-9/._-]+(?:\s+[A-Za-z0-9/._-]+)*$/,
    'Use only letters, numbers and / - _ .'
  ),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().max(128, 'That password is too long').optional(),
  confirmPassword: z.string().max(128, 'That password is too long').optional(),
  verificationToken: z.string().optional(),
});

/** Most semesters a student can have completed: from the entry level up to the current level. */
export function maxCompletedSemesters(courseDuration: number, currentLevel: number, entryLevel = 100): number {
  const years = Math.max(1, courseDuration - (entryLevel / 100 - 1));
  return Math.max(0, Math.min(years * 2, ((currentLevel - entryLevel) / 100 + 1) * 2));
}

export const step2Base = z.object({
  university: z.string().trim().min(2, 'Enter your university'),
  department: z.string().trim().min(2, 'Enter your department'),
  programme: z.string().trim().min(2, 'Enter your programme'),
  courseDuration: z.number().min(1).max(10),
  currentLevel: z.number().int().min(100).max(1000).refine((value) => value % 100 === 0, 'Choose your current level'),
  entrySession: z.string().trim().refine((value) => parseAcademicSession(value) !== null, SESSION_MESSAGE),
  // Direct entry (200 or 300 level) and extended-stay semesters. Optional; 100 and 0 are the defaults.
  entryLevel: z.union([z.literal(100), z.literal(200), z.literal(300)]).optional(),
  spilloverSemesters: z.number().int().min(0).max(4).optional(),
});

export const step3Base = z.object({
  recordMode: z.union([z.literal('fromScratch'), z.literal('complete')]),
  semestersCompleted: z.number().min(1).max(20).optional(),
  age: z.enum(['adult', 'minor'], { message: 'Choose your age group to continue' }),
  termsAccepted: z.boolean().refine((value) => value === true, 'Agree to the Terms and Privacy notice to continue'),
  aiConsent: z.boolean().optional(),
});

export const step4Base = z.object({
  pastSemesters: z.array(z.object({
    level: z.number(),
    semester: z.union([z.literal(1), z.literal(2)]),
    session: z.string().trim().refine((value) => parseAcademicSession(value) !== null, SESSION_MESSAGE),
    label: z.string(),
  })).optional(),
});

export const formSchema = step1Base
  .merge(step2Base)
  .merge(step3Base)
  .merge(step4Base)
  .refine((data) => data.authMethod !== 'email' || (!!data.password && data.password.length >= 8), {
    message: 'Use at least 8 characters',
    path: ['password'],
  })
  .refine((data) => data.authMethod !== 'email' || data.password === data.confirmPassword, {
    message: "The two passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.recordMode !== 'complete' || (data.semestersCompleted !== undefined && data.semestersCompleted > 0), {
    message: "Choose how many semesters you've finished",
    path: ['semestersCompleted'],
  })
  .refine((data) => data.currentLevel <= data.courseDuration * 100, {
    message: 'Your current level is beyond the length of your programme. Check the length.',
    path: ['currentLevel'],
  })
  .refine((data) => data.currentLevel >= (data.entryLevel ?? 100), {
    message: "Your current level can't be lower than the level you started in.",
    path: ['currentLevel'],
  })
  .refine(
    (data) => data.recordMode !== 'complete' || (data.semestersCompleted || 0) <= maxCompletedSemesters(data.courseDuration, data.currentLevel, data.entryLevel),
    { message: "That's more semesters than you could have finished by your current level.", path: ['semestersCompleted'] }
  )
  .refine((data) => data.recordMode !== 'complete' || data.pastSemesters?.length === data.semestersCompleted, {
    message: 'Confirm every finished semester before continuing',
    path: ['pastSemesters'],
  });

export type FormData = z.infer<typeof formSchema>;

/** sessionStorage only: per tab, never localStorage (register.md §5.12). */
export const REGISTRATION_DRAFT_KEY = 'acadegrade:registration-draft:v2';

export type SafeRegistrationDraft = {
  step: number;
  values: Partial<Omit<FormData, 'password' | 'confirmPassword' | 'verificationToken'>>;
};

export function withoutRegistrationSecrets(values: unknown): SafeRegistrationDraft['values'] {
  const source = values && typeof values === 'object' ? (values as Record<string, unknown>) : {};
  // Agreements are never restored from storage: each visit must tick them afresh.
  const {
    password: _password,
    confirmPassword: _confirmPassword,
    verificationToken: _verificationToken,
    termsAccepted: _termsAccepted,
    aiConsent: _aiConsent,
    ...safe
  } = source;
  return safe as SafeRegistrationDraft['values'];
}

export function generatePastSemesters(
  currentLevel: number,
  semestersCompleted: number,
  entrySession: string,
  courseDuration: number,
  entryLevel = 100
): PastSemesterEntry[] {
  return buildAcademicSlots(entrySession, courseDuration, entryLevel)
    .filter((slot) => slot.level <= currentLevel)
    .slice(0, semestersCompleted)
    .map((slot) => ({
      level: slot.level as StudentLevel,
      semester: slot.semester,
      session: slot.session,
      label: slot.label,
    }));
}

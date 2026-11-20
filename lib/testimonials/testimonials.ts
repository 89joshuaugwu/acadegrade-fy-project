/**
 * Student testimonials and the public count threshold (01 §8 "Proof policy",
 * home.md §5.6, owner decision B8). Pure; safe on the client and the server.
 *
 * Storage (server-only; client rules deny everything):
 *   public_testimonials/{id}  { quote, firstName, level, department, university,
 *                               consentDate: 'YYYY-MM-DD', status, createdAt,
 *                               updatedAt, approvedAt, createdBy, updatedBy }
 *   config/proof              { countThreshold, updatedAt, updatedBy }
 *
 * Public pages read only approved quotes, through the server (`lib/testimonials/server.ts`),
 * and show the section only when at least MIN_APPROVED_TO_SHOW are approved.
 */

export const PUBLIC_TESTIMONIALS_COLLECTION = 'public_testimonials';
export const PROOF_CONFIG_PATH = { collection: 'config', doc: 'proof' } as const;

export const TESTIMONIAL_STATUSES = ['draft', 'approved', 'hidden'] as const;
export type TestimonialStatus = typeof TESTIMONIAL_STATUSES[number];

export const TESTIMONIAL_MAX_WORDS = 25;
export const TESTIMONIAL_MAX_CHARS = 220;
export const MIN_APPROVED_TO_SHOW = 3;
export const DEFAULT_COUNT_THRESHOLD = 100;
export const MAX_COUNT_THRESHOLD = 1_000_000;
export const TESTIMONIAL_LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L', '700L', 'Graduate'] as const;

export interface TestimonialInput {
  quote: string;
  firstName: string;
  level: string;
  department: string;
  university: string;
  /** YYYY-MM-DD: the day the student agreed to the quote being published. */
  consentDate: string;
}

/** What the admin screen gets. */
export interface AdminTestimonial extends TestimonialInput {
  id: string;
  status: TestimonialStatus;
  createdAt: string | null;
  updatedAt: string | null;
  approvedAt: string | null;
}

/** What a public page may show: no consent date, no admin fields. */
export interface PublicTestimonial {
  id: string;
  quote: string;
  firstName: string;
  level: string;
  department: string;
  /** Null only for SAMPLE fixtures (lib/public/proof-samples.ts). */
  university: string | null;
}

export class TestimonialValidationError extends Error {}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const FIRST_NAME = /^[\p{L}][\p{L}'’-]{0,39}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new TestimonialValidationError(`${field} is required`);
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length < min) throw new TestimonialValidationError(`${field} is required`);
  if (trimmed.length > max) throw new TestimonialValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

/** Validates the admin form. `today` is YYYY-MM-DD (UTC); consent cannot be in the future. */
export function parseTestimonialInput(body: unknown, today = new Date().toISOString().slice(0, 10)): TestimonialInput {
  const value = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};

  // Quotation marks are added by the page, so strip any that were pasted in.
  const quote = text(value.quote, 'Quote', 1, TESTIMONIAL_MAX_CHARS).replace(/^["“'‘]+|["”'’]+$/g, '').trim();
  if (!quote) throw new TestimonialValidationError('Quote is required');
  if (countWords(quote) > TESTIMONIAL_MAX_WORDS) throw new TestimonialValidationError(`Keep the quote to ${TESTIMONIAL_MAX_WORDS} words or fewer`);

  const firstName = text(value.firstName, 'First name', 1, 40);
  if (!FIRST_NAME.test(firstName)) throw new TestimonialValidationError('Use the first name only (one word)');

  const level = text(value.level, 'Level', 1, 20);
  if (!(TESTIMONIAL_LEVELS as readonly string[]).includes(level)) throw new TestimonialValidationError('Choose a level');

  const department = text(value.department, 'Department', 2, 80);
  const university = text(value.university, 'University', 2, 120);

  const consentDate = typeof value.consentDate === 'string' ? value.consentDate.trim() : '';
  const match = ISO_DATE.exec(consentDate);
  const parsed = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!parsed || parsed.toISOString().slice(0, 10) !== consentDate) throw new TestimonialValidationError('Enter the consent date');
  if (consentDate > today) throw new TestimonialValidationError('The consent date cannot be in the future');

  return { quote, firstName, level, department, university, consentDate };
}

/** A whole number from 0 to 1,000,000 (0 shows the count whenever there is one). */
export function parseCountThreshold(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_COUNT_THRESHOLD) {
    throw new TestimonialValidationError(`The threshold must be a whole number from 0 to ${MAX_COUNT_THRESHOLD.toLocaleString('en-GB')}`);
  }
  return value;
}

/** Reads a stored threshold, falling back to the default for anything invalid. */
export function readCountThreshold(data: unknown): number {
  const raw = data && typeof data === 'object' ? (data as Record<string, unknown>).countThreshold : undefined;
  try {
    return parseCountThreshold(raw);
  } catch {
    return DEFAULT_COUNT_THRESHOLD;
  }
}

const isoTime = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const stamp = value as { toDate?: () => Date };
  const date = value instanceof Date ? value : typeof stamp.toDate === 'function' ? stamp.toDate() : new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function adminTestimonialView(id: string, data: Record<string, unknown>): AdminTestimonial {
  return {
    id,
    quote: str(data.quote),
    firstName: str(data.firstName),
    level: str(data.level),
    department: str(data.department),
    university: str(data.university),
    consentDate: str(data.consentDate),
    status: (TESTIMONIAL_STATUSES as readonly string[]).includes(data.status as string) ? data.status as TestimonialStatus : 'draft',
    createdAt: isoTime(data.createdAt),
    updatedAt: isoTime(data.updatedAt),
    approvedAt: isoTime(data.approvedAt),
  };
}

/** Null unless the stored document is approved and still valid (so a bad edit never reaches the page). */
export function publicTestimonialView(id: string, data: Record<string, unknown>): PublicTestimonial | null {
  if (data.status !== 'approved') return null;
  try {
    const input = parseTestimonialInput(data, '9999-12-31');
    return { id, quote: input.quote, firstName: input.firstName, level: input.level, department: input.department, university: input.university };
  } catch {
    return null;
  }
}

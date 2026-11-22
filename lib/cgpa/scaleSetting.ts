/**
 * The stored grading-scale choice (users/{uid}.gradingScale) and the custom
 * scale editor's draft. Optional and additive: a missing setting means ng5.
 * firestore.rules checks the same shape (validGradingScale).
 */
import {
  CUSTOM_SCALE_LIMITS,
  scaleBandRanges,
  type GradingScale,
  type GradingScaleId,
  type NceClassBoundaries,
  type ScaleValidationError,
} from './academicRules';

export const GRADING_SCALE_IDS: readonly GradingScaleId[] = ['ng5', 'ng5-noE', 'nbte4', 'nce5', 'custom'];

/** Custom scale as stored (validateCustomScale input). */
export interface StoredCustomScale {
  name?: string;
  maxPoint: number;
  bands: { grade: string; minScore: number; gradePoint: number }[];
  classes: { name: string; shortLabel?: string; minCgpa: number }[];
}

export interface StoredGradingScale {
  id: GradingScaleId;
  custom?: StoredCustomScale;
  nceClasses?: NceClassBoundaries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The stored setting when it has a known id, else null (treated as ng5). */
export function readGradingScaleSetting(raw: unknown): StoredGradingScale | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  if (!GRADING_SCALE_IDS.includes(raw.id as GradingScaleId)) return null;
  const setting: StoredGradingScale = { id: raw.id as GradingScaleId };
  if (isRecord(raw.custom)) setting.custom = raw.custom as unknown as StoredCustomScale;
  if (isRecord(raw.nceClasses)) setting.nceClasses = raw.nceClasses as NceClassBoundaries;
  return setting;
}

/**
 * The setting to write for a choice. Saved custom scales and NCE boundaries
 * are kept even when another scale is active, so switching back is one tap.
 * Never contains undefined (Firestore rejects it).
 */
export function settingFor(
  id: GradingScaleId,
  extras: { custom?: StoredCustomScale | null; nceClasses?: NceClassBoundaries | null }
): StoredGradingScale {
  const setting: StoredGradingScale = { id };
  if (extras.custom) setting.custom = extras.custom;
  if (extras.nceClasses) {
    const clean: NceClassBoundaries = {};
    for (const key of ['distinction', 'credit', 'merit', 'pass'] as const) {
      const value = extras.nceClasses[key];
      if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    }
    if (Object.keys(clean).length) setting.nceClasses = clean;
  }
  return setting;
}

/** Text inputs of the custom scale editor. */
export interface CustomScaleDraft {
  name: string;
  maxPoint: string;
  bands: { grade: string; minScore: string; gradePoint: string }[];
  classes: { name: string; shortLabel: string; minCgpa: string }[];
}

const text = (value: number) => String(value);

/** A draft prefilled from a scale (the closest scale to start from). */
export function customDraftFromScale(scale: GradingScale, name = ''): CustomScaleDraft {
  return {
    name,
    maxPoint: text(scale.maxPoint),
    bands: scaleBandRanges(scale).map((band) => ({ grade: band.grade, minScore: text(band.minScore), gradePoint: text(band.gradePoint) })),
    classes: [...scale.classes]
      .sort((a, b) => b.minCgpa - a.minCgpa)
      .map((cls) => ({ name: cls.name, shortLabel: cls.shortLabel === cls.name ? '' : cls.shortLabel, minCgpa: text(cls.minCgpa) })),
  };
}

/** A draft prefilled from a stored custom scale. */
export function customDraftFromStored(stored: StoredCustomScale): CustomScaleDraft {
  return {
    name: stored.name ?? '',
    maxPoint: text(stored.maxPoint),
    bands: stored.bands.map((band) => ({ grade: band.grade, minScore: text(band.minScore), gradePoint: text(band.gradePoint) })),
    classes: stored.classes.map((cls) => ({ name: cls.name, shortLabel: cls.shortLabel ?? '', minCgpa: text(cls.minCgpa) })),
  };
}

function toNumber(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

/** The draft as validateCustomScale input (and as stored). Blank numbers fail validation. */
export function customDraftToInput(draft: CustomScaleDraft): StoredCustomScale {
  const input: StoredCustomScale = {
    maxPoint: toNumber(draft.maxPoint),
    bands: draft.bands.map((band) => ({ grade: band.grade, minScore: toNumber(band.minScore), gradePoint: toNumber(band.gradePoint) })),
    classes: draft.classes.map((cls) => ({
      name: cls.name,
      ...(cls.shortLabel.trim() ? { shortLabel: cls.shortLabel } : {}),
      minCgpa: toNumber(cls.minCgpa),
    })),
  };
  if (draft.name.trim()) input.name = draft.name;
  return input;
}

/** The stored form of a validated custom scale (normalised, no id). */
export function storedCustomScale(scale: GradingScale): StoredCustomScale {
  return {
    name: scale.name,
    maxPoint: scale.maxPoint,
    bands: scale.bands.map(({ grade, minScore, gradePoint }) => ({ grade, minScore, gradePoint })),
    classes: scale.classes.map(({ name, shortLabel, minCgpa }) => ({
      name,
      ...(shortLabel && shortLabel !== name ? { shortLabel } : {}),
      minCgpa,
    })),
  };
}

/** First message per field, for inline errors. */
export function fieldErrors(errors: readonly ScaleValidationError[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const error of errors) if (!(error.field in map)) map[error.field] = error.message;
  return map;
}

export const CUSTOM_LIMITS = CUSTOM_SCALE_LIMITS;

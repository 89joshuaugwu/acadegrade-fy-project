/**
 * The CGPA calculator's shareable address (calculator.md §5.1 "URL").
 *
 * Format, unchanged from the first calculator so old links open:
 *   ?m=grade|score&c=<base64 of JSON [{c, u, g}] or [{c, u, s}]>
 * plus the optional prior record &pc=4.47&pu=74 and the optional grading
 * scale &sc=nbte4 (absent = the 5-point scale, so old links open unchanged).
 *
 * The base64 is UTF-8 safe (the old btoa threw on any non-Latin-1 character,
 * so a pasted curly apostrophe silently froze the link); for plain ASCII the
 * output is byte-identical to the old one. Values go through URLSearchParams,
 * so `=`, `/` and `+` are percent-encoded and survive any messenger.
 */

import { READY_SCALE_IDS, SCALES, type ReadyGradingScaleId } from '@/lib/cgpa/academicRules';

export type CalculatorMode = 'grade' | 'score';

/** One row as written to the link. `g` in letter mode, `s` in score mode. */
export interface EncodedRow {
  c: string;
  u: number;
  /** A letter on the link's scale (A-F on the 5-point scale). */
  g?: string;
  s?: number;
}

export const CALCULATOR_MAX_ROWS = 40;
export const CODE_MAX_LENGTH = 24;

/** A ready-made scale id from a link value, or null for the 5-point default and anything unknown. */
function readScaleId(value: string | null): ReadyGradingScaleId | null {
  return value && value !== 'ng5' && READY_SCALE_IDS.includes(value as ReadyGradingScaleId) ? (value as ReadyGradingScaleId) : null;
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64Utf8(encoded: string): string {
  // A raw "+" in an old, unencoded link arrives as a space.
  const binary = atob(encoded.trim().replace(/ /g, '+'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Links written by the old btoa carry Latin-1 bytes.
    return binary;
  }
}

/** The `c` value: base64 of the rows' JSON. */
export function encodeRows(rows: readonly EncodedRow[]): string {
  return toBase64Utf8(JSON.stringify(rows.map((row) => ({ c: row.c, u: row.u, g: row.g, s: row.s }))));
}

export interface CalculationLink {
  mode: CalculatorMode;
  rows: readonly EncodedRow[];
  /** Prior record as typed (kept as text so a half-typed value round-trips). */
  priorCgpa?: string;
  priorUnits?: string;
  /** Grading scale id; left out for the 5-point scale. */
  scale?: string;
}

/** "m=grade&c=…%3D%3D&pc=4.47&pu=74" (no leading "?"). */
export function encodeCalculation(link: CalculationLink): string {
  const params = new URLSearchParams();
  params.set('m', link.mode);
  params.set('c', encodeRows(link.rows));
  if (link.priorCgpa?.trim()) params.set('pc', link.priorCgpa.trim());
  if (link.priorUnits?.trim()) params.set('pu', link.priorUnits.trim());
  const scale = readScaleId(link.scale ?? null);
  if (scale) params.set('sc', scale);
  return params.toString();
}

export interface DecodedRow {
  code: string;
  units: number;
  grade: string | null;
  /** The score as text, so an out-of-range value stays in its field with its error. */
  scoreText: string;
  /** A value in this row was outside the calculator's range and was reset or flagged. */
  reset: boolean;
}

export interface DecodedCalculation {
  mode: CalculatorMode;
  /** Null when the link carries no rows (open the default slip). */
  rows: DecodedRow[] | null;
  /** The `c` value could not be read at all. */
  unreadable: boolean;
  /** Some values were outside the range and were reset (rows marked), or rows were cut. */
  partlyReset: boolean;
  priorCgpa: string;
  priorUnits: string;
  /** The link's scale id, or null for the 5-point scale. */
  scale: ReadyGradingScaleId | null;
}

function decodeRow(value: unknown, mode: CalculatorMode, grades: readonly string[]): DecodedRow {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  let reset = !(value && typeof value === 'object');
  const code = typeof source.c === 'string' ? source.c.trim().slice(0, CODE_MAX_LENGTH) : '';
  const rawUnits = source.u;
  let units = 3;
  if (typeof rawUnits === 'number' && Number.isInteger(rawUnits) && rawUnits >= 1 && rawUnits <= 6) units = rawUnits;
  else reset = true;

  let grade: string | null = null;
  if (typeof source.g === 'string' && grades.includes(source.g)) grade = source.g;
  else if (mode === 'grade' && source.g !== undefined) reset = true;

  let scoreText = '';
  if (typeof source.s === 'number' && Number.isFinite(source.s)) {
    scoreText = String(source.s);
    if (mode === 'score' && (source.s < 0 || source.s > 100)) reset = true;
  } else if (mode === 'score' && source.s !== undefined) {
    reset = true;
  }
  return { code, units, grade, scoreText, reset };
}

/** Reads the calculator's query string (with or without "?"). Never throws. */
export function decodeCalculation(search: string | URLSearchParams): DecodedCalculation {
  const params = typeof search === 'string' ? new URLSearchParams(search.replace(/^\?/, '')) : search;
  const rawMode = params.get('m');
  const mode: CalculatorMode = rawMode === 'score' ? 'score' : 'grade';
  const priorCgpa = params.get('pc') ?? '';
  const priorUnits = params.get('pu') ?? '';
  const encoded = params.get('c');
  const scale = readScaleId(params.get('sc'));
  const grades = SCALES[scale ?? 'ng5'].bands.map((band) => band.grade);
  const base = { mode, priorCgpa, priorUnits, scale };
  if (encoded === null || encoded === '') return { ...base, rows: null, unreadable: false, partlyReset: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Utf8(encoded));
  } catch {
    return { ...base, rows: null, unreadable: true, partlyReset: false };
  }
  if (!Array.isArray(parsed)) return { ...base, rows: null, unreadable: true, partlyReset: false };

  const cut = parsed.length > CALCULATOR_MAX_ROWS;
  const rows = parsed.slice(0, CALCULATOR_MAX_ROWS).map((value) => decodeRow(value, mode, grades));
  return { ...base, rows, unreadable: false, partlyReset: cut || rows.some((row) => row.reset) };
}

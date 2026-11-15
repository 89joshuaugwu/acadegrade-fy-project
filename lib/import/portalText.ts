/**
 * Paste-from-portal parser: turns text copied from a university results page
 * into course rows. Rule-based (no AI), so it is allowed for every user.
 *
 * This file is byte-identical in acadegrade-web/lib/import/portalText.ts and
 * acadegrade-mobile/lib/import/portalText.ts. Both repos run the shared
 * fixture tests/fixtures/portal-text.json against it. Keep it pure: no
 * imports, no platform APIs, erasable TypeScript only.
 *
 * Never throws. Never saves anything: callers show the rows for review.
 */

export type PortalGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PortalCourseRow {
  /** Normalised "CSC 201". */
  code: string;
  title: string;
  /** 1 to 6. */
  units: number;
  caScore: null;
  examScore: null;
  /** 0 to 100, only when the pasted line had a score. */
  totalScore?: number;
  grade?: PortalGrade;
}

export interface PortalParseResult {
  rows: PortalCourseRow[];
  /** Non-empty lines that could not be read as a course (header lines are skipped, not listed). */
  unparsed: string[];
}

const CODE_RE = /(?<![A-Za-z0-9])([A-Z]{2,4})\s?(\d{3}[A-Z]?)(?![A-Za-z0-9])/;
const NUMBER_RE = /^\d{1,3}(?:\.\d+)?$/;
const GRADE_RE = /^[A-F]$/;
const HEADER_RE = /\b(course|code|title|units?|credit|score|grade|s\/n|sn|total)\b/i;
const MAX_INPUT = 200000;
const MAX_LINES = 2000;

function isValue(token: string): boolean {
  return NUMBER_RE.test(token) || GRADE_RE.test(token);
}

function cleanTitle(parts: string[]): string {
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:.–—]+|[\s\-:.–—]+$/g, '')
    .trim();
}

function parseLine(line: string): PortalCourseRow | null {
  const match = CODE_RE.exec(line);
  if (!match) return null;
  const code = `${match[1]} ${match[2]}`;
  const rest = line.slice(match.index + match[0].length);

  const tokens = rest
    .split(/[\t|,;]+|\s{2,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const trailing: string[] = [];
  while (tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    if (isValue(last)) {
      trailing.unshift(last);
      tokens.pop();
      continue;
    }
    const words = last.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (words.length > 1 && isValue(lastWord)) {
      trailing.unshift(lastWord);
      tokens[tokens.length - 1] = words.slice(0, -1).join(' ');
      continue;
    }
    break;
  }

  const numerics = trailing.filter((t) => NUMBER_RE.test(t));
  const letters = trailing.filter((t) => GRADE_RE.test(t));
  if (numerics.length === 0 || numerics.length > 2 || letters.length > 1) return null;

  const isUnit = (t: string) => /^\d$/.test(t) && Number(t) >= 1 && Number(t) <= 6;
  let unitsToken: string | undefined;
  if (numerics.length === 1) {
    if (!isUnit(numerics[0])) return null;
    unitsToken = numerics[0];
  } else {
    unitsToken = numerics.find(isUnit);
    if (!unitsToken) return null;
  }
  const scoreToken = numerics.length === 2 ? numerics[numerics.indexOf(unitsToken) === 0 ? 1 : 0] : undefined;

  const row: PortalCourseRow = {
    code,
    title: cleanTitle(tokens),
    units: Number(unitsToken),
    caScore: null,
    examScore: null,
  };
  if (scoreToken !== undefined) {
    const score = Number(scoreToken);
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    row.totalScore = score;
  }
  if (letters.length === 1) row.grade = letters[0] as PortalGrade;
  return row;
}

export function parsePortalText(text: string): PortalParseResult {
  const rows: PortalCourseRow[] = [];
  const unparsed: string[] = [];
  if (typeof text !== 'string' || text.length === 0) return { rows, unparsed };

  const lines = text.slice(0, MAX_INPUT).split(/\r\n|\r|\n/).slice(0, MAX_LINES);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let row: PortalCourseRow | null = null;
    try {
      row = parseLine(line);
    } catch {
      row = null;
    }
    if (row) {
      rows.push(row);
      continue;
    }
    if (!CODE_RE.test(line) && HEADER_RE.test(line) && !/\d{2,}/.test(line)) continue;
    unparsed.push(line);
  }
  return { rows, unparsed };
}

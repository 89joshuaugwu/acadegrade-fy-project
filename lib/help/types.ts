/**
 * Shared shape for in-app help (spec 2026-11-13, Part 4.2).
 *
 * Admin content lives in `lib/help/admin-help.ts`. Student content will come
 * from a canonical JSON shared with Android and use the same shape, so the
 * help drawer never needs to know which audience it is showing.
 */
export type HelpAudience = 'admin' | 'student';
export type HelpPlatform = 'web' | 'android';

/** Stable dotted key, e.g. `admin.settings.access`. A dot marks a child entry. */
export type HelpId = string;

export interface HelpTerm { term: string; meaning: string }

/** A named task with 1–6 plain steps. */
export interface HelpTask { title: string; steps: string[] }

export interface HelpLink { label: string; to: HelpId | { href: string } }

export interface HelpEntry {
  id: HelpId;
  audience: HelpAudience;
  /** At most 40 characters. */
  title: string;
  /** What this page does, in one or two sentences. */
  summary: string;
  terms?: HelpTerm[];
  tasks?: HelpTask[];
  /** Each one sentence. */
  cautions?: string[];
  related?: HelpLink[];
  /** Web ProductTour id or Android tour chapter id. */
  tourId?: string;
  /** The entry exists on one platform only. */
  only?: HelpPlatform;
  /** Sentences that differ by platform; rendered after the shared text. */
  platformNotes?: Partial<Record<HelpPlatform, string[]>>;
}

/**
 * A content module the drawer can read: its entries, and where an entry's page
 * lives so related links can navigate. Student pages pass their own source.
 */
export interface HelpSource {
  entries: Readonly<Record<HelpId, HelpEntry>>;
  hrefFor: (id: HelpId) => string | undefined;
  platform: HelpPlatform;
}

/** The parent of a child entry (`a.b.c` → `a.b`), when the source has it. */
export function parentHelpId(source: HelpSource, id: HelpId): HelpId | undefined {
  const cut = id.lastIndexOf('.');
  if (cut <= 0) return undefined;
  const parent = id.slice(0, cut);
  return source.entries[parent] && parent.includes('.') ? parent : undefined;
}

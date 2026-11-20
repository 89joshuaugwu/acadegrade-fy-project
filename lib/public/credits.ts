import { PHOTO_CREDITS } from './credits-data';

/**
 * Photograph credits registry. Every found picture used on a public page has
 * an entry in credits-data.ts (owned by the imagery lane; ids are the photo
 * slugs, for example "unn-main-gate"). The footer imprint
 * and the Credit component read from here, so a credit appears wherever its
 * picture is used without anyone typing it twice.
 */

export interface PhotoCredit {
  /** Stable id used by pages and Figure, for example "unn-main-gate". */
  id: string;
  /** What the picture shows, as credited: "Main gate, UNN". */
  title: string;
  /** Author as named on the source. */
  author: string;
  /** Licence short name: "CC BY-SA 4.0". */
  licence: string;
  licenceUrl?: string;
  /** Where it was found (Wikimedia Commons page). */
  sourceUrl?: string;
  /** Collection name for the credit line, for example "Wikimedia Commons". */
  via?: string;
  /** True when the site shows an altered version (the indigo tint). */
  altered?: boolean;
  /** Optional path of the optimised file under /images, for components that pick a picture by id. */
  src?: string;
}

export function allCredits(): readonly PhotoCredit[] {
  return PHOTO_CREDITS;
}

/**
 * Credits for the given ids, in the given order. Unknown ids are skipped.
 * `registry` defaults to the site's credits (empty while there are no photographs); tests pass a fixture.
 */
export function creditsFor(ids?: readonly string[], registry: readonly PhotoCredit[] = PHOTO_CREDITS): PhotoCredit[] {
  if (!ids) return [...registry];
  const byId = new Map(registry.map((credit) => [credit.id, credit]));
  return ids.map((id) => byId.get(id)).filter((credit): credit is PhotoCredit => Boolean(credit));
}

/** One credit: "Main gate, UNN, by Hadassah Photostorie group (CC BY-SA 4.0, via Wikimedia Commons, tinted)". */
export function formatCredit(credit: PhotoCredit): string {
  const notes = [credit.licence, credit.via ? `via ${credit.via}` : null, credit.altered ? 'tinted' : null].filter(Boolean);
  return `${credit.title}, by ${credit.author} (${notes.join(', ')})`;
}

/**
 * The imprint sentence, grouped by licence so a long list stays readable:
 * "Photographs: Main gate, UNN, by A; Faculty of Arts, UNN, by B (CC BY-SA 4.0,
 * via Wikimedia Commons, tinted). Library, by C (CC0 1.0, via Wikimedia Commons, tinted)."
 * Null when there are none, so the footer can leave the clause out.
 */
export function formatImprintCredits(credits: readonly PhotoCredit[]): string | null {
  if (!credits.length) return null;
  const groups = new Map<string, { notes: string; names: string[] }>();
  for (const credit of credits) {
    const notes = [credit.licence, credit.via ? `via ${credit.via}` : null, credit.altered ? 'tinted' : null].filter(Boolean).join(', ');
    const group = groups.get(notes) ?? { notes, names: [] };
    group.names.push(`${credit.title}, by ${credit.author}`);
    groups.set(notes, group);
  }
  const label = credits.length === 1 ? 'Photograph' : 'Photographs';
  const parts = [...groups.values()].map((group) => `${group.names.join('; ')} (${group.notes})`);
  return `${label}: ${parts.join('. ')}.`;
}

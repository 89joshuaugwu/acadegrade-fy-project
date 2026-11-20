import { envContactEmail, resolveContactEmail } from '@/lib/site/contact-email';

export interface AboutContent {
  headline: string;
  platformDescription: string;
  mission: string;
  trustStatement: string;
  /** Empty when no address is configured; pages then link to /support instead. */
  contactEmail: string;
}

/**
 * Shown only when the admin has never saved a field (Admin > Settings > Public site).
 * Saved Firestore text always wins. Wording from docs/public-redesign/pages/about.md §4.
 */
export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  headline: 'A private record, made in Enugu.',
  platformDescription: 'AcadeGrade works out your GPA, CGPA, PI and degree class from your semester results, on the 5-point scale Nigerian universities use, then helps you plan the next semester. It is free and private.',
  mission: 'Every Nigerian university student should know exactly where they stand: their GPA, their CGPA and their class, worked out correctly and explained course by course, without paying for it and without handing their record to anyone.',
  trustStatement: 'Your record is yours. It is private by default, you decide who sees it and for how long, and you can download it or delete it whenever you want.',
  contactEmail: envContactEmail() ?? '',
};

function normalizedText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeAboutContent(value: unknown): AboutContent {
  const data = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};

  return {
    headline: normalizedText(data.headline, DEFAULT_ABOUT_CONTENT.headline),
    platformDescription: normalizedText(data.platformDescription, DEFAULT_ABOUT_CONTENT.platformDescription),
    mission: normalizedText(data.mission, DEFAULT_ABOUT_CONTENT.mission),
    trustStatement: normalizedText(data.trustStatement, DEFAULT_ABOUT_CONTENT.trustStatement),
    // Same order as getContactEmail(): admin value, then NEXT_PUBLIC_SUPPORT_EMAIL, then none.
    contactEmail: resolveContactEmail({ configEmail: data.contactEmail, envEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL }) ?? '',
  };
}

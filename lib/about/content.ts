export interface AboutContent {
  headline: string;
  platformDescription: string;
  mission: string;
  trustStatement: string;
  contactEmail: string;
}

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  headline: 'Academic progress, made clear.',
  platformDescription: 'AcadeGrade helps university students understand results, monitor degree progress, and make better academic decisions.',
  mission: 'Our mission is to give every student a dependable, understandable view of their academic journey.',
  trustStatement: 'Your academic records remain under your control. Sharing is explicit, revocable, and designed around privacy.',
  contactEmail: 'support@acadegrade.com',
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
    contactEmail: normalizedText(data.contactEmail, DEFAULT_ABOUT_CONTENT.contactEmail).toLowerCase(),
  };
}

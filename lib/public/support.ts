import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS, SUPPORT_PURGE_AFTER_MS, type SupportCategory, type SupportStatus } from '@/lib/support/tickets';

/**
 * Content for /support (docs/public-redesign/pages/support.md). Category
 * labels come from lib/support/tickets.ts and are never retyped, so the page,
 * Settings and the Android form always agree.
 */

/** Subject on every mailto: link of the support page. */
export const SUPPORT_SUBJECT = 'AcadeGrade support request';

/** Where signed-in students send requests and read replies on the web. */
export const SETTINGS_HELP_HREF = '/settings#help';

/** One piece of an answer: plain text, or a link inside the sentence. */
export type AnswerPart = string | { label: string; href: string };

export interface QuickFix {
  question: string;
  answer: AnswerPart[];
}

export interface QuickFixGroup {
  title: string;
  items: QuickFix[];
}

export function answerText(parts: readonly AnswerPart[]): string {
  return parts.map((part) => (typeof part === 'string' ? part : part.label)).join('');
}

/** Fourteen common problems, answered. Coin wording appears only while coins are switched on. */
export function quickFixGroups({ coinsEnabled }: { coinsEnabled: boolean }): QuickFixGroup[] {
  return [
    {
      title: 'Signing in',
      items: [
        {
          question: "My verification code hasn't arrived.",
          answer: ['Check your spam and promotions folders and make sure the email address is right. Wait a minute, then ask for one new code. Each code expires after 5 minutes.'],
        },
        {
          question: "I've forgotten my password.",
          answer: ['Choose ', { label: 'Forgot password?', href: '/forgot-password' }, ' on the sign-in page and we will email you a code to set a new one.'],
        },
        {
          question: 'I signed up with Google.',
          answer: ['Choose Continue with Google on the sign-in page and pick the same Google account.'],
        },
        {
          question: "The site says it's under maintenance.",
          answer: ['AcadeGrade is being updated. Try again in a little while. Your saved records are not affected.'],
        },
      ],
    },
    {
      title: 'Your numbers',
      items: [
        {
          question: "My CGPA doesn't match what I worked out.",
          answer: [
            'Check the units and the grade or score of every course, and that every semester is entered. AcadeGrade rounds to two places, half up. You can check one semester by hand with the ',
            { label: 'free calculator', href: '/calculator' },
            '. If your handbook uses different bands, the handbook is the final word.',
          ],
        },
        {
          question: 'A course I failed still shows.',
          answer: ['An F stays flagged as a carry-over until you record a pass for the same course.'],
        },
      ],
    },
    {
      title: 'Scanning and AcadeMind',
      items: [
        {
          question: 'The scanner missed a row or misread a score.',
          answer: ['Use a clear, upright, well-lit photo of the slip, then edit any row before you save. Nothing is saved until you confirm.'],
        },
        {
          question: "I can't see AcadeMind or the scanner.",
          answer: [
            'They are for students aged 18 or over who have allowed AI processing in ',
            { label: 'Settings → Privacy & AI choices', href: '/settings#privacy' },
            coinsEnabled
              ? '. You get free uses each day, and on Android you can earn extra uses with coins.'
              : '. You get free uses each day.',
          ],
        },
      ],
    },
    {
      title: 'Sharing',
      items: [
        {
          question: "Someone can't open my transcript link.",
          answer: ['Links expire after 1, 7 or 30 days, as you chose, and may need the PIN you set. If it has expired, create a new link.'],
        },
        {
          question: 'A course-code link says sharing is paused.',
          answer: ['Course sharing is switched off for a short while. Try the link again later.'],
        },
      ],
    },
    {
      title: 'The Android app',
      items: [
        {
          question: 'How do I install the Android app?',
          answer: ['Follow the steps on the ', { label: 'Android app page', href: '/app' }, '.'],
        },
        {
          question: 'My reminders arrive late or not at all.',
          answer: ["Allow notifications for AcadeGrade in your phone's settings and turn off battery saving for the app. Reminders work without data."],
        },
      ],
    },
    {
      title: 'Your data',
      items: [
        {
          question: 'I want a copy of my data.',
          answer: ['Go to ', { label: 'Settings → Privacy & AI choices', href: '/settings#privacy' }, ' and choose Download my data.'],
        },
        {
          question: 'I want to delete my account.',
          answer: ['Follow the steps on ', { label: 'Delete your account', href: '/account-deletion' }, ". If you can't sign in, the same page explains what to do."],
        },
      ],
    },
  ];
}

/** What to include, per request category ("Before you write"). */
export function includeRows({ coinsEnabled }: { coinsEnabled: boolean }): { category: SupportCategory; label: string; include: string }[] {
  const include: Record<SupportCategory, string> = {
    bug: 'The page or screen, what you tapped, and what you saw',
    account: 'The email address on your account',
    grades: 'The session, the semester and the course code',
    ai: 'Which feature, and roughly when you used it',
    ads: coinsEnabled
      ? 'When you watched the ad, and your coin balance before and after'
      : 'Where you saw the ad, and roughly when',
    privacy: 'What you want: a copy, a correction, deletion or an objection',
    other: 'Anything that helps us understand',
  };
  return SUPPORT_CATEGORIES.map((category) => ({ category, label: SUPPORT_CATEGORY_LABELS[category], include: include[category] }));
}

/** The status words students see in Settings > Help and support. */
export const SUPPORT_STATUS_WORDS: Record<SupportStatus, { word: string; meaning: string }> = {
  open: { word: 'Sent', meaning: 'We have your request.' },
  waiting: { word: 'Answered', meaning: 'We have replied. The reply is in your AcadeGrade inbox and your email.' },
  closed: { word: 'Closed', meaning: 'It is done.' },
};

export const SUPPORT_RETENTION_DAYS = Math.round(SUPPORT_PURGE_AFTER_MS / (24 * 60 * 60 * 1000));

export const SUPPORT_RETENTION_LINE = `Requests are text only. We keep a request until ${SUPPORT_RETENTION_DAYS} days after it is closed, and delete it when you delete your account.`;

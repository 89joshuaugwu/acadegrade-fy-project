/**
 * Content for /account-deletion, AcadeGrade's Google Play data-deletion page
 * (docs/public-redesign/pages/account-deletion.md). Every fact on the earlier
 * page is kept word for word; the four items added to "What is deleted" are
 * the ones lib/user/account-deletion.ts already deletes (owner confirmed).
 */

/** Subject on every mailto: link of this page. */
export const DELETION_SUBJECT = 'Account deletion request';

/** Where "Go to Settings" lands: the Danger Zone in Settings, through sign-in when needed. */
export const DELETE_SETTINGS_HREF = '/settings#delete-account';
export const DELETE_SIGN_IN_HREF = `/login?next=${encodeURIComponent(DELETE_SETTINGS_HREF)}`;

export const DELETION_INTRO =
  'You can delete your AcadeGrade account and its records at any time, in the Android app or on the web. Deletion is permanent and cannot be undone.';

export const PLAY_LINE =
  'For the AcadeGrade Android app and the AcadeGrade website, operated by Joshua Chimaobie Ugwu, Enugu State, Nigeria.';

/** A step: plain text with UI labels (set at weight 500, as the apps show them). */
export type StepPart = string | { ui: string } | { label: string; href: string };

export const ANDROID_STEPS: readonly StepPart[][] = [
  ['Open AcadeGrade and sign in.'],
  ['Go to the ', { ui: 'Profile' }, ' tab.'],
  ['Tap ', { ui: 'Delete Account' }, ' and confirm.'],
];

export const WEB_STEPS: readonly StepPart[][] = [
  [{ label: 'Sign in', href: DELETE_SIGN_IN_HREF }, ' to AcadeGrade.'],
  ['Open ', { ui: 'Settings' }, '.'],
  ['Under ', { ui: 'Danger Zone' }, ', choose ', { ui: 'Delete' }, '.'],
  ['Type ', { ui: 'DELETE' }, ', then confirm with your password, or with Google if you signed in with Google.'],
];

/** The UI labels quoted above, exactly as the web Settings page and the Android app show them. */
export const DELETION_UI_LABELS = ['Delete Account', 'Danger Zone', 'Delete', 'DELETE'] as const;

export const AUTOMATIC_COMPLETION_LINE =
  "If a deletion can't finish at once, we finish it automatically within 21 days.";

export interface DeletedItem {
  text: string;
  /** Firestore collections (or data) this line covers, checked against lib/user/account-deletion.ts by a test. */
  covers: readonly string[];
}

export const DELETED_ITEMS: readonly DeletedItem[] = [
  { text: 'Your profile: name, email, matriculation number, institution, programme and profile photo', covers: ['users', '_matric_numbers', 'avatar'] },
  { text: 'All semesters, courses, scores and grades', covers: ['semesters', 'courses'] },
  { text: 'Saved AI analysis, forecasts and notifications', covers: ['notifications', 'analytics'] },
  { text: 'Share links and course share codes you created', covers: ['shared_transcripts', 'shareCodes'] },
  { text: 'Your coin balance and coin history', covers: ['_coin_wallets', '_coin_ledger', '_coin_requests'] },
  {
    text: 'Verification codes, sign-up records and rewarded-ad records linked to your account',
    covers: ['otps', '_registration_tickets', '_reward_sessions', '_reward_transactions', '_reward_daily'],
  },
  { text: 'Request and security records linked to your account', covers: ['api_logs', '_api_rate_limits'] },
  { text: 'Your timetables', covers: ['timetables'] },
  { text: 'Help and support requests you sent', covers: ['support_tickets'] },
  { text: 'Reports you made about AI answers', covers: ['_ai_feedback'] },
  { text: 'Suggestions you sent for the university and course lists', covers: ['_academic_catalog_suggestions'] },
  { text: 'Your sign-in account itself', covers: ['auth'] },
];

export interface KeptItem {
  item: string;
  period: string;
  reason: string;
}

/** "What may be kept for a while, and why": today's six facts, the logs fact split in two so each has its period. */
export const KEPT_ITEMS: readonly KeptItem[] = [
  { item: 'Proof that the deletion happened', period: 'kept', reason: 'A record that a deletion happened, without your user ID, so we can show the request was completed.' },
  { item: 'Backups', period: 'up to 30 days', reason: 'Copies in backups, until they are overwritten.' },
  { item: 'Hosting provider logs', period: 'under its own rules', reason: 'Request logs held by our hosting provider, under its own retention rules.' },
  {
    item: 'AI provider logs',
    period: 'up to 55 days',
    reason: 'Request logs held by AI providers you used; some keep abuse-monitoring logs for up to 55 days, under their own retention rules.',
  },
  { item: 'Profile photo', period: 'up to 30 days', reason: 'Your profile photo on our image service, where automatic removal is not available.' },
  { item: 'Messages already delivered', period: 'already sent', reason: 'Emails and push notifications that were already delivered to you.' },
  {
    item: 'Information the law requires',
    period: 'only as long as needed',
    reason: 'Information we must keep by law or to deal with fraud or a dispute, only for as long as needed.',
  },
];

export const SHARE_LINK_LINE = 'Anyone who already opened or saved a share link may still have what they saw. The link itself stops working.';
export const PERMANENT_LINE = 'Deletion is permanent and cannot be undone.';

export const CANNOT_SIGN_IN = {
  reset: {
    line: "Can't sign in? Reset your password first.",
    before: 'Choose ',
    link: { label: 'Forgot password?', href: '/forgot-password' },
    after: ' on the sign-in page. We email you a code that expires after 5 minutes.',
  },
  write: { line: 'Still locked out? Write to us.' },
  verify: {
    line: "We check it's really you.",
    sentence: 'We confirm the request comes from the account holder before deleting anything. Never send us your password or a verification code.',
  },
  done: { line: 'Done within 21 days.', sentence: 'We complete the deletion within 21 days.' },
} as const;

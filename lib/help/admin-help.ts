import type { HelpEntry, HelpSource } from './types';

/**
 * Admin help content (spec 2026-11-13, Part 4.5.1), written against the
 * rearranged admin UI. Web only. Keep labels identical to what the pages show.
 */

const ROUTES = {
  'admin.overview': '/admin/dashboard',
  'admin.users': '/admin/users',
  'admin.academic-catalogue': '/admin/academic-catalog',
  'admin.course-list': '/admin/courses',
  'admin.analytics': '/admin/analytics',
  'admin.api-health': '/admin/api-analytics',
  'admin.ai': '/admin/ai',
  'admin.usage': '/admin/usage',
  'admin.ads': '/admin/ads',
  'admin.release': '/admin/mobile-release',
  'admin.settings': '/admin/settings',
  'admin.audit': '/admin/audit',
} as const;

type PageId = keyof typeof ROUTES;

/** Tabs per tabbed page, in display order. Each tab has `<page id>.<tab>`. */
export const ADMIN_HELP_TABS = {
  '/admin/ads': ['status', 'house', 'networks', 'admob'],
  '/admin/settings': ['access', 'announcements', 'public-site', 'email', 'advanced'],
} as const satisfies Partial<Record<(typeof ROUTES)[PageId], readonly string[]>>;

export type AdsTab = (typeof ADMIN_HELP_TABS)['/admin/ads'][number];
export type SettingsTab = (typeof ADMIN_HELP_TABS)['/admin/settings'][number];

export type AdminHelpId =
  | PageId
  | `admin.ads.${AdsTab}`
  | `admin.settings.${SettingsTab}`;

const entry = (value: Omit<HelpEntry, 'audience'> & { id: AdminHelpId }): HelpEntry => ({ audience: 'admin', ...value });

export const ADMIN_HELP: Readonly<Record<AdminHelpId, HelpEntry>> = {
  'admin.overview': entry({
    id: 'admin.overview',
    title: 'Overview',
    summary: 'Shows the size and health of AcadeGrade at a glance: users, activity, average results and anything that needs your attention.',
    terms: [
      { term: 'Active this week', meaning: 'An account created, or signed in, in the last 7 days.' },
      { term: 'Average CGPA / PI', meaning: 'The average over students who have at least one completed semester.' },
      { term: 'Needs attention', meaning: 'Settings that are off, unfinished or waiting for you, each linked to where you fix it.' },
    ],
    tasks: [
      { title: 'Check what needs attention', steps: ['Read the Needs attention list.', 'Open each link to fix it.'] },
    ],
    cautions: [
      'Numbers are recalculated from every account each time the page loads, so it can be slow with many users.',
    ],
    related: [
      { label: 'Academic analytics', to: 'admin.analytics' },
      { label: 'API health', to: 'admin.api-health' },
      { label: 'Users', to: 'admin.users' },
    ],
  }),

  'admin.users': entry({
    id: 'admin.users',
    title: 'Users',
    summary: 'Find a student account and turn its sign-in off or on.',
    terms: [
      { term: 'Disabled', meaning: 'The account cannot sign in on the website or the Android app. Their data is kept.' },
    ],
    tasks: [
      { title: 'Disable sign-in', steps: ['Search by name, matric number or email.', 'Open the row.', 'Choose Disable sign-in.', 'Confirm.'] },
      { title: 'Restore access', steps: ['Open the row.', 'Choose Enable sign-in.'] },
      { title: 'Correct a student\'s age', steps: ['Open the row.', 'Choose Correct age….', 'Pick Adult or Under 18.', 'Write the reason (who asked, and how).', 'Save age correction.'] },
    ],
    cautions: [
      'Disabling takes effect straight away on every device.',
      'Correct an age only when the student or a guardian contacted support; under 18 blocks AI and scanning everywhere.',
      'This page cannot delete accounts or edit results; students do that themselves.',
    ],
    related: [{ label: 'Settings: Access', to: 'admin.settings.access' }],
  }),

  'admin.academic-catalogue': entry({
    id: 'admin.academic-catalogue',
    title: 'Academic catalogue',
    summary: 'Manages the universities, departments and programmes students pick from when they sign up on the website or the Android app.',
    terms: [
      { term: 'Suggestion', meaning: 'A name a student typed that is not in the list yet.' },
      { term: 'Archived', meaning: 'Hidden from sign-up but kept, so existing profiles are unaffected. You can restore it.' },
    ],
    tasks: [
      { title: 'Review suggestions', steps: ['Open Pending suggestions.', 'Approve to add the name, or Reject.'] },
      { title: 'Fix a spelling', steps: ['Choose the tab.', 'Search.', 'Edit.', 'Save.'] },
      { title: 'Retire an entry', steps: ['Choose Archive.', 'Confirm.'] },
    ],
    cautions: [
      'Names must be unique within a type (case and spacing are ignored).',
      'The Android app keeps a built-in list for when it is offline, so new names appear there once it reconnects.',
    ],
    related: [{ label: 'Users', to: 'admin.users' }],
  }),

  'admin.course-list': entry({
    id: 'admin.course-list',
    title: 'Legacy course list',
    summary: 'An old list of course codes and titles. No part of the website or Android app reads it.',
    tasks: [
      { title: 'Nothing to do here', steps: ['Leave it, or copy what you need and stop maintaining it.'] },
    ],
    cautions: [
      'Editing this list does not change any student\'s courses or course codes.',
    ],
    related: [
      { label: 'Academic catalogue', to: 'admin.academic-catalogue' },
      { label: 'Settings: Advanced', to: 'admin.settings.advanced' },
    ],
  }),

  'admin.analytics': entry({
    id: 'admin.analytics',
    title: 'Academic analytics',
    summary: 'Shows how students are doing overall: CGPA spread, degree classes and department averages.',
    terms: [
      { term: 'Degree class bands', meaning: 'First 4.50+, 2:1 3.50+, 2:2 2.40+, Third 1.50+, Pass 1.00+.' },
    ],
    tasks: [
      { title: 'Export department figures', steps: ['Choose Export CSV (department, users, average CGPA).'] },
    ],
    cautions: [
      'Figures are self-reported by students and only include completed semesters.',
    ],
    related: [{ label: 'Overview', to: 'admin.overview' }],
  }),

  'admin.api-health': entry({
    id: 'admin.api-health',
    title: 'API health',
    summary: 'Shows API traffic, errors and response times from server logs, so you can spot outages and heavy use.',
    terms: [
      { term: 'Error rate', meaning: 'Failed calls divided by all calls in the range.' },
      { term: 'Top consumers', meaning: 'The accounts making the most calls.' },
    ],
    tasks: [
      { title: 'Investigate a spike', steps: ['Pick the range.', 'Check Recent errors.', 'Find the endpoint in Top endpoints.'] },
      { title: 'Watch live', steps: ['Turn on Auto-refresh (every 30 seconds).'] },
    ],
    cautions: [
      'Top consumers shows personal details; do not screenshot it into public channels.',
    ],
    related: [{ label: 'AI providers', to: 'admin.ai' }],
  }),

  'admin.ai': entry({
    id: 'admin.ai',
    title: 'AI providers',
    summary: 'Controls which AI provider, model and key answers each AI feature (Written Analysis, Forecast, What-If guidance and Result scanning) on both the website and the Android app.',
    terms: [
      { term: 'Off', meaning: 'The feature makes no AI calls anywhere.' },
      { term: 'Calculator only (no AI)', meaning: 'What-If shows the maths without AI advice.' },
      { term: 'One provider / Provider with backups', meaning: 'Backups are tried in order when a provider fails.' },
      { term: 'Key', meaning: 'An encrypted API key. It is never shown again after saving.' },
      { term: 'Revision', meaning: 'The version number of the saved routing.' },
      { term: 'Custom instructions (system prompt)', meaning: 'The system prompt for Written Analysis only. Leave it empty to use the built-in instructions.' },
      { term: 'Allow OpenRouter data collection', meaning: 'Off by default, which asks OpenRouter to use only providers that do not keep data. Free models with no such provider fail over to the next target.' },
    ],
    tasks: [
      { title: 'Turn AI on for the first time', steps: ['Add a key for a provider.', 'Pick a mode and target for each feature.', 'Save routing.'] },
      { title: 'Rotate a key', steps: ['In Add or rotate a key, reuse the same key name.', 'Paste the new key and save.'] },
      { title: 'Stop a feature everywhere', steps: ['Set its mode to Off.', 'Save routing.'] },
      { title: 'Change Written Analysis wording', steps: ['Open Written Analysis → Custom instructions (system prompt).', 'Edit the text.', 'Save instructions.'] },
      { title: 'Confirm Gemini billing', steps: ['Enable billing on the Google Cloud project that owns the Gemini key.', 'Choose Mark billing confirmed… and confirm.'] },
    ],
    cautions: [
      'Until routing is saved once, every AI request fails.',
      'Disabling a key used by a feature makes that feature fail, or fall back, immediately.',
      'Result scanning needs a provider that can read images.',
      'On the Gemini free tier, Google may use what is sent to improve its products, including result slips.',
    ],
    related: [
      { label: 'Free uses & coins', to: 'admin.usage' },
      { label: 'API health', to: 'admin.api-health' },
      { label: 'Settings: Access', to: 'admin.settings.access' },
    ],
  }),

  'admin.usage': entry({
    id: 'admin.usage',
    title: 'Free uses & coins',
    summary: 'Sets how many free AI requests each student gets per feature, and how Android coins are earned and spent once the free uses run out.',
    terms: [
      { term: 'Free uses per 24 hours', meaning: 'Counted per student and per feature. The window starts at the student\'s first request and does not reset at midnight. 0 pauses free use.' },
      { term: 'Short-term limit', meaning: 'Fixed: Written Analysis and Forecast 2 per hour; What-If 3 per 5 minutes; scanning 5 per 15 minutes.' },
      { term: 'Coins', meaning: 'Earned on Android by watching a rewarded ad and spent per feature at the price you set. Days reset at midnight UTC.' },
      { term: 'Rewarded readiness', meaning: 'The four checks that must all pass for students to earn coins.' },
      { term: 'Extra refresh (legacy)', meaning: 'With coins off, a verified rewarded ad gives one extra Written Analysis refresh, at most 2 per UTC day.' },
    ],
    tasks: [
      { title: 'Change free uses', steps: ['Edit the numbers (0–1000).', 'Save free uses and coins. It applies to the next request; it does not clear anyone\'s count.'] },
      {
        title: 'Turn coins on',
        steps: [
          'Check Rewarded readiness: ads allowed in the Android app, Rewarded ads on, a rewarded unit (or test ads).',
          'Switch on Let Android users earn and spend coins.',
          'Set coins per ad (1–10), daily earn cap (0–100) and balance cap (1–500).',
          'Set each feature\'s price (1–20) and coin uses per day (0–50).',
          'Save and confirm.',
        ],
      },
      { title: 'Pause coin spending for one feature', steps: ['Untick Coins allowed for it.', 'Save.'] },
    ],
    cautions: [
      'Setting free uses to 0 does not turn a feature off while coins can pay for it. To stop a feature, use AI providers → Off.',
      'Turning off Allow ads in the Android app or Rewarded ads stops new earning but keeps balances.',
      'Coins are not money. Never describe them as purchasable.',
      'In AdMob, the reward must stay amount 1, item "Insights refresh", even though students receive coins.',
    ],
    related: [
      { label: 'Advertising: Android AdMob', to: 'admin.ads.admob' },
      { label: 'AI providers', to: 'admin.ai' },
    ],
  }),

  'admin.ads': entry({
    id: 'admin.ads',
    title: 'Advertising',
    summary: 'Everything about promotions and ads, in four tabs: Status, House promotions, Web ad networks and Android AdMob.',
    terms: [
      { term: 'House promotion', meaning: 'Your own message, shown on the website and, if you allow it, in the Android app.' },
      { term: 'Ad network', meaning: 'Google AdSense or an Adsterra SmartLink on the web Dashboard.' },
      { term: 'AdMob', meaning: 'Google\'s ads in the Android app: banners and rewarded ads.' },
    ],
    tasks: [
      { title: 'Find out why something is not showing', steps: ['Open Status.', 'Read the reasons for the slot.', 'Fix the first one in the tab it names.'] },
    ],
    cautions: [
      'Each tab saves on its own. Unsaved changes in one tab are not saved by another.',
    ],
    related: [
      { label: 'Status', to: 'admin.ads.status' },
      { label: 'House promotions', to: 'admin.ads.house' },
      { label: 'Web ad networks', to: 'admin.ads.networks' },
      { label: 'Android AdMob', to: 'admin.ads.admob' },
    ],
  }),

  'admin.ads.status': entry({
    id: 'admin.ads.status',
    title: 'Advertising: Status',
    summary: 'Shows what each ad slot (web Dashboard, web Results, Android Dashboard, Android Results) should show right now, and why, based on saved settings.',
    terms: [
      { term: 'House campaign', meaning: 'Your own promotion.' },
      { term: 'Legacy fallback', meaning: 'An old image banner used when no campaign fits.' },
      { term: 'Nothing to serve', meaning: 'The slot stays empty and takes no space.' },
      { term: 'Rewarded readiness', meaning: 'Whether students can earn coins now, and which check is failing.' },
    ],
    tasks: [
      { title: 'Find why a promotion is not showing', steps: ['Open its slot.', 'Read the reasons in order.', 'Fix the first one.', 'Choose Recheck now.'] },
    ],
    cautions: [
      'This is not proof that an ad rendered, was approved or got filled; unsaved edits are not included.',
    ],
    related: [
      { label: 'House promotions', to: 'admin.ads.house' },
      { label: 'Android AdMob', to: 'admin.ads.admob' },
    ],
  }),

  'admin.ads.house': entry({
    id: 'admin.ads.house',
    title: 'Advertising: House promotions',
    summary: 'Creates your own promotions and chooses where they appear on the website and in the Android app.',
    terms: [
      { term: 'Where promotions show', meaning: 'The website and Android switches, side by side. One save covers both.' },
      { term: 'Weight', meaning: 'The relative share when several campaigns fit (1–100).' },
      { term: 'Frequency cap', meaning: 'The most views per person in a time window, counted per browser or per Android install.' },
      { term: 'Schedule', meaning: 'Optional start and end times.' },
    ],
    tasks: [
      {
        title: 'Launch a campaign',
        steps: [
          'Add campaign.',
          'Write the headline and copy, and add an HTTPS image and link.',
          'Tick Show on.',
          'Turn on Active.',
          'Turn on the surface in Where promotions show.',
          'Save house promotions.',
          'Check Status.',
        ],
      },
      { title: 'Show on Android', steps: ['Turn on Show house promotions in the Android app and the Android slot.', 'Make sure the campaign is ticked for Dashboard.', 'Save house promotions.'] },
    ],
    cautions: [
      'Android uses only campaigns ticked for Dashboard, in both Android slots.',
      'Legacy banners (Advanced) appear on the web Dashboard even when website promotions are off; switch each banner\'s Active off to stop them.',
      'Image and link URLs must start with https://.',
    ],
    related: [{ label: 'Status', to: 'admin.ads.status' }],
  }),

  'admin.ads.networks': entry({
    id: 'admin.ads.networks',
    title: 'Advertising: Web ad networks',
    summary: 'Connects Google AdSense and an Adsterra SmartLink on the web Dashboard.',
    tasks: [
      { title: 'Turn on AdSense', steps: ['Enter the Publisher ID (ca-pub- plus 16 digits) and the Slot ID (digits).', 'Switch it on.', 'Save web ad networks.'] },
      { title: 'Turn on Adsterra', steps: ['Paste the HTTPS SmartLink.', 'Switch it on.', 'Save web ad networks.'] },
    ],
    cautions: [
      'AdSense also needs Google\'s site approval and the visitor\'s consent; a blank slot after saving is usually approval, consent, an ad blocker or no fill.',
      'Ad networks show on the web Dashboard only.',
    ],
    related: [{ label: 'Status', to: 'admin.ads.status' }],
  }),

  'admin.ads.admob': entry({
    id: 'admin.ads.admob',
    title: 'Advertising: Android AdMob',
    summary: 'Controls Google AdMob banners and rewarded ads in the Android app.',
    terms: [
      { term: 'Test ads', meaning: 'Google\'s sample ads; no revenue.' },
      { term: 'Unit ID', meaning: 'ca-app-pub-…/… from AdMob.' },
      { term: 'Rewarded ad', meaning: 'A video the student chooses to watch. Our server only rewards it after Google\'s signed confirmation.' },
    ],
    tasks: [
      { title: 'Go live with banners', steps: ['Enter the unit IDs.', 'Turn on the slots.', 'Turn off Use Google test ads (no revenue).', 'Save Android ad settings.'] },
      { title: 'Turn on rewarded ads', steps: ['Enter the rewarded unit ID.', 'Turn on Rewarded ads.', 'Save Android ad settings.', 'Then set coins in Free uses & coins.'] },
      {
        title: 'Saved but no ad?',
        steps: [
          'Confirm the installed build includes AdMob, then allow ads and the slot you want.',
          'Remember test ads prove nothing about live unit IDs, account approval or fill.',
          'Publish the consent (UMP) forms in AdMob Privacy & messaging.',
          'For live ads, check AdMob account readiness, unit IDs, connectivity and device logs.',
        ],
      },
    ],
    cautions: [
      'Allow ads in the Android app also controls rewarded ads, so turning it off stops coin earning and extra refreshes.',
      'SDK or app-ID changes need a new Android build; these switches do not.',
      'Consent choices on the device can block ads; these switches cannot override them.',
      'iOS (Advanced) is saved for later; no iOS app shows ads yet.',
    ],
    related: [
      { label: 'Free uses & coins', to: 'admin.usage' },
      { label: 'Status', to: 'admin.ads.status' },
    ],
  }),

  'admin.release': entry({
    id: 'admin.release',
    title: 'Android release',
    summary: 'Publishes the update notice Android users see, and decides whether older builds may skip it.',
    terms: [
      { term: 'Build number', meaning: 'The app\'s internal version (a whole number). Phones on a lower build see the notice.' },
      { term: 'Minimum supported build', meaning: 'Builds below it must update.' },
      { term: 'Allow users to ignore', meaning: 'Off makes the update required for every older build.' },
    ],
    tasks: [
      { title: 'Announce an optional update', steps: ['Enter the version (x.y.z), build and HTTPS download link.', 'Enable notice.', 'Save.'] },
      { title: 'Force an update for very old builds', steps: ['Set Minimum supported build.', 'Save and confirm.'] },
      { title: 'Check who is affected', steps: ['Type a build number into Build eligibility.'] },
      { title: 'Keep the public link in step', steps: ['In Download links, choose Use the update link for the public site.', 'Save public link.'] },
    ],
    cautions: [
      'A required update blocks the app until the student downloads it, so test the download link first.',
      'Users who dismissed an optional notice will not see it again until the next release or a manual check.',
      'Keep the public site\'s Android link pointing to the same APK.',
    ],
    related: [{ label: 'Settings: Public site', to: 'admin.settings.public-site' }],
  }),

  'admin.settings': entry({
    id: 'admin.settings',
    title: 'Settings',
    summary: 'Platform-wide settings in five tabs: Access, Announcements, Public site, Email and Advanced. Each tab saves on its own.',
    terms: [
      { term: 'Access', meaning: 'Maintenance mode, sign-ups, feature switches, the AI age and consent check, and legal versions.' },
      { term: 'Announcements', meaning: 'The website banner and the optional notification to every student.' },
      { term: 'Public site', meaning: 'App download links and the About page.' },
      { term: 'Email', meaning: 'The Gmail accounts that send email.' },
      { term: 'Advanced', meaning: 'The grading scale (read only) and the legacy course list.' },
    ],
    cautions: [
      'The AI system prompt moved to AI providers → Written Analysis.',
    ],
    related: [
      { label: 'AI providers', to: 'admin.ai' },
      { label: 'Android release', to: 'admin.release' },
    ],
  }),

  'admin.settings.access': entry({
    id: 'admin.settings.access',
    title: 'Settings: Access',
    summary: 'Controls who can use AcadeGrade and which features are on, everywhere. Changes wait in the save bar until you save.',
    terms: [
      { term: 'Maintenance mode', meaning: 'Blocks the website, the Android app and student APIs. Admins can still sign in.' },
      { term: 'Pause new sign-ups', meaning: 'Blocks new accounts on the website and Android; existing students can still sign in.' },
      { term: 'Feature switches', meaning: 'Turn single features off. Web + API switches are refused by the server, so they stop the Android app too; Web only switches just hide website buttons.' },
      { term: 'Require age confirmation and AI consent for AI', meaning: 'Accounts that have not confirmed their age or allowed AI processing cannot use AI or scanning until they do. Under-18s and users who declined are always blocked.' },
      { term: 'Legal versions', meaning: 'The current Terms and Privacy versions. Publishing a new version asks every student to agree again.' },
    ],
    tasks: [
      { title: 'Short maintenance window', steps: ['Turn on Maintenance mode.', 'Save and confirm.', 'Turn it off and save when you are done.'] },
      { title: 'Turn one feature off', steps: ['Switch the feature off under Feature switches.', 'Save.'] },
      { title: 'Ask everyone to accept new Terms', steps: ['Update the Terms page first.', 'In Legal versions, choose Publish new version for Terms.', 'Confirm.'] },
    ],
    cautions: [
      'Maintenance mode stops every student on every platform until you turn it off.',
      'Installed Android apps older than the coming update cannot ask the age and consent questions, so with the check on their users are blocked from AI until they update; pair it with a required update or turn it off until most have updated.',
      'Publishing a legal version cannot be undone; every student is asked again the next time they open AcadeGrade.',
      'To change which AI provider answers a feature, use AI providers.',
    ],
    related: [
      { label: 'AI providers', to: 'admin.ai' },
      { label: 'Audit log', to: 'admin.audit' },
    ],
  }),

  'admin.settings.announcements': entry({
    id: 'admin.settings.announcements',
    title: 'Settings: Announcements',
    summary: 'Shows a banner at the top of the student website, and optionally sends the text as a notification to every student.',
    tasks: [
      { title: 'Banner only', steps: ['Type the text.', 'Save banner.'] },
      { title: 'Notify everyone', steps: ['Choose Send as notification….', 'Check the preview.', 'Confirm.'] },
      { title: 'Remove the banner', steps: ['Choose Remove banner.'] },
    ],
    cautions: [
      'Each send reaches every student\'s inbox and phone (except those who turned off admin broadcasts) and cannot be recalled.',
      'Android shows the notification but not the banner.',
      'Students can dismiss the banner in their browser.',
    ],
  }),

  'admin.settings.public-site': entry({
    id: 'admin.settings.public-site',
    title: 'Settings: Public site',
    summary: 'Edits the app download links on the public pages and the text of the About page.',
    tasks: [
      { title: 'Update the Android download link', steps: ['Paste the HTTPS APK link (keep it the same as Android release).', 'Save public site.'] },
      { title: 'Hide the iOS link', steps: ['Leave iOS blank to show "iOS coming soon".'] },
      { title: 'Publish app-ads.txt', steps: ['Copy the Android app ID from AdMob (App settings; it contains a ~).', 'Paste it into AdMob Android app ID.', 'Save public site.'] },
    ],
    terms: [
      { term: 'AdMob Android app ID', meaning: 'ca-app-pub- plus 16 digits, a ~, then 10 digits. Used to publish app-ads.txt; it is not an ad unit ID.' },
    ],
    cautions: [
      'The Android app\'s Share AcadeGrade QR reads the iOS link from here.',
      '/ads.txt is built from the AdSense publisher ID in Advertising → Web ad networks.',
    ],
    related: [{ label: 'Android release', to: 'admin.release' }],
  }),

  'admin.settings.email': entry({
    id: 'admin.settings.email',
    title: 'Settings: Email',
    summary: 'Sets the Gmail accounts that send general emails and one-time sign-up codes.',
    terms: [
      { term: 'App Password', meaning: 'A 16-character Gmail password for apps; not your normal password.' },
      { term: 'OTP email', meaning: 'Used for verification codes; it falls back to the General account.' },
    ],
    tasks: [
      { title: 'Change a sender', steps: ['Enter the email and App Password.', 'Save.', 'Choose Verify Gmail login.'] },
    ],
    cautions: [
      'Saved passwords are never shown again.',
      'If no account is saved, the server uses its environment settings.',
    ],
  }),

  'admin.settings.advanced': entry({
    id: 'admin.settings.advanced',
    title: 'Settings: Advanced',
    summary: 'Holds reference information and links you rarely need.',
    terms: [
      { term: 'Grading used by the apps', meaning: 'Display only. Calculations use the standard 5-point scale; editable grading profiles are planned.' },
      { term: 'Legacy course list', meaning: 'An old list that no app reads. It stays reachable from here.' },
    ],
    related: [
      { label: 'Legacy course list', to: 'admin.course-list' },
      { label: 'Academic catalogue', to: 'admin.academic-catalogue' },
    ],
  }),

  'admin.audit': entry({
    id: 'admin.audit',
    title: 'Audit log',
    summary: 'A read-only record of admin changes: who changed what, and when.',
    terms: [
      { term: 'Actor', meaning: 'The admin account that made the change.' },
      { term: 'Action', meaning: 'What was changed, such as a setting, an AI key or a user\'s sign-in.' },
    ],
    tasks: [
      { title: 'Find a change', steps: ['Type an exact action (for example settings.update) and Apply filters.', 'Type part of an email in Admin to narrow the entries already loaded.', 'Choose Load more for older ones.'] },
    ],
    cautions: [
      'The first filter by action may fail until a database index is created; the server logs a link for the developer.',
      'Entries cannot be edited or deleted here.',
      'Secrets such as API keys and passwords are never shown in the log.',
    ],
    related: [{ label: 'Settings: Access', to: 'admin.settings.access' }],
  }),
};

const TAB_IDS: Record<string, PageId> = { '/admin/ads': 'admin.ads', '/admin/settings': 'admin.settings' };

function cleanPath(pathname: string) {
  return pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/** The help id for an admin route, or for one tab of a tabbed page. */
export function adminHelpIdFor(pathname: string, tab?: string | null): AdminHelpId | undefined {
  const path = cleanPath(pathname);
  const page = (Object.entries(ROUTES) as Array<[PageId, string]>).find(([, route]) => route === path)?.[0];
  if (!page) return undefined;
  const tabs = (ADMIN_HELP_TABS as Record<string, readonly string[]>)[path];
  if (tab && tabs?.includes(tab) && TAB_IDS[path]) return `${TAB_IDS[path]}.${tab}` as AdminHelpId;
  return page;
}

function hrefFor(id: string): string | undefined {
  if (id in ROUTES) return ROUTES[id as PageId];
  const cut = id.lastIndexOf('.');
  const page = id.slice(0, cut) as PageId;
  return page in ROUTES && ADMIN_HELP[id as AdminHelpId] ? `${ROUTES[page]}?tab=${id.slice(cut + 1)}` : undefined;
}

export const adminHelp: HelpSource = { entries: ADMIN_HELP, hrefFor, platform: 'web' };

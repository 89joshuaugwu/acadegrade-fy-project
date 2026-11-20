import type { HelpEntry, HelpSource } from './types';

/**
 * Admin help content (spec 2026-11-13, Part 4.5.1), written against the
 * rearranged admin UI. Web only. Keep labels identical to what the pages show.
 */

const ROUTES = {
  'admin.overview': '/admin/dashboard',
  'admin.users': '/admin/users',
  'admin.academic-catalogue': '/admin/academic-catalog',
  'admin.support': '/admin/support',
  'admin.share-codes': '/admin/share-codes',
  'admin.course-list': '/admin/courses',
  'admin.analytics': '/admin/analytics',
  'admin.api-health': '/admin/api-analytics',
  'admin.ai': '/admin/ai',
  'admin.usage': '/admin/usage',
  'admin.ads': '/admin/ads',
  'admin.release': '/admin/mobile-release',
  'admin.settings': '/admin/settings',
  'admin.legal': '/admin/legal',
  'admin.testimonials': '/admin/testimonials',
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
      { term: 'Active this week', meaning: 'Students who opened the website or the Android app in the last 7 days. Accounts that have not been seen since this started count as not active, not as inactive.' },
      { term: 'Average CGPA / PI', meaning: 'The average over students with at least one semester of graded courses.' },
      { term: 'Updated', meaning: 'When the numbers were last calculated. A daily job does it at about 03:00 UTC.' },
      { term: 'Needs attention', meaning: 'Settings that are off, unfinished or waiting for you, each linked to where you fix it.' },
    ],
    tasks: [
      { title: 'Check what needs attention', steps: ['Read the Needs attention list.', 'Open each link to fix it.'] },
      { title: 'Get up-to-date numbers', steps: ['Choose Refresh now next to Updated.', 'Wait a moment; it reads every account.'] },
    ],
    cautions: [
      'Refresh now works 3 times an hour and is recorded in the audit log.',
      'A warning beside Updated means the daily job has not run for over 36 hours; check Needs attention.',
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
    summary: 'Find a student account, turn its sign-in off or on, and handle support requests about it.',
    terms: [
      { term: 'Disabled', meaning: 'The account cannot sign in on the website or the Android app. Their data is kept.' },
      { term: 'Find exact email or matric', meaning: 'Searches every account, not only the ones loaded. It needs the full email or matric number.' },
      { term: 'Details and support actions', meaning: 'Profile, activity, devices, AI use and coin history. Grades stay hidden until you give a reason.' },
      { term: 'Grant coins', meaning: 'Goodwill coins: 1 to 10 at a time, 100 a month per admin, never above the balance cap and never to accounts that cannot use AI.' },
    ],
    tasks: [
      { title: 'Find a student', steps: ['Type in the search box to filter the loaded accounts.', 'Or type their full email or matric and choose Find exact email or matric.', 'Choose Load more for older accounts.'] },
      { title: 'Disable sign-in', steps: ['Open the row.', 'Choose Disable sign-in.', 'Confirm.'] },
      { title: 'Correct a student\'s age', steps: ['Open the row.', 'Choose Correct age….', 'Pick Adult or Under 18.', 'Write the reason (who asked, and how).', 'Save age correction.'] },
      { title: 'Answer a grades question', steps: ['Open the row.', 'Choose Details and support actions….', 'Choose Reveal grades… and write why.', 'Choose Reveal grades.'] },
      { title: 'Delete an account on request', steps: ['Open Details and support actions….', 'Choose Delete account….', 'Type the student\'s email exactly.', 'Choose Delete account permanently.'] },
    ],
    cautions: [
      'Disabling and Sign out everywhere take effect on every device; sign-out can take up to an hour.',
      'Correct an age only when the student or a guardian contacted support; under 18 blocks AI and scanning everywhere.',
      'Revealing grades, granting coins and deleting are recorded in the audit log with your reason.',
      'Deleting removes every semester, coin and share link and cannot be undone.',
    ],
    related: [
      { label: 'Support inbox', to: 'admin.support' },
      { label: 'Settings: Access', to: 'admin.settings.access' },
      { label: 'Audit log', to: 'admin.audit' },
    ],
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

  'admin.support': entry({
    id: 'admin.support',
    title: 'Support inbox',
    summary: 'Requests students send from Settings, Help and support on the website or the Android app, and from the public Support page when they cannot sign in. Reply, then close them when they are done.',
    terms: [
      { term: 'Open', meaning: 'New, or reopened, and waiting for you.' },
      { term: 'Waiting', meaning: 'You replied; waiting for the student. They can send a new request if they need more help.' },
      { term: 'Closed', meaning: 'Done. Closed requests are deleted automatically 180 days after closing.' },
      { term: 'Not signed in', meaning: 'Sent from the public Support page by someone who could not sign in. The email address is not verified, and your reply goes by email only.' },
    ],
    tasks: [
      { title: 'Reply to a request', steps: ['Open the Open tab.', 'Open the request.', 'Write your reply.', 'Choose Send reply. The student gets an inbox message and an email.'] },
      { title: 'Close a request', steps: ['Open the request.', 'Choose Close request.'] },
      { title: 'Look up the account', steps: ['Copy the email from the request.', 'In Users, use Find exact email or matric.'] },
    ],
    cautions: [
      'Replies are plain text and cannot be edited or recalled once sent.',
      'Never ask for a password or a one-time code in a reply.',
      'A request can have at most 20 replies.',
      'Students can be under 18; keep replies factual and do not ask for personal documents.',
    ],
    related: [
      { label: 'Users', to: 'admin.users' },
      { label: 'Settings: Access', to: 'admin.settings.access' },
      { label: 'Audit log', to: 'admin.audit' },
    ],
  }),

  'admin.share-codes': entry({
    id: 'admin.share-codes',
    title: 'Share codes',
    summary: 'Course lists students share with a 6-character code, most used first. Switch a bad list off, or add a checked list to the academic catalogue.',
    terms: [
      { term: 'Uses', meaning: 'How many times students imported the list.' },
      { term: 'Disabled', meaning: 'The list no longer opens on the website, in the Android app or on its share page. It is kept and can be enabled again.' },
      { term: 'Add to catalogue', meaning: 'Copies the courses on the list into the academic catalogue for a department, level and semester. Rows already there are skipped.' },
      { term: 'Created by account', meaning: 'The student account that made the code. Only admins see it; look it up in Users.' },
    ],
    tasks: [
      { title: 'Disable a bad code', steps: ['Find the code.', 'Choose Disable.', 'Write a reason.', 'Choose Disable code.'] },
      { title: 'Bring a code back', steps: ['Find the disabled code.', 'Choose Enable.', 'Write a reason and confirm.'] },
      { title: 'Add a checked list to the catalogue', steps: ['Choose Show courses and check each row.', 'Choose Add to catalogue.', 'Enter department, level and semester, and a reason.', 'Choose Add to catalogue.'] },
    ],
    cautions: [
      'Disabling takes effect for students straight away, including lists they were about to import.',
      'Student-made course lists can have wrong codes, titles or units; check them before adding.',
      'Adding to the catalogue cannot be undone from this page; remove rows in Academic catalogue.',
      'Every action is recorded in the audit log with your reason.',
    ],
    related: [
      { label: 'Academic catalogue', to: 'admin.academic-catalogue' },
      { label: 'Users', to: 'admin.users' },
      { label: 'Audit log', to: 'admin.audit' },
    ],
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
    summary: 'Shows how students are doing overall: CGPA spread, degree classes, department averages and the sign-up funnel.',
    terms: [
      { term: 'Degree class bands', meaning: 'First 4.50+, 2:1 3.50+, 2:2 2.40+, Third 1.50+, Pass 1.00+.' },
      { term: 'Sign-up funnel', meaning: 'Students grouped by sign-up week: how many added a semester, used AI, and came back 7 or 30 days later.' },
      { term: 'Came back', meaning: 'Last seen at least 7 (or 30) days after signing up. Recent weeks have not had time yet.' },
    ],
    tasks: [
      { title: 'Export department figures', steps: ['Choose Export CSV (department, users, average CGPA).'] },
      { title: 'Get up-to-date numbers', steps: ['Choose Refresh now next to Updated (3 times an hour).'] },
    ],
    cautions: [
      'Figures are self-reported by students. Every semester with graded courses counts, complete or not.',
      'Numbers are calculated once a day; check Updated before you quote them.',
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
      { term: 'Student feedback on AI answers', meaning: 'Helpful and not-helpful ratings, reasons and reports from students, per feature and model. Notes appear only on reports, and nothing says who sent them.' },
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
      'Android shows Dashboard-ticked campaigns on its Dashboard and Results-ticked ones on its Results screen.',
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
      { term: 'Announcements', meaning: 'Targeted and scheduled announcements for inboxes, the banner and push, plus the simple website banner.' },
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
      { term: 'Legal versions', meaning: 'The current Terms and Privacy versions students are asked to accept. Change them by publishing new text in Legal documents.' },
    ],
    tasks: [
      { title: 'Short maintenance window', steps: ['Turn on Maintenance mode.', 'Save and confirm.', 'Turn it off and save when you are done.'] },
      { title: 'Turn one feature off', steps: ['Switch the feature off under Feature switches.', 'Save.'] },
      { title: 'Ask everyone to accept new Terms', steps: ['In Legal versions, choose Edit text and publish for Terms.', 'Change the wording in Legal documents and save the draft.', 'Choose Publish and confirm.'] },
    ],
    cautions: [
      'Maintenance mode stops every student on every platform until you turn it off.',
      'Installed Android apps older than the coming update cannot ask the age and consent questions, so with the check on their users are blocked from AI until they update; pair it with a required update or turn it off until most have updated.',
      'Publishing legal text cannot be undone; every student is asked to agree again the next time they open AcadeGrade.',
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
    summary: 'Targeted announcements for every student or for chosen universities and levels, shown in inboxes on the website and Android, optionally as the banner and as one push. Below it, the simple website banner.',
    terms: [
      { term: 'Audience', meaning: 'Universities and levels. Empty means everyone. At most 5 universities and levels combined.' },
      { term: 'Draft / Scheduled / Published / Archived', meaning: 'Only Published announcements are visible to students. Archived ones disappear from inboxes.' },
      { term: 'Push', meaning: 'One notification sent to the audience\'s topics when published. It is never sent twice.' },
      { term: 'Scheduled', meaning: 'Published by the daily run (03:00 to 03:59 UTC) on or after the start time, not at the exact minute.' },
      { term: 'Legacy broadcast', meaning: 'The old "send to every device", which reads every account. It disappears once every device is on announcement topics.' },
    ],
    tasks: [
      { title: 'Announce something now', steps: ['Write the title and message.', 'Choose the audience, or leave it empty for everyone.', 'Tick Show as the website banner or Also send a push if you want them.', 'Choose Publish now… and confirm.'] },
      { title: 'Schedule an announcement', steps: ['Fill it in as above.', 'Set Start.', 'Choose Schedule.'] },
      { title: 'Take an announcement down', steps: ['Find it under Recent announcements.', 'Choose Archive.'] },
      { title: 'Banner only', steps: ['Type the text in Website banner.', 'Save banner.'] },
    ],
    cautions: [
      'A push cannot be recalled. Archiving only removes the announcement from inboxes and the banner.',
      'Never include grades or personal details.',
      'Changes to who gets pushes can take up to a day to reach every phone.',
      'Students who turned off admin broadcasts get no push but still see the announcement in their inbox.',
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

  'admin.legal': entry({
    id: 'admin.legal',
    title: 'Legal documents',
    summary: 'Write and publish the Terms of use and the Privacy notice that students and visitors read. Publishing asks every student to agree again.',
    terms: [
      { term: 'Draft', meaning: 'Your saved, unpublished wording. Students never see it until you publish.' },
      { term: 'Version', meaning: 'A numbered, permanent copy created each time you publish. Students agree to a specific version.' },
      { term: 'Effective date', meaning: 'The date shown at the top of the page as when this wording applies.' },
      { term: 'Contact token', meaning: 'Writing {{contact}} shows the public contact email from Settings, or a link to the support page when none is set.' },
    ],
    tasks: [
      { title: 'Change the wording', steps: ['Pick Terms or Privacy.', 'Choose Start from current text, or keep your saved draft.', 'Edit the text and check the preview and any formatting problems.', 'Choose Save draft.'] },
      { title: 'Publish it', steps: ['Save the draft first.', 'Choose Publish and read the confirmation.', 'Confirm. The public page updates and every student is asked to agree again.'] },
    ],
    cautions: [
      'Publishing cannot be undone, but you can publish a newer version that replaces it.',
      'Do not type an email address into the text. Use {{contact}} so it follows the contact email in Settings.',
      'Have a Nigerian data-protection lawyer review wording changes before you publish.',
      'Only simple formatting works: ## headings, bullets, tables, bold and links. Anything else shows as plain text.',
    ],
    related: [
      { label: 'Settings: Access', to: 'admin.settings.access' },
      { label: 'Audit log', to: 'admin.audit' },
    ],
  }),

  'admin.testimonials': entry({
    id: 'admin.testimonials',
    title: 'Testimonials',
    summary: 'Real quotes from students who agreed to be quoted, for the "What students say" section of the home page, and when the home page may show the student count.',
    terms: [
      { term: 'Draft', meaning: 'Saved but not public. Every new quote starts as a draft.' },
      { term: 'Approved', meaning: 'May appear on the public site. The section shows only when at least 3 quotes are approved.' },
      { term: 'Hidden', meaning: 'Taken off the public site but kept here. You can approve it again.' },
      { term: 'Student-count threshold', meaning: 'The home page shows "Used by N students" only once registered students reach this number (100 unless you change it).' },
    ],
    tasks: [
      { title: 'Add a quote', steps: ['Get the student\'s written agreement to be quoted.', 'Choose Add a quote.', 'Type their words (25 at most), first name, level, department, university and the consent date.', 'Choose Save as draft.', 'Choose Approve when it is ready to show.'] },
      { title: 'Take a quote down', steps: ['Choose Hide to take it off the public site, or Delete if the student withdrew consent.'] },
      { title: 'Preview the section', steps: ['Open the home page preview link on this page while signed in.', 'Sample quotes appear only to you, never to visitors.'] },
    ],
    cautions: [
      'Only publish real quotes from students who agreed in writing. Invented quotes mislead students and break Google Play rules.',
      'Use first names only. Never add a surname, matric number or photo.',
      'Every change is recorded in the audit log.',
    ],
    related: [
      { label: 'Settings: Public site', to: 'admin.settings.public-site' },
      { label: 'Audit log', to: 'admin.audit' },
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

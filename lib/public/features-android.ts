import type { ResolvedMobileAppLinks } from '@/lib/mobile-app-links';
import { absoluteUrl, resolveSiteUrl } from '@/lib/seo/site';
import type { PublicUsage } from './usage-public';
import { coinsOn } from './features-shared';

/**
 * /app, the Android page (docs/public-redesign/pages/android-app.md), and
 * the iPhone page /app/download/ios (pages/download-ios.md). Live values
 * (size, version, Play link, coins) come in as data; nothing here throws.
 */

export const ANDROID_COPY = {
  title: 'Android app',
  description:
    "Download AcadeGrade for Android: timetable reminders that work offline, a camera result scanner and App Lock. Free. Here's how to install the APK safely.",
  keywords: ['AcadeGrade APK', 'CGPA app Android', 'timetable reminder app', 'install APK safely'],
  h1: ['AcadeGrade', 'for Android.'],
  sentence: 'Everything on the website, plus timetable reminders that work without data, a camera scanner and App Lock. Free.',
  minAndroid: 'Android 7.0 or newer',
} as const;

export interface AppRelease {
  apkHref: string;
  sizeMb: number | null;
  version: string | null;
  playUrl: string | null;
  coinsPerAd: number | null;
}

/** Page data from the links, the release notice and the usage policy. */
export function appRelease(links: ResolvedMobileAppLinks, version: string | null, usage: PublicUsage | null): AppRelease {
  return {
    apkHref: '/app/download/android',
    sizeMb: links.androidSizeMb,
    version: version && version.trim() ? version.trim() : null,
    playUrl: links.playUrl || null,
    coinsPerAd: usage && coinsOn(usage) ? usage.coins.coinsPerAd : null,
  };
}

/** "Version 1.4.0 · 45 MB · Android 7.0 or newer · APK file"; missing parts drop out with their separators. */
export function metaLine(release: Pick<AppRelease, 'sizeMb' | 'version'>): string {
  return [
    release.version ? `Version ${release.version}` : null,
    release.sizeMb ? `${release.sizeMb} MB` : null,
    ANDROID_COPY.minAndroid,
    'APK file',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Download AcadeGrade for Android, APK file, 45 MB" */
export function downloadName(release: Pick<AppRelease, 'sizeMb'>): string {
  return ['Download AcadeGrade for Android', 'APK file', release.sizeMb ? `${release.sizeMb} MB` : null].filter(Boolean).join(', ');
}

/** The band's top line: "Download AcadeGrade for Android · 45 MB · version 1.4.0". */
export function bandLine(release: Pick<AppRelease, 'sizeMb' | 'version' | 'playUrl'>): string {
  if (release.playUrl) return 'Get AcadeGrade on Google Play · Opens Google Play';
  return ['Download AcadeGrade for Android', release.sizeMb ? `${release.sizeMb} MB` : null, release.version ? `version ${release.version}` : null]
    .filter(Boolean)
    .join(' · ');
}

/* ------------------------------------------------------------------ extras */

export type ExtraId = 'reminders' | 'scanner' | 'lock' | 'privacy' | 'updates' | 'coins';

export interface AppExtra {
  id: ExtraId;
  name: string;
  fact: string;
  /** Describes the screen in the phone outline. */
  screenAlt: string;
  /** Position of the gold dot on the arc, 0 to 5. */
  dot: number;
}

export function appExtras(release: Pick<AppRelease, 'coinsPerAd'>): AppExtra[] {
  const extras: AppExtra[] = [
    {
      id: 'reminders',
      name: 'Offline reminders',
      fact: 'Up to 3 reminders per event, set on your phone, so they arrive without data or signal.',
      screenAlt: 'Timetable week with a reminder for Data Structures at 09:00',
      dot: 5,
    },
    {
      id: 'scanner',
      name: 'Camera scanner',
      fact: 'Point your camera at your result slip and check the rows it reads. For students 18 and over.',
      screenAlt: 'The scan screen with the example result slip in the frame',
      dot: 4.2,
    },
    {
      id: 'lock',
      name: 'App Lock',
      fact: 'Your fingerprint, face or phone passcode each time you come back to AcadeGrade.',
      screenAlt: 'The App Lock screen with Unlock Now and Use Passcode', // taste-skill-ignore: the App Lock screen's real button label
      dot: 3.4,
    },
    {
      id: 'privacy',
      name: 'Screen privacy',
      fact: 'Hide AcadeGrade from the recent-apps preview and block screenshots, if you choose.',
      screenAlt: 'Screen privacy settings with the switch on',
      dot: 2.6,
    },
    {
      id: 'updates',
      name: 'Update notices',
      fact: 'The app tells you when a new version is ready, and where to get it.',
      screenAlt: 'The update notice sheet',
      dot: 1.8,
    },
  ];
  if (release.coinsPerAd) {
    extras.push({
      id: 'coins',
      name: 'Coins for extra uses',
      fact: `Watch a short ad for ${release.coinsPerAd} coins and spend them on extra AcadeMind uses. Not offered to under-18 accounts.`,
      screenAlt: 'The coins sheet with the balance and Watch an ad',
      dot: 1,
    });
  }
  return extras;
}

/* ----------------------------------------------------------------- install */

export interface InstallGroup {
  name: string;
  steps: { step: string; note: string }[];
}

export function installSteps(release: Pick<AppRelease, 'sizeMb'>): InstallGroup[] {
  return [
    {
      name: 'Download',
      steps: [
        { step: 'Tap Download for Android', note: release.sizeMb ? `${release.sizeMb} MB` : 'one file' },
        { step: 'Wait for the download to finish', note: 'see your notifications' },
      ],
    },
    {
      name: 'Install',
      steps: [
        { step: 'Open the file from your notifications, or Files › Downloads', note: '1 tap' },
        { step: 'If Android asks, open Settings and turn on Allow from this source', note: 'once only' },
        { step: 'Go back and tap Install', note: '1 tap' },
        { step: 'If Play Protect offers to scan the app, let it', note: 'a few seconds' },
      ],
    },
    {
      name: 'Open',
      steps: [
        { step: 'Open AcadeGrade and sign in', note: 'your record is there' },
        { step: 'Allow notifications so reminders can reach you', note: '1 tap' },
      ],
    },
  ];
}

export const INSTALL_TOTAL = { label: 'You have: AcadeGrade on your phone, in step with the website', value: 'about 2 minutes' } as const;

export const INSTALL_PARAGRAPH =
  "The app comes as an APK file from AcadeGrade's own link. Android asks you to allow it once, because it didn't come from the Play Store.";
export const INSTALL_PLAY_LINE = 'Prefer Google Play? Use the Google Play button above; it installs and updates the app for you.';

/* -------------------------------------------------------------- safety Q&A */

export function siteHost(): string {
  try {
    return new URL(resolveSiteUrl()).host;
  } catch {
    return 'acadegrade.vercel.app';
  }
}

/** The ten (eleven with Google Play) answers, exactly as rendered; also the FAQPage JSON-LD. */
export function safetyQa(release: Pick<AppRelease, 'sizeMb' | 'playUrl' | 'coinsPerAd'>, host = siteHost()): { question: string; answer: string }[] {
  const coinsClause = release.coinsPerAd ? ', and in the app you can earn extra uses with coins from short ads' : '';
  const qa = [
    {
      question: 'Is it safe to install from a file?',
      answer:
        "Yes, when the file comes from AcadeGrade. This page always links to the current official file, and Android's Play Protect can scan it as it installs.",
    },
    {
      question: 'Where should I download it from?',
      answer: `Only from this page, or a link that starts with ${host}/app. If someone sends you the APK itself on WhatsApp, download a fresh copy here instead.`,
    },
    {
      question: 'What does "Allow from this source" do?',
      answer:
        'It lets your browser, for example Chrome, install this app. You can switch it off again afterwards in Settings › Apps › Special app access › Install unknown apps; the names differ a little between phones.',
    },
    {
      question: 'What will the app ask for?',
      answer:
        "Your camera when you scan a slip, your photos or files when you choose one, notifications for reminders and, on some phones, Alarms & reminders so they arrive on time. Android asks for each one when it's needed.",
    },
    {
      question: 'Is the app the same as the website?',
      answer: 'Yes. Sign in with the same account and your record, transcripts and timetables are all there. The app adds the extras above.',
    },
    {
      question: 'How do I update it?',
      answer:
        "The app tells you when a new version is out. Download it from this page and install it over the old one. Your record stays, because it's saved to your account.",
    },
    {
      question: 'Will it use much data?',
      answer: release.sizeMb
        ? `The download is ${release.sizeMb} MB, once. After that the app is light, and timetable reminders need no data at all. Turn on data saver to make it lighter still.`
        : 'The download happens once. After that the app is light, and timetable reminders need no data at all. Turn on data saver to make it lighter still.',
    },
    { question: 'Which phones does it work on?', answer: `${ANDROID_COPY.minAndroid}.` },
    {
      question: 'What if I uninstall it?',
      answer: 'Nothing is lost. Your record is saved to your account; sign back in and your reminders are set again.',
    },
    {
      question: 'Is it free?',
      answer: `Yes, with nothing to pay and no subscription. AcadeMind has free uses every day${coinsClause}.`,
    },
  ];
  if (release.playUrl) {
    qa.push({ question: 'Is it on Google Play?', answer: "Yes. It's the same app, and Google Play updates it for you." });
  }
  return qa;
}

/* ------------------------------------------------------------------ iPhone */

export const IPHONE_SECTION = {
  heading: 'On an iPhone?',
  text: "There's no App Store app, and you don't need one. AcadeGrade works fully on the website. Add it to your Home Screen and it opens like an app.",
  safari: ['Open AcadeGrade in Safari', 'Tap Share (the square with an arrow)', 'Choose Add to Home Screen', 'Tap Add'],
  other: "Many iPhone browsers also offer Add to Home Screen in their share menu. If yours doesn't, open AcadeGrade in Safari first.",
} as const;

export const IOS_COPY = {
  title: 'AcadeGrade on iPhone',
  description:
    'AcadeGrade works on iPhone in Safari. Add it to your Home Screen and it opens like an app, with your GPA, CGPA, transcripts and timetables. Free.',
  h1: ['AcadeGrade works', 'on your iPhone.'],
  sentence:
    "There's no App Store app to download, and you don't need one. Use AcadeGrade in Safari and add it to your Home Screen: it opens like an app, with your whole record.",
  note: 'Opened this inside WhatsApp or Instagram? Tap ··· and choose Open in Safari first. On newer iPhones, Share may sit under the ··· button.',
  reminder:
    'Timetable reminders on iPhone come from your calendar: download your timetable as a calendar file (.ics) from the website.',
} as const;

export function iosSteps(host = siteHost()): { step: string; pointer: string }[] {
  return [
    { step: 'Open AcadeGrade in Safari', pointer: host },
    { step: 'Tap Share', pointer: 'the square with an arrow' },
    { step: 'Choose Add to Home Screen', pointer: 'scroll down if you need to' },
    { step: 'Tap Add', pointer: 'top right' },
  ];
}

/** A non-empty HTTPS iOS URL, or null (then the honest iPhone page renders). */
export function iosRedirectTarget(iosUrl: string | null | undefined): string | null {
  if (!iosUrl) return null;
  try {
    const url = new URL(iosUrl.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ JSON-LD */

export function softwareApplicationJsonLd(release: Pick<AppRelease, 'sizeMb' | 'version'>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AcadeGrade',
    operatingSystem: 'Android 7.0 or later',
    applicationCategory: 'EducationalApplication',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'NGN' },
    downloadUrl: absoluteUrl('/app/download/android'),
    ...(release.version ? { softwareVersion: release.version } : {}),
    ...(release.sizeMb ? { fileSize: `${release.sizeMb} MB` } : {}),
  };
}

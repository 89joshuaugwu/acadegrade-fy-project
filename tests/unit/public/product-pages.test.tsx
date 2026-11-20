import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COIN_POLICY } from '@/lib/usage/policy';
import type { PublicUsage } from '@/lib/public/usage-public';

const state = vi.hoisted(() => ({
  user: null as null | { uid: string },
  timetableOff: false,
  usage: null as unknown,
  scanVideoUrl: null as string | null,
  links: { androidUrl: 'https://x.example/a.apk', iosUrl: '', androidSizeMb: null as number | null, playUrl: '' },
  version: null as string | null,
  linksFail: false,
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, uid: state.user?.uid ?? null, loading: false, error: null }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ loading: false, isFeatureDisabled: (id: string) => id === 'timetable' && state.timetableOff }),
}));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {} }));
vi.mock('@/lib/public/usage-public', () => ({ readPublicUsage: async () => state.usage }));
vi.mock('@/components/public/home/home-media', () => ({ readHomeMedia: async () => ({ founderPhotoUrl: null, scanVideoUrl: state.scanVideoUrl }) }));
vi.mock('@/lib/mobile-app-links', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mobile-app-links')>();
  return {
    ...actual,
    getMobileAppLinks: async () => {
      if (state.linksFail) throw new Error('firestore down');
      return state.links;
    },
  };
});
vi.mock('@/lib/public/features-app-release', async () => {
  const { appRelease } = await import('@/lib/public/features-android');
  return { readAppRelease: async () => appRelease(state.links, state.version, state.usage as PublicUsage | null) };
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  usePathname: () => '/',
}));

import ResultScannerPage from '@/app/(public)/features/result-scanner/page';
import AcadeMindPage, { metadata as academindMetadata } from '@/app/(public)/features/ai-insights/page';
import TimetableFeaturePage from '@/app/(public)/features/timetable/page';
import AndroidAppPage from '@/app/(public)/app/page';
import IosDownloadPage from '@/app/app/download/ios/page';
import { GET as androidDownload } from '@/app/app/download/android/route';
import { CheckRows } from '@/components/site/product/CheckRows';
import { WeekAgenda } from '@/components/site/product/WeekAgenda';
import { exampleWeek } from '@/lib/public/features-timetable';
import { photoFor } from '@/lib/public/page-photos';

const usage = (coins = false): PublicUsage => ({
  dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 },
  coins: {
    enabled: coins,
    coinsPerAd: 2,
    dailyEarnCap: 10,
    features: {
      insights: { ...DEFAULT_COIN_POLICY.features.insights },
      forecast: { ...DEFAULT_COIN_POLICY.features.forecast },
      whatif: { ...DEFAULT_COIN_POLICY.features.whatif },
      ocr: { ...DEFAULT_COIN_POLICY.features.ocr },
    },
  },
});

const jsonLd = (container: HTMLElement) =>
  JSON.parse(container.querySelector('script[type="application/ld+json"]')?.textContent ?? 'null');

beforeEach(() => {
  state.user = null;
  state.timetableOff = false;
  state.usage = usage();
  state.scanVideoUrl = null;
  state.links = { androidUrl: 'https://x.example/a.apk', iosUrl: '', androidSizeMb: null, playUrl: '' };
  state.version = null;
  state.linksFail = false;
});

describe('/features/result-scanner', () => {
  it('shows the slip beside its rows, live allowances and no coins row while coins are off', async () => {
    const { container } = render(await ResultScannerPage());
    expect(screen.getByRole('heading', { level: 1, name: 'Snap the slip. Check the rows.' })).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features');
    expect(trail.querySelector('[aria-current="page"]')).toHaveTextContent('Result scanner');
    expect(screen.getByRole('table', { name: 'Example result slip' })).toHaveTextContent('CSC 301');
    // The slip's foot (TNU 13, TCP 54, GPA 4.15, CGPA 4.43), set as four figures in the table's tfoot.
    expect(screen.getByRole('table', { name: 'Example result slip' })).toHaveTextContent('TNU13TCP54GPA4.15CGPA4.43');
    const ways = screen.getByRole('table', { name: 'Three ways to get your results in' });
    expect(ways).toHaveTextContent('20 scans in any 24 hours, at most 5 in 15 minutes');
    expect(ways).not.toHaveTextContent('More when you need it');
    expect(screen.getByText('The scan panel on the website')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'What happens to your scan' })).toHaveTextContent('Only the rows you confirm');
    expect(screen.getByRole('link', { name: 'Next feature: AcadeMind' })).toHaveAttribute('href', '/features/ai-insights');
    expect(screen.getByRole('link', { name: 'Read the scanning section of the privacy notice' })).toHaveAttribute('href', '/privacy#ai-and-scanning');
    expect(container.querySelector('main')).toBeNull();
    expect(jsonLd(container).itemListElement).toHaveLength(3);
  });

  it('falls back to numberless wording when usage cannot be read, and shows the coins row when coins are on', async () => {
    state.usage = null;
    render(await ResultScannerPage());
    expect(screen.getByRole('table', { name: 'Three ways to get your results in' })).toHaveTextContent('Free scans every day');
  });

  it('adds the coins row when coins are on for scans', async () => {
    state.usage = usage(true);
    render(await ResultScannerPage());
    expect(screen.getByRole('table', { name: 'Three ways to get your results in' })).toHaveTextContent('More when you need it');
  });

  it('plays the owner video only when config/about.scanVideoUrl is set', async () => {
    state.scanVideoUrl = 'https://cdn.example/scan.mp4';
    const { container } = render(await ResultScannerPage());
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.example/scan.mp4');
  });

  it('lets the student fix the misread unit: 4.17 / 3.32 becomes 4.15 / 3.30', async () => {
    render(<CheckRows />);
    expect(screen.getByText('GPA 4.17')).toBeInTheDocument();
    expect(screen.getByText('PI 3.32')).toBeInTheDocument();
    const units = screen.getByRole('textbox', { name: 'Units for GST 311 Entrepreneurship' });
    expect(units).toHaveValue('1');
    await userEvent.click(screen.getByRole('button', { name: 'Change it to 2' }));
    expect(units).toHaveValue('2');
    expect(screen.getByText('GPA 4.15')).toBeInTheDocument();
    expect(screen.getByText('PI 3.30')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'After your check' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Show it as read' }));
    expect(screen.getByText('GPA 4.17')).toBeInTheDocument();
    fireEvent.change(units, { target: { value: '2' } });
    expect(screen.getByText('GPA 4.15')).toBeInTheDocument();
  });
});

describe('/features/ai-insights (AcadeMind)', () => {
  it('is titled AcadeMind at the same URL, with the analysis, forecast and what-if figures', async () => {
    const { container } = render(await AcadeMindPage());
    expect(academindMetadata.title).toBe('AcadeMind');
    expect(String(academindMetadata.alternates?.canonical)).toMatch(/\/features\/ai-insights$/);
    expect(screen.getByRole('heading', { level: 1, name: 'AcadeMind reads your record.' })).toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: 'Example written analysis' })[0]).toHaveTextContent('would have been 4.62 instead of 4.15');
    expect(screen.getAllByRole('img', { name: /projected 4\.30 next semester and 4\.21 after/ }).length).toBeGreaterThan(0);
    expect(container).toHaveTextContent('Required GPA4.67');
    expect(container).not.toHaveTextContent(/AI-powered|illustrative|coming soon/i);
  });

  it('quotes live allowances and hides the coins group while coins are off', async () => {
    render(await AcadeMindPage());
    const free = document.getElementById('free-uses') as HTMLElement;
    expect(free.querySelector('[data-allowance]')).toHaveTextContent('Written analysis3 a day');
    expect(free).not.toHaveTextContent('Extra uses with coins on Android');
    expect(free).toHaveTextContent('Used them all? Your free uses come back within 24 hours.');
  });

  it('shows the coins group when coins are on', async () => {
    state.usage = usage(true);
    render(await AcadeMindPage());
    expect(document.getElementById('free-uses')).toHaveTextContent('Extra uses with coins on Android');
  });

  it('feeds FAQPage JSON-LD from exactly the visible data answers', async () => {
    const { container } = render(await AcadeMindPage());
    const [, faq] = jsonLd(container);
    const questions = within(document.getElementById('data') as HTMLElement).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(questions);
  });

  it('sends signed-in students to AcadeMind', async () => {
    state.user = { uid: 'u1' };
    render(await AcadeMindPage());
    expect(screen.getAllByRole('link', { name: 'Open AcadeMind' })[0]).toHaveAttribute('href', '/insights');
  });
});

describe('/features/timetable', () => {
  it('lays out the week from the engine and never calls the builder AI', () => {
    const { container } = render(<TimetableFeaturePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your week, on time.' })).toBeInTheDocument();
    expect(screen.getAllByText(/09:00 to 11:00, Data Structures, CSC 301, LT 2, lecture, reminder at 08:50/).length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: 'Why the example plan looks this way' })).toHaveTextContent('23 sessions');
    expect(container).toHaveTextContent('Only 23 of 24 requested sessions fit');
    expect(container).not.toHaveTextContent(/\bAI\b|smart|intelligent|machine learning/);
    const [, faq] = jsonLd(container);
    expect(faq.mainEntity).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'Next feature: Result scanner' })).toHaveAttribute('href', '/features/result-scanner');
  });

  it('switches days with the keyboard', async () => {
    render(<WeekAgenda days={exampleWeek()} />);
    const monday = screen.getByRole('tab', { name: /Mon/ });
    expect(monday).toHaveAttribute('aria-selected', 'true');
    act(() => monday.focus());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    const thursday = screen.getByRole('tab', { name: /Thu/ });
    expect(thursday).toHaveAttribute('aria-selected', 'true');
    expect(thursday).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Computer Networks practical');
  });

  it('sends signed-in students to their timetables, or to the dashboard while the switch is off', () => {
    state.user = { uid: 'u1' };
    const { unmount } = render(<TimetableFeaturePage />);
    expect(screen.getAllByRole('link', { name: 'Open your timetables' })[0]).toHaveAttribute('href', '/timetable');
    unmount();
    state.timetableOff = true;
    render(<TimetableFeaturePage />);
    expect(screen.queryByRole('link', { name: 'Open your timetables' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Open dashboard' })[0]).toHaveAttribute('href', '/dashboard');
  });
});

describe('/app', () => {
  it('leads with Download for Android and drops unknown size and version', async () => {
    const { container } = render(await AndroidAppPage());
    expect(screen.getByRole('heading', { level: 1, name: 'AcadeGrade for Android.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download for Android' })).toHaveAttribute('href', '/app/download/android');
    expect(document.getElementById('android-meta')).toHaveTextContent(/^Android 7\.0 or newer, APK file$/);
    expect(screen.getByText('Android 7.0 or newer')).toBeInTheDocument();
    expect(screen.queryByText(/^Version /)).toBeNull();
    expect(screen.getByRole('link', { name: 'Download AcadeGrade for Android, APK file' })).toHaveAttribute('href', '/app/download/android');
    expect(screen.queryByRole('tab', { name: /Coins for extra uses/ })).toBeNull();
    expect(container).not.toHaveTextContent(/coming soon|\bbeta\b|App Store app is/i);
    const [app, faq] = jsonLd(container);
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app).not.toHaveProperty('fileSize');
    expect(faq.mainEntity).toHaveLength(10);
  });

  it('shows size, version and the coins extra when known, and Google Play first when listed', async () => {
    state.links = { ...state.links, androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=x' };
    state.version = '1.4.0';
    state.usage = usage(true);
    const { container } = render(await AndroidAppPage());
    expect(document.getElementById('android-meta')).toHaveTextContent(/^Version 1\.4\.0, 45 MB, Android 7\.0 or newer, APK file$/);
    expect(screen.getByText('Version 1.4.0')).toBeInTheDocument();
    expect(screen.getAllByText('45 MB')).toHaveLength(2); // the hero's size chip and the first install step
    expect(screen.getByRole('link', { name: 'Get it on Google Play (opens Google Play)' })).toHaveAttribute('href', state.links.playUrl);
    expect(screen.getByRole('link', { name: 'Or download the APK (45 MB)' })).toHaveAttribute('href', '/app/download/android');
    expect(screen.getByRole('tab', { name: /Coins for extra uses/ })).toBeInTheDocument();
    expect(jsonLd(container)[1].mainEntity).toHaveLength(11);
  });

  it('keeps /app/download/android a no-store redirect to the APK', async () => {
    const response = await androidDownload();
    expect(response.status).toBe(307);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('/app/download/ios', () => {
  it('redirects when an iOS link is set', async () => {
    state.links = { ...state.links, iosUrl: 'https://apps.apple.com/app/x' };
    await expect(IosDownloadPage()).rejects.toThrow('REDIRECT https://apps.apple.com/app/x');
  });

  it('renders the honest iPhone page with no link or when Firestore fails, and never says coming soon', async () => {
    for (const fail of [false, true]) {
      state.linksFail = fail;
      const { container, unmount } = render(await IosDownloadPage());
      expect(screen.getByRole('heading', { level: 1, name: 'AcadeGrade works on your iPhone.' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
        expect.arrayContaining([expect.stringContaining('Choose Add to Home Screen')])
      );
      expect(screen.getByRole('link', { name: 'Create your free record' })).toHaveAttribute('href', '/register');
      expect(screen.getByRole('link', { name: 'Have an Android phone? Get the Android app' })).toHaveAttribute('href', '/app');
      expect(container).not.toHaveTextContent(/coming soon|\bsoon\b|preparing/i);
      unmount();
    }
  });
});

describe('product page plumbing', () => {
  it("fills only the owner's image slots (owner decision 3); the rest are designed without a photo", () => {
    for (const slot of ['scanner.hero', 'academind.free', 'timetable.reminders'] as const) {
      const photo = photoFor(slot);
      expect(photo, slot).not.toBeNull();
      expect(photo!.creditId, slot).toBeFalsy();
      expect(photo!.avifSrcSet || photo!.webpSrcSet, slot).toBeTruthy();
    }
    for (const slot of ['features.points', 'features.privacy', 'academind.close', 'timetable.calendar', 'ios.background'] as const) {
      expect(photoFor(slot), slot).toBeNull();
    }
  });

  it('renders the owner photos on the scanner, AcadeMind and timetable pages with sizes set', async () => {
    const pages = [await ResultScannerPage(), await AcadeMindPage(), <TimetableFeaturePage key="t" />];
    for (const page of pages) {
      const { container, unmount } = render(page);
      const img = container.querySelector('picture img');
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('sizes');
      unmount();
    }
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const schema = vi.hoisted(() => ({ ageGate: false, newFeatures: false }));

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'admin-1', email: 'admin@example.com', getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
// The server agent is adding `ageGate` and new feature ids to the settings
// schema. The page detects support through the schema, so tests flip it here.
vi.mock('@/lib/admin/settings-schema', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin/settings-schema')>();
  const NEW = ['ai_forecast', 'ai_whatif', 'transcript_pdf', 'transcript_share'];
  return {
    ...actual,
    parseAdminSettingsMutation: (input: { field?: string; value?: unknown }) => {
      if (input?.field === 'ageGate') {
        if (!schema.ageGate) throw new actual.SettingsValidationError('Unsupported setting field');
        return { target: 'settings', data: { ageGate: input.value } };
      }
      if (input?.field === 'disabledFeatures' && Array.isArray(input.value) && input.value.some((id) => NEW.includes(id as string))) {
        if (!schema.newFeatures) throw new actual.SettingsValidationError('disabledFeatures contains an unsupported feature');
        return { target: 'settings', data: { disabledFeatures: input.value } };
      }
      return actual.parseAdminSettingsMutation(input);
    },
  };
});

import AdminSettingsPage from '@/app/(admin)/admin/settings/page';

// Full-page renders are slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

type Reply = { ok?: boolean; status?: number; body: unknown };
type Route = (url: string, init?: RequestInit) => Reply | undefined;

function mockFetch(route: Route) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const reply = route(url, init) ?? { body: {} };
    const status = reply.status ?? (reply.ok === false ? 500 : 200);
    return { ok: status < 400, status, json: async () => reply.body } as Response;
  });
}
const puts = (spy: ReturnType<typeof mockFetch>, url: string) => spy.mock.calls
  .filter(([target, init]) => String(target) === url && init?.method === 'PUT')
  .map(([, init]) => JSON.parse(String(init!.body)));
const posts = (spy: ReturnType<typeof mockFetch>, url: string) => spy.mock.calls
  .filter(([target, init]) => String(target) === url && init?.method === 'POST')
  .map(([, init]) => JSON.parse(String(init!.body)));

function settingsRoute(settings: Record<string, unknown>, extra?: Route): Route {
  return (url, init) => {
    const special = extra?.(url, init);
    if (special) return special;
    if (url === '/api/admin/settings' && !init?.method) return { body: { settings } };
    if (url === '/api/admin/legal' && !init?.method) return { status: 404, body: { error: 'Not found' } };
    return undefined;
  };
}

async function renderOn(tab?: string) {
  window.history.replaceState(null, '', tab ? `/admin/settings?tab=${tab}` : '/admin/settings');
  const user = userEvent.setup();
  render(<AdminSettingsPage />);
  await screen.findByRole('tablist', { name: 'Settings sections' }, { timeout: 5000 });
  return user;
}

beforeEach(() => {
  schema.ageGate = false;
  schema.newFeatures = false;
  window.history.replaceState(null, '', '/admin/settings');
});

describe('settings: structure', () => {
  it('does not offer editable controls when saved settings fail to load', async () => {
    mockFetch((url) => url === '/api/admin/settings' ? { ok: false, body: {} } : undefined);
    render(<AdminSettingsPage />);
    expect(await screen.findByRole('heading', { name: /settings could not be loaded/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });

  it('splits settings into five tabs with help for the active tab', async () => {
    mockFetch(settingsRoute({}));
    const user = await renderOn();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Access', 'Announcements', 'Public site', 'Email', 'Advanced']);
    expect(screen.getByRole('tab', { name: 'Access' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Help: Settings: Access' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(screen.getByRole('button', { name: 'Help: Settings: Advanced' })).toBeInTheDocument();
    expect(window.location.search).toBe('?tab=advanced');
  });

  it('opens the tab named in the address', async () => {
    mockFetch(settingsRoute({}));
    await renderOn('public-site');
    expect(screen.getByRole('tab', { name: 'Public site' })).toHaveAttribute('aria-selected', 'true');
  });

  it('no longer holds the AI system prompt or an editable grade scale', async () => {
    mockFetch(settingsRoute({ aiSystemPrompt: 'Be kind.' }));
    const user = await renderOn();
    for (const tab of ['Access', 'Announcements', 'Public site', 'Advanced']) {
      await user.click(screen.getByRole('tab', { name: tab }));
      expect(screen.queryByDisplayValue('Be kind.')).not.toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    }
  });
});

describe('settings: access', () => {
  it('describes maintenance mode as platform-wide and saves it only after confirmation', async () => {
    const spy = mockFetch(settingsRoute({}));
    const user = await renderOn();
    const maintenance = screen.getByRole('switch', { name: 'Maintenance mode' });
    expect(screen.getByText('Blocks the website, the Android app and student APIs. Admins can still sign in.')).toBeInTheDocument();
    await user.click(maintenance);
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Save access settings' }));
    const dialog = screen.getByRole('dialog', { name: /turn on maintenance mode/i });
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: /turn on maintenance mode and save/i }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'maintenanceMode', value: true }]));
  });

  it('saves only the changed switches, in one save, and can discard', async () => {
    const spy = mockFetch(settingsRoute({ disabledFeatures: ['share_code'] }));
    const user = await renderOn();
    expect(screen.getByRole('switch', { name: 'Share and import course codes (new codes blocked everywhere)' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('switch', { name: 'Add semester' }));
    expect(screen.getByRole('switch', { name: 'Add semester' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('switch', { name: 'Add semester' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('switch', { name: 'Add semester' }));
    await user.click(screen.getByRole('button', { name: 'Save access settings' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'disabledFeatures', value: ['share_code', 'add_semester'] }]));
    const items = screen.getAllByRole('listitem');
    expect(items.find((item) => item.textContent?.startsWith('Add semester'))).toHaveTextContent('Web only');
    expect(items.find((item) => item.textContent?.startsWith('Written Analysis'))).toHaveTextContent('Web + API');
    // Creating share codes is blocked by the database rules too, so it is not "web only" any more.
    expect(items.find((item) => item.textContent?.startsWith('Share and import course codes'))).toHaveTextContent('Web + API');
  });

  it('confirms before pausing sign-ups', async () => {
    const spy = mockFetch(settingsRoute({}));
    const user = await renderOn();
    await user.click(screen.getByRole('switch', { name: 'Pause new sign-ups' }));
    await user.click(screen.getByRole('button', { name: 'Save access settings' }));
    const dialog = screen.getByRole('dialog', { name: /pause new sign-ups/i });
    await user.click(within(dialog).getByRole('button', { name: /pause sign-ups and save/i }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'disableSignups', value: true }]));
  });

  it('hides the age check and new feature switches until the server supports them', async () => {
    mockFetch(settingsRoute({}));
    await renderOn();
    expect(screen.queryByRole('switch', { name: /require age confirmation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Forecast' })).not.toBeInTheDocument();
  });

  it('shows the age check and new feature switches once the server supports them', async () => {
    schema.ageGate = true;
    schema.newFeatures = true;
    const spy = mockFetch(settingsRoute({}));
    const user = await renderOn();
    const age = screen.getByRole('switch', { name: 'Require age confirmation and AI consent for AI' });
    expect(age).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Under-18s and users who declined are always blocked/)).toBeInTheDocument();
    expect(screen.getByText(/Installed Android apps older than the coming update can't ask these questions/)).toBeInTheDocument();
    for (const name of ['Forecast', 'What-If guidance', 'Transcript PDF', 'Transcript links', 'Timetables']) {
      expect(screen.getByRole('switch', { name })).toBeInTheDocument();
    }
    await user.click(age);
    await user.click(screen.getByRole('button', { name: 'Save access settings' }));
    const dialog = screen.getByRole('dialog', { name: /turn off the age and consent check/i });
    await user.click(within(dialog).getByRole('button', { name: /turn off and save/i }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'ageGate', value: { enforceUnknown: false } }]));
  });

  it('shows legal versions as not available yet when the server has no legal API', async () => {
    mockFetch(settingsRoute({}));
    await renderOn();
    const legal = await screen.findByRole('region', { name: 'Legal versions' });
    expect(await within(legal).findByText(/not available yet/i)).toBeInTheDocument();
    expect(within(legal).queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
  });

  it('shows the current versions and links to the text editor instead of bumping a version without text', async () => {
    const spy = mockFetch(settingsRoute({}, (url) => {
      if (url !== '/api/admin/legal') return undefined;
      return { body: { termsVersion: '2026-11-13', privacyVersion: '2026-12-01' } };
    }));
    await renderOn();
    const legal = await screen.findByRole('region', { name: 'Legal versions' });
    expect(await within(legal).findByText('Terms of use')).toBeInTheDocument();
    expect(within(legal).getByText('2026-11-13')).toBeInTheDocument();
    expect(within(legal).getByText('2026-12-01')).toBeInTheDocument();
    expect(within(legal).getByRole('link', { name: 'Edit Terms text and publish' })).toHaveAttribute('href', '/admin/legal?doc=terms');
    expect(within(legal).getByRole('link', { name: 'Edit Privacy text and publish' })).toHaveAttribute('href', '/admin/legal?doc=privacy');
    // A version can no longer be published from here: nothing is written.
    expect(within(legal).queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    expect(puts(spy, '/api/admin/legal')).toHaveLength(0);
  });
});

describe('settings: announcements', () => {
  it('saves the banner without notifying anyone', async () => {
    const spy = mockFetch(settingsRoute({}));
    const user = await renderOn('announcements');
    await user.type(screen.getByRole('textbox', { name: 'Banner text' }), 'Exams start Monday');
    expect(screen.getByRole('region', { name: 'Banner preview' })).toHaveTextContent('Exams start Monday');
    await user.click(screen.getByRole('button', { name: 'Save banner' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'announcementBanner', value: 'Exams start Monday' }]));
    expect(posts(spy, '/api/notifications/send')).toHaveLength(0);
  });

  it('sends a notification only after a confirmation that quotes the text', async () => {
    const spy = mockFetch(settingsRoute({ announcementBanner: 'Exams start Monday' }));
    const user = await renderOn('announcements');
    expect(screen.getByRole('textbox', { name: 'Banner text' })).toHaveValue('Exams start Monday');
    await user.click(screen.getByRole('button', { name: 'Send to every device (legacy; reads every account)…' }));
    const dialog = screen.getByRole('dialog', { name: /send to every student/i });
    expect(dialog).toHaveTextContent("Send 'Exams start Monday' to every student's inbox and phone?");
    expect(posts(spy, '/api/notifications/send')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Send notification' }));
    await waitFor(() => expect(posts(spy, '/api/notifications/send')).toHaveLength(1));
    expect(posts(spy, '/api/notifications/send')[0]).toMatchObject({ uid: 'all', message: 'Exams start Monday', type: 'broadcast' });
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);
    expect(await screen.findByText(/Last sent/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send to every device (legacy; reads every account)…' }));
    expect(screen.getByRole('dialog', { name: /send to every student/i })).toHaveTextContent(/already sent this exact text/i);
  });

  it('hides the legacy broadcast once every device is on announcement topics', async () => {
    mockFetch(settingsRoute({ announcementBanner: 'Exams start Monday' }, (url, init) => (
      url === '/api/admin/announcements' && !init?.method ? { body: { announcements: [], topicsBackfill: { completedOnce: true } } } : undefined
    )));
    await renderOn('announcements');
    expect(await screen.findByText('No announcements yet.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /legacy/ })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Targeted announcements' })).toBeInTheDocument();
  });

  it('removes the banner', async () => {
    const spy = mockFetch(settingsRoute({ announcementBanner: 'Old news' }));
    const user = await renderOn('announcements');
    await user.click(screen.getByRole('button', { name: 'Remove banner' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'announcementBanner', value: null }]));
    expect(screen.getByRole('textbox', { name: 'Banner text' })).toHaveValue('');
  });
});

describe('settings: public site', () => {
  it('saves download links and the About page with one save', async () => {
    const spy = mockFetch(settingsRoute({ mobileAppLinks: { androidUrl: 'https://example.com/a.apk', iosUrl: '' } }, (url) =>
      url === '/api/about' ? { body: { about: { headline: 'Old headline' } } } : undefined));
    const user = await renderOn('public-site');
    const headline = await screen.findByRole('textbox', { name: 'Headline' });
    await waitFor(() => expect(headline).toHaveValue('Old headline'));
    await user.clear(screen.getByRole('textbox', { name: 'iOS App Store or TestFlight link' }));
    await user.type(screen.getByRole('textbox', { name: 'iOS App Store or TestFlight link' }), 'https://example.com/ios');
    await user.clear(headline);
    await user.type(headline, 'New headline');
    await user.click(screen.getByRole('button', { name: 'Save public site' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toHaveLength(2));
    const [links, about] = posts(spy, '/api/admin/settings');
    expect(links).toEqual({ field: 'mobileAppLinks', value: { androidUrl: 'https://example.com/a.apk', iosUrl: 'https://example.com/ios', androidSizeMb: null, playUrl: '' } });
    expect(about).toMatchObject({ target: 'about', data: { headline: 'New headline' } });
  });
});

describe('settings: public site, Android page fields', () => {
  it('saves the APK size and the Google Play link, and refuses a bad size', async () => {
    const spy = mockFetch(settingsRoute({ mobileAppLinks: { androidUrl: 'https://example.com/a.apk', iosUrl: '', androidSizeMb: 40, playUrl: '' } }));
    const user = await renderOn('public-site');
    const size = screen.getByRole('textbox', { name: 'APK size (MB)' });
    expect(size).toHaveValue('40');
    await user.clear(size);
    await user.type(size, '4.5');
    await user.click(screen.getByRole('button', { name: 'Save public site' }));
    expect(await screen.findByText('Nothing was saved. Fix the APK size first.')).toBeInTheDocument();
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);

    await user.clear(size);
    await user.type(size, '45');
    await user.type(screen.getByRole('textbox', { name: 'Google Play link' }), 'https://play.google.com/store/apps/details?id=com.acadegrade.app');
    await user.click(screen.getByRole('button', { name: 'Save public site' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'mobileAppLinks', value: {
      androidUrl: 'https://example.com/a.apk', iosUrl: '', androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=com.acadegrade.app',
    } }]));
  });
});

describe('settings: app-ads.txt', () => {
  it('validates and saves the AdMob Android app ID on the public site tab', async () => {
    const spy = mockFetch(settingsRoute({ mobileAppLinks: { androidUrl: 'https://example.com/a.apk', iosUrl: '' } }));
    const user = await renderOn('public-site');
    const field = screen.getByRole('textbox', { name: 'AdMob Android app ID' });
    expect(screen.getByText(/Used to publish app-ads.txt/)).toBeInTheDocument();
    await user.click(field);
    await user.paste('ca-app-pub-123/456');
    await user.click(screen.getByRole('button', { name: 'Save public site' }));
    expect(await screen.findByText(/must look like ca-app-pub-/i)).toBeInTheDocument();
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);
    await user.clear(field);
    await user.paste('ca-app-pub-2745430575041686~2976964736');
    await user.click(screen.getByRole('button', { name: 'Save public site' }));
    await waitFor(() => expect(posts(spy, '/api/admin/settings')).toEqual([{ field: 'admobAndroidAppId', value: 'ca-app-pub-2745430575041686~2976964736' }]));
  });
});

describe('settings: advanced', () => {
  it('shows the grading scale read-only and links the legacy course list', async () => {
    mockFetch(settingsRoute({ gradeScale: [{ grade: 'A', min: 75, max: 100, points: 5 }] }));
    const user = await renderOn('advanced');
    await user.click(screen.getByRole('tab', { name: 'Advanced' }));
    const table = screen.getByRole('table', { name: 'Grading used by the apps' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(within(table).getByRole('row', { name: /^A 70.100 5/ })).toBeInTheDocument();
    expect(screen.getByText('Display only. Calculations use the standard 5-point scale; editable grading profiles are planned.')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /legacy course list/i })).toHaveAttribute('href', '/admin/courses');
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });
});

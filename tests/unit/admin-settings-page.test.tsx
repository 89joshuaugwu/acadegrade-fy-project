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
    expect(screen.getByRole('switch', { name: 'Share and import course codes' })).toHaveAttribute('aria-checked', 'false');
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
    for (const name of ['Forecast', 'What-If guidance', 'Transcript PDF', 'Transcript links']) {
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

  it('publishes a new Terms version only after confirming that everyone must agree again', async () => {
    const spy = mockFetch(settingsRoute({}, (url, init) => {
      if (url !== '/api/admin/legal') return undefined;
      if (!init?.method) return { body: { termsVersion: '2026-11-13', privacyVersion: '2026-11-13' } };
      return { body: JSON.parse(String(init.body)) };
    }));
    const user = await renderOn();
    const legal = await screen.findByRole('region', { name: 'Legal versions' });
    expect(await within(legal).findByText('Terms of Service')).toBeInTheDocument();
    expect(within(legal).getAllByText('2026-11-13')).toHaveLength(2);
    await user.click(within(legal).getByRole('button', { name: 'Publish new Terms version' }));
    const dialog = screen.getByRole('dialog', { name: /publish a new terms version/i });
    expect(dialog).toHaveTextContent('Every student will be asked to agree again the next time they open AcadeGrade.');
    expect(puts(spy, '/api/admin/legal')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Publish new version' }));
    await waitFor(() => expect(puts(spy, '/api/admin/legal')).toHaveLength(1));
    const body = puts(spy, '/api/admin/legal')[0];
    expect(Object.keys(body).sort()).toEqual(['privacyVersion', 'termsVersion']);
    expect(body.privacyVersion).toBe('2026-11-13');
    expect(body.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
    expect(body.termsVersion).not.toBe('2026-11-13');
    expect(await within(legal).findByText(body.termsVersion)).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Send as notification…' }));
    const dialog = screen.getByRole('dialog', { name: /send to every student/i });
    expect(dialog).toHaveTextContent("Send 'Exams start Monday' to every student's inbox and phone?");
    expect(posts(spy, '/api/notifications/send')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Send notification' }));
    await waitFor(() => expect(posts(spy, '/api/notifications/send')).toHaveLength(1));
    expect(posts(spy, '/api/notifications/send')[0]).toMatchObject({ uid: 'all', message: 'Exams start Monday', type: 'broadcast' });
    expect(posts(spy, '/api/admin/settings')).toHaveLength(0);
    expect(await screen.findByText(/Last sent/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send as notification…' }));
    expect(screen.getByRole('dialog', { name: /send to every student/i })).toHaveTextContent(/already sent this exact text/i);
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
    expect(links).toEqual({ field: 'mobileAppLinks', value: { androidUrl: 'https://example.com/a.apk', iosUrl: 'https://example.com/ios' } });
    expect(about).toMatchObject({ target: 'about', data: { headline: 'New headline' } });
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

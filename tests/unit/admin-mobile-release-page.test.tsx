import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminNavigation, getRouteMeta } from '@/lib/ui/route-meta';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import MobileReleasePage from '@/app/(admin)/admin/mobile-release/page';

// Full-page renders are slow when many suites run in parallel.
vi.setConfig({ testTimeout: 20_000 });

const disabled = { enabled: false, latestVersion: '', latestBuild: 0, minSupportedBuild: 0, allowIgnore: true, headline: 'An update is available', message: '', imageUrl: '', downloadUrl: '' };
const active = { ...disabled, enabled: true, latestVersion: '1.2.3', latestBuild: 15, downloadUrl: 'https://example.com/app.apk' };

beforeEach(() => vi.restoreAllMocks());

/** Calls to the release endpoint only; the page also reads the public download link. */
const releaseCalls = (mock: { mock: { calls: unknown[][] } }) => mock.mock.calls.filter(([url]) => String(url) === '/api/admin/mobile-release');

describe('mobile release admin', () => {
  it('confirms minimum-build enforcement even when ignoring is allowed, with keyboard cancellation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'PUT' ? JSON.parse(String(options.body)) : active } as Response));
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByRole('spinbutton', { name: 'Minimum supported build' });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum supported build' }), { target: { value: '14' } });
    expect(screen.getByLabelText('Release preview')).toHaveTextContent(/mandatory below build 14/i);
    await user.click(screen.getByRole('button', { name: /save release notice/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/below build 14/i);
    expect(releaseCalls(fetchMock)).toHaveLength(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(releaseCalls(fetchMock)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /save release notice/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish mandatory notice' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /save release notice/i })).toBeDisabled());
    expect(screen.getByLabelText('Release preview')).toHaveTextContent(/saved configuration/i);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/mobile-release', expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"minSupportedBuild":14,"allowIgnore":true') }));
  });

  it('distinguishes saved and draft state and retains same-field edits made during save', async () => {
    let finishSave!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => options?.method === 'PUT'
      ? new Promise<Response>(resolve => { finishSave = resolve; })
      : { ok: true, json: async () => disabled } as Response);
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    expect(await screen.findByLabelText('Release preview')).toHaveTextContent(/saved configuration/i);
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    fireEvent.change(headline, { target: { value: 'Submitted headline' } });
    await user.click(screen.getByRole('button', { name: /save release notice/i }));
    await waitFor(() => expect(finishSave).toBeDefined());
    fireEvent.change(headline, { target: { value: 'Later edit' } });
    await act(async () => finishSave({ ok: true, json: async () => ({ ...disabled, headline: 'Submitted headline' }) } as Response));
    expect(headline).toHaveValue('Later edit');
    expect(screen.getByLabelText('Release preview')).toHaveTextContent(/unsaved draft/i);
    expect(screen.getByLabelText('Saved release status')).toHaveTextContent(/^Off\b/);
    expect(screen.getByRole('button', { name: /save release notice/i })).toBeEnabled();
    fireEvent.change(headline, { target: { value: 'Submitted headline' } });
    expect(screen.getByLabelText('Release preview')).toHaveTextContent(/saved configuration/i);
  });

  it('simulates installed versus latest builds including threshold, current, newer, and invalid builds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ...active, minSupportedBuild: 14 }) } as Response);
    render(<MobileReleasePage />);
    const installed = await screen.findByRole('spinbutton', { name: 'Installed build' });
    const simulator = screen.getByRole('region', { name: /build eligibility/i });
    for (const [value, expected] of [['13', /mandatory update/i], ['14', /optional update/i], ['15', /up to date/i], ['16', /newer than published/i], ['', /enter a positive whole build/i], ['0', /enter a positive whole build/i], ['-1', /enter a positive whole build/i], ['1.5', /enter a positive whole build/i]] as const) {
      fireEvent.change(installed, { target: { value } });
      expect(within(simulator).getByRole('status')).toHaveTextContent(expected);
    }
    fireEvent.change(installed, { target: { value: '14' } });
    fireEvent.click(screen.getByRole('switch', { name: /allow users to ignore/i }));
    expect(within(simulator).getByRole('status')).toHaveTextContent(/mandatory update/i);
    fireEvent.click(screen.getByRole('switch', { name: /enable notice/i }));
    expect(within(simulator).getByRole('status')).toHaveTextContent(/notice is off/i);
    expect(screen.getByLabelText('Saved release status')).toHaveTextContent(/Live: .*build 15/);
  });
  it('appears in admin navigation and loads a disabled draft with bearer auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    render(<MobileReleasePage />);
    expect(await screen.findByLabelText('Saved release status', {}, { timeout: 5000 })).toHaveTextContent(/^Off\b/);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/mobile-release', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
    expect(adminNavigation).toContainEqual(expect.objectContaining({ href: '/admin/mobile-release' }));
    expect(getRouteMeta('/admin/mobile-release').title).toMatch(/Android/i);
  });

  it('blocks invalid active releases before sending a PUT', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByLabelText('Saved release status', {}, { timeout: 5000 });
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.click(screen.getByRole('button', { name: 'Save release notice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/version/i);
    expect(releaseCalls(fetchMock)).toHaveLength(1);
  });

  it('requires confirmation for a mandatory notice and saves the full config', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'PUT' ? JSON.parse(String(options.body)) : disabled } as Response));
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByLabelText('Saved release status', {}, { timeout: 5000 });
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.type(screen.getByRole('textbox', { name: /version/i }), '1.2.3');
    await user.type(screen.getByRole('spinbutton', { name: 'Build number' }), '12');
    await user.type(screen.getByRole('textbox', { name: /download url/i }), 'https://example.com/app.apk');
    await user.click(screen.getByRole('switch', { name: /allow users to ignore/i }));
    await user.click(screen.getByRole('button', { name: 'Save release notice' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/mandatory/i);
    expect(releaseCalls(fetchMock)).toHaveLength(1);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish mandatory notice' }));
    await waitFor(() => expect(releaseCalls(fetchMock)).toHaveLength(2));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/mobile-release', expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bearer test-token' }), body: expect.stringContaining('"allowIgnore":false') }));
  });

  it('uploads notice artwork, previews it, and saves its HTTPS URL without exposing a URL input', async () => {
    const uploadedUrl = 'https://res.cloudinary.com/dgqukbs8n/image/upload/v1/release.png';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => ({
      ok: true,
      json: async () => String(url).includes('cloudinary.com')
        ? { secure_url: uploadedUrl }
        : options?.method === 'PUT' ? JSON.parse(String(options.body)) : disabled,
    } as Response));
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByLabelText('Saved release status', {}, { timeout: 5000 });
    expect(screen.queryByRole('textbox', { name: /image url/i })).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText(/upload notice image/i), new File(['image'], 'release.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: /release notice artwork/i })).toHaveAttribute('src', uploadedUrl);
    await user.click(screen.getByRole('button', { name: /save release notice/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/mobile-release', expect.objectContaining({ method: 'PUT', body: expect.stringContaining(uploadedUrl) })));
  });

  it('rejects non-image and oversized files before upload and can remove saved artwork', async () => {
    const savedWithImage = { ...disabled, imageUrl: 'https://res.cloudinary.com/dgqukbs8n/image/upload/v1/old.png' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => savedWithImage } as Response);
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByRole('img', { name: /release notice artwork/i });
    fireEvent.change(screen.getByLabelText(/upload notice image/i), { target: { files: [new File(['plain'], 'notes.txt', { type: 'text/plain' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/png, jpeg, or webp/i);
    expect(releaseCalls(fetchMock)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText(/upload notice image/i), { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/5 mb/i));
    expect(releaseCalls(fetchMock)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /remove image/i }));
    expect(screen.queryByRole('img', { name: /release notice artwork/i })).not.toBeInTheDocument();
  });

  it('opens with the renamed title, Help and a plain release status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ...active, minSupportedBuild: 12 }) } as Response);
    render(<MobileReleasePage />);
    expect(await screen.findByLabelText('Saved release status', {}, { timeout: 5000 })).toHaveTextContent('Live: update to 1.2.3 (build 15), mandatory below build 12.');
    expect(screen.getByRole('heading', { level: 1, name: 'Android release' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help: Android release' })).toBeInTheDocument();
  });

  it('shows both download links side by side and copies the update link to the public site', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url) === '/api/admin/settings' && !options?.method) {
        return { ok: true, json: async () => ({ settings: { mobileAppLinks: { androidUrl: 'https://example.com/old.apk', iosUrl: 'https://example.com/ios' } } }) } as Response;
      }
      return { ok: true, json: async () => options?.method ? { message: 'ok' } : active } as Response;
    });
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    const links = await screen.findByRole('region', { name: 'Download links' });
    const publicLink = await within(links).findByRole('textbox', { name: 'Public site Android link' });
    await waitFor(() => expect(publicLink).toHaveValue('https://example.com/old.apk'));
    expect(within(links).getByText(/do not match/i)).toBeInTheDocument();
    await user.click(within(links).getByRole('button', { name: 'Use the update link for the public site' }));
    expect(publicLink).toHaveValue('https://example.com/app.apk');
    await user.click(within(links).getByRole('button', { name: 'Save public link' }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([target, init]) => String(target) === '/api/admin/settings' && init?.method === 'POST')).toHaveLength(1));
    const post = fetchMock.mock.calls.find(([target, init]) => String(target) === '/api/admin/settings' && init?.method === 'POST')!;
    expect(JSON.parse(String(post[1]!.body))).toEqual({ field: 'mobileAppLinks', value: { androidUrl: 'https://example.com/app.apk', iosUrl: 'https://example.com/ios' } });
    expect(within(links).queryByText(/do not match/i)).not.toBeInTheDocument();
  });
});

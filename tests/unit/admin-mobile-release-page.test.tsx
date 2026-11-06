import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminNavigation, getRouteMeta } from '@/lib/ui/route-meta';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import MobileReleasePage from '@/app/(admin)/admin/mobile-release/page';

const disabled = { enabled: false, latestVersion: '', latestBuild: 0, minSupportedBuild: 0, allowIgnore: true, headline: 'An update is available', message: '', imageUrl: '', downloadUrl: '' };
const active = { ...disabled, enabled: true, latestVersion: '1.2.3', latestBuild: 15, downloadUrl: 'https://example.com/app.apk' };

beforeEach(() => vi.restoreAllMocks());

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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(screen.getByLabelText('Saved release status')).toHaveTextContent(/notice is off/i);
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
    expect(screen.getByLabelText('Saved release status')).toHaveTextContent(/notice enabled.*build 15/i);
  });
  it('appears in admin navigation and loads a disabled draft with bearer auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    render(<MobileReleasePage />);
    expect(await screen.findByLabelText('Saved release status')).toHaveTextContent(/notice is off/i);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/mobile-release', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
    expect(adminNavigation).toContainEqual(expect.objectContaining({ href: '/admin/mobile-release' }));
    expect(getRouteMeta('/admin/mobile-release').title).toMatch(/Android/i);
  });

  it('blocks invalid active releases before sending a PUT', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByLabelText('Saved release status');
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/version/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation for a mandatory notice and saves the full config', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'PUT' ? JSON.parse(String(options.body)) : disabled } as Response));
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByLabelText('Saved release status');
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.type(screen.getByRole('textbox', { name: /version/i }), '1.2.3');
    await user.type(screen.getByRole('spinbutton', { name: 'Build number' }), '12');
    await user.type(screen.getByRole('textbox', { name: /download url/i }), 'https://example.com/app.apk');
    await user.click(screen.getByRole('switch', { name: /allow users to ignore/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/mandatory/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish mandatory notice' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
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
    await screen.findByLabelText('Saved release status');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(/upload notice image/i), { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/5 mb/i));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /remove image/i }));
    expect(screen.queryByRole('img', { name: /release notice artwork/i })).not.toBeInTheDocument();
  });
});

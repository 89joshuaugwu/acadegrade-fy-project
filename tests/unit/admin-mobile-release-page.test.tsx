import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminNavigation, getRouteMeta } from '@/lib/ui/route-meta';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import MobileReleasePage from '@/app/(admin)/admin/mobile-release/page';

const disabled = { enabled: false, latestVersion: '', latestBuild: 0, minSupportedBuild: 0, allowIgnore: true, headline: 'An update is available', message: '', imageUrl: '', downloadUrl: '' };

beforeEach(() => vi.restoreAllMocks());

describe('mobile release admin', () => {
  it('appears in admin navigation and loads a disabled draft with bearer auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    render(<MobileReleasePage />);
    expect(await screen.findByText(/notice is off/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/mobile-release', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
    expect(adminNavigation).toContainEqual(expect.objectContaining({ href: '/admin/mobile-release' }));
    expect(getRouteMeta('/admin/mobile-release').title).toMatch(/Android/i);
  });

  it('blocks invalid active releases before sending a PUT', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => disabled } as Response);
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByText(/notice is off/i);
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/version/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation for a mandatory notice and saves the full config', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'PUT' ? JSON.parse(String(options.body)) : disabled } as Response));
    const user = userEvent.setup();
    render(<MobileReleasePage />);
    await screen.findByText(/notice is off/i);
    await user.click(screen.getByRole('switch', { name: /enable notice/i }));
    await user.type(screen.getByRole('textbox', { name: /version/i }), '1.2.3');
    await user.type(screen.getByRole('spinbutton', { name: 'Build number' }), '12');
    await user.type(screen.getByRole('textbox', { name: /download url/i }), 'https://example.com/app.apk');
    await user.click(screen.getByRole('switch', { name: /allow users to ignore/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/mandatory/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /publish mandatory/i }));
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
    await screen.findByText(/notice is off/i);
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

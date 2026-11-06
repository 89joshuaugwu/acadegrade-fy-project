import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'admin-token' };
  return { useAuth: () => ({ user }) };
});
import UsagePage from '@/app/(admin)/admin/usage/page';
const defaults = { dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 } };
beforeEach(() => vi.restoreAllMocks());

describe('usage policy editor', () => {
  it('loads authenticated policy, explains fixed windows and separates reward policy', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => defaults } as Response);
    render(<UsagePage />);
    expect(await screen.findByRole('spinbutton', { name: 'Written Analysis daily limit' })).toHaveValue(3);
    expect(screen.getByLabelText('Saved allowances')).toHaveTextContent(/Written Analysis: 3/);
    expect(screen.getByText(/not midnight/i)).toBeInTheDocument();
    expect(screen.getByText(/2 per UTC day/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save allowances' })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledWith('/api/admin/usage', expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' }, cache: 'no-store' }));
  });

  it('retains same-field and other-field edits made during an in-flight save', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => options?.method === 'PUT'
      ? new Promise<Response>(resolve => { finish = resolve; })
      : { ok: true, json: async () => defaults } as Response);
    render(<UsagePage />);
    const insights = await screen.findByRole('spinbutton', { name: 'Written Analysis daily limit' });
    fireEvent.change(insights, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save allowances' }));
    await waitFor(() => expect(finish).toBeDefined());
    fireEvent.change(insights, { target: { value: '7' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Forecast daily limit' }), { target: { value: '9' } });
    await act(async () => finish({ ok: true, json: async () => ({ dailyLimits: { ...defaults.dailyLimits, insights: 6 } }) } as Response));
    expect(insights).toHaveValue(7);
    expect(screen.getByRole('spinbutton', { name: 'Forecast daily limit' })).toHaveValue(9);
    expect(screen.getByLabelText('Saved allowances')).toHaveTextContent(/Written Analysis: 6/);
    expect(screen.getByRole('status')).toHaveTextContent(/unsaved draft/i);
    expect(screen.getByRole('button', { name: 'Save allowances' })).toBeEnabled();
    expect(fetcher).toHaveBeenLastCalledWith('/api/admin/usage', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ dailyLimits: { ...defaults.dailyLimits, insights: 6 } }) }));
  });

  it.each(['', '-1', '1.5', '1001'])('blocks invalid draft %s without a save request', async value => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => defaults } as Response);
    render(<UsagePage />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Result scanning daily limit' }), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save allowances' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/whole numbers from 0 to 1000/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft and saved values distinct after a failed save', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => options?.method === 'PUT'
      ? { ok: false, json: async () => ({ error: 'Unable to save.' }) } as Response
      : { ok: true, json: async () => defaults } as Response);
    render(<UsagePage />);
    const input = await screen.findByRole('spinbutton', { name: 'Forecast daily limit' });
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save allowances' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save.');
    expect(input).toHaveValue(10);
    expect(screen.getByLabelText('Saved allowances')).toHaveTextContent(/Forecast: 8/);
  });

  it('offers retry on a failed load without enabling writes from guessed defaults', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'Forbidden' }) } as Response);
    render(<UsagePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });
});

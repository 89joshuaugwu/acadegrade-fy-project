import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'admin-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
import UsagePage from '@/app/(admin)/admin/usage/page';
import { defaultUsagePolicy } from '@/lib/usage/policy';

// Full renders are slow when many suites run in parallel.
vi.setConfig({ testTimeout: 20_000 });
const defaults = defaultUsagePolicy();
const envelope = (policy = defaults, source = 'stored', fallbacks: string[] = []) => ({ policy, source, fallbacks });
const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
const failed = (body: unknown = {}) => ({ ok: false, json: async () => body }) as Response;
const liveAds = { enabled: true, testMode: false, rewardedEnabled: true, rewardedUnitId: 'ca-app-pub-1234567890123456/1234567890', placements: { dashboard: false, results: false } };

type Handler = (url: string, options?: RequestInit) => Response | Promise<Response>;
/** Routes the usage policy and the Android ads read the page makes. */
function mockApi({ usage, ads = () => ok({ config: liveAds }) }: { usage: Handler; ads?: Handler }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const url = String(input);
    if (url === '/api/admin/ads/mobile') return ads(url, options);
    return usage(url, options);
  });
}
const usageCalls = (fetcher: ReturnType<typeof mockApi>, method?: string) => fetcher.mock.calls
  .filter(([url, options]) => url === '/api/admin/usage' && (!method || options?.method === method));

beforeEach(() => vi.restoreAllMocks());

describe('Free uses & coins editor', () => {
  it('loads the authenticated policy under the renamed sections', async () => {
    const fetcher = mockApi({ usage: () => ok(envelope()) });
    render(<UsagePage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Free uses & coins' })).toBeInTheDocument();
    expect(await screen.findByRole('spinbutton', { name: 'Written Analysis: free uses per 24 hours' })).toHaveValue(3);
    expect(screen.getByRole('spinbutton', { name: 'What-If guidance: free uses per 24 hours' })).toHaveValue(20);
    expect(screen.getAllByText(/Also limited to 2 per hour/)).toHaveLength(2);
    expect(screen.getByText(/once every 12 hours/)).toBeInTheDocument();
    expect(screen.getByText(/reused for up to 1 hour/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free uses per 24 hours' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coins (Android)' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('spinbutton', { name: 'Result scanning coin price' })).toHaveValue(3);
    expect(screen.getByRole('switch', { name: 'Coins allowed for Result scanning' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('spinbutton', { name: 'What-If guidance coin uses per day' })).toHaveValue(10);
    expect(screen.getByLabelText('Saved free uses')).toHaveTextContent(/Written Analysis: 3/);
    expect(screen.queryByText(/\bpending\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Requires the Android rewarded switch/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Policy source warning')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save free uses and coins' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledWith('/api/admin/usage', expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' }, cache: 'no-store' }));
  }, 15000);

  it('opens with the shared rewarded readiness strip built from saved settings', async () => {
    mockApi({ usage: () => ok(envelope()) });
    render(<UsagePage />);
    const strip = await screen.findByRole('region', { name: 'Rewarded readiness' });
    await waitFor(() => expect(strip).toHaveTextContent('Earning is off because coins are switched off.'));
    expect(within(strip).getAllByRole('listitem')).toHaveLength(4);
    expect(within(strip).getByRole('link', { name: 'Fix Coins on' })).toHaveAttribute('href', '/admin/usage');
  });

  it('marks the Android checks as not loaded when the ads read fails', async () => {
    mockApi({ usage: () => ok(envelope()), ads: () => failed({ error: 'down' }) });
    render(<UsagePage />);
    const strip = await screen.findByRole('region', { name: 'Rewarded readiness' });
    await waitFor(() => expect(within(strip).getAllByRole('listitem')[0]).toHaveTextContent(/Not loaded/));
  });

  it('shows the legacy extra refresh only while coins are off', async () => {
    mockApi({ usage: () => ok(envelope()) });
    render(<UsagePage />);
    const note = 'Without coins, a verified rewarded ad gives one extra Written Analysis refresh (max 2 per UTC day).';
    expect(await screen.findByText(note)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' }));
    expect(screen.queryByText(note)).not.toBeInTheDocument();
  });

  it.each([
    ['partial', ['dailyLimits.forecast', 'coins'], /Forecast: free uses per 24 hours.*Coin settings \(not saved yet\)/],
    ['invalid', ['dailyLimits.insights'], /could not be read/i],
    ['default', [], /Nothing has been saved yet/i],
  ])('warns visibly when the effective policy is %s rather than stored', async (source, fallbacks, text) => {
    mockApi({ usage: () => ok(envelope(defaults, source, fallbacks)) });
    render(<UsagePage />);
    expect(await screen.findByLabelText('Policy source warning')).toHaveTextContent(text);
  });

  it('retains same-field and other-field edits made during an in-flight save', async () => {
    let finish!: (response: Response) => void;
    const fetcher = mockApi({ usage: (_url, options) => options?.method === 'PUT'
      ? new Promise<Response>(resolve => { finish = resolve; })
      : ok(envelope()) });
    render(<UsagePage />);
    const insights = await screen.findByRole('spinbutton', { name: 'Written Analysis: free uses per 24 hours' });
    fireEvent.change(insights, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save free uses and coins' }));
    await waitFor(() => expect(finish).toBeDefined());
    fireEvent.change(insights, { target: { value: '7' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Forecast: free uses per 24 hours' }), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' }));
    const persisted = { ...defaults, dailyLimits: { ...defaults.dailyLimits, insights: 6 } };
    await act(async () => finish(ok(envelope(persisted))));
    expect(insights).toHaveValue(7);
    expect(screen.getByRole('spinbutton', { name: 'Forecast: free uses per 24 hours' })).toHaveValue(9);
    expect(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Saved free uses')).toHaveTextContent(/Written Analysis: 6/);
    expect(screen.getByRole('status', { name: 'Save status' })).toHaveTextContent(/unsaved draft/i);
    expect(screen.getByRole('button', { name: 'Save free uses and coins' })).toBeEnabled();
    expect(usageCalls(fetcher, 'PUT').at(-1)).toEqual(['/api/admin/usage', expect.objectContaining({ method: 'PUT', body: JSON.stringify(persisted) })]);
  });

  it('confirms before turning coins on, then saves coins and prices as one policy', async () => {
    const fetcher = mockApi({ usage: (_url, options) => options?.method === 'PUT'
      ? ok(envelope(JSON.parse(String(options.body))))
      : ok(envelope()) });
    render(<UsagePage />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Let Android users earn and spend coins' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Coins per ad' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Coins allowed for What-If guidance' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Result scanning coin price' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Forecast coin uses per day' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save free uses and coins' }));
    const dialog = await screen.findByRole('dialog', { name: /turn coins on/i });
    expect(dialog).toHaveTextContent('Students on Android will see coin prices and can watch ads to earn. Check Rewarded readiness first.');
    expect(usageCalls(fetcher, 'PUT')).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Turn coins on and save' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Save status' })).toHaveTextContent(/No unsaved changes/));
    const body = JSON.parse(String(usageCalls(fetcher, 'PUT').at(-1)?.[1]?.body));
    expect(body.coins).toEqual({ ...defaults.coins, enabled: true, coinsPerAd: 3, features: {
      ...defaults.coins.features, whatif: { ...defaults.coins.features.whatif, enabled: false },
      ocr: { ...defaults.coins.features.ocr, price: 4 }, forecast: { ...defaults.coins.features.forecast, dailyUseCap: 0 },
    } });
    expect(screen.getByLabelText('Saved coin settings')).toHaveTextContent(/On/);
  });

  it('saves without a confirmation when coins were already on', async () => {
    const coinsOn = { ...defaults, coins: { ...defaults.coins, enabled: true } };
    const fetcher = mockApi({ usage: (_url, options) => options?.method === 'PUT'
      ? ok(envelope(JSON.parse(String(options.body))))
      : ok(envelope(coinsOn)) });
    render(<UsagePage />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Balance cap' }), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save free uses and coins' }));
    await waitFor(() => expect(usageCalls(fetcher, 'PUT')).toHaveLength(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('discards the draft back to the saved policy', async () => {
    mockApi({ usage: () => ok(envelope()) });
    render(<UsagePage />);
    const balance = await screen.findByRole('spinbutton', { name: 'Balance cap' });
    fireEvent.change(balance, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' }));
    expect(screen.getByRole('status', { name: 'Save status' })).toHaveTextContent(/unsaved draft/i);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(balance).toHaveValue(30);
    expect(screen.getByRole('switch', { name: 'Let Android users earn and spend coins' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('status', { name: 'Save status' })).toHaveTextContent(/No unsaved changes/);
  });

  it.each([
    ['Result scanning: free uses per 24 hours', '1001', /whole numbers from 0 to 1000/],
    ['Result scanning: free uses per 24 hours', '', /whole numbers from 0 to 1000/],
    ['Written Analysis: free uses per 24 hours', '1.5', /whole numbers from 0 to 1000/],
    ['Coins per ad', '11', /Coins per ad must be a whole number from 1 to 10/],
    ['Balance cap', '0', /Balance cap must be a whole number from 1 to 500/],
    ['Forecast coin price', '21', /Forecast coin price must be a whole number from 1 to 20/],
    ['What-If guidance coin uses per day', '-1', /What-If guidance coin uses per day must be a whole number from 0 to 50/],
  ])('blocks invalid %s draft %s without a save request', async (name, value, message) => {
    const fetcher = mockApi({ usage: () => ok(envelope()) });
    render(<UsagePage />);
    const input = await screen.findByRole('spinbutton', { name });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save free uses and coins' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(usageCalls(fetcher)).toHaveLength(1);
  });

  it('keeps the draft and saved values distinct after a failed save', async () => {
    mockApi({ usage: (_url, options) => options?.method === 'PUT' ? failed({ error: 'Unable to save.' }) : ok(envelope()) });
    render(<UsagePage />);
    const input = await screen.findByRole('spinbutton', { name: 'Forecast: free uses per 24 hours' });
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save free uses and coins' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save.');
    expect(input).toHaveValue(10);
    expect(screen.getByLabelText('Saved free uses')).toHaveTextContent(/Forecast: 8/);
  });

  it('offers retry on a failed or malformed load without enabling writes from guessed defaults', async () => {
    mockApi({ usage: () => failed({ error: 'Forbidden' }) });
    render(<UsagePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('refuses a load response that is not a complete policy', async () => {
    mockApi({ usage: () => ok({ dailyLimits: defaults.dailyLimits }) });
    render(<UsagePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load free uses/);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'admin-1', email: 'admin@acadegrade.example', getIdToken: mocks.getIdToken },
  }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import AdminAiOperationsPage from '@/app/(admin)/admin/ai/page';

// Full renders are slow when many suites run in parallel.
vi.setConfig({ testTimeout: 20_000 });

const providers = {
  groq: { models: ['llama-3.3-70b-versatile'], capabilities: ['text'] },
  openrouter: { models: ['openrouter/free', 'google/gemma-4-31b-it:free'], capabilities: ['text'] },
  gemini: { models: ['gemini-3.1-flash-lite'], capabilities: ['text', 'multimodal'] },
};

const managedConfig = {
  source: 'managed',
  revision: 4,
  routes: {
    insights: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' }] },
    forecast: { mode: 'fallback-chain', chain: [
      { providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' },
      { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-fallback' },
    ] },
    whatif: { mode: 'local-only', chain: [] },
  },
};
const secrets = [
  { secretId: 'groq-primary', providerId: 'groq', state: 'active', version: 1, label: 'Groq primary', priority: 1 },
  { secretId: 'groq-spare', providerId: 'groq', state: 'active', version: 1, label: 'Groq spare', priority: 2 },
  { secretId: 'gemini-fallback', providerId: 'gemini', state: 'active', version: 1, label: 'Gemini fallback', priority: 1, purpose: 'fallback' },
];

type Snapshot = Record<string, unknown>;
let snapshot: Snapshot;
let settings: Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const calls = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined }));
const posts = (url: string) => calls().filter((call) => call.url === url && call.method === 'POST');

describe('Admin AI providers page', () => {
  beforeEach(() => {
    mocks.getIdToken.mockResolvedValue('admin-token');
    snapshot = { providers };
    settings = { aiSystemPrompt: 'You are a careful academic advisor.' };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url === '/api/admin/ai' && method === 'GET') return json(snapshot);
      if (url === '/api/admin/settings' && method === 'GET') return json({ settings });
      if (url === '/api/admin/settings' && method === 'POST') return json({ message: 'Settings updated.' });
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (body.operation === 'set-secret-state') return json({ secretId: body.secretId, state: body.state });
      if (body.operation === 'set-gemini-billing') return json({ geminiBilling: body.geminiBilling });
      if (body.operation === 'save-routing') return json({ config: { source: 'managed', revision: body.expectedRevision + 1, routes: body.routing, providerModels: body.providerModels } });
      return json({ secret: { secretId: 'groq-primary', providerId: 'groq', state: 'active', version: 1 } });
    }));
  });

  it('writes a key without ever rendering or pre-filling its plaintext value', async () => {
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'AI providers' })).toBeInTheDocument();
    expect(await screen.findByText('gemini-3.1-flash-lite')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Written Analysis mode' })).toHaveValue('disabled');
    expect(screen.getByRole('button', { name: 'Save routing' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Provider keys and models' })).toBeInTheDocument();

    const keyInput = screen.getByLabelText('Groq API key');
    expect(keyInput).toHaveValue('');
    await user.type(keyInput, 'gsk_sensitive-value');
    await user.click(screen.getByRole('button', { name: 'Save Groq key' }));

    await waitFor(() => expect(screen.getByText(/groq-primary saved/)).toBeInTheDocument());
    expect(keyInput).toHaveValue('');
    expect(screen.queryByDisplayValue('gsk_sensitive-value')).not.toBeInTheDocument();
    expect(screen.queryByText('gsk_sensitive-value')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/admin/ai', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      body: JSON.stringify({
        operation: 'upsert-secret',
        providerId: 'groq',
        secretId: 'groq-primary',
        value: 'gsk_sensitive-value',
        label: 'Groq primary',
        modelId: 'llama-3.3-70b-versatile',
        priority: 1,
        purpose: 'general',
      }),
    }));
  }, 15000);

  it('names features and modes the way students see them', async () => {
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);
    const scanning = await screen.findByRole('combobox', { name: 'Result scanning mode' });
    expect(within(scanning).getAllByRole('option').map((option) => option.textContent)).toEqual(['Off', 'One provider', 'Provider with backups']);
    const whatIf = screen.getByRole('combobox', { name: 'What-If guidance mode' });
    expect(within(whatIf).getAllByRole('option').map((option) => option.textContent)).toEqual(['Off', 'Calculator only (no AI)', 'One provider', 'Provider with backups']);
    expect(screen.getByRole('combobox', { name: 'Forecast mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Written Analysis: fill from saved keys' })).toHaveTextContent('Fill from saved keys');

    await user.type(screen.getByRole('textbox', { name: 'New Gemini model ID' }), 'gemini-next-version');
    await user.click(screen.getByRole('button', { name: 'Add Gemini model' }));
    expect(screen.getByText('gemini-next-version')).toBeInTheDocument();
    expect(screen.getByLabelText('Key name', { selector: '#gemini-slot' })).toHaveValue('ocr');
  });

  it('says plainly that AI is off until routing is saved', async () => {
    render(<AdminAiOperationsPage />);
    const status = await screen.findByRole('region', { name: 'AI status' });
    expect(status).toHaveTextContent('AI is off. No routing has been saved yet, so every AI request fails. Save routing to turn AI on.');
    expect(within(status).getByText('Written Analysis').parentElement).toHaveTextContent('Off');
  });

  it('shows the saved revision and each feature mode once routing is managed', async () => {
    snapshot = { providers, config: managedConfig, secrets };
    render(<AdminAiOperationsPage />);
    const status = await screen.findByRole('region', { name: 'AI status' });
    expect(status).toHaveTextContent('AI is on (revision 4)');
    const chips = within(status).getAllByRole('listitem').map((item) => item.textContent);
    expect(chips).toEqual(['Written Analysis: One provider', 'Forecast: Backups', 'What-If guidance: Calculator only', 'Result scanning: Off']);
  });

  it('edits and restores the Written Analysis instructions through the same settings field', async () => {
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);
    await user.click(await screen.findByText('Custom instructions (system prompt)'));
    const prompt = await screen.findByRole('textbox', { name: 'Written Analysis instructions' });
    await waitFor(() => expect(prompt).toHaveValue('You are a careful academic advisor.'));
    await user.clear(prompt);
    await user.type(prompt, 'Be brief.');
    await user.click(screen.getByRole('button', { name: 'Save instructions' }));
    await waitFor(() => expect(posts('/api/admin/settings')).toHaveLength(1));
    expect(posts('/api/admin/settings')[0].body).toEqual({ field: 'aiSystemPrompt', value: 'Be brief.' });

    await user.click(screen.getByRole('button', { name: 'Restore built-in instructions' }));
    const dialog = screen.getByRole('dialog', { name: /restore the built-in instructions/i });
    expect(posts('/api/admin/settings')).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Restore built-in instructions' }));
    await waitFor(() => expect(posts('/api/admin/settings')).toHaveLength(2));
    expect(posts('/api/admin/settings')[1].body).toEqual({ field: 'aiSystemPrompt', value: '' });
    expect(screen.getByRole('textbox', { name: 'Written Analysis instructions' })).toHaveValue('');
  });

  it('confirms before disabling a key the saved routing uses, but not an unused one', async () => {
    snapshot = { providers, config: managedConfig, secrets };
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);
    await user.click(await screen.findByRole('button', { name: 'Disable groq-primary' }));
    const dialog = screen.getByRole('dialog', { name: /disable groq-primary/i });
    expect(dialog).toHaveTextContent('Written Analysis and Forecast use this key. Disabling it makes those features fail, or fall back to the next provider, immediately.');
    expect(posts('/api/admin/ai')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Disable key' }));
    await waitFor(() => expect(posts('/api/admin/ai')).toHaveLength(1));
    expect(posts('/api/admin/ai')[0].body).toEqual({ operation: 'set-secret-state', secretId: 'groq-primary', state: 'inactive' });

    await user.click(screen.getByRole('button', { name: 'Disable groq-spare' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(posts('/api/admin/ai')).toHaveLength(2));
  });

  it('warns about the Gemini free tier only when the server reports billing unconfirmed', async () => {
    snapshot = { providers, geminiBilling: 'unconfirmed' };
    const { unmount } = render(<AdminAiOperationsPage />);
    expect(await screen.findByText("Gemini is on the free tier. Google may use what's sent to improve its products, including result slips. Enable billing on the Google Cloud project, then mark it confirmed here.")).toBeInTheDocument();
    unmount();

    snapshot = { providers, geminiBilling: 'confirmed' };
    const confirmed = render(<AdminAiOperationsPage />);
    await screen.findByRole('region', { name: 'AI status' });
    expect(screen.queryByText(/Gemini is on the free tier/)).not.toBeInTheDocument();
    confirmed.unmount();

    snapshot = { providers };
    render(<AdminAiOperationsPage />);
    await screen.findByRole('region', { name: 'AI status' });
    expect(screen.queryByText(/Gemini is on the free tier/)).not.toBeInTheDocument();
  });

  it('marks Gemini billing confirmed only after a confirmation, and can undo it', async () => {
    snapshot = { providers, geminiBilling: 'unconfirmed' };
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);
    await user.click(await screen.findByRole('button', { name: 'Mark billing confirmed…' }));
    const dialog = screen.getByRole('dialog', { name: /mark gemini billing confirmed/i });
    expect(dialog).toHaveTextContent('Confirm that billing is enabled on the Google Cloud project that owns the Gemini key? Only confirm after checking in Google Cloud.');
    expect(posts('/api/admin/ai')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Mark billing confirmed' }));
    await waitFor(() => expect(posts('/api/admin/ai')).toHaveLength(1));
    expect(posts('/api/admin/ai')[0].body).toEqual({ operation: 'set-gemini-billing', geminiBilling: 'confirmed' });
    await waitFor(() => expect(screen.queryByText(/Gemini is on the free tier/)).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Mark as unconfirmed' }));
    await waitFor(() => expect(posts('/api/admin/ai')).toHaveLength(2));
    expect(posts('/api/admin/ai')[1].body).toEqual({ operation: 'set-gemini-billing', geminiBilling: 'unconfirmed' });
    expect(await screen.findByText(/Gemini is on the free tier/)).toBeInTheDocument();
  });

  it('offers OpenRouter data collection only on routes with an OpenRouter target and saves it with the route', async () => {
    snapshot = {
      providers,
      config: { ...managedConfig, routes: { ...managedConfig.routes, insights: { mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-primary' }] } } },
      secrets: [...secrets, { secretId: 'openrouter-primary', providerId: 'openrouter', state: 'active', version: 1, label: 'OpenRouter primary', priority: 1 }],
      geminiBilling: 'confirmed',
    };
    const user = userEvent.setup();
    render(<AdminAiOperationsPage />);
    const allow = await screen.findByRole('switch', { name: 'Written Analysis: allow OpenRouter data collection' });
    expect(allow).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Off sends data_collection: deny. Free models with no compliant provider fail over to the next target.')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Forecast: allow OpenRouter data collection' })).not.toBeInTheDocument();
    await user.click(allow);
    await user.click(screen.getByRole('button', { name: 'Save routing' }));
    await waitFor(() => expect(posts('/api/admin/ai')).toHaveLength(1));
    const { routing } = posts('/api/admin/ai')[0].body;
    expect(routing.insights).toEqual({ mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-primary' }], dataCollection: 'allow' });
    expect(routing.forecast).not.toHaveProperty('dataCollection');
  });
});

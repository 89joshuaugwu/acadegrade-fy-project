import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/admin/ai', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
}));

const auth = vi.hoisted(() => ({
  user: { uid: 'admin-1', email: 'admin@acadegrade.example', getIdToken: () => Promise.resolve('token-1') },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const firebaseAuth = vi.hoisted(() => ({ signOut: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/firebase/auth', () => firebaseAuth);
vi.mock('@/lib/firebase/fcm', () => ({ removeNotificationToken: vi.fn(() => Promise.resolve()) }));
vi.mock('@/components/ui/ThemeControl', () => ({ ThemeControl: () => <div aria-label="Theme controls" /> }));

import { AdminShell } from '@/components/layout/AdminShell';

const groupLinks = (name: string, scope: HTMLElement = document.body) =>
  within(within(scope).getByRole('group', { name })).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);

/** GET /api/admin/support?status=open and /api/admin/academic-catalog/suggestions answers. */
function stubCounts({ open = 3, pending = 2, more = false } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/admin/support')) {
      return new Response(JSON.stringify({ tickets: Array.from({ length: open }, (_, i) => ({ id: `tk-${i}`, status: 'open' })), nextCursor: more ? 'next' : null }));
    }
    if (url.startsWith('/api/admin/academic-catalog/suggestions')) {
      return new Response(JSON.stringify({ suggestions: Array.from({ length: pending }, (_, i) => ({ id: `sg-${i}`, status: 'pending' })) }));
    }
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => { stubCounts({ open: 0, pending: 0 }); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('AdminShell desktop rail', () => {
  it('groups navigation by job with the renamed labels', () => {
    navigation.pathname = '/admin/ai';
    render(<AdminShell><p>Content</p></AdminShell>);
    const primary = screen.getByRole('navigation', { name: 'Admin primary navigation' });
    expect(within(primary).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview', 'Users', 'Academic catalogue', 'Support inbox', 'Share codes', 'Academic analytics', 'API health',
      'AI providers', 'Free uses & coins', 'Advertising', 'Android release', 'Settings', 'Legal documents', 'Testimonials', 'Audit log',
    ]);
    expect(groupLinks('Students', primary)).toEqual([['Users', '/admin/users'], ['Academic catalogue', '/admin/academic-catalog'], ['Support inbox', '/admin/support'], ['Share codes', '/admin/share-codes']]);
    expect(groupLinks('Monitoring', primary)).toEqual([['Academic analytics', '/admin/analytics'], ['API health', '/admin/api-analytics']]);
    expect(groupLinks('AI, limits & ads', primary)).toEqual([['AI providers', '/admin/ai'], ['Free uses & coins', '/admin/usage'], ['Advertising', '/admin/ads']]);
    expect(groupLinks('Release & system', primary)).toEqual([['Android release', '/admin/mobile-release'], ['Settings', '/admin/settings'], ['Legal documents', '/admin/legal'], ['Testimonials', '/admin/testimonials'], ['Audit log', '/admin/audit']]);
  });

  it('keeps the legacy course list out of the navigation', () => {
    navigation.pathname = '/admin/dashboard';
    render(<AdminShell><p>Content</p></AdminShell>);
    expect(screen.queryByRole('link', { name: /course catalogue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /legacy course list/i })).not.toBeInTheDocument();
  });

  it('keeps the tablet header above the content until the desktop rail appears', () => {
    render(<AdminShell><p>Content</p></AdminShell>);
    const shell = screen.getByRole('main').parentElement;
    expect(shell).toHaveClass('lg:flex-row');
    expect(shell).not.toHaveClass('md:flex-row');
    expect(screen.getByRole('main')).toHaveClass('min-w-0');
  });

  it('marks the active destination in the rail', () => {
    navigation.pathname = '/admin/ai';
    render(<AdminShell><p>AI page content</p></AdminShell>);
    const primary = screen.getByRole('navigation', { name: 'Admin primary navigation' });
    expect(within(primary).getByRole('link', { name: 'AI providers' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('AdminShell phone navigation', () => {
  it('names the current section in the top bar, including the hidden legacy course list', () => {
    navigation.pathname = '/admin/courses';
    render(<AdminShell><p>Courses</p></AdminShell>);
    expect(screen.getByRole('banner')).toHaveTextContent('Legacy course list');
  });

  it('puts the four most-used destinations and More in the bottom bar', () => {
    navigation.pathname = '/admin/users';
    render(<AdminShell><p>Users</p></AdminShell>);
    const bar = screen.getByRole('navigation', { name: 'Admin quick navigation' });
    expect(within(bar).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Overview', '/admin/dashboard'], ['Users', '/admin/users'], ['Support', '/admin/support'], ['Catalogue', '/admin/academic-catalog'],
    ]);
    expect(within(bar).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar).getByRole('button', { name: 'More sections' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(bar).getByRole('button', { name: 'More sections' })).not.toHaveAttribute('data-current');
  });

  it('marks More as current when the open section lives in the More sheet', () => {
    navigation.pathname = '/admin/ai';
    render(<AdminShell><p>AI</p></AdminShell>);
    const bar = screen.getByRole('navigation', { name: 'Admin quick navigation' });
    expect(within(bar).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'More sections' })).toHaveAttribute('data-current', 'true');
  });

  it('opens every section, grouped, in the More sheet with the current one highlighted', async () => {
    navigation.pathname = '/admin/usage';
    const user = userEvent.setup();
    render(<AdminShell><p>Usage</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'More sections' }));
    const dialog = await screen.findByRole('dialog', { name: 'All sections' });
    const nav = within(dialog).getByRole('navigation', { name: 'All admin sections' });
    expect(within(nav).getAllByRole('link')).toHaveLength(15);
    expect(within(nav).getByRole('link', { name: 'Free uses & coins' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('heading', { name: 'Release & system' })).toBeInTheDocument();
    expect(groupLinks('Monitoring', dialog)).toEqual([['Academic analytics', '/admin/analytics'], ['API health', '/admin/api-analytics']]);
    expect(screen.getByRole('button', { name: 'More sections', hidden: true })).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the More sheet with Escape and returns focus to More', async () => {
    navigation.pathname = '/admin/ai';
    const user = userEvent.setup();
    render(<AdminShell><p>AI</p></AdminShell>);
    const more = screen.getByRole('button', { name: 'More sections' });
    await user.click(more);
    await screen.findByRole('dialog', { name: 'All sections' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All sections' })).not.toBeInTheDocument());
    await waitFor(() => expect(more).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the More sheet after choosing a section', async () => {
    navigation.pathname = '/admin/ai';
    const user = userEvent.setup();
    render(<AdminShell><p>AI</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'More sections' }));
    const dialog = await screen.findByRole('dialog', { name: 'All sections' });
    await user.click(within(dialog).getByRole('link', { name: 'Audit log' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All sections' })).not.toBeInTheDocument());
  });

  it('finds a section from the top bar and opens the first match with Enter', async () => {
    navigation.pathname = '/admin/dashboard';
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'Find a section' }));
    const dialog = await screen.findByRole('dialog', { name: 'All sections' });
    const field = within(dialog).getByRole('searchbox', { name: 'Find a section' });
    await waitFor(() => expect(field).toHaveFocus());
    await user.type(field, 'adv');
    expect(within(dialog).getAllByRole('link').map((link) => link.textContent)).toEqual(['Advertising']);
    await user.keyboard('{Enter}');
    expect(navigation.push).toHaveBeenCalledWith('/admin/ads');
  });

  it('says so when no section matches', async () => {
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'Find a section' }));
    const dialog = await screen.findByRole('dialog', { name: 'All sections' });
    await user.type(within(dialog).getByRole('searchbox', { name: 'Find a section' }), 'zzz');
    expect(within(dialog).queryAllByRole('link')).toHaveLength(0);
    expect(within(dialog).getByText('No section called “zzz”.')).toBeInTheDocument();
  });

  it('shows open support requests and pending catalogue suggestions as badges', async () => {
    stubCounts({ open: 3, pending: 2 });
    navigation.pathname = '/admin/dashboard';
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    const bar = screen.getByRole('navigation', { name: 'Admin quick navigation' });
    expect(await within(bar).findByRole('link', { name: 'Support, 3 open' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'Catalogue, 2 waiting' })).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'More sections' }));
    const dialog = await screen.findByRole('dialog', { name: 'All sections' });
    expect(within(dialog).getByRole('link', { name: 'Support inbox, 3 open' })).toBeInTheDocument();
  });

  it('caps a long support queue at 25+', async () => {
    stubCounts({ open: 25, pending: 0, more: true });
    render(<AdminShell><p>Overview</p></AdminShell>);
    const bar = screen.getByRole('navigation', { name: 'Admin quick navigation' });
    expect(await within(bar).findByRole('link', { name: 'Support, 25+ open' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'Catalogue' })).toBeInTheDocument();
  });

  it('leaves the badges off when the counts cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    render(<AdminShell><p>Overview</p></AdminShell>);
    const bar = screen.getByRole('navigation', { name: 'Admin quick navigation' });
    await act(async () => { await Promise.resolve(); });
    expect(within(bar).getByRole('link', { name: 'Support' })).toBeInTheDocument();
  });
});

describe('AdminShell sign-out confirmation', () => {
  it('asks before signing out from the account sheet, with focus on Cancel', async () => {
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    const account = screen.getByRole('button', { name: 'Account' });
    await user.click(account);
    const sheet = await screen.findByRole('dialog', { name: 'Account' });
    expect(sheet).toHaveTextContent('admin@acadegrade.example');
    await user.click(within(sheet).getByRole('button', { name: 'Sign out' }));

    const confirm = await screen.findByRole('dialog', { name: 'Sign out?' });
    expect(confirm).toHaveTextContent("You'll need to sign in again to manage AcadeGrade on this device.");
    await waitFor(() => expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sign out?' })).not.toBeInTheDocument());
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(account).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('signs out once confirmed', async () => {
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Account' })).getByRole('button', { name: 'Sign out' }));
    const confirm = await screen.findByRole('dialog', { name: 'Sign out?' });
    await user.click(within(confirm).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1));
  });

  it('asks before signing out from the desktop rail and Escape cancels', async () => {
    const user = userEvent.setup();
    render(<AdminShell><p>Overview</p></AdminShell>);
    const rail = screen.getByRole('complementary', { name: 'Admin navigation' });
    const railButton = within(rail).getByRole('button', { name: 'Sign out' });
    await user.click(railButton);
    await screen.findByRole('dialog', { name: 'Sign out?' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sign out?' })).not.toBeInTheDocument());
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(railButton).toHaveFocus());
  });
});

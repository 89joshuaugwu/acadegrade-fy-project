import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  docs: [] as Array<Record<string, unknown>>,
  disabled: [] as string[],
  settingsLoading: false,
  routeId: 'tt-active',
  push: vi.fn(),
  setDocument: vi.fn(async (_path: string, _data?: unknown, _options?: unknown) => undefined),
  updateDocument: vi.fn(async (_path: string, _data?: unknown) => undefined),
  deleteDocument: vi.fn(async (_path: string) => undefined),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, replace: vi.fn() }),
  useParams: () => ({ id: h.routeId }),
  usePathname: () => '/timetable',
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, uid: 'u1', loading: false, error: null }),
}));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { fullName: 'Minor Student', dateOfBirth: '2012-05-01' }, loading: false }),
}));
vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({
    settings: {},
    loading: h.settingsLoading,
    isFeatureDisabled: (id: string) => h.disabled.includes(id),
  }),
}));
vi.mock('@/lib/firebase/firestore', () => ({
  subscribeToCollection: (_path: string, cb: (docs: unknown[]) => void) => {
    cb(h.docs);
    return () => undefined;
  },
  setDocument: h.setDocument,
  updateDocument: h.updateDocument,
  deleteDocument: h.deleteDocument,
  serverTimestamp: () => 'SERVER_TS',
  getDocument: vi.fn(async () => null),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/firebase/fcm', () => ({ removeNotificationToken: vi.fn() }));

import TimetablesPage from '@/app/(student)/timetable/page';
import NewTimetablePage from '@/app/(student)/timetable/new/page';
import TimetableDetailPage from '@/app/(student)/timetable/[id]/page';
import BuildTimetablePage from '@/app/(student)/timetable/build/page';
import { TimetableDashboardCard } from '@/components/timetable/TimetableDashboardCard';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { addDays, localNowISO, localToday } from '@/lib/timetable/format';
import { validityEnd } from '@/lib/timetable/engine';

const today = localToday();
const lecture = {
  id: 'ev1',
  title: 'MTH 101',
  type: 'lecture',
  recurrence: { kind: 'weekly', days: [1, 3] },
  startTime: '09:00',
  endTime: '10:00',
};

function tt(id: string, title: string, over: Record<string, unknown> = {}) {
  return {
    id,
    title,
    kind: 'fixed',
    validity: { startsOn: today, unit: 'weeks', amount: 12, endsAt: validityEnd(today, 'weeks', 12) },
    reminders: { defaultOffsetsMin: [10] },
    status: 'active',
    events: [lecture],
    ...over,
  };
}

function seed() {
  const soon = `${addDays(today, 1)}T12:00:00`;
  h.docs = [
    tt('tt-active', 'Semester lectures'),
    tt('tt-soon', 'Soon ending', { validity: { startsOn: addDays(today, -20), unit: 'weeks', amount: 3, endsAt: soon } }),
    tt('tt-expired', 'Old plan', {
      kind: 'reading',
      builtWith: 'academind',
      validity: { startsOn: addDays(today, -40), unit: 'weeks', amount: 2, endsAt: `${addDays(today, -20)}T23:59:59` },
    }),
    tt('tt-arch', 'Put away', { status: 'archived' }),
  ];
}

beforeEach(() => {
  seed();
  h.disabled = [];
  h.settingsLoading = false;
  h.routeId = 'tt-active';
});
afterEach(() => cleanup());

describe('timetable list', () => {
  it('shows status chips, Extend only where it applies, the Android reminder note and the AcadeMind tag only on built ones', () => {
    render(<TimetablesPage />);
    const row = (title: string) => screen.getByRole('heading', { name: title }).closest('li') as HTMLElement;

    expect(within(row('Semester lectures')).getByText('Active')).toBeInTheDocument();
    expect(within(row('Soon ending')).getByText('Ending soon')).toBeInTheDocument();
    expect(within(row('Old plan')).getByText('Expired')).toBeInTheDocument();
    expect(within(row('Put away')).getByText('Archived')).toBeInTheDocument();

    expect(within(row('Semester lectures')).queryByRole('button', { name: /Extend/ })).toBeNull();
    expect(within(row('Soon ending')).getByRole('button', { name: 'Extend Soon ending' })).toBeInTheDocument();
    expect(within(row('Old plan')).getByRole('button', { name: 'Extend Old plan' })).toBeInTheDocument();
    expect(within(row('Semester lectures')).getByRole('button', { name: 'Archive Semester lectures' })).toBeInTheDocument();

    expect(screen.getByText(/Reminders are an Android app feature/)).toBeInTheDocument();
    expect(screen.getByText(/calendar file \(\.ics\)/)).toBeInTheDocument();

    expect(within(row('Old plan')).getByText('Built with AcadeMind')).toBeInTheDocument();
    expect(within(row('Semester lectures')).queryByText(/AcadeMind/)).toBeNull();
  });

  it('archives a timetable by updating status only', async () => {
    render(<TimetablesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive Semester lectures' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalled());
    expect(h.updateDocument).toHaveBeenCalledWith('users/u1/timetables/tt-active', { status: 'archived' });
    expect(h.setDocument).not.toHaveBeenCalled();
  });

  it('extends an expired timetable to a later end and reactivates it', async () => {
    render(<TimetablesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Extend Old plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extend timetable' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalled());
    const [path, patch] = h.updateDocument.mock.calls[0] as unknown as [string, { validity: { endsAt: string }; status: string }];
    expect(path).toBe('users/u1/timetables/tt-expired');
    expect(patch.status).toBe('active');
    expect(patch.validity.endsAt > localNowISO()).toBe(true);
  });

  it('shows an empty state', () => {
    h.docs = [];
    render(<TimetablesPage />);
    expect(screen.getByText('No timetables yet')).toBeInTheDocument();
  });

  it('lets a minor use the timetable and the builder (it is not an AI feature)', () => {
    render(<TimetablesPage />);
    expect(screen.getByRole('link', { name: /New timetable/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Build with AcadeMind/ })).toBeInTheDocument();
    const dir = path.resolve(__dirname, '../../app/(student)/timetable');
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(path.join(d, n)).isDirectory() ? walk(path.join(d, n)) : [path.join(d, n)]));
    for (const file of walk(dir)) {
      const text = readFileSync(file, 'utf8');
      expect(text).not.toMatch(/aiAccess|aiAgeGate|AiAccessNotice|aiAllowed/);
    }
  });
});

describe('create timetable', () => {
  it('creates a new document with the chosen validity', async () => {
    h.docs = [];
    render(<NewTimetablePage />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Exam week' } });
    fireEvent.change(screen.getByLabelText('Valid for (amount)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Valid for (unit)'), { target: { value: 'months' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create timetable' }));
    await waitFor(() => expect(h.setDocument).toHaveBeenCalled());
    const [docPath, data, options] = h.setDocument.mock.calls[0] as unknown as [string, Record<string, any>, { merge: boolean }];
    expect(docPath).toMatch(/^users\/u1\/timetables\/tt/);
    expect(options).toEqual({ merge: false });
    expect(data.title).toBe('Exam week');
    expect(data.kind).toBe('fixed');
    expect(data.validity).toEqual({ startsOn: today, unit: 'months', amount: 2, endsAt: validityEnd(today, 'months', 2) });
    expect(data.status).toBe('active');
    expect(data.events).toEqual([]);
    expect(data.builtWith).toBeUndefined();
    await waitFor(() => expect(h.push).toHaveBeenCalledWith(expect.stringMatching(/^\/timetable\/tt/)));
  });

  it('shows an error and writes nothing for an empty title', async () => {
    h.docs = [];
    render(<NewTimetablePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create timetable' }));
    expect(await screen.findByText('Give the timetable a title.')).toBeInTheDocument();
    expect(h.setDocument).not.toHaveBeenCalled();
  });
});

describe('timetable detail', () => {
  it('edits an event in place without recreating the timetable', async () => {
    render(<TimetableDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit MTH 101' }));
    fireEvent.change(screen.getByLabelText('Event title'), { target: { value: 'MTH 101 tutorial' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalled());
    expect(h.setDocument).not.toHaveBeenCalled();
    const [docPath, patch] = h.updateDocument.mock.calls[0] as unknown as [string, { events: Array<{ id: string; title: string }> }];
    expect(docPath).toBe('users/u1/timetables/tt-active');
    expect(patch.events).toHaveLength(1);
    expect(patch.events[0]).toMatchObject({ id: 'ev1', title: 'MTH 101 tutorial' });
  });

  it('adds a one-date event with its own reminders', async () => {
    render(<TimetableDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Add event/ }));
    fireEvent.change(screen.getByLabelText('Event title'), { target: { value: 'MTH 101 exam' } });
    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'exam' } });
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'once' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: addDays(today, 5) } });
    fireEvent.click(screen.getByLabelText('Use different reminders for this event'));
    fireEvent.click(screen.getByLabelText('60 minutes before'));
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalled());
    const patch = h.updateDocument.mock.calls[0][1] as unknown as { events: Array<Record<string, any>> };
    expect(patch.events).toHaveLength(2);
    expect(patch.events[1]).toMatchObject({ title: 'MTH 101 exam', type: 'exam', recurrence: { kind: 'once', date: addDays(today, 5) } });
    expect(patch.events[1].reminderOffsetsMin).toEqual([60, 10]);
  });

  it('deletes an event after confirmation', async () => {
    render(<TimetableDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete MTH 101' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalledWith('users/u1/timetables/tt-active', { events: [] }));
  });

  it('edits the title and validity of the timetable', async () => {
    render(<TimetableDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit details/ }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed' } });
    fireEvent.change(screen.getByLabelText('Valid for (amount)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await waitFor(() => expect(h.updateDocument).toHaveBeenCalled());
    const patch = h.updateDocument.mock.calls[0][1] as unknown as Record<string, any>;
    expect(patch.title).toBe('Renamed');
    expect(patch.validity.amount).toBe(20);
    expect(patch.validity.endsAt).toBe(validityEnd(today, 'weeks', 20));
  });

  it('downloads an .ics with the calendar content type and acadegrade-<title>.ics name', async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:test';
    });
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    render(<TimetableDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Download calendar/ }));

    expect(downloadName).toBe('acadegrade-semester-lectures.ics');
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('text/calendar;charset=utf-8');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blobs[0]);
    });
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text).toContain('SUMMARY:MTH 101');
    expect(text).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
    expect(text).toContain('TRIGGER:-PT10M');
  });

  it('shows the week view with the occurrences of the current week', () => {
    render(<TimetableDetailPage />);
    expect(screen.getByRole('region', { name: 'Week view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeInTheDocument();
  });
});

describe('Build with AcadeMind wizard', () => {
  it('prefills blocked times from fixed timetables', () => {
    render(<BuildTimetablePage />);
    fireEvent.change(screen.getByLabelText('Subject 1 name'), { target: { value: 'Calculus' } });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const list = screen.getByRole('list', { name: 'Blocked times' });
    expect(within(list).getByText(/Every Monday, 09:00 to 10:00/)).toBeInTheDocument();
    expect(within(list).getByText(/Every Wednesday, 09:00 to 10:00/)).toBeInTheDocument();
  });

  it('previews a plan with why lines, shows the tag and saves it as a reading timetable built with academind', async () => {
    render(<BuildTimetablePage />);
    expect(screen.getByRole('heading', { name: 'Build with AcadeMind' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subject 1 name'), { target: { value: 'Calculus' } });
    fireEvent.click(screen.getByRole('button', { name: /Add subject/ }));
    fireEvent.change(screen.getByLabelText('Subject 2 name'), { target: { value: 'Physics' } });
    fireEvent.change(screen.getByLabelText('Subject 2 priority'), { target: { value: '3' } });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview plan' }));

    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByText('Why it looks this way')).toBeInTheDocument();
    expect(within(preview).getByText(/study sessions? of 60 minutes were placed/)).toBeInTheDocument();
    expect(within(preview).getByText('Built with AcadeMind')).toBeInTheDocument();
    expect(within(preview).getAllByText(/Study: (Calculus|Physics)/).length).toBeGreaterThan(0);
    expect(document.body.textContent ?? '').not.toMatch(/\bAI\b|machine learning|smart/i);

    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }));
    await waitFor(() => expect(h.setDocument).toHaveBeenCalled());
    const data = h.setDocument.mock.calls[0][1] as unknown as Record<string, any>;
    expect(data.kind).toBe('reading');
    expect(data.builtWith).toBe('academind');
    expect(data.title).toBe('Study plan');
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.events[0].type).toBe('study');
    expect(data.reminders.defaultOffsetsMin).toEqual([10]);
  });

  it('lets a session be removed before saving', () => {
    render(<BuildTimetablePage />);
    fireEvent.change(screen.getByLabelText('Subject 1 name'), { target: { value: 'Calculus' } });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview plan' }));
    const before = screen.getAllByRole('button', { name: /^Remove Study: Calculus/ }).length;
    fireEvent.click(screen.getAllByRole('button', { name: /^Remove Study: Calculus/ })[0]);
    expect(screen.queryAllByRole('button', { name: /^Remove Study: Calculus/ }).length).toBe(before - 1);
  });

  it('blocks Next without a subject', () => {
    render(<BuildTimetablePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one subject');
  });
});

describe('kill switch (timetable)', () => {
  it('shows a notice instead of the page when off', () => {
    h.disabled = ['timetable'];
    render(<TimetablesPage />);
    expect(screen.getByText('Timetables are unavailable right now')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /New timetable/ })).toBeNull();
  });

  it('hides the dashboard card and the drawer link when off, and shows them when on', () => {
    h.disabled = ['timetable'];
    const dash = render(<TimetableDashboardCard />);
    expect(dash.container).toBeEmptyDOMElement();
    dash.unmount();
    const off = render(<ThemeProvider attribute="class"><MobileDrawer isOpen onClose={() => undefined} /></ThemeProvider>);
    expect(screen.queryByRole('link', { name: 'Timetable' })).toBeNull();
    off.unmount();

    h.disabled = [];
    render(<TimetableDashboardCard />);
    expect(screen.getByRole('link', { name: /Open timetable/ })).toHaveAttribute('href', '/timetable');
    cleanup();
    render(<ThemeProvider attribute="class"><MobileDrawer isOpen onClose={() => undefined} /></ThemeProvider>);
    expect(screen.getByRole('link', { name: 'Timetable' })).toHaveAttribute('href', '/timetable');
  });

  it('fails open while settings are loading', () => {
    h.settingsLoading = true;
    h.disabled = ['timetable'];
    render(<TimetablesPage />);
    expect(screen.getByRole('heading', { name: 'Timetables' })).toBeInTheDocument();
  });
});

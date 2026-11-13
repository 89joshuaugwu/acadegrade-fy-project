import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { HelpButton } from '@/components/help/HelpDrawer';
import type { HelpSource } from '@/lib/help/types';

const source: HelpSource = {
  platform: 'web',
  hrefFor: (id) => ({ 'demo.page': '/demo', 'demo.page.tab': '/demo?tab=tab', 'other.page': '/other' } as Record<string, string>)[id],
  entries: {
    'demo.page': { id: 'demo.page', audience: 'admin', title: 'Demo page', summary: 'All tabs of the demo page.' },
    'demo.page.tab': {
      id: 'demo.page.tab',
      audience: 'admin',
      title: 'Demo tab',
      summary: 'Explains the demo tab.',
      terms: [{ term: 'Widget', meaning: 'A thing you configure.' }],
      tasks: [{ title: 'Turn it on', steps: ['Open the tab.', 'Switch it on.', 'Save.'] }],
      cautions: ['Saving affects every student.'],
      related: [{ label: 'Other page', to: 'other.page' }, { label: 'Docs', to: { href: 'https://example.com/docs' } }, { label: 'Glossary', to: 'shared.glossary' }],
      platformNotes: { web: ['Web only note.'], android: ['Android only note.'] },
    },
    'other.page': { id: 'other.page', audience: 'admin', title: 'Other page', summary: 'Another page.' },
    'shared.glossary': { id: 'shared.glossary', audience: 'student', title: 'Glossary', summary: 'Every term, defined once.', terms: [{ term: 'CGPA', meaning: 'Cumulative GPA.' }] },
    'missing.link': { id: 'missing.link', audience: 'admin', title: 'Dead end', summary: 'Links nowhere.', related: [{ label: 'Nowhere', to: 'not.an.entry' }] },
  },
};

async function openHelp() {
  const user = userEvent.setup();
  render(<><input aria-label="Search" /><HelpButton entryId="demo.page.tab" source={source} /></>);
  const button = screen.getByRole('button', { name: 'Help: Demo tab' });
  await user.click(button);
  const dialog = await screen.findByRole('dialog', { name: 'Demo tab' });
  return { user, button, dialog };
}

describe('HelpButton and drawer', () => {
  it('advertises the dialog it controls before opening', () => {
    render(<HelpButton entryId="demo.page.tab" source={source} />);
    const button = screen.getByRole('button', { name: 'Help: Demo tab' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent('Help');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a labelled modal dialog with structured sections and focuses its title', async () => {
    const { button, dialog } = await openHelp();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(within(dialog).getByRole('heading', { level: 2, name: 'Demo tab' })).toHaveFocus());
    expect(within(dialog).getByText('Explains the demo tab.')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Key terms' })).toBeInTheDocument();
    expect(within(dialog).getByRole('term')).toHaveTextContent('Widget');
    expect(within(dialog).getByRole('definition')).toHaveTextContent('A thing you configure.');
    const steps = within(dialog).getByRole('list', { name: 'Turn it on' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Before you change anything' })).toBeInTheDocument();
    expect(within(dialog).getByText('Saving affects every student.')).toBeInTheDocument();
    expect(within(dialog).getByText('Web only note.')).toBeInTheDocument();
    expect(within(dialog).queryByText('Android only note.')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Other page' })).toHaveAttribute('href', '/other');
    expect(within(dialog).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com/docs');
  });

  it('closes on Escape and returns focus to the Help button', async () => {
    const { user, button } = await openHelp();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes from its own close button', async () => {
    const { user, dialog, button } = await openHelp();
    await user.click(within(dialog).getByRole('button', { name: 'Close help' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('keeps keyboard focus inside the open drawer', async () => {
    const { user, dialog } = await openHelp();
    await waitFor(() => expect(within(dialog).getByRole('heading', { level: 2 })).toHaveFocus());
    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('shows the parent entry from a tab entry and can come back', async () => {
    const { user, dialog } = await openHelp();
    await user.click(within(dialog).getByRole('button', { name: 'About the whole page: Demo page' }));
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Demo page' })).toBeInTheDocument();
    expect(within(dialog).getByText('All tabs of the demo page.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Back to Demo tab' }));
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Demo tab' })).toBeInTheDocument();
  });

  it('opens with the ? shortcut, but not while typing in a field', async () => {
    const user = userEvent.setup();
    render(<><input aria-label="Search" /><HelpButton entryId="demo.page.tab" source={source} /></>);
    await user.click(screen.getByRole('textbox', { name: 'Search' }));
    await user.keyboard('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => { (document.activeElement as HTMLElement).blur(); });
    await user.keyboard('?');
    expect(await screen.findByRole('dialog', { name: 'Demo tab' })).toBeInTheDocument();
  });

  it('opens a related help entry that has no page inside the drawer, with a way back', async () => {
    const { user, dialog } = await openHelp();
    const glossary = within(dialog).getByRole('button', { name: 'Glossary' });
    expect(within(dialog).queryByRole('link', { name: 'Glossary' })).not.toBeInTheDocument();
    await user.click(glossary);
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Glossary' })).toBeInTheDocument();
    expect(within(dialog).getByText('Cumulative GPA.')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('heading', { level: 2, name: 'Glossary' })).toHaveFocus());
    await user.click(within(dialog).getByRole('button', { name: 'Back to Demo tab' }));
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Demo tab' })).toBeInTheDocument();
  });

  it('drops related links that point to neither a page nor an entry', async () => {
    const user = userEvent.setup();
    render(<HelpButton entryId="missing.link" source={source} />);
    await user.click(screen.getByRole('button', { name: 'Help: Dead end' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dead end' });
    expect(within(dialog).queryByText('Nowhere')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Related' })).not.toBeInTheDocument();
  });

  it('renders nothing when the entry does not exist', () => {
    const { container } = render(<HelpButton entryId="missing" source={source} />);
    expect(container).toBeEmptyDOMElement();
  });
});

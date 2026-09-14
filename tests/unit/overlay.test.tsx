import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import * as UI from '@/components/ui';
import type { ElementType } from 'react';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('labels the dialog and initially focuses the first enabled field', async () => {
    render(
      <Modal open onClose={() => undefined} title="Add semester" description="Create an academic period.">
        <input aria-label="Unavailable field" disabled />
        <input aria-label="Session" />
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Add semester' });
    expect(dialog).toHaveAccessibleDescription('Create an academic period.');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Session' })).toHaveFocus());
  });

  it('closes through Escape and backdrop using the same dismissal callback', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Share result"><p>Share content</p></Modal>);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(document.querySelector('[data-overlay-backdrop]')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('returns focus to the trigger after closing', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open transcript</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Transcript">
            <button>Download</button>
          </Modal>
        </>
      );
    }

    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open transcript' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('requires the exact confirmation phrase before enabling a destructive action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Delete account"
        confirm={{ label: 'Delete account', onConfirm, requireText: 'DELETE' }}
      >
        <p>This cannot be undone.</p>
      </Modal>
    );

    const confirmButton = screen.getByRole('button', { name: 'Delete account' });
    expect(confirmButton).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /type delete to confirm/i }), 'DELETE');
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Sheet', () => {
  it('uses the dialog contract and dismisses after a deliberate downward handle drag', async () => {
    const user = userEvent.setup();
    const Sheet = (UI as Record<string, ElementType>).Sheet;
    expect(Sheet, 'Sheet must be part of the public UI registry').toBeTruthy();
    const onClose = vi.fn();

    render(
      <Sheet open onClose={onClose} title="Choose your department">
        <p>Departments</p>
      </Sheet>
    );

    expect(screen.getByRole('dialog', { name: 'Choose your department' })).toBeInTheDocument();
    const handle = screen.getByRole('button', { name: 'Swipe down to close' });
    await user.pointer([
      { keys: '[TouchA>]', target: handle, coords: { clientX: 100, clientY: 100 } },
      { target: handle, coords: { clientX: 100, clientY: 210 } },
      { keys: '[/TouchA]', target: handle },
    ]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

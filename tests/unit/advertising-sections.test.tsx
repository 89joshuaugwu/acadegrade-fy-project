import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdvertisingSections } from '@/components/admin/ads/AdvertisingSections';

function Draft() {
  const [value, setValue] = useState('');
  return <input aria-label="Campaign draft" value={value} onChange={event => setValue(event.target.value)} />;
}

const sections = [
  { id: 'web', label: 'Web', description: 'Website promotions', content: <Draft /> },
  { id: 'android', label: 'Android', description: 'Android placements', content: <button>Save Android settings</button> },
  { id: 'ios', label: 'iOS', description: 'Configuration only', content: <button>Save iOS settings</button> },
];

describe('AdvertisingSections', () => {
  it('shows only the chosen platform and preserves drafts when switching', async () => {
    const user = userEvent.setup();
    render(<AdvertisingSections id="platform" label="Advertising platform" sections={sections} />);
    await user.type(screen.getByRole('textbox', { name: 'Campaign draft' }), 'Workshop');
    expect(screen.queryByRole('button', { name: 'Save Android settings' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Android' }));
    expect(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Save Android settings' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Campaign draft' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Web' }));
    expect(screen.getByRole('textbox', { name: 'Campaign draft' })).toHaveValue('Workshop');
  });

  it('supports arrow, home, and end keys with selection and focus kept together', async () => {
    const user = userEvent.setup();
    render(<AdvertisingSections id="platform" label="Advertising platform" sections={sections} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Android' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Android' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'iOS' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Web' })).toHaveFocus();
    await user.keyboard('{End}{Home}');
    expect(screen.getByRole('tab', { name: 'Web' })).toHaveFocus();
  });
});

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RewardedReadiness, rewardedReadiness } from '@/components/admin/rewarded/RewardedReadiness';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const live = { enabled: true, testMode: false, rewardedEnabled: true, rewardedUnitId: 'ca-app-pub-1234567890123456/1234567890' };

describe('rewarded readiness', () => {
  it('passes only when ads, rewarded, a usable unit and coins are all on', () => {
    expect(rewardedReadiness({ mobileAds: live, coinsEnabled: true }).ready).toBe(true);
    expect(rewardedReadiness({ mobileAds: { ...live, rewardedUnitId: '', testMode: true }, coinsEnabled: true }).ready).toBe(true);
    const missingUnit = rewardedReadiness({ mobileAds: { ...live, rewardedUnitId: 'nope' }, coinsEnabled: true });
    expect(missingUnit.ready).toBe(false);
    expect(missingUnit.checks.map((check) => check.state)).toEqual(['pass', 'pass', 'fail', 'pass']);
    expect(rewardedReadiness({ mobileAds: live, coinsEnabled: false }).checks[3].state).toBe('fail');
    expect(rewardedReadiness({ mobileAds: null, coinsEnabled: null }).checks.every((check) => check.state === 'unknown')).toBe(true);
  });

  it('shows four checks, each linking to where it is fixed, and the first reason earning is off', () => {
    render(<RewardedReadiness mobileAds={{ ...live, enabled: false }} coinsEnabled />);
    const region = screen.getByRole('region', { name: 'Rewarded readiness' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent(/Android app ads allowed.*No/);
    expect(within(items[0]).getByRole('link', { name: /fix android app ads allowed/i })).toHaveAttribute('href', '/admin/ads?tab=admob');
    expect(within(items[3]).getByRole('link', { name: /coins on/i })).toHaveAttribute('href', '/admin/usage');
    expect(region).toHaveTextContent('Earning is off because Android app ads are not allowed.');
  });

  it('says plainly when students can earn', () => {
    render(<RewardedReadiness mobileAds={live} coinsEnabled />);
    expect(screen.getByRole('region', { name: 'Rewarded readiness' })).toHaveTextContent('Students can earn coins now.');
  });

  it('marks checks it could not load instead of guessing', () => {
    render(<RewardedReadiness mobileAds={live} coinsEnabled={null} />);
    const region = screen.getByRole('region', { name: 'Rewarded readiness' });
    expect(within(region).getAllByRole('listitem')[3]).toHaveTextContent(/Coins on.*Not loaded/);
    expect(region).toHaveTextContent(/could not be checked/i);
  });
});

describe('AdminPageHeader', () => {
  it('gives every page a Help button for its help entry', () => {
    render(<AdminPageHeader title="Users" description="Find accounts." helpId="admin.users" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help: Users' })).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

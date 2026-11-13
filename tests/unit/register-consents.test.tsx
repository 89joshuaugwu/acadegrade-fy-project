import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import {
  AI_CONSENT_LABEL,
  MINOR_NOTICE,
  buildRegistrationAnswers,
  loadLegalVersions,
} from '@/app/(public)/register/consent';
import { RegistrationConsents, type ConsentFields } from '@/app/(public)/register/RegistrationConsents';

function Harness({ onValues }: { onValues?: (values: ConsentFields) => void }) {
  const methods = useForm<ConsentFields>({ defaultValues: { termsAccepted: false, aiConsent: false } });
  return (
    <FormProvider {...methods}>
      <RegistrationConsents />
      <button type="button" onClick={() => onValues?.(methods.getValues())}>Read values</button>
    </FormProvider>
  );
}

describe('registration answers payload', () => {
  const legal = { termsVersion: '2026-12-01', privacyVersion: '2026-11-20' };

  it('records an adult with the current legal versions and their AI choice', () => {
    expect(buildRegistrationAnswers({ age: 'adult', aiConsent: true }, legal)).toEqual({
      age: 'adult',
      terms: { version: '2026-12-01' },
      privacy: { version: '2026-11-20' },
      aiConsent: true,
    });
    expect(buildRegistrationAnswers({ age: 'adult' }, legal)).toMatchObject({ aiConsent: false });
  });

  it('never sends an AI consent for someone under 18', () => {
    const answers = buildRegistrationAnswers({ age: 'minor', aiConsent: true }, legal);
    expect(answers).toEqual({ age: 'minor', terms: { version: '2026-12-01' }, privacy: { version: '2026-11-20' } });
    expect(answers).not.toHaveProperty('aiConsent');
    expect(answers).not.toHaveProperty('marketingConsent');
  });

  it('reads config/legal and falls back to the current default when it cannot', async () => {
    await expect(loadLegalVersions(async () => ({ termsVersion: 'v9', privacyVersion: 'v8' })))
      .resolves.toEqual({ termsVersion: 'v9', privacyVersion: 'v8' });
    await expect(loadLegalVersions(async () => { throw new Error('offline'); }))
      .resolves.toEqual({ termsVersion: '2026-11-13', privacyVersion: '2026-11-13' });
    await expect(loadLegalVersions(async () => null))
      .resolves.toEqual({ termsVersion: '2026-11-13', privacyVersion: '2026-11-13' });
  });
});

describe('RegistrationConsents', () => {
  it('asks the age question with two equal, unselected choices', () => {
    render(<Harness />);

    const group = screen.getByRole('radiogroup', { name: 'How old are you?' });
    const adult = screen.getByRole('radio', { name: "I'm 18 or older" });
    const minor = screen.getByRole('radio', { name: "I'm under 18" });
    expect(group).toContainElement(adult);
    expect(group).toContainElement(minor);
    expect(adult).not.toBeChecked();
    expect(minor).not.toBeChecked();
    expect(adult).toBeRequired();
    expect(adult.closest('label')?.className).toBe(minor.closest('label')?.className);
  });

  it('requires an unticked terms agreement that links to both documents', () => {
    render(<Harness />);

    const terms = screen.getByRole('checkbox', { name: /i agree to the terms and privacy notice/i });
    expect(terms).not.toBeChecked();
    expect(terms).toBeRequired();
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy');
  });

  it('offers the optional AI consent to adults only, unticked', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole('checkbox', { name: AI_CONSENT_LABEL })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: "I'm 18 or older" }));

    const ai = screen.getByRole('checkbox', { name: AI_CONSENT_LABEL });
    expect(ai).not.toBeChecked();
    expect(ai).not.toBeRequired();
    expect(screen.queryByText(MINOR_NOTICE)).not.toBeInTheDocument();
  });

  it('hides AI consent for minors, clears it, and shows the under-18 notice', async () => {
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);

    await user.click(screen.getByRole('radio', { name: "I'm 18 or older" }));
    await user.click(screen.getByRole('checkbox', { name: AI_CONSENT_LABEL }));
    await user.click(screen.getByRole('radio', { name: "I'm under 18" }));

    expect(screen.queryByRole('checkbox', { name: AI_CONSENT_LABEL })).not.toBeInTheDocument();
    expect(screen.getByText(MINOR_NOTICE)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Read values' }));
    expect(onValues).toHaveBeenCalledWith(expect.objectContaining({ age: 'minor', aiConsent: false }));
  });
});

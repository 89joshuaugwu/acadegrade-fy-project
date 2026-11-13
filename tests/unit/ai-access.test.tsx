import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const requirements = vi.hoisted(() => ({ openRequirements: vi.fn() }));
vi.mock('@/components/requirements', () => requirements);

import { AiAccessNotice } from '@/components/ai/AiAccessNotice';
import { AGE_RESTRICTED_NOTICE, blockFromUsage, classifyAiFailure } from '@/components/ai/aiAccess';

describe('classifyAiFailure', () => {
  it('maps the age and consent codes', () => {
    expect(classifyAiFailure(403, { code: 'AGE_RESTRICTED', error: 'x' })).toMatchObject({ kind: 'age-restricted', message: AGE_RESTRICTED_NOTICE });
    expect(classifyAiFailure(403, { code: 'AGE_CONFIRMATION_REQUIRED' })).toMatchObject({ kind: 'requirements' });
    expect(classifyAiFailure(403, { code: 'AI_CONSENT_REQUIRED' })).toMatchObject({ kind: 'requirements' });
  });

  it('maps maintenance and a disabled feature', () => {
    expect(classifyAiFailure(503, { code: 'MAINTENANCE' })).toMatchObject({ kind: 'maintenance' });
    expect(classifyAiFailure(503, { code: 'FEATURE_DISABLED' })).toMatchObject({ kind: 'feature-disabled' });
  });

  it('leaves other failures to the caller', () => {
    expect(classifyAiFailure(500, { error: 'boom' })).toBeNull();
    expect(classifyAiFailure(429, {})).toBeNull();
    expect(classifyAiFailure(403, null)).toBeNull();
  });
});

describe('blockFromUsage', () => {
  it('blocks when the usage summary says AI is not allowed', () => {
    expect(blockFromUsage({ age: { status: 'minor', aiAllowed: false, aiConsent: null } })).toMatchObject({ kind: 'age-restricted' });
    expect(blockFromUsage({ age: { status: 'unknown', aiAllowed: false, aiConsent: null } })).toMatchObject({ kind: 'requirements' });
    expect(blockFromUsage({ age: { status: 'adult', aiAllowed: false, aiConsent: false } })).toMatchObject({ kind: 'requirements' });
  });

  it('does not block when AI is allowed or the field is missing (older server)', () => {
    expect(blockFromUsage({ age: { status: 'adult', aiAllowed: true, aiConsent: true } })).toBeNull();
    expect(blockFromUsage({ features: [] })).toBeNull();
    expect(blockFromUsage(null)).toBeNull();
  });
});

describe('AiAccessNotice', () => {
  it('tells under-18s they can still track results, with no setup action', () => {
    render(<AiAccessNotice block={{ kind: 'age-restricted', message: AGE_RESTRICTED_NOTICE }} />);
    expect(screen.getByRole('status')).toHaveTextContent('AI features and result scanning are for users 18 and over. You can still track your results.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the "Finish setting up" flow for setup-required users', async () => {
    render(<AiAccessNotice block={classifyAiFailure(403, { code: 'AI_CONSENT_REQUIRED' })!} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /finish setting up/i }));
    expect(requirements.openRequirements).toHaveBeenCalledWith('ai');
  });

  it('explains maintenance without a dead-end action', () => {
    render(<AiAccessNotice block={classifyAiFailure(503, { code: 'MAINTENANCE' })!} />);
    expect(screen.getByRole('status')).toHaveTextContent(/maintenance/i);
    expect(screen.getByRole('status')).toHaveTextContent(/results and calculations still work/i);
  });
});

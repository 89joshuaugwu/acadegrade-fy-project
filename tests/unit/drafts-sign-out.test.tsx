import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { loadDraft, saveDraft, useClearDraftsOnSignOut } from '@/lib/drafts';

function Probe({ uid }: { uid: string | null }) {
  useClearDraftsOnSignOut(uid);
  return null;
}

const course = { code: 'CSC 401', title: 'Compilers', units: 3, caScore: 20, examScore: 40 };

describe('useClearDraftsOnSignOut', () => {
  beforeEach(() => localStorage.clear());

  it('removes the signed-out user drafts and nothing else', () => {
    saveDraft('u1', 's1', [course]);
    saveDraft('u2', 's1', [course]);
    const view = render(<Probe uid="u1" />);
    expect(loadDraft('u1', 's1')).not.toBeNull();

    view.rerender(<Probe uid={null} />);
    expect(loadDraft('u1', 's1')).toBeNull();
    expect(loadDraft('u2', 's1')).not.toBeNull();
  });

  it('removes drafts when a different account signs in on the same device', () => {
    saveDraft('u1', 's1', [course]);
    const view = render(<Probe uid="u1" />);
    view.rerender(<Probe uid="u2" />);
    expect(loadDraft('u1', 's1')).toBeNull();
  });

  it('keeps drafts while the auth state is still loading on first render', () => {
    saveDraft('u1', 's1', [course]);
    const view = render(<Probe uid={null} />);
    view.rerender(<Probe uid="u1" />);
    expect(loadDraft('u1', 's1')).not.toBeNull();
  });
});

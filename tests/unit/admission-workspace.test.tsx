import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fs = vi.hoisted(() => ({ setDocument: vi.fn(), updateDocument: vi.fn(), subscribeToDocument: vi.fn() }));
const state = vi.hoisted(() => ({ admission: null as unknown }));
vi.mock('@/lib/firebase/firestore', () => fs);
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ uid: 'u1', user: null, loading: false }) }));
vi.mock('@/hooks/useRecordData', () => ({
  useAdmissionRecord: () => ({ data: state.admission, loading: false, error: null }),
  useOlevelRecord: () => ({ data: null, loading: false, error: null }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { AdmissionWorkspace } from '@/components/records/AdmissionWorkspace';

describe('AdmissionWorkspace: saved target and post-UTME total', () => {
  beforeEach(() => {
    fs.setDocument.mockReset().mockResolvedValue(undefined);
    state.admission = null;
  });

  it('shows the saved target and post-UTME total from admission/current', () => {
    state.admission = { formula: 'utme-post', olevelSource: 'record', pointTable: 'four-to-two', utme: { score: 240 }, postUtme: { max: 60 }, target: 70 };
    render(<AdmissionWorkspace />);
    expect(screen.getByLabelText(/Target aggregate/)).toHaveValue('70');
    expect(screen.getByLabelText(/out of$/i)).toHaveValue('60');
    // UTME 240 = 30 of 50, so 40 more is needed from post-UTME: 40/50 of 60 = 48.
    expect(screen.getByText(/48/)).toBeInTheDocument();
  });

  it('saves the target and a post-UTME total typed without a score', async () => {
    render(<AdmissionWorkspace />);
    fireEvent.change(screen.getByLabelText(/^UTME score/), { target: { value: '240' } });
    fireEvent.change(screen.getByLabelText(/out of$/i), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(/Target aggregate/), { target: { value: '72.5' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save details' })[0]);
    await waitFor(() => expect(fs.setDocument).toHaveBeenCalled());
    expect(fs.setDocument).toHaveBeenCalledWith(
      'users/u1/admission/current',
      expect.objectContaining({ utme: { score: 240 }, postUtme: { max: 60 }, target: 72.5 }),
      { merge: false },
    );
  });
});

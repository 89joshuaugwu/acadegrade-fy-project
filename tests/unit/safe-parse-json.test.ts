import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

describe('safeParseJSON diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not print private model output when JSON parsing fails', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeParseJSON('PRIVATE_STUDENT_RECORD is not JSON', 'insight-json');
    expect(log.mock.calls.flat().join(' ')).not.toContain('PRIVATE_STUDENT_RECORD');
  });
});

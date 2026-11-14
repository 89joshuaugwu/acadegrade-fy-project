'use client';

import { useEffect, useRef } from 'react';
import { clearUserDrafts } from './semester-drafts';
import { clearUserPreviews } from '@/lib/planning/semesterPreviewStore';

/**
 * Removes a user's unsaved semester drafts and semester-preview guesses (A3)
 * from this device when they sign out (or another account signs in). Mount
 * where the auth state is observed across sign-out, such as the student layout.
 */
export function useClearDraftsOnSignOut(uid: string | null | undefined): void {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const current = uid ?? null;
    if (previous.current && previous.current !== current) {
      clearUserDrafts(previous.current);
      clearUserPreviews(previous.current);
    }
    previous.current = current;
  }, [uid]);
}

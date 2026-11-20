'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Admin preview of the proof section in production. Renders its children
 * (the section built with SAMPLE quotes) only when the URL has
 * ?preview=proof and the signed-in account is verified as an admin by
 * /api/admin/verify. Everyone else sees nothing: the samples are not in the
 * rendered HTML (they travel only in the page's component data, marked as
 * samples). Only mount it when the real section is hidden.
 */

export const PROOF_PREVIEW_PARAM = 'preview';
export const PROOF_PREVIEW_VALUE = 'proof';

export function hasProofPreviewParam(search: string): boolean {
  return new URLSearchParams(search).get(PROOF_PREVIEW_PARAM) === PROOF_PREVIEW_VALUE;
}

export function ProofPreviewGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading || !user || !hasProofPreviewParam(window.location.search)) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as { isAdmin?: boolean } | null;
        if (!controller.signal.aborted && response.ok && data?.isAdmin === true) setAllowed(true);
      } catch {
        // Fail closed: no preview.
      }
    })();
    return () => controller.abort();
  }, [loading, user]);

  return allowed ? <>{children}</> : null;
}

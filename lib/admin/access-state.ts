export type AdminAccessStatus = 'idle' | 'verifying' | 'allowed' | 'denied' | 'error';

export interface AdminAccessState {
  status: AdminAccessStatus;
  uid: string | null;
}

export function canRenderAdminContent(
  access: AdminAccessState,
  authenticatedUid: string | null | undefined,
): boolean {
  return Boolean(
    authenticatedUid
      && access.status === 'allowed'
      && access.uid === authenticatedUid,
  );
}

export function getAdminVerificationTarget(
  access: AdminAccessState,
  authenticatedUid: string | null | undefined,
): string | null {
  if (!authenticatedUid) return null;

  if (
    access.uid === authenticatedUid
      && (access.status === 'allowed' || access.status === 'verifying')
  ) {
    return null;
  }

  return authenticatedUid;
}

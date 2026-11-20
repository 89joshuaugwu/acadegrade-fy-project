import type { ApiFixture } from './types';
import { reply } from './types';

/** Endpoints every signed-in screen needs: admin verification and the account-requirements gate. */
export const CORE_API: ApiFixture[] = [
  {
    method: 'POST',
    path: '/api/admin/verify',
    respond: ({ role }) => (role === 'admin' ? { isAdmin: true, email: 'admin@acadegrade.preview' } : reply(403, { isAdmin: false, error: 'Not an admin' })),
  },
  {
    method: 'GET',
    path: '/api/user/requirements',
    respond: () => ({ items: [], current: { ageStatus: 'adult', aiConsent: true, marketingConsent: false }, checkedAt: Date.now() }),
  },
  {
    method: 'POST',
    path: '/api/user/requirements',
    respond: () => ({ items: [], current: { ageStatus: 'adult', aiConsent: true, marketingConsent: false }, checkedAt: Date.now() }),
  },
];

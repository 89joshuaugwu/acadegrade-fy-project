/**
 * Fixture registry for the UI preview. Each lane keeps its own file; the first match wins, so put
 * specific paths before RegExp catch-alls. Shapes must match what the real route returns
 * (read the route under app/api/... before writing a fixture).
 */
import { CORE_API } from './core';
import { ADMIN_API } from './admin';
import { STUDENT_API } from './student';
import { SHARE_API } from './share';

export type { ApiContext, ApiFixture, ApiReply } from './types';
export { reply } from './types';

export const API_FIXTURES = [...CORE_API, ...ADMIN_API, ...STUDENT_API, ...SHARE_API];

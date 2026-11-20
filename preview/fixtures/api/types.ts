import type { PreviewRole } from '../../runtime';

export interface ApiContext {
  url: URL;
  method: string;
  body: unknown;
  role: PreviewRole;
}

/** A tagged reply when the status is not 200 or the body is not JSON. Plain values are sent as 200 JSON. */
export interface ApiReply {
  __reply: true;
  status: number;
  body?: unknown;
  raw?: BodyInit;
  contentType?: string;
}

export interface ApiFixture {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';
  /** Exact pathname ("/api/admin/stats") or a RegExp for dynamic segments. */
  path: string | RegExp;
  respond: (ctx: ApiContext) => unknown | Promise<unknown>;
}

export const reply = (status: number, body?: unknown): ApiReply => ({ __reply: true, status, body });

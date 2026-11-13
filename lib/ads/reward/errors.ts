import 'server-only';

export class RewardError extends Error {
  /** `details` are safe, additive JSON fields for the client (e.g. balance and price on 402). */
  constructor(message: string, readonly status = 400, readonly details?: Record<string, number | string | boolean>) { super(message); }
}

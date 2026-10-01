import 'server-only';

export class RewardError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

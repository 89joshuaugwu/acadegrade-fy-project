import 'server-only';
import { NextResponse } from 'next/server';
import type { UsageFeatureId } from '@/lib/usage/policy';
import { isCoinRequestId, type CoinHold } from './coins';
import { RewardError } from './errors';
import { coins } from './index';

const noStore = { 'Cache-Control': 'no-store' };

/** `coinSpend: { requestId }` from a JSON body. Absent/null means "free only". */
export function readCoinSpend(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'coinSpend')) return undefined;
  const spend = (body as { coinSpend?: unknown }).coinSpend;
  if (spend === null || spend === undefined) return undefined;
  const requestId = typeof spend === 'object' ? (spend as { requestId?: unknown }).requestId : undefined;
  if (!isCoinRequestId(requestId)) throw new RewardError('Invalid coin spend request ID');
  return requestId;
}

/** `X-Coin-Spend-Id` for routes whose body carries a file. */
export function readCoinSpendHeader(request: Request): string | undefined {
  const value = request.headers.get('x-coin-spend-id');
  if (value === null) return undefined;
  if (!isCoinRequestId(value)) throw new RewardError('Invalid coin spend request ID');
  return value;
}

export function rewardErrorResponse(error: RewardError) {
  return NextResponse.json({ error: error.message, ...error.details }, { status: error.status, headers: noStore });
}

/** Returned when a charged request failed after its hold: coins are refunded. */
export function chargedFailureResponse(label: string) {
  return NextResponse.json({ error: `${label} is temporarily unavailable; your coins were not spent.` }, { status: 503, headers: noStore });
}

export const freeCoinHeaders = (requestId: string | undefined): Record<string, string> => requestId ? { 'X-Coins-Spent': '0' } : {};
export const chargedHeaders = (charge: { spent: number; balance: number }) => ({ 'X-Coins-Spent': String(charge.spent), 'X-Coin-Balance': String(charge.balance) });

export async function refundQuietly(hold: CoinHold) {
  try { await coins.refund(hold); }
  catch { console.error('Coin refund failed; the hold refunds automatically after five minutes.'); }
}

/** Additive hint on a free-path 429: the feature's coin price and the
 * caller's balance, only when coins can currently pay for this feature.
 * A hint failure never changes the original refusal. */
export async function withCoinHint(response: Response, uid: string, feature: UsageFeatureId): Promise<Response> {
  try {
    const quote = await coins.quote(uid, feature);
    if (!quote) return response;
    const body = await response.clone().json();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return NextResponse.json({ ...body, coinPrice: quote.price, coinBalance: quote.balance }, { status: response.status, headers });
  } catch {
    return response;
  }
}

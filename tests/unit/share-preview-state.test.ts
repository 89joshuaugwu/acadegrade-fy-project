import { describe, expect, it, vi } from 'vitest';
import { INITIAL_PREVIEW_STATE, lockedMessage, previewReducer, type PreviewState } from '@/lib/share/preview';

const transcript = { studentName: 'Ada', semesters: [] };
const open = (id = 'abc123abc123') => previewReducer(INITIAL_PREVIEW_STATE, { type: 'open', id });

describe('previewReducer', () => {
  it('opening an id starts loading it', () => {
    expect(open()).toEqual({ kind: 'loading', id: 'abc123abc123' });
  });

  it('shows the record when the link opens', () => {
    const state = previewReducer(open(), {
      type: 'result', id: 'abc123abc123', result: { status: 'ok', transcript, expiresAt: '2026-12-01T00:00:00.000Z' },
    });
    expect(state).toEqual({ kind: 'ready', id: 'abc123abc123', transcript, expiresAt: '2026-12-01T00:00:00.000Z' });
  });

  it('asks for a PIN with no error the first time', () => {
    const state = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'pin-required' } });
    expect(state).toEqual({ kind: 'pin', id: 'abc123abc123', error: null, checking: false });
  });

  it('marks the PIN as checking while it is sent, then wrong', () => {
    let state: PreviewState = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'pin-required' } });
    state = previewReducer(state, { type: 'pin-sent' });
    expect(state).toEqual({ kind: 'pin', id: 'abc123abc123', error: null, checking: true });
    state = previewReducer(state, { type: 'result', id: 'abc123abc123', result: { status: 'pin-incorrect' } });
    expect(state).toEqual({ kind: 'pin', id: 'abc123abc123', error: 'incorrect', checking: false });
  });

  it('flags a badly formed PIN without sending it', () => {
    let state: PreviewState = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'pin-required' } });
    state = previewReducer(state, { type: 'pin-invalid' });
    expect(state).toEqual({ kind: 'pin', id: 'abc123abc123', error: 'format', checking: false });
  });

  it('locks with the retry time', () => {
    const state = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'locked', retryAfterSeconds: 1200 } });
    expect(state).toEqual({ kind: 'locked', id: 'abc123abc123', retryAfterSeconds: 1200 });
  });

  it('keeps expired apart from not found or turned off', () => {
    const expired = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'unavailable', reason: 'expired' } });
    expect(expired).toEqual({ kind: 'unavailable', id: 'abc123abc123', reason: 'expired' });
    const missing = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'unavailable', reason: 'not-found' } });
    expect(missing).toEqual({ kind: 'unavailable', id: 'abc123abc123', reason: 'not-found' });
    const unknown = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'unavailable' } });
    expect(unknown).toEqual({ kind: 'unavailable', id: 'abc123abc123', reason: 'not-found' });
  });

  it('shows a retryable error for network or server failures, and retry loads again', () => {
    const failed = previewReducer(open(), { type: 'result', id: 'abc123abc123', result: { status: 'error' } });
    expect(failed).toEqual({ kind: 'error', id: 'abc123abc123' });
    expect(previewReducer(failed, { type: 'retry' })).toEqual({ kind: 'loading', id: 'abc123abc123' });
  });

  it('ignores a late answer for a link that is no longer open', () => {
    const second = previewReducer(open('first1first1'), { type: 'open', id: 'second2second' });
    const late = previewReducer(second, { type: 'result', id: 'first1first1', result: { status: 'error' } });
    expect(late).toEqual({ kind: 'loading', id: 'second2second' });
    const closed = previewReducer(open(), { type: 'close' });
    expect(previewReducer(closed, { type: 'result', id: 'abc123abc123', result: { status: 'error' } })).toEqual(INITIAL_PREVIEW_STATE);
  });

  it('ignores PIN actions outside the PIN step', () => {
    expect(previewReducer(open(), { type: 'pin-sent' })).toEqual(open());
    expect(previewReducer(INITIAL_PREVIEW_STATE, { type: 'retry' })).toEqual(INITIAL_PREVIEW_STATE);
  });
});

describe('lockedMessage', () => {
  it('rounds up to whole minutes', () => {
    expect(lockedMessage(30)).toBe('Too many wrong PINs. This link is locked for about 1 minute. Try again later.');
    expect(lockedMessage(1200)).toBe('Too many wrong PINs. This link is locked for about 20 minutes. Try again later.');
  });
});

describe('fetchSharedTranscript unavailable reason', () => {
  it('tells expired (410) apart from not found (404)', async () => {
    const { fetchSharedTranscript } = await import('@/lib/share/viewer');
    const reply = (status: number) => ({ ok: false, status, headers: new Headers(), json: async () => ({}) }) as Response;
    vi.stubGlobal('fetch', vi.fn(async () => reply(410)));
    expect(await fetchSharedTranscript('abc')).toEqual({ status: 'unavailable', reason: 'expired' });
    vi.stubGlobal('fetch', vi.fn(async () => reply(404)));
    expect(await fetchSharedTranscript('abc')).toEqual({ status: 'unavailable', reason: 'not-found' });
    vi.unstubAllGlobals();
  });
});

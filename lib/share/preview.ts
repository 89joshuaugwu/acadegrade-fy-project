import type { SharedTranscriptResult } from './viewer';

/**
 * State for "Preview a transcript" on the student's transcript page. The fetch
 * itself is lib/share/viewer.ts; this only decides what the panel shows. The PIN
 * is never held here: the component sends it and forgets it.
 */

export type PreviewState<T = Record<string, unknown>> =
  | { kind: 'idle' }
  | { kind: 'loading'; id: string }
  | { kind: 'pin'; id: string; error: null | 'format' | 'incorrect'; checking: boolean }
  | { kind: 'locked'; id: string; retryAfterSeconds: number }
  | { kind: 'unavailable'; id: string; reason: 'expired' | 'not-found' }
  | { kind: 'error'; id: string }
  | { kind: 'ready'; id: string; transcript: T; expiresAt: string | null };

export type PreviewAction<T = Record<string, unknown>> =
  | { type: 'open'; id: string }
  | { type: 'result'; id: string; result: SharedTranscriptResult<T> }
  | { type: 'pin-sent' }
  | { type: 'pin-invalid' }
  | { type: 'retry' }
  | { type: 'close' };

export const INITIAL_PREVIEW_STATE: PreviewState<never> = { kind: 'idle' };

export function previewReducer<T>(state: PreviewState<T>, action: PreviewAction<T>): PreviewState<T> {
  switch (action.type) {
    case 'open':
      return { kind: 'loading', id: action.id };
    case 'close':
      return { kind: 'idle' };
    case 'retry':
      return state.kind === 'idle' ? state : { kind: 'loading', id: state.id };
    case 'pin-sent':
      return state.kind === 'pin' ? { ...state, error: null, checking: true } : state;
    case 'pin-invalid':
      return state.kind === 'pin' ? { ...state, error: 'format', checking: false } : state;
    case 'result': {
      // A late answer for a link that is no longer open changes nothing.
      if (state.kind === 'idle' || state.id !== action.id) return state;
      const { id, result } = action;
      switch (result.status) {
        case 'ok':
          return { kind: 'ready', id, transcript: result.transcript, expiresAt: result.expiresAt };
        case 'pin-required':
          return { kind: 'pin', id, error: null, checking: false };
        case 'pin-incorrect':
          return { kind: 'pin', id, error: 'incorrect', checking: false };
        case 'locked':
          return { kind: 'locked', id, retryAfterSeconds: result.retryAfterSeconds };
        case 'unavailable':
          return { kind: 'unavailable', id, reason: result.reason === 'expired' ? 'expired' : 'not-found' };
        default:
          return { kind: 'error', id };
      }
    }
    default:
      return state;
  }
}

export function lockedMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many wrong PINs. This link is locked for about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Try again later.`;
}

import type { AiFeature } from './aiAccess';

export type AiReportReason = 'inaccurate' | 'offensive' | 'unsafe' | 'other';
export type AiFeedbackKind = 'report' | 'helpful' | 'not_helpful';

export const AI_REPORT_REASONS: readonly { value: AiReportReason; label: string }[] = [
  { value: 'inaccurate', label: 'Inaccurate' },
  { value: 'offensive', label: 'Offensive' },
  { value: 'unsafe', label: 'Unsafe' },
  { value: 'other', label: 'Other' },
];

export const AI_REPORT_NOTE_MAX = 500;

export type AiFeedbackPayload =
  | { feature: AiFeature; kind: 'report'; reason: AiReportReason; note?: string }
  | { feature: AiFeature; kind: 'helpful' | 'not_helpful' };

/**
 * `POST /api/ai/report`. Resolves true on a 2xx and false otherwise (including
 * a 404 before the route is deployed or a network error); never throws.
 * No academic content is sent: only the feature, the kind, a reason and the
 * student's own optional note.
 */
export async function sendAiFeedback(getIdToken: () => Promise<string>, payload: AiFeedbackPayload): Promise<boolean> {
  try {
    const token = await getIdToken();
    const body = payload.kind === 'report'
      ? { feature: payload.feature, kind: payload.kind, reason: payload.reason, ...(payload.note?.trim() ? { note: payload.note.trim().slice(0, AI_REPORT_NOTE_MAX) } : {}) }
      : { feature: payload.feature, kind: payload.kind };
    const response = await fetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

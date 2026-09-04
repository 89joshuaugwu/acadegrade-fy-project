import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const TICKET_VERSION = 1;
export const REGISTRATION_TICKET_TTL_MS = 10 * 60 * 1000;

export interface RegistrationTicketPayload {
  version: typeof TICKET_VERSION;
  purpose: 'registration';
  email: string;
  jti: string;
  issuedAt: number;
  expiresAt: number;
}

function getSigningSecret(): string {
  const secret =
    process.env.REGISTRATION_TICKET_SECRET?.trim() ||
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!secret || secret.length < 32) {
    throw new Error('Registration ticket signing secret is not configured');
  }

  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function issueRegistrationTicket(email: string): {
  token: string;
  payload: RegistrationTicketPayload;
} {
  const issuedAt = Date.now();
  const payload: RegistrationTicketPayload = {
    version: TICKET_VERSION,
    purpose: 'registration',
    email: email.trim().toLowerCase(),
    jti: randomUUID(),
    issuedAt,
    expiresAt: issuedAt + REGISTRATION_TICKET_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${encodedPayload}.${sign(encodedPayload)}`, payload };
}

export function verifyRegistrationTicket(token: string): RegistrationTicketPayload {
  const [encodedPayload, suppliedSignature, ...rest] = token.split('.');
  if (!encodedPayload || !suppliedSignature || rest.length > 0) {
    throw new Error('Invalid registration verification token');
  }

  const expectedSignature = sign(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('Invalid registration verification token');
  }

  let payload: RegistrationTicketPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as RegistrationTicketPayload;
  } catch {
    throw new Error('Invalid registration verification token');
  }

  if (
    payload.version !== TICKET_VERSION ||
    payload.purpose !== 'registration' ||
    typeof payload.email !== 'string' ||
    typeof payload.jti !== 'string' ||
    typeof payload.expiresAt !== 'number' ||
    payload.expiresAt <= Date.now()
  ) {
    throw new Error('Registration verification has expired');
  }

  return payload;
}


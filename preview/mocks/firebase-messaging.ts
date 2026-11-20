/* eslint-disable @typescript-eslint/no-explicit-any */
/** Dev-only stand-in for 'firebase/messaging': in preview there is no push, so nothing registers. */
import * as real from 'firebase/messaging';
import { PREVIEW } from '../runtime';

export * from 'firebase/messaging';

export const isSupported: typeof real.isSupported = (() => (PREVIEW ? Promise.resolve(false) : real.isSupported())) as any;
export const getMessaging: typeof real.getMessaging = ((...args: any[]) => (PREVIEW ? ({ __preview: 'messaging' } as any) : (real.getMessaging as any)(...args))) as any;
export const getToken: typeof real.getToken = ((m: any, o?: any) => (PREVIEW ? Promise.resolve('') : real.getToken(m, o))) as any;
export const deleteToken: typeof real.deleteToken = ((m: any) => (PREVIEW ? Promise.resolve(true) : real.deleteToken(m))) as any;
export const onMessage: typeof real.onMessage = ((m: any, cb: any) => (PREVIEW ? () => undefined : real.onMessage(m, cb))) as any;

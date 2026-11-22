'use client';

import { useEffect } from 'react';
import { bootAgMotion } from './boot';

/** Starts the motion runtime when the inline script did not run (client-side navigation). Idempotent. */
export function MotionBoot() {
  useEffect(() => {
    bootAgMotion();
  }, []);
  return null;
}

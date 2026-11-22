'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { resolveGradingScale, type GradingScale } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE } from '@/lib/cgpa/scale';
import { readGradingScaleSetting, type StoredGradingScale } from '@/lib/cgpa/scaleSetting';

export interface GradingScaleState {
  /** The active scale (5-point when nothing is stored or the setting is broken). */
  scale: GradingScale;
  /** The stored choice, or null when none is stored. */
  setting: StoredGradingScale | null;
}

const DEFAULT_STATE: GradingScaleState = { scale: DEFAULT_SCALE, setting: null };
const GradingScaleContext = createContext<GradingScaleState>(DEFAULT_STATE);

/**
 * Supplies the student's grading scale to everything under it. The student
 * layout wraps the app with it using the profile it already subscribes to, so
 * no extra reads happen. Outside it (public pages, tests) the scale is ng5.
 */
export function GradingScaleProvider({ setting, children }: { setting: unknown; children: ReactNode }) {
  const key = JSON.stringify(setting ?? null);
  const value = useMemo<GradingScaleState>(() => {
    const stored = readGradingScaleSetting(setting);
    return { scale: stored ? resolveGradingScale(stored) : DEFAULT_SCALE, setting: stored };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <GradingScaleContext.Provider value={value}>{children}</GradingScaleContext.Provider>;
}

/** The active grading scale and the stored choice. */
export function useGradingScale(): GradingScaleState {
  return useContext(GradingScaleContext);
}

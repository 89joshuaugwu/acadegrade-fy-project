'use client';

import { usePlatformSettings } from './usePlatformSettings';

/** The kill-switch id for timetables (platform settings `disabledFeatures`). */
export const TIMETABLE_FEATURE = 'timetable';

/** False only when the `timetable` switch is explicitly off. Fails open while loading or on error. */
export function useTimetableEnabled(): boolean {
  const { isFeatureDisabled, loading } = usePlatformSettings();
  if (loading) return true;
  try {
    return !isFeatureDisabled(TIMETABLE_FEATURE);
  } catch {
    return true;
  }
}

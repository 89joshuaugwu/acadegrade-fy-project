'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useSemesters } from './useSemesters';
import type { CumulativeResult } from '@/types/course';
import type { DegreeClass } from '@/types/analytics';
import type { SemesterSummary } from '@/types/semester';
import { DEGREE_CLASSES } from '@/lib/utils/constants';
import { computeCumulativeCGPA } from '@/lib/cgpa/calculator';
import { resolveDegreeClass } from '@/lib/cgpa/degreeClass';

interface CGPAState {
  cgpa: number;
  pi: number;
  degreeClass: DegreeClass;
  semesterHistory: SemesterSummary[];
  totalCredits: number;
  totalCourses: number;
  loading: boolean;
  error: Error | null;
}

/**
 * Compute CGPA and PI from the user's semester data.
 * Subscribes to Firestore via useSemesters and recomputes on data change.
 */
export function useCGPA(): CGPAState {
  const { semesters, loading, error } = useSemesters();

  const result = useMemo(() => {
    if (semesters.length === 0) {
      return {
        cgpa: 0,
        pi: 0,
        degreeClass: DEGREE_CLASSES[DEGREE_CLASSES.length - 1],
        semesterHistory: [],
        totalCredits: 0,
        totalCourses: 0,
      };
    }

    const history: SemesterSummary[] = [];

    for (const sem of semesters) {
      history.push({
        semesterId: sem.id,
        label: sem.label,
        gpa: sem.gpa,
        pi: sem.pi,
        creditLoaded: sem.creditLoaded,
        session: sem.session,
      });
    }

    // Shared academic rules: credit-weighted CGPA, rounded lower-bound class
    const { cgpa, pi, totalCredits } = computeCumulativeCGPA(semesters);
    const degreeClass = resolveDegreeClass(cgpa);

    return {
      cgpa,
      pi,
      degreeClass,
      semesterHistory: history,
      totalCredits,
      totalCourses: 0,
    };
  }, [semesters]);

  return {
    ...result,
    loading,
    error,
  };
}

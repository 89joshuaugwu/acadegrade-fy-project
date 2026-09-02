'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useSemesters } from './useSemesters';
import type { CumulativeResult } from '@/types/course';
import type { DegreeClass } from '@/types/analytics';
import type { SemesterSummary } from '@/types/semester';
import { DEGREE_CLASSES } from '@/lib/utils/constants';

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

    let totalWeightedGPA = 0;
    let totalWeightedPI = 0;
    let totalCredits = 0;
    const history: SemesterSummary[] = [];

    for (const sem of semesters) {
      if (sem.creditLoaded > 0) {
        totalWeightedGPA += sem.gpa * sem.creditLoaded;
        totalWeightedPI += sem.pi * sem.creditLoaded;
        totalCredits += sem.creditLoaded;
      }
      history.push({
        semesterId: sem.id,
        label: sem.label,
        gpa: sem.gpa,
        pi: sem.pi,
        creditLoaded: sem.creditLoaded,
        session: sem.session,
      });
    }

    const cgpa = totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
    const pi = totalCredits > 0 ? totalWeightedPI / totalCredits : 0;

    const degreeClass =
      DEGREE_CLASSES.find(
        (dc) => cgpa >= dc.minCGPA && cgpa <= dc.maxCGPA
      ) ?? DEGREE_CLASSES[DEGREE_CLASSES.length - 1];

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

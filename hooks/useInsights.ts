'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface InsightsState {
  insights: {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    degreeOutlook: string;
  } | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Fetch and cache AI insights for the current user.
 * Rate-limited to 1 call per 24 hours.
 */
export function useInsights(): InsightsState {
  const { uid } = useAuth();
  const [insights, setInsights] = useState<InsightsState['insights']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    try {
      const { getIdToken } = await import('@/lib/firebase/auth');
      const token = await getIdToken();
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch insights');

      const data = await res.json();
      setInsights(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { insights, loading, error, refresh, lastUpdated };
}

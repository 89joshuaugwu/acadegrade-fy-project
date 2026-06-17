import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToDocument } from '@/lib/firebase/firestore';

export function useAnalytics() {
  const { user } = useAuth();
  const [insightsStale, setInsightsStale] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToDocument<any>(
      `analytics/${user.uid}`,
      (data) => {
        if (data && data.insightsStale) {
          setInsightsStale(true);
        } else {
          setInsightsStale(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return { insightsStale };
}

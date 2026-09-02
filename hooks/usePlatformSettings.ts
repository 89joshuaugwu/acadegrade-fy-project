'use client';

import { useState, useEffect } from 'react';
import { getDocument } from '@/lib/firebase/firestore';

export function usePlatformSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        setSettings(doc || {});
      } catch (err) {
        console.error('Failed to load platform settings', err);
        setSettings({});
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const isFeatureDisabled = (featureId: string) => {
    if (!settings || !settings.disabledFeatures) return false;
    return settings.disabledFeatures.includes(featureId);
  };

  return { settings, loading, isFeatureDisabled };
}

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToDocument, updateDocument } from '@/lib/firebase/firestore';
import type { UserWithId } from '@/types/user';
import toast from 'react-hot-toast';

export function useProfile() {
  const { uid } = useAuth();
  const [profile, setProfile] = useState<UserWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      setLoadedUid(null);
      return;
    }
    setProfile(null);
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToDocument<UserWithId>(
      `users/${uid}`,
      (data) => {
        setProfile(data);
        setLoading(false);
        setError(null);
        setLoadedUid(uid);
      },
      (subscriptionError) => {
        setError(subscriptionError);
        setLoading(false);
        setLoadedUid(uid);
      }
    );
    return unsubscribe;
  }, [retryKey, uid]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryKey((key) => key + 1);
  }, []);

  const updateProfile = async (data: Partial<UserWithId>) => {
    if (!uid) return;
    try {
      await updateDocument(`users/${uid}`, { ...data, updatedAt: new Date().toISOString() });
    } catch (err: any) {
      toast.error('Failed to update profile');
    }
  };

  const completeTour = async () => {
    if (!uid) return;
    try {
      await updateDocument(`users/${uid}`, { tourCompleted: true, updatedAt: new Date().toISOString() });
      setProfile(prev => prev ? { ...prev, tourCompleted: true } : null);
    } catch (err: any) {
      toast.error('Failed to update tour status');
    }
  };

  const completeProductTour = async (
    tourId: string,
    version: number,
    legacyField?: 'tourCompleted' | 'resultsTourCompleted'
  ) => {
    if (!uid || !profile) return;
    const tourVersions = { ...(profile.tourVersions || {}), [tourId]: version };
    const legacyUpdate = legacyField ? { [legacyField]: true } : {};
    try {
      await updateDocument(`users/${uid}`, {
        tourVersions,
        ...legacyUpdate,
        updatedAt: new Date().toISOString(),
      });
      setProfile((previous) => previous ? {
        ...previous,
        tourVersions,
        ...legacyUpdate,
      } : null);
    } catch {
      toast.error('Could not save tour progress. You can continue using AcadeGrade.');
    }
  };

  const completeResultsTour = async () => {
    if (!uid || !profile || profile.resultsTourCompleted) return;
    try {
      await updateDocument(`users/${uid}`, { resultsTourCompleted: true, updatedAt: new Date().toISOString() });
      setProfile(prev => prev ? { ...prev, resultsTourCompleted: true } : null);
    } catch (err: any) {
      toast.error('Failed to update results tour status');
    }
  };

  const profileLoading = Boolean(uid) && (loading || loadedUid !== uid);
  return { profile, loading: profileLoading, error, retry, updateProfile, completeTour, completeResultsTour, completeProductTour };
}

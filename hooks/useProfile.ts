'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToDocument, updateDocument } from '@/lib/firebase/firestore';
import type { UserWithId } from '@/types/user';
import toast from 'react-hot-toast';

export function useProfile() {
  const { uid } = useAuth();
  const [profile, setProfile] = useState<UserWithId | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const unsubscribe = subscribeToDocument<UserWithId>(
      `users/${uid}`,
      (data) => setProfile(data)
    );
    return unsubscribe;
  }, [uid]);

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

  const completeResultsTour = async () => {
    if (!uid || !profile || profile.resultsTourCompleted) return;
    try {
      await updateDocument(`users/${uid}`, { resultsTourCompleted: true, updatedAt: new Date().toISOString() });
      setProfile(prev => prev ? { ...prev, resultsTourCompleted: true } : null);
    } catch (err: any) {
      toast.error('Failed to update results tour status');
    }
  };

  return { profile, updateProfile, completeTour, completeResultsTour };
}

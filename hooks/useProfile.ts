'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToDocument } from '@/lib/firebase/firestore';
import type { UserWithId } from '@/types/user';

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

  return { profile };
}

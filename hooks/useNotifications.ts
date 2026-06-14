'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToRTDB } from '@/lib/firebase/rtdb';
import type { NotificationWithId, NotificationCount } from '@/types/analytics';

interface NotificationState {
  unreadCount: number;
  notifications: NotificationWithId[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to notification count from RTDB and recent notifications from Firestore.
 * RTDB provides instant badge updates; Firestore provides full notification list.
 */
export function useNotifications(): NotificationState {
  const { uid } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    // Subscribe to RTDB for live unread count
    const unsubscribeRTDB = subscribeToRTDB<NotificationCount>(
      `notif_counts/${uid}`,
      (data) => {
        setUnreadCount(data?.unread ?? 0);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRTDB();
    };
  }, [uid]);

  return { unreadCount, notifications, loading, error };
}

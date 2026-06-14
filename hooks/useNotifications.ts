'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToRTDB } from '@/lib/firebase/rtdb';
import { subscribeToQuery } from '@/lib/firebase/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { NotificationWithId, NotificationCount } from '@/types/analytics';

interface NotificationState {
  unreadCount: number;
  notifications: NotificationWithId[];
  loading: boolean;
  error: Error | null;
}

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
      }
    );

    // Subscribe to last 5 notifications from Firestore
    const notifsRef = collection(db, `notifications/${uid}/items`);
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(5));
    
    const unsubscribeFirestore = subscribeToQuery<NotificationWithId>(
      q,
      (data) => {
        setNotifications(data);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRTDB();
      unsubscribeFirestore();
    };
  }, [uid]);

  return { unreadCount, notifications, loading, error };
}

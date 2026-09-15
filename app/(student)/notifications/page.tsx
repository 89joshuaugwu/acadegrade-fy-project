'use client';

import { useState, useEffect } from 'react';
import { CheckCheck, Bell, Info, AlertTriangle, Sparkles, CheckCircle2, Trash2, Lightbulb } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { queryCollection, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { setRTDB } from '@/lib/firebase/rtdb';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { NotificationWithId } from '@/types/analytics';

const ICONS = {
  info: <Info size={20} className="text-[var(--acade-primary)]" />,
  system: <Info size={20} className="text-[var(--acade-primary)]" />,
  success: <CheckCircle2 size={20} className="text-[var(--acade-success)]" />,
  achievement: <CheckCircle2 size={20} className="text-[var(--acade-success)]" />,
  warning: <AlertTriangle size={20} className="text-[var(--acade-warning)]" />,
  error: <AlertTriangle size={20} className="text-[var(--acade-danger)]" />,
  ai: <Sparkles size={20} className="text-[var(--acade-gold)]" />,
  tip: <Lightbulb size={20} className="text-[var(--acade-gold)]" />,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const items = await queryCollection<NotificationWithId>(`notifications/${user.uid}/items`);
      
      // Sort newest first
      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setNotifications(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDocument(`notifications/${user.uid}/items/${id}`, { read: true });
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      setNotifications(updated);
      
      const newUnreadCount = updated.filter(n => !n.read).length;
      await setRTDB(`notif_counts/${user.uid}/unread`, newUnreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    await Promise.all(
      unread.map(n => updateDocument(`notifications/${user.uid}/items/${n.id}`, { read: true }))
    );
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await setRTDB(`notif_counts/${user.uid}/unread`, 0);
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    try {
      await Promise.all(
        notifications.map(n => deleteDocument(`notifications/${user.uid}/items/${n.id}`))
      );
      setNotifications([]);
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading notifications">
        <div className="size-10 animate-spin rounded-full border-4 border-[var(--acade-primary)] border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] flex items-center gap-2">
            <Bell size={24} /> Notifications
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
            You have {unreadCount} unread message{unreadCount !== 1 && 's'}.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck size={16} className="mr-2" /> Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearAll} className="bg-[var(--acade-danger-dim)] text-[var(--acade-danger)] hover:bg-[var(--acade-danger)] hover:text-white border-transparent">
              <Trash2 size={16} className="mr-2" /> Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-[var(--acade-text-muted)]">
            <div className="mx-auto w-16 h-16 bg-[var(--acade-deep)] rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-[var(--acade-text-faint)]" />
            </div>
            <h3 className="font-bold text-[var(--acade-text)] text-[length:var(--text-lg)]">All caught up!</h3>
            <p className="text-[length:var(--text-sm)] mt-1">Check back later for updates on your academic progress.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--acade-border-subtle)]">
            <AnimatePresence initial={!shouldReduceMotion}>
              {notifications.map((notif, index) => (
                <motion.article
                  key={notif.id}
                  aria-label={notif.title}
                  data-reduced-motion={shouldReduceMotion ? 'true' : 'false'}
                  initial={shouldReduceMotion ? false : { opacity: 0, rotateX: -60, y: -20, transformOrigin: 'top' }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95, height: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : {
                    duration: 0.5,
                    delay: index * 0.08,
                    type: 'spring',
                    damping: 20,
                  }}
                  className={cn(
                    'transition-colors motion-reduce:transition-none',
                    notif.read ? 'bg-transparent' : 'bg-[var(--acade-primary-dim)]'
                  )}
                >
                  {notif.read ? (
                    <div className="flex gap-4 p-4 sm:p-6">
                      <NotificationContent notification={notif} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Mark “${notif.title}” as read`}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="flex w-full gap-4 p-4 text-left transition-colors hover:bg-[var(--acade-primary-dim)]/80 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acade-primary)] motion-reduce:transition-none sm:p-6"
                    >
                      <NotificationContent notification={notif} />
                    </button>
                  )}

                  {notif.actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-4 ml-16 sm:mb-6"
                      onClick={() => {
                        window.location.href = notif.actionUrl!;
                      }}
                    >
                      View Details
                    </Button>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationContent({ notification }: { notification: NotificationWithId }) {
  return (
    <>
      <div className="mt-1 shrink-0">
        <div className="flex size-10 items-center justify-center rounded-full border border-[var(--acade-border)] bg-[var(--acade-surface)]">
          {ICONS[notification.type as keyof typeof ICONS] || ICONS.info}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h2 className={cn(
            'text-[length:var(--text-base)] font-bold',
            notification.read ? 'text-[var(--acade-text)]' : 'text-[var(--acade-primary-glow)]'
          )}>
            {notification.title}
          </h2>
          {notification.createdAt?.toMillis && (
            <span className="shrink-0 whitespace-nowrap text-[length:var(--text-xs)] text-[var(--acade-text-faint)]">
              {formatDistanceToNow(notification.createdAt.toMillis(), { addSuffix: true })}
            </span>
          )}
        </div>
        <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--acade-text-muted)]">
          {notification.message}
        </p>
      </div>

      {!notification.read && (
        <span className="flex shrink-0 items-center" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[var(--acade-primary)] shadow-[0_0_8px_var(--acade-primary)]" />
        </span>
      )}
    </>
  );
}

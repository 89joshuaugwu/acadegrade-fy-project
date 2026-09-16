'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Bell, Info, AlertTriangle, Sparkles, CheckCircle2, Trash2, Lightbulb, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [loadError, setLoadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
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
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [loadNotifications, user]);

  const retryNotifications = () => {
    setLoading(true);
    setLoadError(false);
    void loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user || pendingAction) return;
    setPendingAction(id);
    try {
      await updateDocument(`notifications/${user.uid}/items/${id}`, { read: true });
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      const newUnreadCount = updated.filter(n => !n.read).length;
      await setRTDB(`notif_counts/${user.uid}/unread`, newUnreadCount);
      setNotifications(updated);
    } catch (err) {
      console.error(err);
      toast.error('Could not mark the notification as read. Try again.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || pendingAction) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    setPendingAction('mark-all');
    try {
      await Promise.all(
        unread.map(n => updateDocument(`notifications/${user.uid}/items/${n.id}`, { read: true }))
      );
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Could not mark all notifications as read. Try again.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0 || pendingAction) return;
    setPendingAction('clear-all');
    try {
      await Promise.all(
        notifications.map(n => deleteDocument(`notifications/${user.uid}/items/${n.id}`))
      );
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      toast.error('Could not clear notifications. Try again.');
    } finally {
      setPendingAction(null);
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
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} loading={pendingAction === 'mark-all'} disabled={pendingAction !== null}>
              <CheckCheck size={16} className="mr-2" /> Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearAll} loading={pendingAction === 'clear-all'} disabled={pendingAction !== null} className="bg-[var(--acade-danger-dim)] text-[var(--acade-danger)] hover:bg-[var(--acade-danger)] hover:text-white border-transparent">
              <Trash2 size={16} className="mr-2" /> Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl overflow-hidden shadow-sm">
        {loadError ? (
          <div role="alert" className="p-8 text-center text-[var(--acade-text-muted)] sm:p-12">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--acade-danger-dim)]">
              <AlertTriangle size={24} className="text-[var(--acade-danger)]" aria-hidden="true" />
            </div>
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">Notifications are unavailable</h2>
            <p className="mx-auto mt-1 max-w-md text-[length:var(--text-sm)]">We could not load your updates. Check your connection and try again.</p>
            <Button variant="outline" size="sm" onClick={retryNotifications} className="mt-5">
              <RefreshCw size={16} className="mr-2" aria-hidden="true" /> Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
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
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 sm:gap-4 sm:p-6">
                    <NotificationContent
                      notification={notif}
                      disabled={pendingAction !== null}
                      onMarkAsRead={() => handleMarkAsRead(notif.id)}
                    />
                  </div>

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

function NotificationContent({
  notification,
  disabled,
  onMarkAsRead,
}: {
  notification: NotificationWithId;
  disabled: boolean;
  onMarkAsRead: () => void;
}) {
  return (
    <>
      <div className="mt-0.5 shrink-0">
        {notification.read ? (
          <span
            aria-label={`Read: ${notification.title}`}
            data-state="read"
            className="flex size-10 items-center justify-center rounded-full border border-[var(--acade-success)]/35 bg-[var(--acade-success)]/10 text-[var(--acade-success)]"
          >
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Mark “${notification.title}” as read`}
            data-state="unread"
            onClick={onMarkAsRead}
            disabled={disabled}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--acade-primary)]/40 bg-[var(--acade-surface)] transition-colors hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          >
            {ICONS[notification.type as keyof typeof ICONS] || ICONS.info}
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h2 className={cn(
            'min-w-0 break-words text-[length:var(--text-base)] font-bold',
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
        <p className="mt-1 [overflow-wrap:anywhere] text-[length:var(--text-sm)] leading-relaxed text-[var(--acade-text-muted)]">
          {notification.message}
        </p>
      </div>
    </>
  );
}

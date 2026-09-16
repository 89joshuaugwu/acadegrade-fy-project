'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertTriangle, Lightbulb, Info, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firebase/firestore';
import { setRTDB } from '@/lib/firebase/rtdb';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(() => new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { unreadCount, notifications, loading } = useNotifications();
  const shouldReduceMotion = useReducedMotion();

  const isRead = (id: string, read: boolean) => read || locallyReadIds.has(id);
  const locallyResolvedCount = notifications.filter(
    (notification) => !notification.read && locallyReadIds.has(notification.id),
  ).length;
  const effectiveUnreadCount = Math.max(0, unreadCount - locallyResolvedCount);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (!notifications || !user) return;
    try {
      const unread = notifications.filter((notification) => !isRead(notification.id, notification.read));
      if (unread.length === 0) return;
      
      await Promise.all(
        unread.map(n => updateDocument(`notifications/${user.uid}/items/${n.id}`, { read: true }))
      );
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
      setLocallyReadIds((current) => new Set([...current, ...unread.map((notification) => notification.id)]));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!user) return;
    const notification = notifications.find((item) => item.id === id);
    if (!notification || isRead(notification.id, notification.read)) return;

    try {
      await updateDocument(`notifications/${user.uid}/items/${id}`, { read: true });
      const nextUnreadCount = Math.max(0, effectiveUnreadCount - 1);
      await setRTDB(`notif_counts/${user.uid}/unread`, nextUnreadCount);
      setLocallyReadIds((current) => new Set(current).add(id));
    } catch (error) {
      console.error(error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <CheckCircle2 size={16} className="text-[var(--acade-success)]" />;
      case 'warning': return <AlertTriangle size={16} className="text-[var(--acade-danger)]" />;
      case 'tip': return <Lightbulb size={16} className="text-[var(--acade-gold)]" />;
      case 'system':
      default: return <Info size={16} className="text-[var(--acade-primary)]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="notification-dropdown"
      >
        <Bell size={20} />
        {effectiveUnreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acade-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--acade-primary)] border-2 border-[var(--acade-surface)]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="notification-dropdown"
            role="dialog"
            aria-label="Notifications"
            aria-modal="false"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-x-3 top-[4.25rem] z-50 flex w-auto max-h-[min(65dvh,28rem)] origin-top-right flex-col overflow-hidden rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)]/95 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-[28rem]"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--acade-border)] p-4">
              <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                Notifications
              </h3>
              {effectiveUnreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[length:var(--text-xs)] text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="size-6 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notif) => {
                    const notificationIsRead = isRead(notif.id, notif.read);
                    return (
                      <article
                        key={notif.id}
                        className={cn(
                          "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-[var(--acade-border-subtle)] p-4 transition-colors hover:bg-[var(--acade-overlay)]",
                          !notificationIsRead ? "bg-[var(--acade-primary)]/5" : ""
                        )}
                      >
                        {notificationIsRead ? (
                          <span
                            aria-label={`Read: ${notif.title}`}
                            data-state="read"
                            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--acade-success)]/35 bg-[var(--acade-success)]/10 text-[var(--acade-success)]"
                          >
                            <CheckCircle2 size={17} aria-hidden="true" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Mark “${notif.title}” as read`}
                            data-state="unread"
                            onClick={() => void handleMarkRead(notif.id)}
                            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--acade-primary)]/40 bg-[var(--acade-deep)] transition-colors hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
                          >
                            {getIcon(notif.type)}
                          </button>
                        )}
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className={cn(
                              "min-w-0 break-words text-[length:var(--text-sm)] font-bold font-[family-name:var(--font-dm-sans)]",
                              !notificationIsRead ? "text-[var(--acade-text)]" : "text-[var(--acade-text-muted)]"
                            )}>
                              {notif.title}
                            </span>
                            {notif.createdAt && (
                              <span className="text-[10px] text-[var(--acade-text-faint)]">
                                {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere] text-[length:var(--text-xs)] leading-relaxed text-[var(--acade-text-muted)]">
                            {notif.message}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="bg-[var(--acade-deep)] p-3 rounded-full mb-2">
                    <Bell size={24} className="text-[var(--acade-text-faint)]" />
                  </div>
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">No new notifications</p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--acade-border)] bg-[var(--acade-deep)] p-2">
              <Link 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-2 rounded-lg text-[length:var(--text-sm)] font-semibold text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] transition-colors"
              >
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

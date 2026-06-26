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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { unreadCount, notifications, loading } = useNotifications();
  const shouldReduceMotion = useReducedMotion();

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
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      
      await Promise.all(
        unread.map(n => updateDocument(`notifications/${user.uid}/items/${n.id}`, { read: true }))
      );
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
    } catch (e) {
      console.error(e);
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
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acade-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--acade-primary)] border-2 border-[var(--acade-surface)]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-32px)] max-w-[360px] sm:w-80 bg-[var(--acade-deep)]/95 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 overflow-hidden origin-top-right"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--acade-border)]">
              <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[length:var(--text-xs)] text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="size-6 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-4 border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-overlay)] transition-colors flex gap-3",
                        !notif.read ? "bg-[var(--acade-primary)]/5" : ""
                      )}
                    >
                      <div className="shrink-0 mt-0.5 bg-[var(--acade-deep)] p-1.5 rounded-full border border-[var(--acade-border)]">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className={cn(
                            "text-[length:var(--text-sm)] font-bold font-[family-name:var(--font-dm-sans)]",
                            !notif.read ? "text-[var(--acade-text)]" : "text-[var(--acade-text-muted)]"
                          )}>
                            {notif.title}
                          </span>
                          {notif.createdAt && (
                            <span className="text-[10px] text-[var(--acade-text-faint)] whitespace-nowrap mt-0.5">
                              {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] line-clamp-2 leading-relaxed pr-4">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="shrink-0 flex items-center self-center ml-1">
                          <div className="w-2 h-2 rounded-full bg-[var(--acade-primary)] shadow-[0_0_6px_var(--acade-primary)]" />
                        </div>
                      )}
                    </div>
                  ))}
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

            <div className="p-2 border-t border-[var(--acade-border)] bg-[var(--acade-deep)]">
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

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Settings, Calculator, Bell, Info, LogOut, X, LayoutDashboard, BookOpen, BrainCircuit, Activity } from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useProfile } from '@/hooks/useProfile';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { cn } from '@/lib/utils/cn';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export function MobileDrawer({ isOpen, onClose, isAdmin = false }: MobileDrawerProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Swipe to close handlers
  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchEndX - touchStartX > 50) {
      onClose(); // Swipe right to close (drawer is on the right)
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        await removeNotificationToken(user.uid);
      }
      await signOut();
      onClose();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-50 bg-[#07090F]/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed inset-y-0 right-0 z-50 w-4/5 max-w-sm bg-[var(--acade-surface)] border-l border-[var(--acade-border)] shadow-2xl md:hidden flex flex-col",
              isAdmin ? 'border-l-[var(--acade-danger)]' : ''
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className={cn(
              "p-4 flex items-center justify-between border-b border-[var(--acade-border)]",
              isAdmin ? 'bg-[var(--acade-danger-dim)]/30' : ''
            )}>
              {isAdmin ? (
                <div className="flex items-center gap-2 text-[var(--acade-danger)] font-bold font-[family-name:var(--font-bricolage)]">
                  <Shield size={20} />
                  <span>Admin Panel</span>
                </div>
              ) : (
                <div className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                  Menu
                </div>
              )}
              <button 
                onClick={onClose}
                className="p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Section (Student Only) */}
            {!isAdmin && user && (
              <div className="p-6 border-b border-[var(--acade-border)] flex items-center gap-4">
                <div className="shrink-0 size-12 rounded-full border-2 border-[var(--acade-primary)]/50 overflow-hidden bg-[var(--acade-deep)]">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Avatar" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] truncate font-[family-name:var(--font-bricolage)]">
                    {profile?.fullName || user?.displayName || 'Student'}
                  </span>
                  <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">
                    {profile?.matric || 'No Matric'}
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              {isAdmin ? (
                <>
                  <DrawerLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
                  <DrawerLink href="/admin/users" icon={Shield} label="Users" onClick={onClose} />
                  <DrawerLink href="/admin/courses" icon={BookOpen} label="Course Catalog" onClick={onClose} />
                  <DrawerLink href="/admin/analytics" icon={BrainCircuit} label="Analytics" onClick={onClose} />
                  <DrawerLink href="/admin/api-analytics" icon={Activity} label="API Monitor" onClick={onClose} />
                  <DrawerLink href="/admin/settings" icon={Settings} label="Settings" onClick={onClose} />
                </>
              ) : (
                <>
                  <DrawerLink href="/settings" id="tour-mobile-nav-settings" icon={Settings} label="Settings" onClick={onClose} />
                  <DrawerLink href="/calculator" icon={Calculator} label="Quick Calculator" onClick={onClose} />
                  <DrawerLink href="/notifications" id="tour-mobile-nav-notifications" icon={Bell} label="Notifications" badge={unreadCount} onClick={onClose} />
                  <DrawerLink href="/about" icon={Info} label="About" onClick={onClose} />
                </>
              )}
            </div>

            {/* Footer Sign Out */}
            <div className="p-4 border-t border-[var(--acade-border)]">
              {isAdmin && user && (
                <div className="mb-4 px-2 text-[length:var(--text-xs)] text-[var(--acade-text-muted)] truncate text-center">
                  {user.email}
                </div>
              )}
              <button
                id="tour-mobile-nav-logout"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-semibold text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerLink({ 
  href, 
  icon: Icon, 
  label, 
  badge,
  id,
  onClick 
}: { 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  badge?: number;
  id?: string;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link 
      href={href} 
      id={id}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-colors font-medium text-[length:var(--text-base)] font-[family-name:var(--font-dm-sans)]",
        active 
          ? "bg-[var(--acade-primary)]/10 text-[var(--acade-primary)]" 
          : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]"
      )}
    >
      <Icon size={20} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-[var(--acade-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, BookOpen, BrainCircuit, FileText, Settings, Bell, LogOut, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { signOut } from '@/lib/firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getDocument } from '@/lib/firebase/firestore';
import { requestNotificationPermission, onForegroundMessage, removeNotificationToken } from '@/lib/firebase/fcm';
import toast from 'react-hot-toast';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { MobileDrawer } from './MobileDrawer';
import { BottomTabBar } from './BottomTabBar';
import { NotificationDropdown } from './NotificationDropdown';
import { Logo } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/results', label: 'Results', icon: BookOpen },
  { href: '/insights', label: 'Insights', icon: BrainCircuit },
  { href: '/transcript', label: 'Transcript', icon: FileText },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { insightsStale } = useAnalytics();
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        if (doc?.announcementBanner) {
          // Check if dismissed in localStorage
          const dismissed = localStorage.getItem('dismissed_banner');
          if (dismissed !== doc.announcementBanner) {
            setAnnouncement(doc.announcementBanner);
          }
        }
      } catch (err) {
        console.error('Failed to load banner', err);
      }
    };
    fetchBanner();
  }, []);

  // Request FCM Permission and Listen
  useEffect(() => {
    if (user?.uid) {
      requestNotificationPermission(user.uid).catch(console.error);

      const unsubscribe = onForegroundMessage((payload) => {
        if (payload?.notification) {
          toast(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">
                {payload.notification.title}
              </span>
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                {payload.notification.body}
              </span>
            </div>,
            { icon: '🔔', duration: 5000 }
          );
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const dismissBanner = () => {
    if (announcement) {
      localStorage.setItem('dismissed_banner', announcement);
      setAnnouncement(null);
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        await removeNotificationToken(user.uid);
      }
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[var(--acade-void)] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-[var(--acade-deep)]/80 backdrop-blur-md border-b border-[var(--acade-border)] md:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationDropdown />
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] fixed inset-y-0 left-0 bg-[var(--acade-deep)] border-r border-[var(--acade-border)] z-40 overflow-y-auto">
        <div className="p-6">
          <Logo size="md" className="mb-8" />

          {/* Profile snippet */}
          <div className="flex flex-col items-center mb-8 bg-[var(--acade-surface)] p-4 rounded-2xl border border-[var(--acade-border-subtle)]">
            <div className="mb-3 rounded-full border-2 border-[var(--acade-primary)]/50 overflow-hidden size-16 shrink-0 relative flex items-center justify-center bg-[var(--acade-deep)]">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] truncate w-full text-center">
              {profile?.fullName || user?.displayName || 'Student'}
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] truncate max-w-full">
              {profile?.matric || 'No Matric'}
            </span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]",
                    active
                      ? "bg-[var(--acade-primary)]/10 text-[var(--acade-primary)] border border-[var(--acade-primary)]/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                      : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
                  )}
                >
                  <div className="relative">
                    <Icon size={20} className={active ? "text-[var(--acade-primary-glow)]" : ""} />
                    {tab.label === 'Insights' && insightsStale && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-[var(--acade-deep)]"></span>
                      </span>
                    )}
                  </div>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 flex flex-col gap-1.5">
          <div className="mb-2">
            <Link
              href="/notifications"
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]",
                isActive('/notifications')
                  ? "bg-[var(--acade-primary)]/10 text-[var(--acade-primary)] border border-[var(--acade-primary)]/20"
                  : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className={isActive('/notifications') ? "text-[var(--acade-primary-glow)]" : ""} />
                Notifications
              </div>
              {unreadCount > 0 && (
                <span className="bg-[var(--acade-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
          
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]",
              isActive('/settings')
                ? "bg-[var(--acade-primary)]/10 text-[var(--acade-primary)] border border-[var(--acade-primary)]/20"
                : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
            )}
          >
            <Settings size={20} className={isActive('/settings') ? "text-[var(--acade-primary-glow)]" : ""} />
            Settings
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] text-left w-full mt-2"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[240px] pb-[80px] md:pb-0 relative min-h-screen">
        {announcement && (
          <div className="bg-[var(--acade-gold)]/10 border-b border-[var(--acade-gold)]/20 px-4 py-3 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 text-[var(--acade-gold)]">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[length:var(--text-sm)] font-medium font-[family-name:var(--font-dm-sans)] leading-tight">
                {announcement}
              </p>
            </div>
            <button onClick={dismissBanner} className="p-1 rounded-full text-[var(--acade-gold)] hover:bg-[var(--acade-gold)]/20 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-w-6xl mx-auto p-4 md:p-8 w-full h-full">
          {children}
        </div>
      </main>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} isAdmin={false} />
      <BottomTabBar />
    </div>
  );
}

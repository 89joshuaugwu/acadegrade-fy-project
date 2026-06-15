'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, BookOpen, BrainCircuit, FileText, Settings, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { signOut } from '@/lib/firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';
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
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
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
            <div className="mb-3 bg-[var(--acade-deep)] rounded-full p-1 border border-[var(--acade-border)]">
              <CGPAArc cgpa={0} pi={0} size="sm" showParticles={false} animateOnMount={false} />
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
                  <Icon size={20} className={active ? "text-[var(--acade-primary-glow)]" : ""} />
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
        <div className="max-w-6xl mx-auto p-4 md:p-8 w-full h-full">
          {children}
        </div>
      </main>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} isAdmin={false} />
      <BottomTabBar />
    </div>
  );
}

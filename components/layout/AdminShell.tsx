'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, Users, BookOpen, BarChart3, Activity, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { MobileDrawer } from './MobileDrawer';
import { cn } from '@/lib/utils/cn';

const ADMIN_TABS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Course Catalog', icon: BookOpen },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/api-analytics', label: 'API Monitor', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

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

  const isActive = (href: string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-[#07090F] flex flex-col md:flex-row">
      {/* Mobile Header — Red-tinted admin strip */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-[#1A0A0A]/90 backdrop-blur-md border-b border-[var(--acade-danger)]/20 md:hidden">
        <div className="flex items-center gap-2 text-[var(--acade-danger)] font-bold font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)]">
          <Shield size={22} className="text-[var(--acade-danger)]" />
          <span>Admin Panel</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Desktop Sidebar — Red-tinted admin */}
      <aside className="hidden md:flex flex-col w-[240px] fixed inset-y-0 left-0 bg-[#0E0808] border-r border-[var(--acade-danger)]/15 z-40 overflow-y-auto">
        <div className="p-6">
          {/* Admin Identity Header */}
          <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-[#1A0A0A] border border-[var(--acade-danger)]/20">
            <div className="size-10 rounded-lg bg-[var(--acade-danger)]/10 flex items-center justify-center shrink-0">
              <Shield size={22} className="text-[var(--acade-danger)]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-danger)] font-[family-name:var(--font-bricolage)]">
                Admin Panel
              </span>
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] truncate">
                AcadeGrade v2
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {ADMIN_TABS.map((tab) => {
              const active = isActive(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]",
                    active
                      ? "bg-[var(--acade-danger)]/10 text-[var(--acade-danger)] border border-[var(--acade-danger)]/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                      : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
                  )}
                >
                  <Icon size={20} className={active ? "text-[var(--acade-danger)]" : ""} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer — email + sign out */}
        <div className="mt-auto p-6 flex flex-col gap-2">
          <div className="px-3 py-2 rounded-lg bg-[var(--acade-overlay)]/30 text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] truncate text-center">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] text-left w-full"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[240px] relative min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8 w-full h-full">
          {children}
        </div>
      </main>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} isAdmin={true} />
    </div>
  );
}

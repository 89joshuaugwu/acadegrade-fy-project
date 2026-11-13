'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdvertisingSections } from '@/components/admin/ads/AdvertisingSections';
import { useUrlTab } from '@/components/admin/useUrlTab';
import { AccessSettings, type AccessValues } from '@/components/admin/settings/AccessSettings';
import { AnnouncementSettings } from '@/components/admin/settings/AnnouncementSettings';
import { PublicSiteSettings, type AppLinks } from '@/components/admin/settings/PublicSiteSettings';
import { AdvancedSettings } from '@/components/admin/settings/AdvancedSettings';
import { EmailSettings } from '@/components/admin/email/EmailSettings';
import { ADMIN_HELP_TABS, type SettingsTab } from '@/lib/help/admin-help';

interface StoredSettings {
  announcementBanner?: string | null;
  maintenanceMode?: boolean;
  disableSignups?: boolean;
  disabledFeatures?: string[];
  ageGate?: { enforceUnknown?: boolean };
  mobileAppLinks?: { androidUrl?: string; iosUrl?: string };
  admobAndroidAppId?: string;
}

/** Pre-filled as before so saving the public links never blanks the Android download. */
const DEFAULT_ANDROID_DOWNLOAD_URL = 'https://github.com/89joshuaugwu/AcadeGrade-APK/releases/download/v1.0.0/acadegrade.apk';

const TABS = ADMIN_HELP_TABS['/admin/settings'];
const TAB_LABELS: Record<SettingsTab, string> = {
  access: 'Access',
  announcements: 'Announcements',
  'public-site': 'Public site',
  email: 'Email',
  advanced: 'Advanced',
};

function SettingsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useUrlTab<SettingsTab>(TABS, 'access');
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Settings request failed.');
      const data = await response.json() as { settings?: StoredSettings };
      setSettings(data.settings ?? {});
    } catch (error) {
      console.error(error);
      // Defaults must never be offered for saving over settings that failed to load.
      setLoadError('The settings service did not respond. Nothing has been changed.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const header = (
    <AdminPageHeader
      title="Settings"
      description="Who can use AcadeGrade, announcements, the public site, email and reference settings. Each tab saves on its own."
      helpId={`admin.settings.${tab}`}
    />
  );

  if (loadError) {
    return (
      <div className="max-w-4xl space-y-8">
        {header}
        <ErrorState title="Settings could not be loaded" description={loadError} onRetry={() => { void loadSettings(); }} />
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="max-w-4xl space-y-6">
        {header}
        <div role="status" aria-label="Loading settings" aria-busy="true" className="space-y-4">
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const access: AccessValues = {
    maintenanceMode: settings.maintenanceMode === true,
    disableSignups: settings.disableSignups === true,
    disabledFeatures: Array.isArray(settings.disabledFeatures) ? settings.disabledFeatures : [],
    ageGateEnforce: typeof settings.ageGate?.enforceUnknown === 'boolean' ? settings.ageGate.enforceUnknown : true,
  };
  const links: AppLinks = {
    androidUrl: settings.mobileAppLinks?.androidUrl || DEFAULT_ANDROID_DOWNLOAD_URL,
    iosUrl: settings.mobileAppLinks?.iosUrl || '',
  };

  const content: Record<SettingsTab, React.ReactNode> = {
    access: <AccessSettings initial={access} getToken={getToken} />,
    announcements: <AnnouncementSettings initial={settings.announcementBanner ?? ''} getToken={getToken} />,
    'public-site': <PublicSiteSettings initialLinks={links} initialAdmobAppId={typeof settings.admobAndroidAppId === 'string' ? settings.admobAndroidAppId : ''} getToken={getToken} />,
    email: <EmailSettings />,
    advanced: <AdvancedSettings />,
  };

  return (
    <div className="max-w-4xl space-y-6">
      {header}
      {/* Panels stay mounted while hidden, so unsaved drafts survive tab switches. */}
      <AdvertisingSections
        id="settings"
        label="Settings sections"
        selectedId={tab}
        onSelect={(id) => setTab(id as SettingsTab)}
        sections={TABS.map((id) => ({ id, label: TAB_LABELS[id], content: content[id] }))}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading settings" aria-busy="true"><Skeleton className="h-64" /></div>}>
      <SettingsScreen />
    </Suspense>
  );
}

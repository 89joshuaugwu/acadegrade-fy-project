'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { subscribeToDocument } from '@/lib/firebase/firestore';

const ANDROID_DOWNLOAD_PATH = '/app/download/android';
const IOS_DOWNLOAD_PATH = '/app/download/ios';

interface MobileAppLinks {
  androidUrl?: string;
  iosUrl?: string;
}

interface MobileAppDownloadProps {
  compact?: boolean;
  className?: string;
}

/** A live, admin-configurable Android/iOS install call-to-action. */
export function MobileAppDownload({ compact = false, className }: MobileAppDownloadProps) {
  const [links, setLinks] = useState<MobileAppLinks>({});

  useEffect(() => subscribeToDocument<{ mobileAppLinks?: MobileAppLinks }>('config/settings', (settings) => {
    setLinks({
      androidUrl: settings?.mobileAppLinks?.androidUrl?.trim() || '',
      iosUrl: settings?.mobileAppLinks?.iosUrl?.trim() || '',
    });
  }), []);

  if (compact) {
    return (
      <div className={cn('flex items-center justify-center gap-2 text-[length:var(--text-xs)]', className)}>
        <a href={ANDROID_DOWNLOAD_PATH} className="inline-flex items-center gap-1.5 font-semibold text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] transition-colors">
          <Smartphone size={14} /> Get the Android app
        </a>
        <span className="text-[var(--acade-text-faint)]">•</span>
        {links.iosUrl ? (
          <a href={IOS_DOWNLOAD_PATH} className="font-medium text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors">iOS</a>
        ) : (
          <span className="text-[var(--acade-text-faint)]">iOS coming soon</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3', className)}>
      <a href={ANDROID_DOWNLOAD_PATH} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--acade-primary)] px-5 text-[length:var(--text-sm)] font-bold text-white shadow-lg shadow-[var(--acade-primary)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--acade-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)] focus:ring-offset-2 focus:ring-offset-[var(--acade-background)]">
        <Download size={18} className="transition-transform group-hover:translate-y-0.5" /> Download for Android
      </a>
      {links.iosUrl ? (
        <a href={IOS_DOWNLOAD_PATH} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-5 text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-deep)]">
          <Smartphone size={18} /> Download for iOS
        </a>
      ) : (
        <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--acade-border)] bg-[var(--acade-surface)]/60 px-5 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-faint)]" aria-label="iOS app coming soon">
          <Smartphone size={18} /> iOS coming soon
        </span>
      )}
    </div>
  );
}

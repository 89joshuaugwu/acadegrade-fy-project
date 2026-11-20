'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { useAuth } from '@/hooks/useAuth';

export function PWABanner() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed the banner
      if (localStorage.getItem('pwa_banner_dismissed') !== 'true' && user) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also check if app is already installed
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [user]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          role="region"
          aria-label="Install AcadeGrade"
          // Solid surface (the old --acade-card/--acade-muted tokens did not exist, so it was see-through);
          // on phones it sits above the bottom tab bar instead of covering it.
          className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-50 bg-[var(--acade-surface)] border border-[var(--acade-border)] shadow-[var(--shadow-popover,0_18px_50px_-20px_rgba(14,11,43,0.45))] rounded-[20px] p-4 flex items-start gap-4"
        >
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--acade-text)] flex items-center gap-2">
              <Download size={18} className="text-[var(--acade-primary)]" aria-hidden="true" />
              Install AcadeGrade
            </h3>
            <p className="text-sm text-[var(--acade-text-muted)] mt-1">
              Add AcadeGrade to your home screen so it opens like an app.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstallClick} className="flex-1">
                Install
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss} className="px-3">
                Later
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close install suggestion"
            className="grid size-9 place-items-center rounded-lg text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

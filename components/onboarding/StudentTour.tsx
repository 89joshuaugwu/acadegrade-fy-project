'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useProfile } from '@/hooks/useProfile';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Position = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: Position;
  interactive?: boolean;
}

export function StudentTour() {
  const { profile, completeTour } = useProfile();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  
  // Show tour if profile is loaded, tourCompleted is falsy, and we are on the dashboard
  const showTour = profile !== null && profile.tourCompleted !== true && pathname === '/dashboard';

  useEffect(() => {
    setIsClient(true);
    setWindowWidth(window.innerWidth);
  }, []);

  const TOUR_STEPS: TourStep[] = useMemo(() => {
    const isDesktop = windowWidth >= 1024;
    const baseSteps: TourStep[] = [
      { targetId: 'tour-welcome', title: 'Welcome to AcadeGrade!', description: "Let's take a quick tour to help you get the most out of your academic dashboard.", position: 'center' },
      { targetId: 'tour-cgpa-arc', title: 'Your Performance at a Glance', description: 'This arc displays your primary academic metrics. The outer ring represents your active metric, and the inner ring shows the secondary one.', position: 'left' },
      { targetId: 'tour-metrics-toggle', title: 'Dual Metric System', description: 'Toggle between your official CGPA (letter-graded) and Performance Index (PI) which measures your raw weighted percentage score.', position: 'bottom' },
      { targetId: 'tour-quick-stats', title: 'Quick Stats', description: 'Keep an eye on your total credits, current semester performance, and immediately spot if you have any courses at risk.', position: 'top' },
    ];

    if (windowWidth === 0) return baseSteps;

    if (isDesktop) {
      baseSteps.push(
        { targetId: 'tour-desktop-nav-dashboard', title: 'Dashboard', description: 'Your home base for all academic metrics.', position: 'right' },
        { targetId: 'tour-desktop-nav-results', title: 'Results', description: 'Add and manage your semester results here.', position: 'right' },
        { targetId: 'tour-desktop-nav-insights', title: 'Insights', description: 'Check Insights for AI-powered analysis of your academic trajectory.', position: 'right' },
        { targetId: 'tour-desktop-nav-transcript', title: 'Transcript', description: 'View and export your complete academic history.', position: 'right' },
        { targetId: 'tour-desktop-nav-notifications', title: 'Notifications', description: 'Stay updated on important announcements.', position: 'right' },
        { targetId: 'tour-desktop-nav-settings', title: 'Settings', description: 'Customize your profile and preferences.', position: 'right' },
        { targetId: 'tour-desktop-nav-logout', title: 'Sign Out', description: 'Securely log out when you are done. You are all set!', position: 'right' }
      );
    } else {
      baseSteps.push(
        { targetId: 'tour-mobile-nav-dashboard', title: 'Dashboard', description: 'Your home base.', position: 'top' },
        { targetId: 'tour-mobile-nav-results', title: 'Results', description: 'Add and manage your semester results.', position: 'top' },
        { targetId: 'tour-mobile-nav-insights', title: 'Insights', description: 'AI-powered academic insights.', position: 'top' },
        { targetId: 'tour-mobile-nav-transcript', title: 'Transcript', description: 'Full academic history.', position: 'top' },
        { targetId: 'tour-mobile-hamburger-btn', title: 'More Options', description: 'Click the Menu icon to access your notifications and settings.', position: 'bottom', interactive: true },
        { targetId: 'tour-mobile-nav-notifications', title: 'Notifications', description: 'Stay updated on important announcements.', position: 'bottom' },
        { targetId: 'tour-mobile-nav-settings', title: 'Settings', description: 'Customize your profile and preferences.', position: 'bottom' },
        { targetId: 'tour-mobile-nav-logout', title: 'Sign Out', description: 'Securely log out when you are done. You are all set!', position: 'top' }
      );
    }
    return baseSteps;
  }, [windowWidth]);

  // Handle interactive clicks
  useEffect(() => {
    if (!showTour || !isClient || !TOUR_STEPS.length) return;
    const step = TOUR_STEPS[currentStep];
    
    if (step?.interactive) {
      const element = document.getElementById(step.targetId);
      if (element) {
        const handleClick = () => {
          if (currentStep === TOUR_STEPS.length - 1) {
            completeTour();
          } else {
            setCurrentStep((s) => s + 1);
          }
        };
        element.addEventListener('click', handleClick);
        return () => element.removeEventListener('click', handleClick);
      }
    }
  }, [currentStep, showTour, isClient, TOUR_STEPS, completeTour]);

  // Scroll to target when step changes
  useEffect(() => {
    if (!showTour || !isClient) return;
    const step = TOUR_STEPS[currentStep];
    if (step.position !== 'center') {
      // Add a tiny delay to ensure element is mounted
      setTimeout(() => {
        const element = document.getElementById(step.targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [currentStep, showTour, isClient]);

  useEffect(() => {
    if (!showTour) return;

    const updateRect = () => {
      setWindowWidth(window.innerWidth);
      const step = TOUR_STEPS[currentStep];
      if (step.position === 'center') {
        setTargetRect(null);
        return;
      }
      
      const element = document.getElementById(step.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Initial update
    // Add a slight delay to allow elements to mount/animate in
    const timer = setTimeout(updateRect, 300);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const interval = setInterval(updateRect, 1000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [currentStep, showTour]);

  if (!isClient || !showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  // Calculate tooltip position based on targetRect
  let tooltipStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
  };
  let transform = { x: "-50%", y: "-50%" };

  if (targetRect && step.position !== 'center') {
    const spacing = 16;
    const tooltipWidth = 320;
    const padding = 16;
    
    let resolvedPosition = step.position;
    // On mobile screens, force top/bottom positioning because left/right will overflow
    if (windowWidth < 768 && (resolvedPosition === 'left' || resolvedPosition === 'right')) {
      resolvedPosition = targetRect.top > window.innerHeight / 2 ? 'top' : 'bottom';
    }

    // Calculate clamped left position for top/bottom to prevent horizontal overflow
    const targetCenterLeft = targetRect.left + targetRect.width / 2;
    const maxLeft = windowWidth - padding - tooltipWidth / 2;
    const minLeft = padding + tooltipWidth / 2;
    const clampedLeft = Math.max(minLeft, Math.min(targetCenterLeft, maxLeft));

    switch (resolvedPosition) {
      case 'bottom': {
        const topPos = targetRect.bottom + spacing;
        tooltipStyle = {
          top: topPos,
          left: clampedLeft,
        };
        transform = { x: "-50%", y: "0%" };
        // If bottom overflows window, flip to top
        if (topPos > window.innerHeight - 200) {
           tooltipStyle.top = targetRect.top - spacing;
           transform = { x: "-50%", y: "-100%" };
        }
        break;
      }
      case 'top': {
        const topPos = targetRect.top - spacing;
        tooltipStyle = {
          top: topPos,
          left: clampedLeft,
        };
        transform = { x: "-50%", y: "-100%" };
        // If top overflows window, flip to bottom
        if (topPos < 100) {
           tooltipStyle.top = targetRect.bottom + spacing;
           transform = { x: "-50%", y: "0%" };
        }
        break;
      }
      case 'left':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - spacing,
        };
        transform = { x: "-100%", y: "-50%" };
        break;
      case 'right':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + spacing,
        };
        transform = { x: "0%", y: "-50%" };
        break;
    }
  }

  return (
    <AnimatePresence>
      {showTour && TOUR_STEPS.length > 0 && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {/* Full screen backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 transition-colors duration-500"
            style={
              step.position === 'center'
                ? { backgroundColor: 'rgba(7, 9, 15, 0.8)', backdropFilter: 'blur(4px)' }
                : { pointerEvents: 'none' } // Let clicks pass through the dimmed area
            }
          >
            {/* Spotlight Cutout via Box Shadow */}
            {targetRect && step.position !== 'center' && (
              <div 
                className="absolute transition-all duration-500 ease-in-out border-2 border-[var(--acade-primary)]/80 pointer-events-none"
                style={{
                  top: targetRect.top - 8,
                  left: targetRect.left - 8,
                  width: targetRect.width + 16,
                  height: targetRect.height + 16,
                  borderRadius: '16px',
                  boxShadow: '0 0 0 9999px rgba(7, 9, 15, 0.8), 0 0 20px var(--acade-primary-glow) inset, 0 0 30px var(--acade-primary-glow)'
                }}
              />
            )}
          </motion.div>

          {/* Tooltip Card */}
          <motion.div
            key={`${pathname}-${currentStep}`}
            initial={{ opacity: 0, scale: 0.9, ...transform }}
            animate={{ opacity: 1, scale: 1, ...transform }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute z-[101] w-[320px] max-w-[calc(100vw-32px)] bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            style={tooltipStyle}
          >
            {/* Progress bar */}
            <div className="h-1 w-full bg-[var(--acade-deep)]">
              <motion.div 
                className="h-full bg-[var(--acade-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {step.position === 'center' && <Sparkles className="text-[var(--acade-gold)] w-5 h-5" />}
                  <h3 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] leading-tight">
                    {step.title}
                  </h3>
                </div>
                <button 
                  onClick={handleSkip}
                  className="text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors p-1 -mr-1 -mt-1"
                  aria-label="Skip tour"
                >
                  <X size={16} />
                </button>
              </div>
              
              <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] leading-relaxed font-[family-name:var(--font-dm-sans)] mb-6">
                {step.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-geist-mono)]">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className="px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
                  >
                    Skip
                  </button>
                  {!step.interactive && (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 bg-[var(--acade-primary)] hover:bg-[var(--acade-primary-hover)] text-white px-4 py-1.5 rounded-lg text-[length:var(--text-sm)] font-medium transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    >
                      {isLastStep ? 'Finish' : 'Next'}
                      {!isLastStep && <ChevronRight size={16} className="-mr-1" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

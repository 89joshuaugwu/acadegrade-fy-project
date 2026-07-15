'use client';

import { useState, useEffect } from 'react';
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
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-grade-table',
    title: 'Manual Entry',
    description: "You can manually enter your courses, units, and scores here. The table will automatically calculate your GPA and PI.",
    position: 'top',
  },
  {
    targetId: 'tour-import-slip',
    title: 'AI Result Extraction',
    description: 'Save time by importing your result slip! Click this button to upload a PDF or image, and our AI will extract all courses and scores instantly.',
    position: 'bottom',
  },
  {
    targetId: 'tour-share-code',
    title: 'Share Course List',
    description: 'Share your course list with classmates using a unique 6-character code. (Scores are kept private).',
    position: 'bottom',
  },
  {
    targetId: 'tour-import-code',
    title: 'Import Courses',
    description: 'Got a code from a friend? Import their course list instantly so you don\'t have to type them out again!',
    position: 'bottom',
  },
];

export function ResultsTour() {
  const { profile, completeResultsTour } = useProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  
  // Show tour if profile is loaded and resultsTourCompleted is falsy
  const showTour = profile !== null && profile.resultsTourCompleted !== true;

  useEffect(() => {
    setIsClient(true);
    setWindowWidth(window.innerWidth);
  }, []);

  // Scroll to target when step changes
  useEffect(() => {
    if (!showTour || !isClient) return;
    const step = TOUR_STEPS[currentStep];
    if (step.position !== 'center') {
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
      completeResultsTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    completeResultsTour();
  };

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
    if (windowWidth < 768 && (resolvedPosition === 'left' || resolvedPosition === 'right')) {
      resolvedPosition = targetRect.top > window.innerHeight / 2 ? 'top' : 'bottom';
    }

    const targetCenterLeft = targetRect.left + targetRect.width / 2;
    const maxLeft = windowWidth - padding - tooltipWidth / 2;
    const minLeft = padding + tooltipWidth / 2;
    const clampedLeft = Math.max(minLeft, Math.min(targetCenterLeft, maxLeft));

    switch (resolvedPosition) {
      case 'bottom': {
        const topPos = targetRect.bottom + spacing;
        tooltipStyle = { top: topPos, left: clampedLeft };
        transform = { x: "-50%", y: "0%" };
        if (topPos > window.innerHeight - 200) {
           tooltipStyle.top = targetRect.top - spacing;
           transform = { x: "-50%", y: "-100%" };
        }
        break;
      }
      case 'top': {
        const topPos = targetRect.top - spacing;
        tooltipStyle = { top: topPos, left: clampedLeft };
        transform = { x: "-50%", y: "-100%" };
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
      {showTour && (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
          {/* Full screen backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 transition-colors duration-500"
            style={
              step.position === 'center'
                ? { backgroundColor: 'rgba(7, 9, 15, 0.8)', backdropFilter: 'blur(4px)' }
                : { pointerEvents: 'none' }
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
            initial={{ opacity: 0, scale: 0.9, ...transform }}
            animate={{ opacity: 1, scale: 1, ...transform }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute z-[101] w-[320px] max-w-[calc(100vw-32px)] bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[var(--acade-primary)]/10 text-[var(--acade-primary)] rounded-lg">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                    {step.title}
                  </h3>
                </div>
                <button 
                  onClick={handleSkip}
                  className="text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mb-6 leading-relaxed">
                {step.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--acade-text-faint)] font-[family-name:var(--font-geist-mono)]">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkip}
                    className="text-xs font-medium text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors px-3 py-2"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 bg-[var(--acade-primary)] hover:bg-[var(--acade-primary-hover)] text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_var(--acade-primary-glow)] hover:shadow-[0_0_25px_var(--acade-primary-glow)]"
                  >
                    {isLastStep ? 'Finish' : 'Next'}
                    {!isLastStep && <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

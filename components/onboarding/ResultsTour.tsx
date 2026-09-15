'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { ProductTour, type ProductTourStep } from './ProductTour';

const RESULTS_TOUR_VERSION = 1;

export function ResultsTour() {
  const pathname = usePathname();
  const { profile, completeProductTour } = useProfile();

  const steps = useMemo<readonly ProductTourStep[]>(() => {
    if (pathname === '/results') {
      return [{
        targetId: 'tour-new-semester',
        title: 'Start a semester record',
        description: 'Create the semester first. You will review its details before adding or importing courses.',
        position: 'bottom',
      }];
    }
    if (pathname === '/results/new') {
      return [{
        targetId: 'tour-create-semester',
        title: 'Confirm the semester details',
        description: 'Choose the level, session, and semester, then create the blank record. Nothing is marked complete until you save valid results.',
        position: 'top',
      }];
    }
    if (pathname?.startsWith('/results/')) {
      return [
        {
          targetId: 'tour-grade-table',
          title: 'Review every course before saving',
          description: 'Enter CA and exam scores or switch to letter-grade mode. Awaiting results remain separate from real zero scores.',
          position: 'top',
        },
        {
          targetId: 'tour-import-slip',
          title: 'Scan a result slip with AI',
          description: 'Upload an image or PDF to extract courses, then check the preview before anything is applied to your semester.',
          position: 'bottom',
        },
        {
          targetId: 'tour-import-code',
          title: 'Reuse a shared course list',
          description: 'Import course codes and titles from a classmate. Scores are never included in the shared code.',
          position: 'bottom',
        },
        {
          targetId: 'tour-share-code',
          title: 'Share courses without grades',
          description: 'Generate a short code for this course list. Review the scope before sharing it.',
          position: 'bottom',
        },
      ];
    }
    return [];
  }, [pathname]);

  if (!profile) return null;

  return (
    <ProductTour
      tourId="results"
      version={RESULTS_TOUR_VERSION}
      eligible={steps.length > 0}
      completedVersion={profile.tourVersions?.results}
      legacyCompleted={profile.resultsTourCompleted === true}
      steps={steps}
      onComplete={(tourId, version) => completeProductTour(tourId, version, 'resultsTourCompleted')}
    />
  );
}

'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { ProductTour, type ProductTourStep } from './ProductTour';

const DASHBOARD_TOUR_VERSION = 1;

export function StudentTour() {
  const pathname = usePathname();
  const { profile, completeProductTour } = useProfile();

  const steps = useMemo<readonly ProductTourStep[]>(() => [
    {
      title: 'Welcome to your academic workspace',
      description: 'This short tour shows where your standing, latest updates, and main tools live. You can skip it at any time.',
      position: 'center',
    },
    {
      targetId: 'tour-cgpa-arc',
      title: 'See where you stand',
      description: 'Your primary metric summarizes your saved record. Switch between CGPA and PI without changing the underlying results.',
      position: 'left',
    },
    {
      targetId: 'tour-metrics-toggle',
      title: 'Choose the metric you want first',
      description: 'CGPA follows letter-grade points. PI reflects weighted raw scores where those scores are available.',
      position: 'bottom',
    },
    {
      targetId: 'tour-quick-stats',
      title: 'Review the important signals',
      description: 'Credits, course count, and attention items are kept together so you can decide what to inspect next.',
      position: 'top',
    },
    {
      targetId: 'tour-desktop-nav-results',
      title: 'Your record starts in Results',
      description: 'Create semesters, add courses, scan a result slip, and review saved grades from the Results workspace.',
      position: 'right',
    },
    {
      targetId: 'tour-mobile-nav-results',
      title: 'Your record starts in Results',
      description: 'Create semesters, add courses, scan a result slip, and review saved grades from the Results tab.',
      position: 'top',
    },
  ], []);

  if (!profile) return null;

  return (
    <ProductTour
      tourId="dashboard"
      version={DASHBOARD_TOUR_VERSION}
      eligible={pathname === '/dashboard'}
      completedVersion={profile.tourVersions?.dashboard}
      legacyCompleted={profile.tourCompleted === true}
      steps={steps}
      onComplete={(tourId, version) => completeProductTour(tourId, version, 'tourCompleted')}
    />
  );
}

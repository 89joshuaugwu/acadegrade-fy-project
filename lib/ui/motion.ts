export const motionDurations = {
  instant: 0,
  fast: 0.1,
  panel: 0.16,
  route: 0.22,
  complete: 0.26,
} as const;

export const navigationSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 30,
  mass: 0.8,
};

export const sheetSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 30,
  mass: 0.9,
};

export const disclosureSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 34,
};

export const routeEntry = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionDurations.route, ease: [0.22, 1, 0.36, 1] as const },
};

export const tabPanelEntry = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionDurations.panel, ease: [0.22, 1, 0.36, 1] as const },
};

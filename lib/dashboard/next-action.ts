export interface DashboardNextActionInput {
  hasAcademicData: boolean;
  atRiskCount: number;
  unknownCount: number;
  insightsStale: boolean;
}

export interface DashboardNextAction {
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  href: string;
  tone: 'primary' | 'warning' | 'info';
}

export function getDashboardNextAction(input: DashboardNextActionInput): DashboardNextAction {
  if (!input.hasAcademicData) {
    return {
      eyebrow: 'Start here',
      title: 'Build your academic record',
      description: 'Add your first semester so AcadeGrade can calculate your standing and track your trajectory.',
      label: 'Add first semester',
      href: '/results/new',
      tone: 'primary',
    };
  }

  if (input.atRiskCount > 0) {
    return {
      eyebrow: 'Needs attention',
      title: `${input.atRiskCount} ${input.atRiskCount === 1 ? 'course is' : 'courses are'} below the current pass threshold`,
      description: 'Review the recorded scores and focus your next study plan on the courses that can move your standing most.',
      label: 'Review flagged courses',
      href: '/results',
      tone: 'warning',
    };
  }

  if (input.unknownCount > 0) {
    return {
      eyebrow: 'Record incomplete',
      title: `${input.unknownCount} ${input.unknownCount === 1 ? 'course needs' : 'courses need'} a score or grade`,
      description: 'Complete the missing records before treating the current academic summary as final.',
      label: 'Complete pending scores',
      href: '/results',
      tone: 'info',
    };
  }

  if (input.insightsStale) {
    return {
      eyebrow: 'Outlook ready to refresh',
      title: 'Bring your AI insight up to date',
      description: 'Your academic record has changed since the last analysis. Refresh it for recommendations based on your latest results.',
      label: 'Refresh AI insight',
      href: '/insights',
      tone: 'info',
    };
  }

  return {
    eyebrow: 'You are up to date',
    title: 'Plan what comes next',
    description: 'Use your current trend and what-if tools to set a realistic target for the next semester.',
    label: 'Plan with insights',
    href: '/insights',
    tone: 'primary',
  };
}

import { format as dateFnsFormat } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

/**
 * Format a GPA/CGPA/PI value to 2 decimal places
 */
export function formatGPA(value: number): string {
  return value.toFixed(2);
}

/**
 * Format a Firestore Timestamp or Date to a readable string
 */
export function formatDate(
  date: Timestamp | Date | string,
  pattern: string = 'dd MMM yyyy'
): string {
  if (date instanceof Timestamp) {
    return dateFnsFormat(date.toDate(), pattern);
  }
  if (date instanceof Date) {
    return dateFnsFormat(date, pattern);
  }
  return dateFnsFormat(new Date(date), pattern);
}

/**
 * Format credit units with label
 */
export function formatCredits(units: number): string {
  return `${units} unit${units !== 1 ? 's' : ''}`;
}

/**
 * Format a score value (integer)
 */
export function formatScore(score: number | null): string {
  if (score === null) return '—';
  return Math.round(score).toString();
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format semester label from level and semester number
 */
export function formatSemesterLabel(
  level: number,
  semester: 1 | 2
): string {
  return `${level}L ${semester === 1 ? 'First' : 'Second'} Semester`;
}

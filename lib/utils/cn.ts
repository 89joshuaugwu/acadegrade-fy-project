/**
 * Merge class names with conditional support.
 * Lightweight alternative to clsx + twMerge — no external dependency needed.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

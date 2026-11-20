/**
 * Words for where the maintenance page will return the visitor
 * (maintenance.md §5.4). Takes a path already checked with safeNextPath().
 */
export function returnPlaceLabel(next: string): string {
  const path = (next.split(/[?#]/)[0] || '/').toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/') return 'the home page';
  if (path === '/dashboard') return 'your dashboard';
  if (path === '/login') return 'sign in';
  if (path === '/register') return 'registration';
  return 'where you were';
}

/** "14:32" in the visitor's clock. */
export function formatCheckedTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

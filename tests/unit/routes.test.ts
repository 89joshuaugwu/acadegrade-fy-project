import { describe, expect, it } from 'vitest';
import { getRouteMeta, isRouteActive } from '@/lib/ui/route-meta';

describe('route metadata', () => {
  it('keeps Results active on a semester detail without changing its destination', () => {
    expect(isRouteActive('/results/semester-123', '/results')).toBe(true);
    expect(getRouteMeta('/results/semester-123')).toMatchObject({
      title: 'Semester result',
      parentHref: '/results',
    });
  });

  it('does not treat dashboard as the parent of every student route', () => {
    expect(isRouteActive('/insights', '/dashboard')).toBe(false);
    expect(isRouteActive('/dashboard', '/dashboard')).toBe(true);
  });

  it('matches nested admin routes to their owning section', () => {
    expect(isRouteActive('/admin/users/student-1', '/admin/users')).toBe(true);
    expect(isRouteActive('/admin/users', '/admin/dashboard')).toBe(false);
  });
});

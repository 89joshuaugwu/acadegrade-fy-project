import { describe, expect, it } from 'vitest';
import { getRouteMeta, isRouteActive } from '@/lib/ui/route-meta';
import { render, screen } from '@testing-library/react';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';

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

  it('identifies the advertising control plane as its own admin destination', () => {
    expect(isRouteActive('/admin/ads', '/admin/ads')).toBe(true);
    expect(getRouteMeta('/admin/ads')).toEqual({ title: 'Advertising' });
  });
});

describe('RouteAnnouncer', () => {
  it('announces the current route title without becoming visible content', () => {
    render(<RouteAnnouncer title="Semester result" />);
    expect(screen.getByRole('status')).toHaveTextContent('Semester result');
    expect(screen.getByRole('status')).toHaveClass('sr-only');
  });
});

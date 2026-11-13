import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_HELP, ADMIN_HELP_TABS, adminHelp, adminHelpIdFor } from '@/lib/help/admin-help';
import { ADMIN_NAV_GROUPS } from '@/components/admin/navigation';

const adminDir = path.resolve(import.meta.dirname, '../../app/(admin)/admin');

/** Every `/admin/<segment>` that has its own page, except sign-in. */
function adminRoutes() {
  return readdirSync(adminDir)
    .filter((name) => statSync(path.join(adminDir, name)).isDirectory())
    .filter((name) => name !== 'login')
    .filter((name) => readdirSync(path.join(adminDir, name)).includes('page.tsx'))
    .map((name) => `/admin/${name}`);
}

describe('admin help content', () => {
  it('has an entry for every admin route', () => {
    const routes = adminRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(12);
    for (const route of routes) {
      const id = adminHelpIdFor(route);
      expect(id, route).toBeTruthy();
      expect(ADMIN_HELP[id!], route).toBeDefined();
    }
  });

  it('has an entry for every tab of the tabbed pages', () => {
    for (const [route, tabs] of Object.entries(ADMIN_HELP_TABS)) {
      for (const tab of tabs) {
        const id = adminHelpIdFor(route, tab);
        expect(ADMIN_HELP[id!], `${route}?tab=${tab}`).toBeDefined();
        expect(adminHelp.hrefFor(id!)).toBe(`${route}?tab=${tab}`);
      }
    }
    expect(ADMIN_HELP_TABS['/admin/settings']).toEqual(['access', 'announcements', 'public-site', 'email', 'advanced']);
    expect(ADMIN_HELP_TABS['/admin/ads']).toEqual(['status', 'house', 'networks', 'admob']);
  });

  it('covers every navigation destination', () => {
    for (const item of ADMIN_NAV_GROUPS.flatMap((group) => group.items)) {
      expect(adminHelpIdFor(item.href), item.href).toBeTruthy();
    }
  });

  it('keeps entries within the content limits and links only to real entries', () => {
    for (const [id, entry] of Object.entries(ADMIN_HELP)) {
      expect(entry.id).toBe(id);
      expect(entry.audience).toBe('admin');
      expect(entry.title.length, id).toBeLessThanOrEqual(40);
      expect(entry.summary.trim().length, id).toBeGreaterThan(0);
      expect(entry.terms?.length ?? 0, id).toBeLessThanOrEqual(8);
      expect(entry.tasks?.length ?? 0, id).toBeLessThanOrEqual(5);
      expect(entry.cautions?.length ?? 0, id).toBeLessThanOrEqual(4);
      expect(entry.related?.length ?? 0, id).toBeLessThanOrEqual(5);
      for (const task of entry.tasks ?? []) {
        expect(task.steps.length, `${id}: ${task.title}`).toBeGreaterThan(0);
        expect(task.steps.length, `${id}: ${task.title}`).toBeLessThanOrEqual(7);
      }
      for (const link of entry.related ?? []) {
        if (typeof link.to === 'string') {
          expect((ADMIN_HELP as Record<string, unknown>)[link.to], `${id} → ${link.to}`).toBeDefined();
          expect(adminHelp.hrefFor(link.to), `${id} → ${link.to}`).toMatch(/^\/admin\//);
        }
      }
    }
  });

  it('uses the binding copy for access controls and placeholders', () => {
    const access = JSON.stringify(ADMIN_HELP['admin.settings.access']);
    expect(access).toContain('Blocks the website, the Android app and student APIs. Admins can still sign in.');
    expect(access).toMatch(/Require age confirmation and AI consent for AI/);
    expect(access).toMatch(/Legal versions/);
    expect(JSON.stringify(ADMIN_HELP['admin.settings.advanced'])).toContain('Display only. Calculations use the standard 5-point scale; editable grading profiles are planned.');
    expect(JSON.stringify(ADMIN_HELP)).not.toMatch(/Reset (all onboarding|web tour flags)/i);
  });
});

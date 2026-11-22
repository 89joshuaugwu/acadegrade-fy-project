import type { ReactNode } from 'react';
import './public.css';
import { CookieStub } from '@/components/public/CookieStub';
import { MotionReady } from '@/components/public/MotionReady';
import { MotionScript } from '@/components/motion/MotionScript';
import { PublicChrome } from '@/components/public/PublicChrome';
import { SkipLink } from '@/components/public/SkipLink';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import '@/components/site/site.css';

/**
 * Layout for every route in app/(public).
 *
 * Shells (brand v2, docs/brand-v2/DESIGN.md):
 * - Public shell, the default: skip link, SiteHeader, <main id="content">,
 *   SiteFooter. Pages render only their sections, wrapped in .ag-site (no
 *   header, footer or <main> of their own).
 * - Auth shell (/login, /register, /forgot-password) and minimal shell
 *   (/share/*, /c/*): these routes live here too, so PublicChrome reads the
 *   pathname (components/public/shell-paths.ts) and renders the page alone.
 *   Those pages wrap themselves in AuthShell or MinimalShell from
 *   components/public/shells, which bring their own skip link and main.
 *   No route group moves, so no page owned by another lane changes path.
 *
 * Every public route gets the tokens (.public-root), the motion fail-safe
 * (MotionReady) and the cookie stub, which replaces the site-wide consent
 * panel on these pages with the same storage and logic.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-root">
      <MotionScript />
      <MotionReady />
      <PublicChrome
        header={
          <>
            <SkipLink />
            <SiteHeader />
          </>
        }
        footer={<SiteFooter />}
      >
        {children}
      </PublicChrome>
      <CookieStub />
    </div>
  );
}

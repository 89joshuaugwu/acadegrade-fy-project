'use client';

import '@/components/site/site.css';

/**
 * Loads the brand v2 helpers (site.css: the display face, focus ring, sky
 * gradient) from a client module. The root not-found route does not collect
 * stylesheets imported by server components, so the minimal shell renders
 * this to make sure the 404 gets them too. Renders nothing.
 */
export function SiteStyles() {
  return null;
}

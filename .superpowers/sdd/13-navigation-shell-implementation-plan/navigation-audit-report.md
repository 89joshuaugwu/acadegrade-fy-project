# Navigation audit report — AcadeGrade

**Scope.** Read-only audit of the public `Navbar`, student `StudentShell` / `BottomTabBar` / `MobileDrawer`, route metadata, the shared modal primitive, and representative public/student route layouts. No production or test file was changed.

**Evidence limit.** This run had no browser-capture surface, so findings are source-verified rather than screenshot-verified. Responsive rendering, actual focus order, and safe-area behavior still need device/browser checks.

## Findings

### 1. P1 — The public primary-nav anchors have no targets

`Navbar` sends **Features** to `/#features` and **How it works** to `/#how-it-works`, but there are no matching IDs in the public page or marketing components. From any route, both links navigate to the home URL without reaching the advertised section.

- Evidence: [components/layout/Navbar.tsx](../../components/layout/Navbar.tsx#L14-L15)
- Evidence: [app/(public)/page.tsx](../../app/(public)/page.tsx#L9-L45) contains the landing-page composition but no corresponding anchor targets; a source-wide ID search found none.
- Recommendation: add stable target IDs to the intended sections, or make these links point to dedicated routes. Add a route-level test for direct navigation from a non-home public page.

### 2. P2 — Public navigation never communicates the current location

The public navbar renders each link with identical styling and without `aria-current`; it does not read pathname or hash state. This leaves About and Calculator visually indistinguishable from inactive links, and it cannot report the active item to assistive technology. The same applies to the mobile-sheet links.

- Evidence: [components/layout/Navbar.tsx](../../components/layout/Navbar.tsx#L56-L65), [components/layout/Navbar.tsx](../../components/layout/Navbar.tsx#L99-L108)
- Contrast: the student shell and drawer consistently calculate active state with `isRouteActive` and set `aria-current`: [components/layout/StudentShell.tsx](../../components/layout/StudentShell.tsx#L149-L155), [components/layout/MobileDrawer.tsx](../../components/layout/MobileDrawer.tsx#L163-L175).
- Recommendation: derive pathname/hash state in `Navbar`, render an active treatment, and set `aria-current="page"` for route links. Define the home-anchor active-state rule explicitly.

### 3. P2 — Student primary navigation has three independent renderers

The same four destinations are rendered separately in the desktop rail, bottom tabs, and mobile drawer. They share the `studentNavigation` data and active-route helper, but each owns markup, icon mapping, badge behavior, sizing, labels, and motion. A later navigation change can therefore ship inconsistently across breakpoints; it already uses three different icon maps (`STUDENT_ICONS`, `TAB_ICONS`, and `ADMIN_ICONS`).

- Evidence: [components/layout/StudentShell.tsx](../../components/layout/StudentShell.tsx#L31-L37), [components/layout/StudentShell.tsx](../../components/layout/StudentShell.tsx#L149-L180)
- Evidence: [components/layout/BottomTabBar.tsx](../../components/layout/BottomTabBar.tsx#L11-L22), [components/layout/BottomTabBar.tsx](../../components/layout/BottomTabBar.tsx#L34-L77)
- Evidence: [components/layout/MobileDrawer.tsx](../../components/layout/MobileDrawer.tsx#L33-L46), [components/layout/MobileDrawer.tsx](../../components/layout/MobileDrawer.tsx#L105-L120)
- Recommendation: retain the shared navigation model and consolidate icon/label/badge semantics into one presentation-neutral item definition. Keep only viewport-specific layout wrappers.

### 4. P2 — Transcript overlays bypass the accessible modal/sheet system

The transcript’s share and delete overlays are plain fixed `div`s. Unlike the app’s `Modal`, they have no dialog semantics, focus placement/trap, Escape handling, scroll lock, or background inerting. When either is open, keyboard users can still tab into the student rail, mobile header, and bottom tab bar behind it, creating an obscured-navigation path.

- Evidence: [app/(student)/transcript/page.tsx](../../app/(student)/transcript/page.tsx#L299-L347), [app/(student)/transcript/page.tsx](../../app/(student)/transcript/page.tsx#L349-L385)
- Baseline available but not used: [components/ui/Modal.tsx](../../components/ui/Modal.tsx#L75-L141) provides focus management, Escape dismissal, scroll locking, and background inerting.
- Recommendation: migrate both overlays to `Modal` (or give the custom overlays equivalent behavior), then keyboard-test open, close, Escape, focus restoration, and attempted navigation behind the overlay.

## Confirmed safeguards

- Student content reserves `calc(5rem + safe-area-inset-bottom)` on mobile while the tab bar uses a 4rem content height plus the safe area, reducing ordinary bottom-bar obstruction: [components/layout/StudentShell.tsx](../../components/layout/StudentShell.tsx#L268-L268), [components/layout/BottomTabBar.tsx](../../components/layout/BottomTabBar.tsx#L31-L33).
- The shared `Sheet` delegates to the accessible `Modal`; the public and student drawers use it: [components/ui/Sheet.tsx](../../components/ui/Sheet.tsx#L23-L57), [components/layout/Navbar.tsx](../../components/layout/Navbar.tsx#L89-L126), [components/layout/MobileDrawer.tsx](../../components/layout/MobileDrawer.tsx#L69-L157).
- Student route titles are announced through a polite live region and active child routes remain associated with their parent destination: [components/shared/RouteAnnouncer.tsx](../../components/shared/RouteAnnouncer.tsx#L8-L20), [lib/ui/route-meta.ts](../../lib/ui/route-meta.ts#L39-L72).

## Verification notes

- `git status` before this report showed pre-existing modified production/test files and untracked planning files; they were not touched.
- The only intended artifact from this audit is this report.

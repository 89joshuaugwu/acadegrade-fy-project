# 03 · Motion and interaction

Motion makes the stationery feel handled: slips are laid down, sheets slide over each other, the meter reads. It is never decoration, and the page must look finished with every animation switched off.

## 1. Principles

- **Allowed properties:** transform and opacity only, never layout properties. Nothing animates while the visitor is trying to read it.
- **One loud moment per page** (its signature move). Everything else is quiet: entrances, feedback, the one moving picture.
- **Reduced motion and data saver:** `prefers-reduced-motion`, the app's data-saver flag and `navigator.connection.saveData` all keep the content and drop the travel. Crossfades become a single still; scroll-linked moves become static.
- **No idle loops:** no typewriters, no infinite gradient borders, no floating particles, no shimmer. The current typewriters (hero, about, auth) and the animated nav border are removed.
- **Fail safe:** content is visible by default and animated *from* a hidden state only once JavaScript has added the `pg-motion-ready` class to `<html>`. If the script fails, everything is visible.

## 2. Tokens (in `public.css`)

| Token | Value | Use |
|---|---|---|
| `--pg-dur-1` | 160ms | Press, hover, chevrons, underline thickness |
| `--pg-dur-2` | 320ms | Meter dot, menu sheet, number change, stub in |
| `--pg-dur-3` | 640ms | Section entrances, sheet slide, slip "laid down" |
| `--pg-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances and settles |
| `--pg-ease-paper` | `cubic-bezier(0.3, 0.7, 0.2, 1)` | Paper being placed: a small overshoot-free settle |
| Stagger | 70ms | Between the parts of one section: heading, sentence, object |
| Rise | 24px desktop, 16px phone | Entrance travel |

## 3. The layers

### 3.1 Signature move (site-wide): the slip is laid down

On the home hero the result slip arrives as paper placed on a desk:
- it rises 24px with opacity;
- its stripe band fills left to right, one step at a time, 60ms each (five steps);
- the course rows appear in order, 40ms apart;
- the foot bar lands last with the GPA figure.

Total under 900ms, once per visit (session storage). Other pages use a shorter version (rise and stripe only) for their first object.

### 3.2 Slow crossfade (home hero photograph)

The sticky campus photograph beside the slip changes between three or four real campus pictures:
- 1.6s crossfade, holding 6s each;
- paused while the tab is hidden or when the photograph is off-screen;
- only the first picture shows under reduced motion or data saver;
- frames after the first load only after the page is idle (`requestIdleCallback`).

### 3.3 Section entrances

Each section's parts enter in order (heading, sentence, then object) with a 70ms stagger, rising 24px with opacity over 640ms, triggered once at 15% visibility.
- Built with an `IntersectionObserver` in a tiny client helper (`components/public/Reveal.tsx`, about 1 KB) that toggles `data-revealed`.
- No library is needed. `motion` v12 is already installed for the few physics-based pieces (the reply card settle and meter tween) and may be used there only.

### 3.4 Stacking sheets (features section on home and `/features`)

- Each capability sheet is `position: sticky`, with top offsets rising 72px per sheet, so each new sheet slides over the last and leaves its title band showing.
- This is pure CSS, so it needs no JavaScript.
- It is checked with `scenes.mjs` at 0–100% of the hold, so no title is ever fully covered: unlike today's deck, which hides headings, the bands stay readable.

### 3.5 Reply card settle (CTA)

The rotated reply card enters from 40px lower with a 4° rotation and settles to 2° with a soft spring (`motion`, stiffness 120, damping 18). Under reduced motion it appears at 2° with a fade.

### 3.6 Live elements

- **Live slip (home), calculator and tools:**
  - Changed figures tween over 320ms (number interpolation; tabular figures stop the width jumping).
  - The meter dot travels along the arc.
  - When the class changes, its label swaps with a 160ms crossfade, and the polite live region announces it once the input settles.
- **GradeKeys:** the selected key fills with ink in 160ms; on press it scales to 0.97.

### 3.7 Feedback on every control

- **Buttons:** on hover the stripe band rises inside (160ms); on press, translateY 1px; focus shows the gold outline at once, without animating.
- **Text links:** the underline thickens from 2px to 3px.
- **Accordion:** the chevron rotates and the answer fades in (the height jump is native to `details`, so the fade is the only motion).
- **Menu sheet:** slides 24px with opacity (320ms).
- **Cookie stub:** slides up 16px with opacity once, after the first screen has painted (never during LCP).
- **Interface fragments:** a 2% scale on hover, desktop only, where the fragment is a link.

### 3.8 One moving picture

- The home showcase section shows the owner's real 6–10s screen recording of the scanner turning a slip into rows: muted, looping, with a poster frame and `preload="none"`, playing only when visible.
- Until the recording exists, the full-bleed lecture-hall photograph drifts slowly (scale 1.0 to 1.04 over the section's scroll, transform only).

## 4. Interaction rules

- **Touch and pointer:** every control works with touch, mouse and keyboard, in reading order. Hover-only reveals are not allowed.
- **Scroll:** no scroll hijacking and no smooth-scroll library. Anchor jumps use `scroll-behavior: smooth`, except under reduced motion, and offset by the header height (`scroll-margin-top`).
- **Forms:** validate on blur and on submit, never on every keystroke while typing (except the live calculators, which compute but do not shout errors).
- **External links:** none open in a new tab except PDFs and app-store or APK downloads, which say so ("Downloads the Android app, 45 MB").
- **Confirmation for destructive or irreversible actions:** used only where the product already has it; public pages rarely need it.

## 5. Checks

- `scenes.mjs` for the stacking sheets and the hero crossfade (desktop, phone, reduced motion): no covered headings at any point.
- `inspect.mjs` motion count: at least 8 moving elements on load and scroll on Persuade pages (home, features, Android app), and fewer on Read pages (legal, support), where motion is limited to entrances.
- Impeccable `animate` review on home and features before release.
- A manual check with reduced motion on and with data saver on, where both crossfade and video must stop.

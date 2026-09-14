# Motion, Responsive Layout, and Accessibility

## Motion Direction

Keep the lively, lightly bouncing response the user enjoys. Concentrate it where a person takes an action: selecting a tab, opening a sheet, changing a metric, or completing a phase. Reading and editing should remain spatially stable.

Create `lib/ui/motion.ts` as the single source of motion presets. Use `hooks/useReducedMotion.ts`; CSS animations must also respond to `prefers-reduced-motion`.

| Interaction | Normal motion | Reduced motion |
|---|---|---|
| Button press | scale 1 → .98 → 1, 100ms; only expressive controls | Color change only |
| Navigation/tab indicator | spring stiffness 420, damping 30, mass .8; slight overshoot only | Immediate placement |
| Tab panel | opacity + 6px translate, 160ms, max 40ms overlap | Opacity 80ms |
| Registration forward/back | new phase enters +16px/-16px according to direction; 220ms | Opacity 80ms |
| Route content | opacity + 8px translate, 220ms; shell persists | Immediate or opacity 80ms |
| Sheet | y 24px → 0, spring 360/30/.9; backdrop 160ms | Opacity 80ms |
| Desktop dialog | opacity + scale .98 → 1, 180ms | Opacity 80ms |
| Disclosure | measured height, spring 360/34, content opacity 140ms | Immediate height |
| Save/complete mark | single scale .9 → 1.04 → 1 over 260ms | Immediate check mark |
| Chart metric change | 240ms interpolation/crossfade; static axes where compatible | Immediate final data |
| Header seam | scroll-position-driven opacity and fade geometry | Same static geometry, immediate opacity |

No scroll hijacking, forced smooth scroll during input, route-wide blur, elastic tables, looping decorative pulses, or endlessly drawing charts. A named spinner may rotate only while work is happening. Stale data uses a static dot plus text.

Use at most one principal entrance and one indicator animation per visible region. Limit list stagger to the first six non-tabular items, 25ms apart, and only on first mount. Do not stagger admin rows or replay after every filter/auto-refresh.

### Next App Router handling

Keep shells outside animated route content. Implement entry transitions at an intentional route/template boundary without fragile router-freezing hacks. Next App Router exit animation is not assumed to work just by wrapping `children` with AnimatePresence. Use supported entry animation, preserve forms where necessary, and prove back/forward behavior. Route changes should announce the title and focus the heading without stealing focus on filter changes.

Insights tabs may unmount presentational panels, but scenario form state belongs above the animated boundary. Tab switches must not clear draft scenarios or send extra AI requests. Each animated panel needs a stable key and a real tabpanel id.

## Sticky Headers and Downward Curve

Use one scroll owner per page. The browser document is the default for student/public pages; dialogs and table overflow regions may have their own scrolling when needed.

The requested contour is the top shoulders of the following content surface: visually `/----------\`, not the bottom corners of the header `\__________/`.

Implementation specification for student dashboard/insights and other long student content:

1. Header remains sticky beneath any shell header. Its height is measured, not guessed from several independent fixed offsets.
2. The content seam is a 16px-high decorative layer immediately below the pinned area, with the content surface's **top-left and top-right** radii of 20px. This makes the content appear to rise under the header with downward-facing shoulders.
3. At scrollTop 0, seam rule and shadow opacity are 0. Between 4–16px, a hairline reaches opacity .35. From 16–48px, the line fades out while a 12px soft gradient increases from 0 to .7 opacity. After 48px the fade stays, with no hard line.
4. Light seam uses a subtle neutral dark shadow; dark seam uses a faint light border plus surface-color fade. The fade's transparent endpoint preserves the same RGB color rather than transitioning to transparent black.
5. Pointer events are none. The layer must not obscure letters, focus outlines, controls, or chart tooltips. Reserve its space or overlap only a non-interactive gutter.
6. Use a CSS mask or explicit SVG path if overlapping surfaces cannot produce the intended contour. Avoid rotating the entire header or rounding its bottom corners, which creates the rejected orientation.

| Area | Sticky behavior | Curved/faded seam |
|---|---|---|
| Public navbar | Sticky; background gains opacity after hero | Subtle fade only; no ornamental curve |
| Dashboard | Page context/compact standing may pin; full hero scrolls | Downward shoulder + scroll fade |
| Results list | Page title/actions pin | Subtle fade; curve allowed at grouped list start |
| Semester editor | Context + save status pin, wrapping controls | Fade only to keep column alignment |
| Insights | Title + tabs pin within available viewport | Downward shoulder; 16px content gap |
| Transcript | Export toolbar pins in app mode | Straight; no fade in print |
| Settings | Title/local nav pin on large screens | Quiet fade; no extra floating header |
| Admin tables/settings | Context/toolbar pin as needed | Straight rule/fade; no curve |
| Auth forms, error pages, dialogs | Form/dialog header as needed | None |

At 320px width or a short keyboard viewport, reduce sticky content to one compact context row or let the page header scroll. Keeping an input visible takes priority over keeping a large header pinned.

## Responsive Contract

| Viewport | Shell | Content |
|---|---|---|
| 320–639px | Mobile header; student bottom tabs, admin drawer | 16px gutter, one column, wrapped toolbars |
| 640–1023px | Same navigation mode, more content space | 24px gutter, two columns only if each stays useful |
| 1024–1439px | Persistent rail; sticky context header | 32px gutter, 12-column content grid |
| 1440px+ | Rail remains fixed width | Center content at 1200px student / 1440px admin |

The min-width behavior is 320 CSS pixels. Test 390px, 768px, 1024px, 1440px, 1920px, landscape phone, and 200% browser zoom. Two-column forms collapse before fields become narrower than 240px. Long names/session labels wrap rather than overlap controls.

Recent-result rows use three columns: 36px grade, `minmax(0,1fr)` text, `max-content` score. Gaps 12px, padding 12–16px, minimum 72px height. Title may truncate once; code and semester remain available through the destination and accessible name. Score is never pushed to a separate row by a `flex-col` utility.

Admin tables remain tables. On narrow screens, hide only lower-priority columns behind a row details disclosure; preserve identity/status/action. If horizontal scrolling is needed, keep it inside the table region with a visible edge cue and screen-reader description. Do not hide overflow on the document to conceal layout bugs.

Bottom navigation uses safe-area padding and content reserves its measured height plus 16px. Touch controls remain 48px. Respect OS browser chrome, notches, and `100dvh` support.

## Keyboard and Focused Inputs

- Forms and sheet bodies must scroll the focused field and its error into the visible viewport.
- Start with semantic scrolling, `scroll-padding-top`, `scroll-margin-top`, `scroll-padding-bottom`, and `dvh`; use `window.visualViewport` only in a small hook if browser testing proves it is necessary.
- A focused input's bottom plus 16px clearance must be above the keyboard and pinned footer. Re-evaluate after validation error text appears.
- Keep input text at 16px minimum. Do not zoom the viewport or disable zoom.
- A keyboard opening must not trigger sheet drag-dismiss or replay entrance motion.
- Test the last field in registration, CA/exam fields, new-semester session, admin prompt textarea, and share/import dialogs on actual Android Chrome and iOS Safari where available.

## Accessibility Acceptance

Target WCAG 2.2 AA: text contrast at least 4.5:1 for normal text and 3:1 for large text; meaningful non-text controls/focus boundaries at least 3:1; keyboard operability; visible unobscured focus; proper headings, landmarks, labels, and live status. Reflow and text resizing must preserve the task. See the [WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/).

The repository's 48px hit target is a product rule stricter than WCAG's minimum target criterion; do not present 48px as the WCAG AA threshold.

Additional project checks:

- One visible h1 per route state, unique document title, skip-to-content link, named main/nav/aside.
- A link navigates; a button acts. No nested interactive controls or click-only divs.
- Destructive confirmation announces consequences and puts initial focus on the safe action or heading.
- OTP permits paste and `autocomplete="one-time-code"`; password fields permit password-manager use.
- Toasts use polite status for success and assertive alerts sparingly for actionable errors. Auto-refresh never floods live regions.
- Charts provide equivalent data access and distinguish series beyond color. Academic state must not be conveyed only by the badge hue.
- Hover-revealed actions are also visible on focus and available on touch.
- Onboarding tours cannot trap people; Skip and Close work, missing targets are skipped, and replay is user-controlled.

## Performance Targets

These are targets to measure during implementation, not current benchmark results: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile where field data exists. Use a repeatable lab mobile profile when field data is absent and record that distinction.

Server-render public copy; reserve image/chart dimensions; use Next Image for appropriate content; defer below-fold charts; avoid loading Three.js just for static decoration. Audit `AcademicGraphHero`, `LiveAcademicGraph`, `KnowledgeCoreBackground`, `ReactiveAuthBackground`, and `OrbitingTechStack` before reuse. Preserve the brand artifact with SVG/CSS when that is sufficient. Measure bundle changes against the baseline rather than setting arbitrary size claims.

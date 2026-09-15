# AcadeGrade Design System

## Authority and scope

This is the compact design context for future Superdesign work. It synthesizes the repository’s existing `DESIGN.md`, the `upgrade/` package, and the current runtime implementation.

Use sources in this order when they conflict:

1. Security, data integrity, and proven business behavior.
2. `upgrade/06-ux-contract.md` for interaction behavior.
3. `upgrade/03-design-system-spec.md` for tokens and component contracts.
4. `upgrade/04-route-screen-specs.md` for route composition.
5. `upgrade/02-design-direction.md` for aesthetic interpretation.
6. `DESIGN.md` for identity, academic/data rules, and areas where the upgrade package is silent.
7. Current source for what is actually implemented now; runtime CSS tokens in `app/globals.css` are canonical.

The v2 palette, ubiquitous glow/blur, blanket count-up, card lift, and route-wide animation examples in older sections of `DESIGN.md` are historical. They do not override the v3 notice at the top of that file or the upgrade contract.

## Product identity

AcadeGrade is a Nigerian academic-performance platform: a trustworthy degree ledger and forward-looking academic advisor, not a school-management portal.

- Product promise: record what happened, understand where the student stands, and decide what to do next.
- Durable tagline: “Know where you stand. Know where you’re going.”
- Internal north star: “Academic Observatory.”
- Internal signature motif: “Degree Meridian.”
- Keep user-facing navigation familiar: Dashboard, Results, Insights, Transcript. Do not rename routes after internal design concepts.
- Preserve the existing AcadeGrade logo assets. Do not invent a crest, acronym, mascot, or replacement icon language.
- Any transcript/result is user-managed and unofficial unless an institution actually verifies it.

Design character: calibrated, assured, academic, forward-looking, quietly premium, Nigerian-context aware, and legible under pressure.

Avoid: generic neon SaaS, a conventional school portal, default component-library styling, decorative purple gradients, red “hacker mode” admin UI, ungrounded gamification, generic graduation photography, fabricated metrics, or unsupported institutional endorsement.

## Three visual registers

| Surface | Job | Density and expression |
|---|---|---|
| Public | Persuade with evidence | Spacious, editorial, proof-driven; strongest use of signature product imagery and display type |
| Student | Guide decisions | Calm, personal, data-first; current standing, changes, and next action dominate |
| Admin | Operate safely | Dense, neutral, auditable; scan speed, filtering, tables, permission clarity, and destructive safeguards dominate |

These registers share tokens, typography, primitives, and identity. They differ through composition and density, not separate themes.

## Signature visual: Degree Meridian

The Degree Meridian is a calibrated trajectory, not a decorative gradient.

- CGPA: solid indigo trace.
- PI: dashed gold trace.
- Milestones: semester/session ticks.
- Class bands: only where the configured CGPA scale supports them.
- Current state: precise labeled endpoint with basis and period delta.
- Forecast: visually distinct from history; uncertainty appears only when real interval data exists.
- Missing values: gaps, never zero.
- One point: a marker, never an invented trend.

Context adaptations:

- Public hero: expressive result-sheet → structured record → degree outlook story using deterministic, labeled illustrative data.
- Student dashboard: compact accurate standing/trajectory with current marker and prior-period context.
- Insights: full analytical history/forecast/scenario surface.
- Registration: thin progress rail in the same calibrated stroke language; no fake academic chart.
- Admin: restrained mini-trend/divider motif only.

The older CGPA Arc remains a secondary compact summary for dashboard, transcript, or share contexts. Do not show it beside a full duplicate trajectory.

## Color

Use semantic tokens only in route/component code. Full current values are in `.superdesign/init/theme.md`.

Core light roles:

- Canvas `#F5F7FC`; raised/surface `#FFFFFF`; overlay `#EEF1F8`.
- Text `#141827`; muted `#5C6577`; faint `#636D80`.
- Primary `#5148DD`; gold `#9A5A00`; success `#067647`; danger `#C83232`; info `#0B6B9E`.
- Border `#CDD3E0`; subtle border `#E5E8F0`; control border `#788399`.

Core dark roles:

- Canvas `#080B16`; raised `#0C1120`; surface `#101626`; overlay `#171E31`.
- Text `#F7F8FC`; muted `#A7B0C4`; faint `#7E899F`.
- Primary `#7C74FF`; gold `#F4B544`; success `#46C98B`; danger `#FF6B6B`; info `#55BDEB`.
- Border `#293249`; subtle border `#1C2539`; control border `#758198`.

Rules:

- Light primary buttons use white text; dark primary buttons use `#080B16`, via `--acade-on-primary`.
- Danger is destructive/error only. Admin identity comes from structure and a small shield marker, not red surfaces.
- Gold indicates academic milestones, ongoing/warning context, or the PI trace; it is not a second generic primary action.
- Status needs icon and/or text, never color alone.
- Grade B remains indigo. Failed and unknown/missing states need distinct labels even if both use neutral ink in some contexts.
- Decorative borders may be subtle; fields use the stronger control-border token.
- Support light, dark, and system across pages, overlays, charts, loading/error states, and shell controls. Transcript paper remains intentionally white/black in both app themes.

## Typography

- Bricolage Grotesque: 600–700 for public hero, page title, section-defining heading, or major metric.
- DM Sans: 400–700 for UI, labels, paragraphs, buttons, navigation, and long-form reading.
- Geist Mono: tabular numbers, CGPA/PI/GPA, scores, course codes, matric numbers, IDs, dates, and operational metrics.

Scale anchors:

- Display XL: 64/68 desktop, 42/46 mobile.
- Display: 48/54 desktop, 36/40 mobile.
- Page title: 32/38 desktop, 28/34 mobile.
- Section title: 20/28.
- Card title: 16/24.
- Body: 16/24.
- Compact UI: 14/20.
- Metadata: 12/18 minimum.
- Key metric: 44–64px.

Avoid all caps except short transcript labels, compact table headers, and verified operational statuses. Never shrink essential labels to 10px. Keep input text at least 16px.

## Spacing, shape, elevation, and layers

- Base unit: 4px; preferred rhythm: 8, 12, 16, 24, 32, 48, 64, 96px.
- Minimum interactive target/control height: 48px.
- Controls: 10–12px radius.
- Cards/grouped surfaces: 16px.
- Hero artifacts: 20px.
- Dialogs/sheets: 20–24px.
- Pills are reserved for badges, statuses, filters, and segmented controls.
- Light mode uses border plus a soft neutral shadow.
- Dark mode uses tonal contrast plus border; reserve glow for a single meaningful current-state marker.
- Do not wrap every section in a floating card. Use whitespace, tonal regions, rules, tables, and page structure.
- Z-order: sticky 100; popover 150; drawer/scrim 200; dialog 300; dialog popover 320; toast 400; tooltip 420.

## Composition

1. One page, one dominant answer.
2. Keep context and primary action in a stable page header.
3. Pair every metric with its basis and period: for example, “3.71 CGPA · after 117 credits · +0.08 this session.”
4. Keep evidence near the claim or warning it supports.
5. Use progressive disclosure for secondary controls and long explanations.
6. Preserve geometry during loading, saving, filtering, theme changes, and refresh.
7. On mobile, stack by decision order, not desktop source order.
8. Keep public static sections server-renderable where possible; isolate interaction.
9. Route files compose screens; shared/domain components own presentation; hooks/data layers own state and mutations.
10. URL state owns views that should survive sharing/back navigation: insights tabs, admin query/filter/sort/page/range, and relevant expanded records.

Width and grid anchors:

- Public/student maximum: 1200px.
- Admin maximum: 1440px.
- Reading/form maximum: 720px.
- Page padding: 16px under 640px, 24px tablet, 32px desktop.
- Desktop grid: 12 columns with 24px gutters.
- Student rail: 240px; admin rail: 224px.
- Both rails become drawers below 1024px.
- Student bottom tabs remain below 1024px; admin does not gain bottom tabs.
- Dashboard reference: summary 7 columns, next action 5; trend 8, risk/context 4; stack in decision order below desktop.

## Canonical component ownership

| Responsibility | Canonical source |
|---|---|
| Actions | `components/ui/Button.tsx`, `LinkButton.tsx`, `IconButton.tsx` |
| Fields/forms | `Input.tsx`, `Textarea.tsx`, `FormField.tsx`, `components/forms/FormSection.tsx` |
| Selection | `Select.tsx`, `Switch.tsx`, `Tabs.tsx`, `SegmentedControl.tsx` |
| Overlays | `Modal.tsx`, `Sheet.tsx`; mobile drawers use the same interaction core |
| Data surfaces | `Card.tsx`, `Badge.tsx`, `DataTable.tsx`, `Pagination.tsx`, `Disclosure.tsx` |
| Shared states | `Skeleton.tsx`, `components/shared/EmptyState.tsx`, `ErrorState.tsx` |
| Page context | `components/shared/PageHeader.tsx` |
| Theme | `components/ui/ThemeControl.tsx` |
| Brand | `components/ui/Logo.tsx` |
| Student shell | `components/layout/StudentShell.tsx` |
| Admin shell | `components/layout/AdminShell.tsx` |
| Public shell/navigation | `components/layout/PublicShell.tsx`, `Navbar.tsx` |
| Motion presets | `lib/ui/motion.ts`, `hooks/useReducedMotion.ts` |
| Navigation metadata | `lib/ui/route-meta.ts` |

Do not create route-local modal, select, toast, table, upload field, skeleton, or segmented-control clones. Improve canonical components in place and preserve existing APIs where migration compatibility matters.

Interaction contracts:

- Button defaults to `type="button"`; explicit submit for forms; loading keeps width and names the operation.
- Icon buttons require accessible names.
- Select follows combobox keyboard/ARIA behavior and uses a keyboard-aware sheet on narrow viewports.
- Tabs use one tab stop, arrows/Home/End, linked tabpanels, and consumer-owned route state.
- Modal/Sheet centralize portal, focus trap/return, inertness, scroll locking, dismissal, dirty-state confirmation, and viewport-safe scrolling.
- DataTable remains a semantic table unless full grid keyboard behavior is implemented.
- Pagination never invents page totals from a loaded slice.
- Cards are surfaces, not implicit click targets; put a link/button inside.
- Empty/error/loading states preserve context and provide only meaningful actions.

## Data visualization

- Charts are explanatory instruments, not ambient decoration.
- CGPA and semester GPA labels must say which metric is shown.
- PI is a continuous performance signal, not a degree classification.
- Axis extent follows the configured scale.
- Historical and forecast traces must be distinct.
- Tooltip is supplementary; provide a readable summary or table alternative.
- Numeric cells use tabular figures and right alignment.
- Real admin analytics need sample size, period, and completeness. Never style `Math.random()` or approximate PI as measured data.
- Deterministic demo data must say “Illustrative example.”
- Do not imply precision through gradients, bands, or curves that the data does not support.

## Motion

Use motion to explain selection, hierarchy, navigation, disclosure, or completion.

- Button press: 100ms to 0.98 only for expressive controls.
- Navigation/tab indicator: spring 420/30/0.8.
- Tab panel: opacity + 6px, 160ms.
- Route entry: opacity + 8px, 220ms; shell persists.
- Sheet: +24px to rest, spring 360/30/0.9.
- Dialog: opacity + 0.98 scale, 180ms.
- Disclosure: measured height, spring 360/34.
- One-time completion: 260ms.
- Chart metric change: 240ms interpolation/crossfade with stable axes where possible.

At most one principal entrance and one indicator animation per visible region. Limit non-table list stagger to the first six items at 25ms and first mount only. Do not stagger admin rows or replay animation on filter/refresh. No scroll hijack, route-wide blur, looping glow/pulse, universal hover lift, endless chart drawing, or movement of factual values for decoration. Reduced motion uses immediate state or an 80ms opacity change.

## Responsive and accessibility contract

- WCAG 2.2 AA is the baseline.
- Design/test desktop, tablet, 320–390px phone, keyboard-only, 200% zoom, reduced motion, slow network, empty data, partial failure, and permission denied.
- One scroll owner per page; document scrolling is default. Dialog bodies and table overflow can scroll independently.
- Sticky student headers use a measured 16px downward-shoulder content seam. Admin table headers remain straight.
- Focus-visible: 2px primary outline with 2px offset.
- Route changes announce the title and focus the heading without stealing focus on filter/tab changes.
- Overlays keep heading/description IDs, `aria-modal`, focus containment/return, Escape/X/backdrop parity, and keyboard-safe viewport height.
- Preserve content and action order at 320px; horizontal tables need announced overflow and visible cues.
- Do not hide information from keyboard/touch users behind hover-only behavior.
- Status, failure, and selection cannot rely on hue alone.
- Theme switching must not remount the route, clear form state, close overlays, reorder data, or replay factual animations.

## Content and imagery

Voice:

- Direct: “Add your first semester.”
- Specific: “Forecast how two A grades affect your CGPA.”
- Honest: label recorded, calculated, estimated, forecast, illustrative, and AI-generated information.
- Supportive: “3 courses need attention,” not judgmental failure language.
- Nigerian-context aware: matric numbers, sessions such as `2025/2026`, level notation, CA/exam splits, and degree classes; avoid slang in critical flows.

Imagery:

- Prefer authored result fragments, ledger lines, calibration ticks, semester annotations, and anonymized coherent interface crops.
- Avoid generic graduation photography as the primary identity.
- Any university name, crest, or result sample must be authorized or clearly illustrative.
- Keep sample values internally consistent across CGPA, PI, credits, courses, and charts.

## Review anchors

Before extending a design direction, prove these four surfaces:

- Public home: understandable product proof and primary action without a feature wall.
- Registration phase: first actionable field/Google option visible, errors and progress clear, behavior preserved.
- Student dashboard: selected metric, value, period/basis, and next action above the first full scroll at 1440px; compact rows retain left/middle/right meaning at 390px.
- Admin table/overview: useful toolbar, headers, and truthful rows/metrics visible before scrolling.

Every route needs a title/landmark, primary action where appropriate, and explicit loading, empty, error, success, responsive, theme, keyboard, and reduced-motion behavior.

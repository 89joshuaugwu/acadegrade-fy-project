# Design System Specification

Status: proposed implementation contract. Paths below are relative to `acadegrade-web`. Existing components are to be improved in place; new paths are explicitly identified.

## Architecture

Retain Next App Router, Tailwind CSS v4, Motion, Lucide, the existing three fonts, Recharts, next-themes, react-hook-form, Zod, and react-hot-toast. Respect `.cursorrules`: no shadcn, Radix, or replacement component library. Do not introduce another animation, toast, chart, or form library.

Layers and ownership:

| Layer | Owner | Responsibility |
|---|---|---|
| Tokens | `app/globals.css` | Theme values, Tailwind aliases, type/spacing/layer tokens, base focus and scrollbar rules |
| Primitives | `components/ui/` | Button, field, select, dialog, tabs, badge, table, skeleton; no Firebase calls |
| Shared presentation | `components/shared/`, `components/charts/` | Page headers, empty/error states, chart frame, transitions |
| Domain presentation | `components/results/`, `components/dashboard/`, `components/insights/`, `components/transcript/`, `components/admin/` | Academic/operational composition from typed data |
| State/data | Existing hooks plus narrowly scoped new hooks | Loading, error, mutations, URL state, adapters |
| Routes | Existing `app/**/page.tsx` | Compose a screen, own its route boundary, pass behavior/data |

Do not split files merely to hit a line-count target. Extract independently named responsibilities and avoid a monolithic generic “page builder.” Public static sections should remain server-renderable; interactive controls should be client islands. Existing client auth guards may remain client-side while their surrounding metadata is handled by a small server layout or server page wrapper.

## Canonical Token Contract

Keep existing `--acade-*`, `--grade-*`, and `--class-*` names during migration. Tailwind aliases must reference these variables, not duplicate literal colors. If a descriptive new alias is needed, map it to the canonical variable. A theme must define every color token below.

| Token | Light | Dark |
|---|---|---|
| `--acade-void` | `#F5F7FC` | `#080B16` |
| `--acade-deep` | `#FFFFFF` | `#0C1120` |
| `--acade-surface` | `#FFFFFF` | `#101626` |
| `--acade-overlay` | `#EEF1F8` | `#171E31` |
| `--acade-border` | `#CDD3E0` | `#293249` |
| `--acade-border-subtle` | `#E5E8F0` | `#1C2539` |
| `--acade-control-border` | `#788399` | `#758198` |
| `--acade-text` | `#141827` | `#F7F8FC` |
| `--acade-text-muted` | `#5C6577` | `#A7B0C4` |
| `--acade-text-faint` | `#636D80` | `#7E899F` |
| `--acade-primary` | `#5148DD` | `#7C74FF` |
| `--acade-primary-hover` | `#453CC5` | `#918BFF` |
| `--acade-primary-glow` | `#5148DD` | `#B0AAFF` |
| `--acade-on-primary` | `#FFFFFF` | `#080B16` |
| `--acade-primary-dim` | `#EEECFF` | `#211E40` |
| `--acade-gold` / `--acade-warning` | `#9A5A00` | `#F4B544` |
| `--acade-gold-hover` | `#804900` | `#FFCB70` |
| `--acade-gold-dim` | `#FFF3DD` | `#302617` |
| `--acade-success` | `#067647` | `#46C98B` |
| `--acade-success-dim` | `#E9F7EF` | `#102C22` |
| `--acade-danger` | `#C83232` | `#FF6B6B` |
| `--acade-danger-dim` | `#FDECEC` | `#361E28` |
| `--acade-on-danger` | `#FFFFFF` | `#080B16` |
| `--acade-info` | `#0B6B9E` | `#55BDEB` |
| `--acade-info-dim` | `#E8F4FC` | `#112A39` |
| `--acade-text-inverse` | `#FFFFFF` | `#080B16` |
| `--acade-scrim` | `rgba(8,11,22,.46)` | `rgba(0,0,0,.64)` |
| `--chart-cgpa` | `#5148DD` | `#A09AFF` |
| `--chart-pi` | `#9A5A00` | `#F4B544` |
| `--chart-grid` | `#E5E8F0` | `#293249` |

`--acade-text-inverse` is not a universal accent foreground. Buttons use `on-primary` or `on-danger`; gold buttons use a tested dark foreground on an explicitly golden fill, or become outline actions. Decorative borders can remain subtle; fields needing a visible boundary use `control-border`. Test full components against their actual backgrounds.

### Grade and classification colors

Maintain the current grade hue meanings and resolve every state in both themes:

| Grade / classification | Light ink | Dark ink |
|---|---|---|
| A / First class | `#067647` | `#46C98B` |
| B / Second upper | `#5148DD` | `#A09AFF` |
| C / Second lower | `#9A5A00` | `#F4B544` |
| D / Third class | `#A9430D` | `#FFAA70` |
| E / Pass | `#A63256` | `#F59AB7` |
| F / Fail | `#5C6577` | `#A7B0C4` |
| AR / unknown / incomplete | `#5C6577` | `#A7B0C4` |

Use text labels to distinguish F from missing data. An actual failed-course warning uses danger semantics around the grade badge; an unknown result never uses a failure label. Preserve grade B as indigo. Do not invent “third class upper/lower” categories. Classification thresholds come from `lib/cgpa/degreeClass.ts` and the configured scale, not this color table.

### Theme behavior

Add `components/ui/ThemeControl.tsx` using next-themes. Offer Light, Dark, System with a clearly selected label and icon. Retain the current storage key to respect existing choices. New users default to System. Use `resolvedTheme` only for necessary JS chart/asset decisions; CSS handles surfaces. Set the CSS `color-scheme` appropriately. Reserve control width before mounting to prevent hydration layout shifts.

Theme changes must not remount routes, reset forms, close overlays, reorder results, or replay chart/number entrance animation. Keep `disableTransitionOnChange` if needed for a flash-free theme switch; a deliberate icon transition is sufficient.

### Type and geometry

Use fluid `clamp()` tokens following the endpoints in `02`. Body inputs never fall below 16px. Compact UI ends at 14px; metadata ends at 12px. Avoid current tokens that shrink essential labels to 10.4px on small viewports.

| Token | Value |
|---|---|
| `--radius-control` | `12px` |
| `--radius-surface` | `16px` |
| `--radius-dialog` | `24px` |
| `--control-height` | `48px` |
| `--student-rail-width` | `240px` |
| `--admin-rail-width` | `224px` |
| `--shell-header-height` | `64px` desktop, `56px` mobile, plus safe area if applicable |
| `--shadow-card` light | `0 2px 10px rgba(20,24,39,.04)` |
| `--shadow-popover` light | `0 12px 36px rgba(20,24,39,.14)` |
| `--shadow-card` dark | `none` |
| `--shadow-popover` dark | `0 16px 48px rgba(0,0,0,.36)` |

## Canonical Component Registry

### Actions

Improve `components/ui/Button.tsx`; add `components/ui/LinkButton.tsx` and `components/ui/IconButton.tsx`.

- Button defaults to `type="button"`; form submission must explicitly use `submit`.
- Variants: primary, secondary/outline, ghost, danger. Keep legacy gold only where already meaningful; do not create a second primary action.
- All hit areas at least 48×48px, including icon controls and table actions, following the repository rule. Visual icons remain 18–20px.
- `loading` reserves text width, disables repeat submit, sets `aria-busy`, and names the action: “Saving semester…” rather than just a spinner.
- Rest/hover/pressed/focus/disabled/pending states share geometry. Default hover changes color/border; an optional expressive variant permits a 0.98 press scale.
- LinkButton renders one Next Link with button appearance. No Link wrapping Button and no navigation implemented as a click-div.
- IconButton requires an accessible name. Tooltip is supplementary, appears on focus and hover, and never becomes the only label.

### Fields

Improve `Input.tsx`; create `Textarea.tsx`, `FormField.tsx`, and `components/forms/FormSection.tsx`.

- Stable label above, optional explanation below, error associated with id. Preserve both description and error relationships when applicable.
- Required status is announced; placeholders contain examples, never replace labels.
- Render first-invalid focus plus a linked summary for multi-field submit errors. Use the existing react-hook-form/Zod stack.
- Textarea: minimum 120px, vertical resize, maximum visual height 320px before internal scrolling for long prompts; expand control for larger editing. No horizontal resizing.
- Password visibility stays in Input and preserves focus. Allow paste, autofill, and password managers.
- Search: leading icon, explicit label, clear action, Escape-to-clear when appropriate, empty-query state. Local datasets filter immediately; remote datasets use 300ms debounce and abort/discard stale responses.
- Numeric fields keep the user's draft string until validation. Do not silently clamp or shake a score into a different value. Explain “Enter a CA score from 0 to 30” using the actual scale limits.

### Selection and tabs

Improve `Select.tsx`, `Switch.tsx`; create `Tabs.tsx` and `SegmentedControl.tsx`. Retire `Toggle.tsx` from metric selection after all consumers migrate.

- Select supports a short non-searchable list and a searchable academic list. Use one selected value, clear selected state, wrapped option labels, result count, no-results text, and explicit custom-value entry only where existing registration accepts it.
- Use WAI-ARIA combobox relationships, keyboard arrows/Home/End/Enter/Escape, selected-option focus, and focus restoration. Distinguish focused option from selected option. Search input needs a visible or screen-reader label.
- Desktop popup is anchored, collision-aware, and portalled outside clipping containers. Search/header stay outside the scrolling option list. Never put options behind the search box.
- On narrow viewports use the same state/option renderer in a dialog sheet with a 56px header, 48px search, and independently scrollable list. Max panel height is based on available visual viewport, not a fixed 600px.
- Switch represents one binary preference. It accepts `id`, `aria-label`/`aria-labelledby`, `disabled`, and pending state; passes disabled to the actual button.
- SegmentedControl represents a choice: CGPA/PI, Light/Dark/System, Score/Letter where applicable. Implement radio-group semantics for preferences, tab semantics only when it controls a panel. Selected label stays visible with a filled indicator.
- Tabs require `tablist`, one tab stop, arrow/Home/End navigation, `aria-selected`, `aria-controls`, linked `tabpanel`, and a visible focused state. Activate cached panels automatically; use Enter/Space activation when selection triggers a new request. Route state is owned by the consumer, not hidden inside the primitive.

Combobox keyboard/ARIA implementation should follow the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

### Overlays

Improve `Modal.tsx`; create a `Sheet.tsx` wrapper using its shared overlay/focus core. `MobileDrawer.tsx` must use that core too.

- Portal to the overlay root. Use `role="dialog"`, `aria-modal`, heading/description ids, background inertness, reference-counted scroll locking, and focus return to the trigger or its nearest surviving action.
- One active focus trap; popovers opened inside a dialog belong to its interaction boundary. Exclude hidden/disabled elements. Initial focus is title for long/destructive content or first field for simple entry.
- Escape, X, and backdrop use one dismiss function. Dirty forms open a leave/discard confirmation. Dismissing must not report a pending server mutation as cancelled unless cancellation is actually supported.
- Panel max height: available viewport minus 32px; header/footer remain visible while body scrolls. Mobile respects `100dvh`, safe area, and keyboard viewport.
- Sheet downward drag starts on the handle/header or at body scrollTop zero. Dismiss after 96px or 25% panel travel with deliberate downward velocity; otherwise spring back. Close button always provides a non-drag alternative. Do not hijack scrolling or field selection.
- Implement `confirm.requireText` before use; compare trimmed exact phrase, disable confirm until matched, and keep operation loading/error inside the dialog.
- Preset widths: confirm 440px, form 560px, upload/review 880px; no route-local `9999` values.

Layer tokens: base 0, sticky 100, drawer/scrim 200, dialog 300, dialog-popover 320, toast 400, tooltip 420. A tooltip must belong to its owning overlay and not float above unrelated dialogs. Global non-modal popovers use 150. Nesting is managed centrally; there must be no raw layer overrides in pages.

### Data surfaces

Improve `Card.tsx` and `Badge.tsx`; create `DataTable.tsx`, `Pagination.tsx`, and `Disclosure.tsx`.

- Card defaults to solid surface + border. Clickability belongs to a link/button inside it. A glass variant is limited to the public hero artifact, not admin lists/forms.
- Badge has icon/text/status hue, 12px minimum type, and no uncontrolled pulse.
- Read-only table: real table, caption/description, `th scope`, sort buttons with `aria-sort`, right-aligned numbers, stable row keys. Do not apply `role="grid"` without implementing full grid keyboard navigation.
- Admin row height at least 56px; 48px actions fit. Toolbar wraps into labeled filters at narrow widths. Table scrolls within an announced region and has visible overflow cues.
- Pagination initially uses Previous/Next and “25 shown”; exact totals only when backed by a complete count query. No fake page numbers inferred from the currently loaded slice.
- Expanded detail is a separate row with a labeled disclosure button. Selecting text or clicking a row action never triggers another navigation.
- Error/empty/loading states preserve table columns and toolbar. Never show “No records” while fetching failed.

### Charts and academic metrics

Improve `TrendChart.tsx`, `ForecastChart.tsx`, `CGPAArc.tsx`; create `components/charts/ChartFrame.tsx` and `lib/ui/chart-theme.ts`.

- ChartFrame owns title, period, metric toggle slot, legend, summary, loading/empty/error state, minimum height, and optional data table.
- CGPA uses solid indigo; PI uses dashed gold. Add labels and distinguish lines by stroke style in both themes.
- Axis extent comes from the actual scale. Cumulative CGPA must not be confused with semester GPA. Missing values are gaps, not zero; one point is a marker, not an invented trend.
- Plot heights: 280px desktop, 240px phone; labels stay at least 12px. Show a subset of crowded ticks while the tooltip/table exposes full session labels.
- Historical and forecast segments are visually distinct. Uncertainty bands require real interval data; if unavailable, label the forecast as an estimate and omit a fabricated band.
- Decorative curves in public examples may be smoothed, but real charts must not imply out-of-range values or hide a discontinuity. Prefer a monotone interpolation with visible sample markers.
- Chart tooltips use semantic surfaces/text. Provide focusable data access through a table or meaningful summary; hover is supplementary.
- Do not add a gradient to every metric card. If a two-metric gradient is retained, it is a continuous two-color blend with text-safe underlay and explicit metric labels, not a third arbitrary color. Its extent must not imply precise statistical weighting; the values and chart are the quantitative truth.

### Shared states and feedback

Reuse `Skeleton.tsx`, `SkeletonCard.tsx`, and `EmptyState.tsx`; create `InlineNotice.tsx`, `ErrorState.tsx`, and `lib/ui/feedback.ts`.

- Loading: reserved geometry plus text “Loading results”; skeletons for structured data, a named spinner for a short indivisible operation. Skeletons do not need a blanket shimmer.
- Empty: one sentence explaining why, one primary next action, and optional secondary help. Filtered-empty offers Clear filters.
- Error: retain safe cached data where possible, distinguish offline/forbidden/not-found/server failure, and supply Retry only when meaningful.
- Success: local state first, toast for a consequential mutation or copy/export result. No success toast for opening a tab or typing.
- Feedback wrapper standardizes ids, messages, duration, loading-to-success replacement, and sanitized errors. It does not hide field validation in a toast.

## Foundation Gallery

During implementation create a development-only `/design-preview` page, disabled in production, with real canonical components in light/dark and every state. Include long names, multiline options, missing scores, disabled inputs, two nested overlay levels, and a table with empty/error/loading states. This is a review harness, not a production feature or publicly accessible data page. No Firebase account is needed to inspect it.

The gallery must pass contrast, keyboard, 320px reflow, reduced motion, and theme-switch-with-open-dialog checks before route migration.

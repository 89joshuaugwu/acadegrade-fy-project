# Design Direction: Academic Observatory

## Product Thesis

AcadeGrade should feel like a personal academic observatory: the confidence of a registrar’s ledger, the clarity of modern financial instrumentation, and the forward-looking usefulness of an academic advisor.

The experience must answer three questions in order:

1. **What results have I recorded?** Courses, scores, credits, semesters, and their source. AcadeGrade records are user-managed and must not imply institutional certification.
2. **Where do I stand?** CGPA, PI, degree class, momentum, risk, and completeness.
3. **What should I do next?** Forecasts, scenarios, course priorities, and corrective actions.

This direction evolves the existing “Precision Intelligence” idea rather than discarding it.

## Three Registers, One Product

### Public: persuade

Expressive, spacious, and proof-driven. Show the product operating on a believable academic record. Use the signature visual at full strength, larger typography, editorial sections, and strong before/after storytelling.

### Student: guide

Calm, personal, and data-first. Prioritize current standing, recent changes, and next actions. Animation helps orientation but never competes with results.

### Admin: operate

Dense, neutral, and auditable. Prioritize scan speed, filtering, comparison, permissions, and safe actions. Red is reserved for danger; admin identity is conveyed by structure and a small shield marker, not a red environment.

## Signature: The Degree Meridian

The Degree Meridian is a calibrated visual path with two related traces:

- **CGPA trace:** cumulative outcome calculated using the applicable grade scale.
- **PI trace:** continuous performance signal.
- **Milestone ticks:** semester/session boundaries.
- **Class bands:** subtle degree-class zones only on CGPA scales where the configured thresholds apply. PI is a performance signal, not an institutional degree award.
- **Current marker:** a precise, labeled endpoint with change context.

It is not one reusable gradient pasted everywhere. It adapts by context:

- Public hero: an expressive trajectory flowing from a result sheet into an intelligible degree outlook.
- Student dashboard: compact, data-accurate CGPA/PI trajectory with current marker and previous-semester delta.
- Insights: full analytical chart with forecast uncertainty and scenario overlays.
- Registration: a thin progress rail using the same spacing and stroke language, without CGPA data or an extra chart.
- Admin: a restrained divider/mini-trend motif, never the primary navigation treatment.

The existing CGPA Arc remains useful as a compact summary or share/transcript motif. It is secondary to the Degree Meridian and should not be repeated beside a full trajectory chart.

## Visual Character

Use these words to judge design decisions:

- Calibrated
- Assured
- Academic
- Forward-looking
- Quietly premium
- Nigerian-context aware
- Legible under pressure

Reject these outcomes:

- Generic neon SaaS dashboard
- School management portal
- Glass cards floating on every surface
- Purple gradients without data meaning
- Red-tinted admin “hacker mode”
- Overfriendly gamification that trivializes academic risk
- Feature-grid marketing with no evidence

## Color Direction

Use semantic roles in components. The values below are the proposed v3 foundation; implementation must contrast-test all component states, not only these base pairs.

### Dark theme

| Role | Value | Use |
|---|---|---|
| Canvas / Observatory Night | `#080B16` | Root background |
| Raised canvas | `#0C1120` | Shell rail, grouped sections |
| Surface | `#101626` | Cards, table containers, inputs |
| Surface raised | `#171E31` | Popovers, modal panels |
| Border | `#293249` | Default boundaries |
| Border subtle | `#1C2539` | Internal rules |
| Text | `#F7F8FC` | Primary text; 18.50:1 on canvas |
| Text muted | `#A7B0C4` | Secondary text; 9.02:1 on canvas |
| Text faint | `#7E899F` | Metadata, only at compliant sizes |
| Primary | `#7C74FF` | Focus, primary action, active state; 5.42:1 on canvas |
| Primary hover | `#918BFF` | Hover and selected emphasis |
| Gold | `#F4B544` | Academic milestones and “ongoing” |
| Success | `#46C98B` | Verified/success |
| Danger | `#FF6B6B` | Destructive/error only |
| Info | `#55BDEB` | Neutral system information |

### Light theme

| Role | Value | Use |
|---|---|---|
| Canvas / Ledger Paper | `#F5F7FC` | Root background |
| Raised canvas | `#EEF1F8` | Shell rail, grouped sections |
| Surface | `#FFFFFF` | Cards, tables, inputs |
| Surface raised | `#FFFFFF` | Popovers and dialogs with stronger shadow |
| Border | `#CDD3E0` | Default boundaries |
| Border subtle | `#E5E8F0` | Internal rules |
| Text | `#141827` | Primary text; 16.47:1 on canvas |
| Text muted | `#5C6577` | Secondary text; 5.47:1 on canvas |
| Text faint | `#636D80` | Supporting metadata; still verify on tinted surfaces |
| Primary | `#5148DD` | Focus, primary action, active state; 6.32:1 with white |
| Primary hover | `#453CC5` | Hover/pressed |
| Gold ink | `#9A5A00` | Milestone text; 5.47:1 on white |
| Success ink | `#067647` | Verified/success; 5.69:1 on white |
| Danger ink | `#C83232` | Destructive/error; 5.31:1 on white |
| Info ink | `#0B6B9E` | System information; 5.82:1 on white |

Status surfaces are derived from the corresponding accent at 8–14% opacity in dark and 6–10% in light, with a solid compliant text color. Never rely on color alone; pair status with icon and label.

Dark primary buttons use `#080B16` foreground on `#7C74FF`; light primary buttons use white on `#5148DD`. Do not inherit the current always-white button foreground onto the lighter dark-theme accent. Decorative borders do not qualify as accessible input boundaries: use the stronger control-border tokens in `03`.

## Typography

Keep the existing families and make their roles stricter:

| Role | Family | Rules |
|---|---|---|
| Display and page title | Bricolage Grotesque | 600–700; marketing hero, route title, major metric only |
| UI and reading | DM Sans | 400–700; labels, paragraphs, buttons, navigation |
| Numeric/data | Geist Mono | Tabular numbers, IDs, matric numbers, scores, codes, timestamps |

Type scale:

- Display XL: 64/68 desktop, 42/46 mobile.
- Display: 48/54 desktop, 36/40 mobile.
- Page title: 32/38 desktop, 28/34 mobile.
- Section title: 20/28.
- Card title: 16/24.
- Body: 16/24.
- Compact UI: 14/20.
- Metadata: 12/18; never use 10px for essential information.
- Key metric: 44–64px with Geist Mono or Bricolage numeric treatment, depending on context.

Avoid all-caps except short transcript labels, compact data headers, and verified operational statuses. Avoid exaggerated letter spacing in navigation and body labels.

## Shape, Spacing, and Elevation

- Base spacing unit: 4px.
- Content rhythm: 8, 12, 16, 24, 32, 48, 64, 96.
- Inputs and buttons: 10–12px radius.
- Cards and grouped surfaces: 16px radius.
- Hero/feature artifacts: 20px radius.
- Modal and mobile sheet: 20–24px radius.
- Pills only for badges, compact filters, segmented controls, and status—not every button.
- Light theme elevation: border plus soft neutral shadow.
- Dark theme elevation: tonal contrast plus border; glow is reserved for one signature/current-state marker.
- Use full-width tonal sections and rules to organize dense pages. Do not wrap every heading and paragraph in a card.

## Composition Principles

1. One page, one dominant answer.
2. Put context and primary action in a stable page header.
3. Pair metrics with their basis and change period: “3.71 CGPA · after 117 credits · +0.08 this session.”
4. Keep evidence near claims. A risk count links to the courses causing it.
5. Use progressive disclosure for long explanations and secondary controls.
6. Preserve spatial stability during loading, saving, filtering, and auto-refresh.
7. On mobile, stack by decision order—not desktop source order.

## Page Shapes

### Public home, desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Logo        Product  Calculator  About       Theme   Sign in   Start     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  KNOW WHERE YOUR DEGREE IS HEADING         ┌─ Degree Meridian ─────────┐ │
│  A clear degree outlook from every         │ result → CGPA/PI → outlook │ │
│  semester result.                          │ labelled, believable data  │ │
│  [Start your ledger] [Try calculator]       └────────────────────────────┘ │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ Proof strip: calculations · privacy · transcript · Nigerian grade scales │
├──────────────────────────────────────────────────────────────────────────┤
│ Result sheet → clean record → degree outlook (interactive narrative)      │
├──────────────────────────────────────────────────────────────────────────┤
│ Student outcomes / product evidence       │ Trust and privacy             │
├──────────────────────────────────────────────────────────────────────────┤
│ Final CTA                                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Student dashboard, desktop

```text
┌──────────── rail ────────────┬───────────────────────────────────────────┐
│ AcadeGrade                   │ Dashboard                period / theme   │
│ Dashboard                    ├───────────────────────────────────────────┤
│ Results                      │ Current standing + Degree Meridian        │
│ Insights                     │ 3.71 CGPA  | 3.04 PI | 117 credits       │
│ Transcript                   ├─────────────────────────┬─────────────────┤
│                              │ Recent academic changes │ Next best action│
│                              ├─────────────────────────┴─────────────────┤
│ Notifications               │ Trend / class bands / risk explanation    │
│ Settings            Profile │                                           │
└──────────────────────────────┴───────────────────────────────────────────┘
```

### Admin list, desktop

```text
┌────── admin rail ──────┬─────────────────────────────────────────────────┐
│ Shield · AcadeGrade    │ Users                          Export / Add      │
│ Overview               │ Search | Status | Level | Department | Reset   │
│ Users                  ├─────────────────────────────────────────────────┤
│ Courses                │ Name ↕ | Matric | Dept | Level | Status | …    │
│ Analytics              │ semantic, sortable, paginated table            │
│ API monitor            │                                                 │
│ Settings               ├─────────────────────────────────────────────────┤
│ Admin account          │ 1–25 of 1,248                 ‹ 1 2 3 … 50 ›   │
└────────────────────────┴─────────────────────────────────────────────────┘
```

### Authentication, desktop

```text
┌──────────────────────────────┬───────────────────────────────────────────┐
│ Product proof                │ AcadeGrade                                │
│ Degree Meridian + one        │ Create your account                      │
│ static factual benefit       │ [Google]                                 │
│                              │ ───────── or use email ─────────          │
│ Privacy / no affiliation     │ Fields, errors, primary action           │
│ claim                        │ Recovery / sign-in link                  │
└──────────────────────────────┴───────────────────────────────────────────┘
```

On mobile, the proof panel becomes a compact top artifact; the form remains first in the reading order.

## Content Voice

- Direct: “Add your first semester” rather than “Embark on your journey.”
- Specific: “Forecast how two A grades affect your CGPA” rather than “Powerful AI insights.”
- Honest: distinguish official record, calculated metric, forecast, and AI interpretation.
- Supportive without judgment: “3 courses need attention” rather than “You are failing.”
- Nigerian context without slang in critical flows: recognize matric numbers, sessions such as `2025/2026`, level notation, CA/exam splits, and degree classes.

## Image and Illustration Direction

Do not use generic graduation photography as the main identity. Prefer authored product artifacts:

- A cleaned result-sheet fragment transforming into structured records.
- A precise degree trajectory with semester annotations.
- Abstract ledger lines, calibration ticks, and paper-to-screen transitions.
- Real interface crops with anonymized, internally consistent sample data.

Any university name, crest, or result sample must be clearly illustrative or authorized. Avoid implying endorsement.

## Implementation Decisions That Must Stay Concrete

- This is a proposed implementation specification for the user's requested upgrade, not a claim that screenshots or a final visual prototype have been approved.
- Keep the existing logo assets. Do not invent a new name, crest, acronym, or unrelated icon style.
- Keep user-facing labels familiar: Dashboard, Results, Insights, Transcript. “Degree Meridian” and “Academic Observatory” are internal design terms, not new navigation labels.
- Desktop student rail: 240px. Desktop admin rail: 224px. Both become drawers below 1024px. Student bottom navigation remains below 1024px; admin uses a drawer without bottom tabs.
- Page content: student maximum 1200px, admin maximum 1440px, reading/forms maximum 720px, public maximum 1200px. Padding: 16px below 640px, 24px at tablet, 32px desktop.
- Use a 12-column desktop layout and 24px gutters. Dashboard summary is 7 columns, next-action panel 5; the main trend chart spans 8 and risk/context spans 4. At tablet, summary then actions then chart; below 640px all stack.
- No duplicate trend plots in the dashboard: the summary may include a small current-marker ribbon, while the main chart owns the full time series.
- Sample data is deterministic and labeled “Illustrative example.” No random values on mount, animated random graphs, fabricated testimonials, or invented adoption counts.
- Preserve tasteful bounce: navigation indicators, tab selection, small sheet entrances, and a one-time completion mark may use a restrained spring. Tables, reading content, and numeric facts stay stable. See `05` for exact motion values.
- Student sticky headers use the user's preferred downward shoulder shape only at the content seam, with scroll-driven fading. Admin table/tool headers remain straight for alignment; dialogs and auth forms do not need curved seams.
- New backend capabilities are explicitly marked dependencies in `10`. A frontend agent must not invent endpoint responses or claim the feature works because a mock looks correct.

## Visual Acceptance Anchors

At 1440px, the dashboard's primary number, selected metric, relevant period, and next action must fit above the first full scroll. At 390px, recent result rows must retain grade on the left, title in the middle, and score on the right without falling into vertical fragments. Admin lists must show a usable toolbar, column headers, and meaningful rows before scrolling. Login must show the first actionable field and Google option without decorative content pushing them below the fold.

Use these anchors to review implementation screenshots before extending the design across the remaining routes. One polished dashboard, one registration phase, and one admin table are the reference surfaces for the rest of the work.

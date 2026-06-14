# AcadeGrade v2 — DESIGN.md v2.1
> Nigerian AI-Powered CGPA & Academic Performance Tracker  
> Author: Joshuazaza · CSC 499 Final Year Project · ESUT, Agbani  
> Supervisor: Dr. Okorie · Matric: 2022030202909  
> Last updated: 14 June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack — Exact Versions](#2-tech-stack--exact-versions)
3. [Brand Identity](#3-brand-identity)
4. [Dual-Mode System](#4-dual-mode-system)
5. [Architecture](#5-architecture)
6. [Page Breakdown](#6-page-breakdown)
7. [Mobile Navigation System](#7-mobile-navigation-system)
8. [Component Library](#8-component-library)
9. [Data Architecture](#9-data-architecture)
10. [AI Integration](#10-ai-integration)
11. [Email (Gmail SMTP)](#11-email-gmail-smtp)
12. [API Routes](#12-api-routes)
13. [PWA & Notifications](#13-pwa--notifications)
14. [Agent Skills (.agents folder)](#14-agent-skills-agents-folder)
15. [Hard Rules for Antigravity IDE](#15-hard-rules-for-antigravity-ide)

---

## 1. Project Overview

AcadeGrade v2 is a full-stack Next.js 16 academic platform for Nigerian university students that replaces the Flask v1 (acadegrade.vercel.app). It is Joshua Chimaobi Ugwu's CSC 499 final year project at ESUT, supervised by Dr. Okorie.

**Core Innovations over v1 (Flask):**
- Dual Record Mode: From Scratch vs Complete Record
- Dual Metric System: Official CGPA (letter-discretized) + Performance Index PI (score-continuous)
- Per-user linear regression forecasting via `simple-statistics`
- Gemini 3.1 Flash-Lite AI Insights (analysis, risk flags, what-if)
- Full role-based platform: Student + Admin
- Admin-managed Course Catalog
- PWA with FCM push notifications
- Premium animated UI — far beyond the Kimi Vite prototype

**Tagline:** *Know where you stand. Know where you're going.*

**Deployment:** acadegrade.vercel.app (replaces existing Flask site)

---

## 2. Tech Stack — Exact Versions

All versions verified on npm as of 13 June 2026.

### Core
| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.9 | App Router, API routes, SSR/RSC |
| `react` | 19.2.7 | UI rendering |
| `react-dom` | 19.2.7 | DOM renderer |
| `typescript` | 6.0.3 | Type safety |

### Styling & UI
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | 4.3.1 | CSS-first utility styling |
| `motion` | 12.40.0 | All animations, spring physics, page transitions |
| `geist` | 1.7.2 | Geist Mono font (data/numbers) |
| `lucide-react` | 1.18.0 | Icons |
| `react-hot-toast` | 2.6.0 | Toast notifications |
| `next-themes` | 0.4.6 | Dark/light mode |
| `recharts` | 3.8.1 | CGPA/PI trend charts |
| `react-countup` | 6.5.3 | Animated number roll-up |

### Firebase
| Package | Version | Purpose |
|---|---|---|
| `firebase` | 12.14.0 | Firestore, RTDB, Auth, FCM (client) |
| `firebase-admin` | 14.0.0 | Server-side writes, FCM push |

### Forms & Validation
| Package | Version | Purpose |
|---|---|---|
| `react-hook-form` | 7.79.0 | Form state |
| `@hookform/resolvers` | 5.4.0 | Zod integration |
| `zod` | 4.4.3 | Schema validation |

### AI
| Package | Version | Model String |
|---|---|---|
| `@google/genai` | 2.8.0 | `gemini-3.1-flash-lite` |

> ⚠️ There is NO `gemini-3.5-flash-lite`. The lite model is `gemini-3.1-flash-lite`. Do not confuse with `gemini-3.5-flash` (which is the full flagship Flash model). Use `gemini-3.1-flash-lite` for all AcadeGrade AI calls.

### Intelligence & Export
| Package | Version | Purpose |
|---|---|---|
| `simple-statistics` | 7.9.0 | linearRegression for CGPA/PI forecasting |
| `jspdf` | 4.2.1 | PDF transcript export |

### Utilities
| Package | Version | Purpose |
|---|---|---|
| `date-fns` | 4.4.0 | Date formatting |
| `nodemailer` | 8.0.11 | Gmail SMTP email |
| `@types/node` | 25.9.3 | Node types |

### PWA
| Package | Version | Purpose |
|---|---|---|
| `@serwist/next` | 9.5.11 | Service worker, offline, PWA |
| `serwist` | 9.5.11 | Service worker runtime |

### Infrastructure
| Tool | Purpose |
|---|---|
| Vercel | Hosting + serverless API routes |
| Firebase Console | Firestore, RTDB, Auth, FCM |
| Cloudinary | Student avatar uploads (direct fetch, cloud: `acadegrade`) |
| Google AI Studio | `GEMINI_API_KEY` management |
| Gmail SMTP | Transactional email via nodemailer |

---

## 3. Brand Identity

### 3.1 Design Direction

**Theme:** Precision Intelligence — a data-forward Nigerian edtech platform that sits at the crossover of fintech aesthetics and academic tools. Credible enough for a university, energetic enough for a 20-year-old to enjoy opening every day.

**Target feel:** Premium Nigerian fintech dashboard, not a school portal. Think Cowrywise or Piggyvest's UI language applied to academics.

**Reference:** The Kimi Vite prototype proved the design direction works visually. AcadeGrade v2 must be significantly more polished: real fonts (Bricolage Grotesque + DM Sans), exact color tokens, correct animations, full Firebase integration, and mobile-first layout — not a Vite SPA.

**NOT:** boring · pastel · generic SaaS · Western clone · shadcn default

### 3.2 Color System

#### Dark Mode (Default)
```css
/* Backgrounds — layer stack */
--acade-void:          #07090F;    /* page background */
--acade-deep:          #0E1322;    /* base card */
--acade-surface:       #141B2E;    /* elevated card, modal */
--acade-overlay:       #1A243D;    /* hover state, tooltip */
--acade-border:        #1F2B47;    /* dividers, input borders */
--acade-border-subtle: #162038;    /* very subtle separators */

/* Primary — Electric Indigo */
--acade-primary:        #6366F1;
--acade-primary-hover:  #4F46E5;
--acade-primary-glow:   #818CF8;
--acade-primary-dim:    #1e1b4b;   /* background tint for primary sections */

/* Accent — Nigerian Gold */
--acade-gold:           #F59E0B;
--acade-gold-hover:     #D97706;
--acade-gold-dim:       #1C1005;

/* Semantic */
--acade-success:        #22C55E;
--acade-success-dim:    #052E16;
--acade-danger:         #EF4444;
--acade-danger-dim:     #450A0A;
--acade-warning:        #F59E0B;
--acade-info:           #38BDF8;

/* Text */
--acade-text:           #E8EDFF;
--acade-text-muted:     #8892B0;
--acade-text-faint:     #4A5580;
--acade-text-inverse:   #07090F;

/* Grade Colors */
--grade-a: #22C55E;   /* green */
--grade-b: #6366F1;   /* indigo — NOT green. B is indigo. */
--grade-c: #F59E0B;   /* gold */
--grade-d: #F97316;   /* orange */
--grade-e: #EF4444;   /* red */
--grade-f: #6B7280;   /* grey */

/* Degree Class Colors */
--class-first:  #22C55E;   /* First Class — gold glow added */
--class-2upper: #6366F1;   /* 2:1 */
--class-2lower: #F59E0B;   /* 2:2 */
--class-third:  #F97316;   /* Third */
--class-pass:   #EF4444;   /* Pass */
--class-fail:   #6B7280;   /* Fail */
```

#### Light Mode
```css
--acade-void:           #F0F4FF;
--acade-deep:           #FFFFFF;
--acade-surface:        #F8FAFF;
--acade-overlay:        #EEF2FF;
--acade-border:         #C7D2FE;
--acade-border-subtle:  #E0E7FF;
--acade-primary:        #4F46E5;
--acade-primary-hover:  #4338CA;
--acade-primary-glow:   #6366F1;
--acade-gold:           #D97706;
--acade-text:           #1A1F36;
--acade-text-muted:     #4B5563;
--acade-text-faint:     #9CA3AF;
```

### 3.3 Typography

```
Display:  Bricolage Grotesque  — loaded via next/font/google
          Used for: hero headlines, CGPA callout number, degree class label
          
Body:     DM Sans              — loaded via next/font/google
          Used for: all body text, labels, inputs, nav items, descriptions

Data:     Geist Mono           — loaded via geist package
          Used for: CGPA value, PI value, GPA number, scores, course codes,
                    percentages, matric numbers — ANY numeric data display
```

```css
/* Responsive Type Scale using clamp() — no fixed px for text */
--text-xs:   clamp(0.65rem,  1.5vw, 0.75rem);
--text-sm:   clamp(0.75rem,  1.8vw, 0.875rem);
--text-base: clamp(0.875rem, 2.0vw, 1rem);
--text-lg:   clamp(1rem,     2.5vw, 1.125rem);
--text-xl:   clamp(1.125rem, 3.0vw, 1.25rem);
--text-2xl:  clamp(1.25rem,  4.0vw, 1.5rem);
--text-3xl:  clamp(1.5rem,   5.0vw, 1.875rem);
--text-4xl:  clamp(1.875rem, 6.0vw, 2.25rem);
--text-hero: clamp(2.25rem,  9.0vw, 4.5rem);
--cgpa-num:  clamp(2.75rem,  10vw,  5rem);    /* the big arc number */
```

### 3.4 Motion & Animation System

Package: `motion` v12.40.0 — import from `motion/react`.

```typescript
// useReducedMotion hook — check BEFORE every animated component
import { useReducedMotion } from 'motion/react';
```

#### Page Transition
```typescript
const pageVariants = {
  hidden:  { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)',
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit:    { opacity: 0, y: -10,
    transition: { duration: 0.22, ease: 'easeIn' }
  }
};
// Wrap every page in <AnimatePresence mode="wait">
```

#### Stagger Card Reveal
```typescript
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
};
const card = {
  hidden:  { opacity: 0, y: 28, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { type: 'spring', stiffness: 90, damping: 18 }
  }
};
```

#### CGPA Arc Spring
```typescript
// SVG stroke-dashoffset driven by motion spring
const arcSpring = { stiffness: 55, damping: 16, mass: 1.3 };
// Plays once on mount, replays on data update
// Duration to reach final value: ~1.4 seconds
```

#### Micro-interactions (all components)
```typescript
// Buttons
whileTap={{ scale: 0.96 }}
whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}

// Cards
whileHover={{ y: -4, boxShadow: '0 24px 48px rgba(99,102,241,0.18)' }}

// Invalid input shake
animate={{ x: [0, -8, 8, -5, 5, -2, 2, 0] }}

// Toggle switch thumb — spring slide
layout transition with spring physics

// Degree class badge unlock
initial={{ scale: 0.4, opacity: 0 }}
animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
// + glow pulse keyframe after settle
```

#### Number Counter
```typescript
// react-countup v6.5.3 on all CGPA, PI, GPA values
<CountUp
  end={cgpa}
  decimals={2}
  duration={1.6}
  delay={0.3}
  easingFn={(t, b, c, d) => c * (1 - Math.pow(1 - t/d, 3)) + b}
/>
```

#### Skeleton Loaders
Every data-fetching component shows a **shimmer skeleton** that exactly matches the shape of real content. No raw spinners.

```css
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--acade-deep) 25%,
    var(--acade-overlay) 50%,
    var(--acade-deep) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

#### Reduced Motion
```typescript
// In EVERY animated component
const shouldReduceMotion = useReducedMotion();
const variants = shouldReduceMotion ? {} : actualVariants;
```

### 3.5 The Signature Element — CGPA Arc Gauge

The single most memorable visual in AcadeGrade v2.

**Structure:** SVG radial arc (270° sweep, open at bottom). Two concentric rings:
- **Outer ring (thicker, 12px stroke):** CGPA — color shifts across gradient by value range
- **Inner ring (thinner, 6px stroke):** PI — gold color

**On every dashboard load:**
1. Both arcs spring-animate from 0 to final value (CGPA first, PI 350ms later)
2. Number inside counts up with react-countup (2 decimal places)
3. At 100% of animation — 20 particle dots scatter from arc endpoint and fade out
4. Degree class label fades in below the number
5. Arc tip has a glowing dot (radial gradient, pulses subtly after settle)

**Arc Color Gradient based on CGPA value:**
```
0.00 – 1.49 → --grade-f grey → --grade-e red
1.50 – 2.39 → --grade-e red  → --grade-d orange
2.40 – 3.49 → --grade-d orange → --grade-c gold
3.50 – 4.49 → --grade-c gold   → --grade-b indigo
4.50 – 5.00 → --grade-b indigo → --grade-a green (with gold glow)
```

**Three size variants:**
- `size="lg"` — Dashboard hero, 280px × 280px
- `size="md"` — Insights page, 180px × 180px
- `size="sm"` — Sidebar avatar ring, 52px × 52px (no particles, just static ring)

**Present on:**
- `/dashboard` — full `lg` size, center of hero section
- Student shell sidebar — `sm` size as avatar ring
- PDF transcript — static SVG render (no animation, final values only)

---

## 4. Dual-Mode System

### 4.1 Record Mode Toggle

Set at onboarding Step 3. Changeable in Settings (with migration warning modal).
Persisted to `users/{uid}.recordMode`.

| Mode | Description |
|---|---|
| **From Scratch** | Empty start. User enters results as they complete each semester. CGPA grows from 0. |
| **Complete Record** | User enters all past results at once. CGPA can start high. Ongoing semester continues with From Scratch flow after past data entered. |

Both modes use the **exact same Firestore data model**. The difference is only UX flow and onboarding wizard branching.

### 4.2 Metric Display Toggle

Persisted to `users/{uid}.gradeMode`. Toggle visible on Dashboard arc card and Insights header.
Placement: **inline on the arc hero card** — directly below the arc. Not on a separate settings page.

| Toggle | Primary Arc Shows | Secondary (smaller) Shows |
|---|---|---|
| CGPA Mode | Official CGPA | PI (with `~` prefix if estimated) |
| PI Mode | Performance Index | Official CGPA |

### 4.3 Grading Scale

Nigerian 5-point scale. Hardcoded as default, overridable by admin via `config/settings.gradeScale`.

| Score | Grade | Grade Point | Color Token |
|---|---|---|---|
| 70–100 | A | 5.0 | `--grade-a` |
| 60–69 | B | 4.0 | `--grade-b` (indigo) |
| 50–59 | C | 3.0 | `--grade-c` (gold) |
| 45–49 | D | 2.0 | `--grade-d` (orange) |
| 40–44 | E | 1.0 | `--grade-e` (red) |
| 0–39 | F | 0.0 | `--grade-f` (grey) |

Score = CA Score (e.g. /30) + Exam Score (e.g. /70) = Total /100

### 4.4 Performance Index Formula

```typescript
// Per course
const gradePoint_official = lookupGrade(totalScore);        // 0|1|2|3|4|5 (discrete)
const gradePoint_pi       = (totalScore / 100) * 5;         // 0.00–5.00 (continuous)

// Semester GPA
const gpa  = Σ(gradePoint_official * units) / Σ(units);
const pi   = Σ(gradePoint_pi * units)       / Σ(units);

// Cumulative (weighted across all semesters)
const cgpa = Σ(gpa  * creditLoaded) / Σ(creditLoaded);
const cpi  = Σ(pi   * creditLoaded) / Σ(creditLoaded);
```

**Why PI matters:** CGPA can stay at 5.00 while performance drops from 95% → 71% (both are A). PI detects that drift because 71% gives `gradePoint_pi = 3.55` while 95% gives `4.75`. This difference is the signal the regression model trains on.

**Edge case:** If user only has a letter grade (no raw score) → use `gradePoint_official` for CGPA normally, mark `estimated: true`, display PI with `~` prefix.

### 4.5 Degree Class Thresholds

| Degree Class | CGPA Range | Color | Badge Icon |
|---|---|---|---|
| First Class | 4.50–5.00 | `--class-first` + gold glow | 🏆 |
| Second Class Upper (2:1) | 3.50–4.49 | `--class-2upper` | 🎖 |
| Second Class Lower (2:2) | 2.40–3.49 | `--class-2lower` | ✅ |
| Third Class | 1.50–2.39 | `--class-third` | ⚠️ |
| Pass | 1.00–1.49 | `--class-pass` | 🔴 |
| Fail | 0.00–0.99 | `--class-fail` | ❌ |

---

## 5. Architecture

### 5.1 Folder Structure

```
acadegrade-v2/
├── .agents/                             ← AI agent skills (see Section 14)
│   ├── nextjs-app-router-patterns.md
│   ├── tailwind-design-system.md
│   ├── typescript-pro.md
│   ├── frontend-developer.md
│   ├── ui-skills.md
│   └── developing-genkit-js.md
├── app/
│   ├── (public)/
│   │   ├── page.tsx                     — Landing
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── calculator/page.tsx          — No-login quick CGPA calc
│   │   └── about/page.tsx
│   ├── (student)/
│   │   ├── layout.tsx                   — Auth guard + student shell
│   │   ├── dashboard/page.tsx
│   │   ├── results/
│   │   │   ├── page.tsx
│   │   │   └── [semesterId]/page.tsx
│   │   ├── insights/page.tsx
│   │   ├── transcript/page.tsx
│   │   ├── settings/page.tsx
│   │   └── notifications/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx                   — Admin auth guard (checks config/admins)
│   │   └── admin/
│   │       ├── login/page.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── users/page.tsx
│   │       ├── courses/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── settings/page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   ├── insights/route.ts        — Gemini academic analysis
│   │   │   ├── whatif/route.ts          — Reverse CGPA calculator + Gemini note
│   │   │   └── forecast/route.ts        — simple-statistics regression
│   │   ├── transcript/generate/route.ts — jsPDF generation
│   │   └── notifications/send/route.ts  — FCM push via firebase-admin
│   ├── layout.tsx                       — Root: fonts, providers, ThemeProvider
│   └── globals.css                      — Tailwind v4 @theme, CSS custom properties
├── components/
│   ├── ui/                              — Base atoms (Button, Input, Card, etc.)
│   ├── charts/                          — TrendChart, PIChart, SemesterBarChart
│   ├── cgpa/                            — CGPAArc, GradeTable, DegreeClassBadge
│   ├── ai/                              — InsightCard, WhatIfCalculator, ForecastChart
│   ├── forms/                           — ScoreEntryForm, SemesterForm, OnboardingForm
│   ├── layout/
│   │   ├── StudentShell.tsx             — Sidebar + bottom tab + mobile drawer
│   │   ├── AdminShell.tsx               — Admin-distinct sidebar
│   │   ├── BottomTabBar.tsx             — 4-tab mobile persistent nav
│   │   ├── MobileDrawer.tsx             — Slide-in full menu
│   │   └── Navbar.tsx                   — Public pages top nav
│   └── shared/                          — SkeletonCard, EmptyState, PageTransition
├── lib/
│   ├── firebase/
│   │   ├── client.ts
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── rtdb.ts
│   ├── ai/
│   │   ├── gemini.ts                    — GoogleGenAI client (server only)
│   │   ├── insights.ts                  — Prompt builder for insights
│   │   └── forecast.ts                  — simple-statistics regression wrapper
│   ├── cgpa/
│   │   ├── calculator.ts                — CGPA + PI computation engine
│   │   ├── gradeScale.ts
│   │   └── degreeClass.ts
│   ├── email/
│   │   └── mailer.ts                    — nodemailer Gmail SMTP config
│   ├── pdf/
│   │   └── transcript.ts                — jsPDF builder
│   └── utils/
│       ├── cn.ts
│       ├── format.ts
│       └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useCGPA.ts
│   ├── useSemesters.ts
│   ├── useInsights.ts
│   ├── useReducedMotion.ts
│   └── useNotifications.ts
├── types/
│   ├── user.ts
│   ├── semester.ts
│   ├── course.ts
│   ├── analytics.ts
│   └── ai.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/
│   └── og/
├── next.config.ts
└── tsconfig.json
```

### 5.2 Route Map

```
PUBLIC
  /                    Landing
  /login
  /register            Onboarding wizard (5 steps)
  /calculator          No-login CGPA quick tool
  /about

STUDENT (auth required)
  /dashboard
  /results
  /results/[semesterId]
  /insights
  /transcript
  /notifications
  /settings

ADMIN (admin email in config/admins required)
  /admin/login
  /admin/dashboard
  /admin/users
  /admin/courses
  /admin/analytics
  /admin/settings

API (server-only)
  POST /api/ai/insights
  POST /api/ai/whatif
  POST /api/ai/forecast
  POST /api/transcript/generate
  POST /api/notifications/send
```

---

## 6. Page Breakdown

### 6.1 Landing Page `/`

**Sections (top to bottom):**

**Hero (full viewport)**
- Animated starfield background (canvas, 80 particles, very slow drift, z-0)
- Cycling headline: "Track Your CGPA." → "Know Your Standing." → "Ace Your Degree."
  - Words fade out/in via Motion `AnimatePresence` every 2.5 seconds
  - Font: Bricolage Grotesque, `--text-hero`, `--acade-text`
- Sub-headline (DM Sans): "The smartest CGPA tracker built for Nigerian university students. AI-powered insights. Real academic clarity."
- Two CTAs: `[Get Started — it's free]` (primary indigo) + `[Try Calculator]` (ghost)
- Demo arc below CTAs: read-only, showing `4.72 CGPA · First Class`, slowly pulsing indigo glow

**Social Proof Marquee**
- Infinite scroll marquee: "Built for Nigerian Universities · ESUT · UNILAG · OAU · ABU · UNIBEN · UNN · LASU · UNIPORT ·"
- Subtle fade edges left and right

**Dual Metric Explainer**
- Section heading: "Why Two Metrics?"
- Two glassmorphism cards side by side (stack on mobile):
  - Left: **CGPA** — "Your official transcript grade point. What your university sees."
  - Right: **PI (Performance Index)** — "What CGPA misses. When 71% and 95% both print as A but represent very different mastery."
- Each card has a mini comparison chart: semester axis, flat CGPA line vs moving PI line
- Kimi's copy was sharper — use: *"Detects when 71% and 95% both print as A — but represent very different mastery."*

**9 Feature Cards (grid: 3 cols desktop, 2 cols tablet, 1 col mobile)**
- AI Academic Insights · Dual Metric System · Semester Tracking · PDF Transcript · What-If Calculator · Degree Class Projection · Push Notifications · Works Offline (PWA) · Course Catalog
- Each card: icon (lucide-react), title, 1-line description
- `whileInView` stagger reveal as user scrolls

**How It Works (4 numbered steps, horizontal on desktop, vertical on mobile)**
1. Create your account and set your programme
2. Choose your record mode and enter your course results
3. Get your CGPA + PI calculated instantly
4. Receive AI-powered insights and projections

**AI Preview Card**
- Mockup of the Insights page Written Analysis tab
- "Gemini 3.1 Flash-Lite" badge in corner
- Typing animation playing on the mockup text

**Footer**
- Links: About · Calculator · Privacy · Terms
- "Built by Joshuazaza · ESUT Computer Science 2026 · CSC 499 Final Year Project"

---

### 6.2 Register + Onboarding `/register`

Multi-step wizard. All state in React, committed to Firebase on Step 5 completion.

```
Step 1 — Account
  Full Name · Matric Number · Email · Password · Confirm Password

Step 2 — Programme
  University: ESUT Agbani (pre-filled, editable)
  Department: dropdown (populated from Firestore course catalog depts)
  Programme: e.g. B.Sc Computer Science
  Current Level: 100L / 200L / 300L / 400L / 500L
  Current Session: e.g. 2025/2026

Step 3 — Record Mode
  [From Scratch card]    — "Start fresh. Enter results as you go."
  [Complete Record card] — "You have past results to enter now."
  If Complete Record → show slider: "How many semesters completed?" (1–10)

Step 4 — (Complete Record only)
  System generates past semester list
  User confirms: "100L S1 (2022/2023), 100L S2 (2022/2023)..."
  Edit button on each if dates wrong

Step 5 — Done
  Firebase Auth createUserWithEmailAndPassword
  Firestore users/{uid} document created
  Pre-create past semesters if Complete Record
  Send welcome email via Gmail SMTP
  Redirect to /dashboard with confetti animation
```

Progress bar at top of wizard. Back button on each step. Form validation with Zod + react-hook-form.

---

### 6.3 Dashboard `/dashboard`

**Layout:** Single column on mobile, 2-column grid on desktop (main content left, sidebar right on desktop, sidebar becomes bottom on mobile)

#### Arc Hero Card
```
┌────────────────────────────────────────────┐
│  Good morning, Joshua 👋                   │
│                                            │
│         [CGPA Arc — 280px, centered]       │
│              4.72  ← Geist Mono, 5rem      │
│           PI: ~4.81  ← secondary          │
│        Second Class Upper (2:1) 🎖         │
│                                            │
│  [CGPA ●─────────── PI]  ← inline toggle  │
└────────────────────────────────────────────┘
```

CGPA/PI toggle sits directly below the arc on the same card — NOT on a separate settings page. This is the improvement from Kimi analysis.

#### Stats Row (4 cards, 2×2 on mobile, 4×1 on desktop)
- Total Credit Units
- Current Semester GPA
- Courses Completed
- **At Risk** (courses with E or F grade) — label "At Risk: X" not just "Risk Counter"

The "At Risk" label is explicitly borrowed from Kimi's cleaner naming.

#### Trend Chart
- Recharts LineChart
- X-axis: semesters (100L S1 → current)
- Line 1: CGPA (indigo `#6366F1`)
- Line 2: PI (gold `#F59E0B`)
- `isAnimationActive`, `animationBegin={400}`, `animationDuration={1200}`
- Custom tooltip on hover/tap

#### AI Summary Card
- 3-sentence Gemini-generated summary
- Shows degree class projection as clickable link → `/insights` (improvement from Kimi: inline link, not just text)
- Refresh icon button (triggers new AI call, rate-limited to 1/24h per user)
- "Powered by Gemini 3.1 Flash-Lite" badge

#### Recent Activity
- Last 5 courses entered with course code + grade badge
- Link: "View all results →" → `/results`

#### Quick Actions Row
- [Add Results] · [View Insights] · [Export Transcript] · [Share CGPA Card]

---

### 6.4 Results `/results`

Semester accordion tree. Sorted level → semester number.

Each accordion row (collapsed):
```
[▶] 300L First Semester (2024/2025)   [GPA: 4.50 · 18 units]  [Ongoing]
```

**Ongoing badge:** The current active semester gets an amber `Ongoing` pill. This is the improvement from Kimi — students instantly see which semester is live without reading dates.

Expanded row shows read-only course table with grade badges.
[Edit] button → `/results/[semesterId]`

Mobile: `[+ New Semester]` button is in the **page header (top-right)**, not buried at the bottom of the list. This is the mobile improvement from Kimi.

---

### 6.5 Semester Detail `/results/[semesterId]`

Full course score entry table.

| # | Code | Title | Units | CA (/30) | Exam (/70) | Total | Grade | GP | PI |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CSC301 | Data Structures | 3 | 28 | 64 | 92 | A | 5.0 | 4.60 |

- Course code field: autocomplete from Admin Course Catalog (search by dept + level)
- Manual add option if course not in catalog
- `totalScore` auto-computed as CA + Exam updates
- Grade + GP + PI auto-computed in real time
- Row addition is spring-animated
- Shake animation on invalid score (> max, non-numeric)
- Bottom summary: Semester GPA · PI · Total Credits · Grade distribution bar

"Save Semester" writes to Firestore, recomputes `analytics/{uid}` via API call.
"Delete Semester" → confirm modal with motion scale animation.

---

### 6.6 AI Insights `/insights`

#### Tabs: Forecast · What-If · Risk Analysis · Written Analysis

**Forecast Tab:**
- Recharts LineChart: historical + 2-semester projected (dashed line, lighter color)
- `simple-statistics` `linearRegression` on the student's own PI history
- Projection display: "Projected CGPA by 400L S2: **4.65** → First Class"
- Light blue confidence band around projected range
- Note: forecast always uses PI series for regression (more granular), then converts back to estimated CGPA

**What-If Tab:**
```
Target CGPA: [─────────────────●──] 4.50      [5.00]
Remaining semesters: [2]
Credit load per semester: [18]

Required GPA per remaining semester: 4.28
That means scoring ~68/100 average across all courses.
Feasibility: Achievable with consistent B+ performance.
[Recalculate]
```
Slider at min touch target (48px). Computation is pure math + 1 Gemini call for feasibility note.

**Risk Analysis Tab:**
- Risk gauge (1–5, SVG arc): computed from slope of PI trend
- Flagged courses: scores < 50 in last 2 semesters (red badge)
- Trend label: "Declining trend detected" / "Stable" / "Improving" (color-coded banner)
- Department breakdown: which course groups have lowest avg scores

**Written Analysis Tab:**
- Gemini 3.1 Flash-Lite response: Strengths · Concerns · Recommendations · Degree Outlook
- 400–600 words, structured with headers
- Typing animation on first render (character-by-character with Motion)
- Regenerate button
- Last generated timestamp shown

---

### 6.7 Transcript `/transcript`

HTML preview matching the PDF layout exactly.

**Content:**
- ESUT header (logo, "Enugu State University of Science and Technology, Agbani")
- Student details: Name, Matric, Programme, Department, Level
- Results table per semester: course code, title, units, CA, Exam, Total, Grade, GP
- Semester sub-total row: GPA · Total Credits
- Cumulative CGPA + PI at the bottom
- Degree class (labeled "Projected — Not an official university document")
- Footer: "Generated by AcadeGrade · Joshuazaza · For reference only"

[Download PDF] → calls `/api/transcript/generate` → jsPDF → returns blob → auto-downloads.

---

### 6.8 Settings `/settings`

Sections:
1. **Profile** — Name, Matric, Department, Level, Avatar (Cloudinary upload)
2. **Academic Setup** — Record Mode toggle (with migration warning) · Default metric toggle
3. **Notifications** — FCM push permission request + topic preferences
4. **Email** — Email address (read-only after register), change password
5. **Account** — Delete account (type "DELETE" to confirm, motion-animated destructive modal)

---

### 6.9 Notifications `/notifications`

Full notifications list. All read/unread states.
On mobile: bell icon in header opens **inline dropdown** (not route navigation) for last 5 notifications. "View all" links to this page.

---

### 6.10 Admin Pages

**Shell distinction:** Admin shell has a **red shield icon + "Admin Panel" header** at the top of the sidebar/drawer, visually distinct from the student shell. Admin can never mistake which mode they're in.

#### `/admin/dashboard`
- 4 stat cards: Total Users · Avg CGPA · Avg PI · Active This Week
- CGPA distribution histogram (Recharts BarChart, 0.5-point buckets)
- Department breakdown bar chart
- New user signups line chart (last 30 days)
- Last 10 activity feed

#### `/admin/users`
- Searchable table: Name · Matric · Dept · Level · CGPA · PI · Joined
- Expandable rows: full profile, semester summary, [Disable] [Send Email] buttons

#### `/admin/courses`
Course Catalog CRUD. Code · Title · Units · Dept · Level · Semester.
Add/Edit in modal. This catalog populates autocomplete in `/results/[semesterId]`.

#### `/admin/analytics`
- CGPA distribution curve
- PI vs CGPA scatter plot (Recharts ScatterChart)
- Department leaderboard
- Degree class breakdown donut chart
- Export anonymized CSV

#### `/admin/settings`
- Grade scale override
- Gemini system prompt template (editable rich textarea)
- Announcement banner (dismissible banner shown on all student dashboards)
- Maintenance mode toggle

---

## 7. Mobile Navigation System

**Critical: Mobile-first means the mobile nav is designed first, desktop is an enhancement.**

### 7.1 Bottom Tab Bar (Primary Mobile Nav)

Persistent bottom bar, 4 tabs. Always visible in student shell on mobile (< 768px). Hidden on desktop (sidebar takes over).

```
┌────────────────────────────────────┐
│  🏠        📋       🧠       📄   │
│ Home    Results  Insights  Script  │
└────────────────────────────────────┘
```

- Tabs: Dashboard · Results · Insights · Transcript
- Active tab: filled icon + indigo label + spring scale animation + indigo indicator dot above icon
- Inactive tab: muted icon + muted label
- Height: 64px + safe-area-inset-bottom (handles iPhone notch)
- Background: `--acade-deep` + 1px top border `--acade-border`
- The bottom tab bar is the primary navigation — NOT the hamburger drawer

### 7.2 Hamburger Drawer (Secondary Mobile Nav)

Opens via hamburger icon in top-right of mobile header. Contains secondary pages.

**Student Drawer:**
```
╔═══════════════════════════════╗
║  [X]                          ║
║                               ║
║  ┌────────────────────┐       ║
║  │ [Avatar ring CGPA] │       ║
║  │ Joshua Chimaobi    │       ║
║  │ 2022030202909      │ ← matric under name
║  └────────────────────┘       ║
║                               ║
║  ⚙️  Settings                ║
║  🧮  Quick Calculator         ║
║  🔔  Notifications  [3]       ║
║  ℹ️  About                   ║
║                               ║
║  [Sign Out]                   ║
╚═══════════════════════════════╝
```

**Admin Drawer:**
```
╔═══════════════════════════════╗
║  [🛡️ Admin Panel]            ║  ← Red shield icon + "Admin Panel" label
║                               ║
║  📊  Dashboard                ║
║  👤  Users                   ║
║  📚  Course Catalog           ║
║  📈  Analytics                ║
║  ⚙️  Settings                ║
║                               ║
║  admin@email.com              ║
║  [Sign Out]                   ║
╚═══════════════════════════════╝
```

Admin drawer header is visually distinct: red/danger-toned header strip with shield icon. This prevents admins from ever confusing which mode they're in.

**Drawer animation:** slides in from right, backdrop blur, closes on swipe-left or tap outside.

### 7.3 Desktop Sidebar (Student)

Visible on md+ screens. Fixed left, 240px width.

```
┌──────────────────────┐
│   [Mini CGPAArc]     │  ← 52px sm arc as avatar ring
│   Joshua C.          │
│   2022030202909      │
│                      │
│  ● Dashboard         │
│  ○ Results           │
│  ○ Insights          │
│  ○ Transcript        │
│  ○ Notifications  [3]│
│  ○ Settings          │
│                      │
│  [Sign Out]          │
└──────────────────────┘
```

Active item: indigo left border + indigo text + subtle bg tint.
Mini CGPAArc shows live CGPA value. Clicking → `/dashboard`.

### 7.4 Mobile Notification Bell

In the mobile header (right side, next to hamburger). Shows unread count badge.
Tap → opens **inline dropdown** (not route navigation) showing last 5 notifications + "View all" link. This is faster than routing on mobile.

---

## 8. Component Library

No shadcn. No Radix UI. No external UI library. Build everything from scratch.

### Atoms

```typescript
// Button
type ButtonProps = {
  variant: 'primary' | 'ghost' | 'outline' | 'danger' | 'gold';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  // Min 48px height always
};

// Input
// — label above, error below, animated focus ring in --acade-primary
// — variants: default | search | score (numeric, right-aligned, Geist Mono)

// Toggle
// — spring-animated thumb, transitions color via CSS var
// — two label props: left and right (e.g. "CGPA" and "PI")

// Badge
// — variants: grade-a|b|c|d|e|f | degree-class | status | ongoing
// — 'ongoing' variant: amber fill, used on active semester row

// Modal
// — backdrop blur, AnimatePresence scale 0.9→1
// — confirm variant: red action button, requires text input for destructive action

// Select
// — fully custom, not native <select>
// — searchable variant for course autocomplete

// Card
// — base card + hover lift variant + glow variant (indigo glow on hover)

// Skeleton
// — shimmer animation, exact shape of real content
```

### Compound Components

```typescript
// CGPAArc
props: {
  cgpa: number;
  pi: number;
  size: 'sm' | 'md' | 'lg';
  animateOnMount?: boolean;
  showParticles?: boolean;   // false for sm
}
// SVG, 270° sweep, dual rings, spring animation, particle burst, glow dot

// GradeTable
props: {
  courses: Course[];
  semesterId: string;
  editable: boolean;
  onSave: (data: CourseInput[]) => void;
}
// Real-time grade/GP/PI computation as scores typed
// Animated row add, shake on invalid

// DegreeClassBadge
props: { cgpa: number; animated?: boolean }
// Resolves class, renders with color + icon
// Unlock animation: scale 0.4→1.15→1 + glow pulse

// TrendChart
props: {
  semesters: SemesterSummary[];
  metric: 'cgpa' | 'pi' | 'both';
  showForecast?: boolean;
  forecastPoints?: { x: number; y: number }[];
}

// InsightCard
props: {
  title: string;
  content: string;
  type: 'forecast' | 'risk' | 'tip' | 'achievement';
}
// Gemini icon badge, typing animation on first render

// WhatIfCalculator
props: {
  currentCGPA: number;
  totalCredits: number;
  remainingSemesters: number;
}
// Slider for target, live required GPA computation

// SemesterAccordion
props: { semesters: Semester[]; onEdit: fn; onDelete: fn }
// Spring expand/collapse
// Shows "Ongoing" amber pill on active semester
// "+" button in header on mobile

// ScoreModeToggle / RecordModeToggle
// Persists to Firestore on change
// Animated spring thumb

// TranscriptPDF
// HTML preview + jsPDF download via API route

// NotificationBell
// RTDB listener for unread count
// Inline dropdown on mobile
// FCM registration

// BottomTabBar
// 4-tab persistent mobile nav
// Spring-animated indicator
// safe-area-inset-bottom padding

// MobileDrawer
// Slide-in from right
// Swipe-left to close (touch event)
// Admin variant with red shield header

// OnboardingWizard
// 5-step wizard with progress bar
// Back button each step
// Zod validation per step
```

---

## 9. Data Architecture

### 9.1 Firestore Schema

```
users/{uid}
  name:             string
  email:            string
  matric:           string
  dept:             string
  level:            100|200|300|400|500
  programme:        string
  university:       string   (default: 'ESUT Agbani')
  avatarUrl:        string|null
  recordMode:       'fromScratch'|'complete'
  gradeMode:        'cgpa'|'pi'
  currentSession:   string   ('2025/2026')
  isAdmin:          boolean
  disabled:         boolean
  fcmToken:         string|null
  createdAt:        Timestamp
  updatedAt:        Timestamp

users/{uid}/semesters/{semesterId}
  label:        string   ('300L First Semester')
  session:      string   ('2024/2025')
  level:        number
  semester:     1|2
  gpa:          number   (computed, stored)
  pi:           number   (computed, stored)
  creditLoaded: number
  isComplete:   boolean  (false = "Ongoing")
  createdAt:    Timestamp
  updatedAt:    Timestamp

users/{uid}/semesters/{semesterId}/courses/{courseId}
  code:         string   ('CSC301')
  title:        string
  units:        number
  caScore:      number|null
  examScore:    number|null
  totalScore:   number|null
  grade:        'A'|'B'|'C'|'D'|'E'|'F'|null
  gradePoint:   number   (0–5, official)
  piPoint:      number   (0–5, continuous)
  estimated:    boolean
  createdAt:    Timestamp
  updatedAt:    Timestamp

analytics/{uid}
  cgpa:            number
  pi:              number
  degreeClass:     string
  totalCredits:    number
  semesterHistory: Array<{semesterId, label, gpa, pi, creditLoaded, session}>
  regressionSlope: number
  projectedCGPA:   number
  riskScore:       number   (1–5)
  lastUpdated:     Timestamp

courses/{courseCode}                    ← Admin Catalog
  code:     string
  title:    string
  units:    number
  dept:     string
  level:    number
  semester: 1|2
  createdAt: Timestamp

config/admins
  emails:   string[]

config/settings
  announcementBanner: string|null
  maintenanceMode:    boolean
  aiSystemPrompt:     string
  gradeScale:         Array<{minScore, grade, gradePoint}>

notifications/{uid}/items/{notifId}
  type:      'achievement'|'warning'|'tip'|'system'
  title:     string
  message:   string
  read:      boolean
  createdAt: Timestamp
```

### 9.2 Realtime Database

Used only for live notification badge counter.

```json
{
  "notif_counts": {
    "{uid}": { "unread": 3 }
  }
}
```

`useNotifications` hook uses `onValue` on `notif_counts/{uid}/unread` → instant bell badge updates.

### 9.3 Security Rules

**Must be published manually in Firebase Console after every change. Cannot be automated.**

```javascript
// Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      match /semesters/{semId} {
        allow read, write: if request.auth.uid == uid;
        match /courses/{courseId} {
          allow read, write: if request.auth.uid == uid;
        }
      }
    }
    match /analytics/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false; // server-side only via firebase-admin
    }
    match /courses/{code} {
      allow read: if request.auth != null;
      allow write: if false; // admin only via server
    }
    match /config/{doc} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /notifications/{uid}/items/{notifId} {
      allow read: if request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

```json
// RTDB Rules
{
  "rules": {
    "notif_counts": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": false
      }
    }
  }
}
```

---

## 10. AI Integration

### Model

```typescript
// lib/ai/gemini.ts — SERVER SIDE ONLY
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateContent(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',   // ← this is the correct model string
    contents: prompt,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.65,
    }
  });
  return response.text ?? '';
}
```

> Model: `gemini-3.1-flash-lite` — low-latency, cost-efficient, perfect for AcadeGrade's insight calls.
> Package: `@google/genai` v2.8.0. NEVER use `@google/generative-ai` (deprecated/EOL).
> All calls from `/app/api/` routes only. `GEMINI_API_KEY` stays server-side.

### AI Features

#### 1. Academic Insights (`/api/ai/insights`)
```
Input:  { cgpa, pi, degreeClass, riskScore, semesterHistory, weakCourses }
Output: { strengths[], concerns[], recommendations[], degreeOutlook }
Rate limit: 1 call per user per 24 hours (Firestore timestamp check)
```

System prompt (editable by admin in `/admin/settings`):
```
You are AcadeGrade AI, an academic advisor for Nigerian university students.
Analyze this student's academic record and respond ONLY with valid JSON (no markdown):
{
  "strengths": ["point 1", "point 2"],
  "concerns": ["point 1"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "degreeOutlook": "one sentence projection"
}
Student data: {JSON.stringify(data)}
```

#### 2. What-If (`/api/ai/whatif`)
```
Input:  { currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad }
Output: { requiredGPA, requiredAvgScore, feasibilityNote }
Math-first: requiredGPA computed without LLM. Gemini only writes feasibilityNote (1 sentence).
```

#### 3. Forecast (`/api/ai/forecast`)
```
Input:  { piHistory: number[] }  // PI value per semester
Processing:
  import { linearRegression, linearRegressionLine } from 'simple-statistics';
  const { m, b } = linearRegression(piHistory.map((y, x) => [x, y]));
  const predict  = linearRegressionLine({ m, b });
  const slope    = m;
  const projected = [predict(n), predict(n+1)];  // next 2 semesters
Output: { slope, projected, riskScore, trendLabel }
Gemini writes trendLabel only (e.g. "Consistent upward trend — First Class trajectory")
```

> Forecast bug from Kimi: their regression extrapolated into negative values.
> Fix: clamp all projected values to [0.00, 5.00] range before returning.
> `const clamp = (v: number) => Math.max(0, Math.min(5, v));`

---

## 11. Email (Gmail SMTP)

```typescript
// lib/email/mailer.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,         // TLS
  auth: {
    user: process.env.GMAIL_USER,    // your Gmail address
    pass: process.env.GMAIL_PASS,    // your Gmail App Password (26-character)
  },
});

export async function sendEmail({
  to, subject, html
}: { to: string; subject: string; html: string }) {
  return transporter.sendMail({
    from: `"AcadeGrade" <${process.env.GMAIL_USER}>`,
    to, subject, html,
  });
}
```

**.env.local variables:**
```
GMAIL_USER=your.gmail@gmail.com
GMAIL_PASS=your-26-char-app-password
```

**Email triggers:**
| Trigger | Recipient | Subject |
|---|---|---|
| Registration | Student | "Welcome to AcadeGrade, {name} 🎓" |
| Results saved | Student | "Semester saved — GPA: {gpa}" |
| Degree class change | Student | "You've hit {class}! 🏆" |
| Admin broadcast | All users | Configured in `/admin/settings` |
| New user registered | Admin | "New AcadeGrade signup: {name}" |

**HTML email template:** inline CSS only (no Tailwind in emails). Dark brand colors. ESUT attribution in footer.

---

## 12. API Routes

All in `app/api/`. Server-side only. Use `firebase-admin` for verified writes.

```typescript
// Auth pattern for all student routes:
const token = request.headers.get('Authorization')?.replace('Bearer ', '');
const decoded = await adminAuth.verifyIdToken(token!);
const uid = decoded.uid;
```

| Route | Method | Auth | Returns |
|---|---|---|---|
| `/api/ai/insights` | POST | Firebase ID token | `{ strengths, concerns, recommendations, degreeOutlook }` |
| `/api/ai/whatif` | POST | Firebase ID token | `{ requiredGPA, requiredAvgScore, feasibilityNote }` |
| `/api/ai/forecast` | POST | Firebase ID token | `{ slope, projected, riskScore, trendLabel }` |
| `/api/transcript/generate` | POST | Firebase ID token | PDF blob |
| `/api/notifications/send` | POST | Admin service account | FCM send result |

---

## 13. PWA & Notifications

### PWA (Serwist v9.5.11)

```typescript
// next.config.ts
import withSerwist from '@serwist/next';
export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})({ /* nextjs config */ });
```

**Offline behavior:**
- Dashboard: serves cached last-computed CGPA/PI + skeleton
- Results: read-only from cache; writes queued on reconnect
- Insights: shows last cached analysis with "Generated offline" banner

**manifest.json:**
```json
{
  "name": "AcadeGrade",
  "short_name": "AcadeGrade",
  "description": "AI-Powered CGPA Tracker for Nigerian Universities",
  "theme_color": "#6366F1",
  "background_color": "#07090F",
  "display": "standalone",
  "start_url": "/dashboard",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

### FCM Push Notifications

| Trigger | Message | Tone |
|---|---|---|
| Semester GPA saved | "300L S1 saved. GPA: 4.50 — Outstanding performance! 🎉" | Celebratory |
| Degree class crosses threshold | "You've hit Second Class Upper! Keep pushing 🏆" | Motivational |
| Risk score hits 4+ | "Academic risk flag raised. Check your Insights." | Urgent |
| Admin announcement | Custom message from `/admin/settings` | Neutral |
| AI analysis ready | "Your AI report is ready. Tap to read 🤖" | Informational |

---

## 14. Agent Skills (.agents folder)

Install these in the project root `.agents/` directory. Reference them at the start of every Antigravity session.

### `.agents/nextjs-app-router-patterns.md`
```markdown
# Next.js 16 App Router Patterns (AcadeGrade v2)

- ALWAYS use App Router: app/ directory only. Never use pages/.
- Route groups: (public), (student), (admin) — use parentheses for layout grouping.
- `use client` ONLY for components that use hooks, browser APIs, or event handlers.
- Server Components are default — prefer them for data fetching.
- Layout.tsx handles auth guards:
  (student)/layout.tsx → checks Firebase Auth, redirects to /login if not authenticated.
  (admin)/layout.tsx → checks uid against config/admins.emails via firebase-admin.
- API routes: app/api/**/route.ts — always use Request/Response, never Express patterns.
- Dynamic routes: [semesterId] — always validate params with Zod.
- Never use next/router (pages router) — use next/navigation: useRouter, usePathname, useSearchParams.
- next/link for all internal navigation.
- next/image for all images with width, height, and alt props.
- next/font/google for Bricolage Grotesque + DM Sans.
- Environment variables: NEXT_PUBLIC_ prefix for client-side, plain for server-side only.
```

### `.agents/tailwind-design-system.md`
```markdown
# Tailwind v4 Design System (AcadeGrade v2)

- Tailwind v4 is CSS-first. Use @theme in globals.css to define tokens.
- No tailwind.config.js plugin pattern for v4.
- All custom color tokens defined as CSS custom properties under @theme.
- Use CSS vars directly: bg-[--acade-void], text-[--acade-primary].
- clamp() for ALL font sizes — no fixed text-sm, text-lg etc. for responsive text.
- Responsive: base (mobile) → md:  → lg:  → xl:  (mobile-first always).
- Min touch target: h-12 (48px) on ALL interactive elements — buttons, inputs, tabs.
- Bottom tab bar: pb-safe for safe-area-inset (iOS notch).
- Dark mode: class strategy via next-themes. 'dark' class on html element.
- Shimmer skeleton: custom CSS @keyframes shimmer — not a library.
- Grid: grid-cols-2 on mobile for stat cards, grid-cols-4 on desktop.
- Never use @apply in components — use className strings directly.
```

### `.agents/typescript-pro.md`
```markdown
# TypeScript 6 Standards (AcadeGrade v2)

- Strict mode: "strict": true in tsconfig.json.
- Never use `any` — use `unknown` and type-narrow.
- All Firebase documents have typed interfaces in types/.
- Zod schemas validate all form inputs and API request bodies.
- API routes: type Request body explicitly with Zod parse.
- useAuth hook returns: { user: User | null, loading: boolean, uid: string | null }
- All async functions must handle errors with try/catch.
- Type all Recharts data arrays.
- Enum-style string literals for grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
- recordMode: 'fromScratch' | 'complete'  — not boolean flags.
- Never cast with `as any` to silence TypeScript errors — fix the type.
```

### `.agents/frontend-developer.md`
```markdown
# Frontend Developer Rules (AcadeGrade v2)

- Mobile-first design: design base styles for mobile, enhance with md: and lg:.
- Bottom tab bar is primary mobile nav — not hamburger.
- Min 48px touch targets everywhere (h-12 in Tailwind).
- All data-fetching states show skeleton (not spinner).
- Every state: loading / error / empty / populated — handle all four.
- Empty states have illustrations + CTA buttons, not just text.
- Error states have retry buttons.
- Forms: react-hook-form + Zod. Never uncontrolled inputs.
- Toast notifications: react-hot-toast for all success/error feedback.
- Image uploads: Cloudinary direct fetch() with hardcoded cloud name.
- No window access in Server Components.
- Accessibility: all interactive elements have aria-label.
- Focus management: modals trap focus (use ref + keydown listener).
- Lazy load heavy components (charts, PDF preview) with next/dynamic.
```

### `.agents/ui-skills.md`
```markdown
# UI Skills (AcadeGrade v2)

- NO shadcn. NO Radix UI. NO external component libraries. Build from scratch.
- Animation: motion/react (not framer-motion import path).
- Every page: AnimatePresence page transition (fade + slide-up + blur).
- Cards: whileHover lift + indigo glow shadow.
- Buttons: whileTap scale 0.96.
- Arc gauge: SVG stroke-dashoffset animated with spring physics.
- Number displays: react-countup for all GPA/CGPA/score values.
- Degree class badge: unlock animation on threshold crossing.
- Stagger card reveals with whileInView.
- Input validation: shake animation on invalid entry.
- Reduced motion: useReducedMotion() in every animated component.
- Particle burst: 20 canvas dots from arc endpoint on animation complete.
- Grade badge colors: A=green, B=indigo (NOT green), C=gold, D=orange, E=red, F=grey.
- Geist Mono font for ALL numeric data display.
- Bricolage Grotesque for ALL display/hero text.
```

### `.agents/developing-genkit-js.md`
```markdown
# AI Integration (AcadeGrade v2)

- Package: @google/genai v2.8.0 — NEVER @google/generative-ai (deprecated).
- Model: 'gemini-3.1-flash-lite' — this is the correct model string.
  There is NO gemini-3.5-flash-lite. The lite model is 3.1, not 3.5.
- All Gemini calls: SERVER-SIDE ONLY in app/api/ routes.
- API key: process.env.GEMINI_API_KEY — never expose to client.
- Client pattern: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
- Generate: await ai.models.generateContent({ model, contents, config })
- When asking for JSON: prompt must say "respond ONLY with valid JSON, no markdown backticks".
- Parse response: JSON.parse(response.text.replace(/```json|```/g, '').trim())
- Rate limit AI calls: check Firestore for lastAiCall timestamp before calling.
- Forecast: simple-statistics linearRegression (not AI) for math. Gemini only for text labels.
- Clamp all regression outputs to [0.00, 5.00] — never return negative projections.
- Max output tokens: 1024 for insights, 256 for labels/notes.
```

---

## 15. Hard Rules for Antigravity IDE

Paste this entire block at the start of every Antigravity session.

```
═══════════════════════════════════════════════════════════
ACADEGRADE V2 — HARD RULES (MUST FOLLOW — NEVER BREAK)
═══════════════════════════════════════════════════════════

STACK
1.  NEVER import shadcn, Radix UI, or any external component library.
    Build all UI from scratch with Tailwind + motion.
2.  COMPLETE FILES ALWAYS. Never truncate. Never write "// rest unchanged".
3.  Next.js 16.2.9 App Router only. Never use pages/ directory.
4.  use client ONLY for components with hooks, events, or browser APIs.
5.  Tailwind v4 CSS-first: @theme in globals.css. Not tailwind.config.js plugins.

FIREBASE
6.  firebase v12.14.0: modular SDK only.
    import { doc, getDoc } from 'firebase/firestore' — not namespaced SDK.
7.  firebase-admin v14.0.0: SERVER-SIDE ONLY. Never in client components.
8.  Firestore security rules CANNOT be published automatically.
    ALWAYS flag: "Publish these rules manually in Firebase Console."
9.  RTDB used only for notif_counts. Firestore for all other data.

AI
10. Package: @google/genai v2.8.0 ONLY.
    NEVER use @google/generative-ai — it is deprecated and EOL.
11. Model string: 'gemini-3.1-flash-lite'
    There is NO gemini-3.5-flash-lite.
    Do NOT use gemini-3.5-flash for AcadeGrade — use the lite model.
12. Gemini API: SERVER-SIDE ONLY in app/api/ routes.
    NEVER call Gemini from client components.
13. Clamp all regression projections: Math.max(0, Math.min(5, value))

ANIMATION
14. Animation package: import from 'motion/react' (package name: motion v12.40.0).
15. Every animated component: check useReducedMotion() first.
16. Particle burst: canvas-based, NOT Math.random() — use deterministic seed.

CALCULATIONS
17. CGPA and PI are computed client-side after data loads, then written to
    analytics/{uid} via /api route using firebase-admin. Never trust stale analytics.
18. Grade scale: A=5(70+), B=4(60-69), C=3(50-59), D=2(45-49), E=1(40-44), F=0(0-39).
    Never change without checking config/settings.gradeScale.
19. Grade B color: --grade-b is INDIGO (#6366F1). NOT green. B≠A visually.
20. PI clamp: gradePoint_pi = (totalScore / 100) * 5 → range 0.00–5.00.

MOBILE
21. Mobile-first always. Bottom tab bar is primary mobile nav (not hamburger).
22. Min touch target: 48px height on ALL interactive elements.
23. clamp() for all font sizes — never fixed px for text.

ASSETS
24. Cloudinary: direct fetch() only with cloud name 'acadegrade' and preset
    'acadegrade_avatars'. resource_type: 'auto'. NEVER Cloudinary SDK.
25. Fonts: Bricolage Grotesque (display), DM Sans (body), Geist Mono (all numbers).
    Load via next/font/google and geist package.

EMAIL
26. Gmail SMTP via nodemailer. Config in lib/email/mailer.ts.
    Credentials from process.env.GMAIL_USER + process.env.GMAIL_PASS.
    NEVER hardcode email credentials.

GENERAL
27. Admin check: verify against Firestore config/admins.emails[] via firebase-admin
    in (admin)/layout.tsx. Never hardcode admin emails in client code.
28. jsPDF v4.2.1 — check constructor API before use. May differ from v3.
29. No hardcoded sample/mock data in production code.
═══════════════════════════════════════════════════════════
```

---

*DESIGN.md v2.1 · AcadeGrade v2 · Joshuazaza · ESUT CS 2026*  
*This document is the single source of truth for the entire build.*  
*Reference PROMPT.md for phase-by-phase Antigravity build prompts.*

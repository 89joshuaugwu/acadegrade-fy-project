# AcadeGrade v2 — PROMPT.md
> Phase-by-phase Antigravity IDE build prompts  
> Author: Joshuazaza · CSC 499 · ESUT Agbani  
> Paste the CONTEXT BLOCK first in every session, then paste the phase prompt.

---

## HOW TO USE THIS FILE

1. Open a new Antigravity session (Claude Opus 4.6 Thinking)
2. **Paste the CONTEXT BLOCK below first** (always, every session)
3. Then paste the relevant **Phase Prompt**
4. Build that phase completely before moving to the next
5. Never mix phases in one session

---

## CONTEXT BLOCK (Paste First — Every Session)

```
You are building AcadeGrade v2, a Next.js 16.2.9 App Router full-stack academic platform for Nigerian university students. This is a CSC 499 final year project by Joshua Chimaobi Ugwu (Joshuazaza) at ESUT, Agbani.

TECH STACK:
- Next.js 16.2.9 App Router | React 19.2.7 | TypeScript 6.0.3
- Tailwind CSS 4.3.1 (CSS-first, @theme in globals.css)
- motion v12.40.0 (import from 'motion/react')
- Firebase 12.14.0 (modular SDK) + firebase-admin 14.0.0
- @google/genai v2.8.0 → model: 'gemini-3.1-flash-lite'
- recharts 3.8.1 | react-countup 6.5.3 | react-hook-form 7.79.0 | zod 4.4.3
- jspdf 4.2.1 | nodemailer 8.0.11 | lucide-react 1.18.0
- next-themes 0.4.6 | react-hot-toast 2.6.0 | simple-statistics 7.9.0
- @serwist/next 9.5.11 | geist 1.7.2

BRAND:
- Background: #07090F | Cards: #0E1322 | Surface: #141B2E
- Primary: #6366F1 (indigo) | Gold: #F59E0B | Border: #1F2B47
- Text: #E8EDFF | Muted: #8892B0
- Grade A: #22C55E | Grade B: #6366F1 (indigo, NOT green) | Grade C: #F59E0B
- Fonts: Bricolage Grotesque (display) | DM Sans (body) | Geist Mono (numbers)

ABSOLUTE RULES:
1. NEVER use shadcn, Radix UI, or any component library — build from scratch
2. COMPLETE FILES ALWAYS — never truncate, never "// rest unchanged"
3. App Router ONLY — never pages/ directory
4. 'use client' ONLY for hooks/events/browser APIs
5. @google/genai ONLY (NOT @google/generative-ai)
6. Gemini model: 'gemini-3.1-flash-lite' (NOT gemini-3.5-flash-lite — that doesn't exist)
7. All Gemini + firebase-admin calls: SERVER-SIDE ONLY in app/api/ routes
8. After any Firestore rules change: FLAG manual publish in Firebase Console
9. Min 48px touch targets on ALL interactive elements
10. clamp() for all font sizes
11. useReducedMotion() in every animated component
12. Mobile-first: bottom tab bar is primary mobile nav
13. Grade B color = indigo #6366F1 (NOT green)
14. Clamp regression outputs: Math.max(0, Math.min(5, value))
15. Cloudinary: direct fetch() only — never SDK
16. No Math.random() in CGPA/PI calculations
17. CGPA formula: Σ(gradePoint × units) / Σ(units)
18. PI formula: Σ((totalScore/100×5) × units) / Σ(units)
19. Grade scale: A=5(70+), B=4(60-69), C=3(50-59), D=2(45-49), E=1(40-44), F=0(0-39)
20. Gmail SMTP credentials from process.env.GMAIL_USER + GMAIL_PASS (never hardcode)
```

---

## Phase 0 — Project Scaffolding

```
ACADEGRADE V2 — PHASE 0: PROJECT SCAFFOLDING

Scaffold the complete AcadeGrade v2 Next.js project.

DO:
1. Create package.json with ALL these exact versions:
   next@16.2.9, react@19.2.7, react-dom@19.2.7, typescript@6.0.3,
   tailwindcss@4.3.1, motion@12.40.0, geist@1.7.2, lucide-react@1.18.0,
   react-hot-toast@2.6.0, next-themes@0.4.6, recharts@3.8.1, react-countup@6.5.3,
   firebase@12.14.0, firebase-admin@14.0.0, react-hook-form@7.79.0,
   @hookform/resolvers@5.4.0, zod@4.4.3, @google/genai@2.8.0,
   simple-statistics@7.9.0, jspdf@4.2.1, nodemailer@8.0.11, date-fns@4.4.0,
   @serwist/next@9.5.11, serwist@9.5.11, @types/node@25.9.3

2. Create tsconfig.json with strict: true and correct path aliases (@/*)

3. Create next.config.ts with:
   - Serwist PWA config (swSrc: 'app/sw.ts', swDest: 'public/sw.js')
   - Image domains for Cloudinary (res.cloudinary.com)
   - Experimental: reactCompiler: true (React 19)

4. Create the COMPLETE folder structure as per DESIGN.md Section 5.1:
   - All app/ route groups: (public), (student), (admin)
   - All api/ routes
   - All components/ subdirectories
   - All lib/ subdirectories
   - All hooks/ files (empty with correct signatures)
   - All types/ files with complete TypeScript interfaces

5. Create .env.local.example with all required environment variables:
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   GEMINI_API_KEY=
   GMAIL_USER=
   GMAIL_PASS=
   CLOUDINARY_CLOUD_NAME=acadegrade

6. Create lib/firebase/client.ts — Firebase client SDK init
7. Create lib/firebase/admin.ts — Firebase Admin SDK init (server only)
8. Create types/user.ts, types/semester.ts, types/course.ts, types/analytics.ts, types/ai.ts
   with ALL TypeScript interfaces matching the Firestore schema in DESIGN.md Section 9.1

9. Create app/sw.ts — Serwist service worker with offline caching strategy

OUTPUT: All files complete and ready. No placeholder comments. Real implementations.
```

---

## Phase 1 — Design System

```
ACADEGRADE V2 — PHASE 1: DESIGN SYSTEM

Build the complete AcadeGrade v2 design system and root layout.

FILES TO CREATE/COMPLETE:

1. app/globals.css — COMPLETE Tailwind v4 CSS with:
   - @import 'tailwindcss'
   - @theme block with ALL CSS custom properties from DESIGN.md Section 3.2
     (--acade-void, --acade-deep, --acade-surface, --acade-overlay, --acade-border,
      --acade-primary, --acade-primary-hover, --acade-primary-glow, --acade-primary-dim,
      --acade-gold, --acade-gold-hover, --acade-gold-dim,
      --acade-success, --acade-danger, --acade-warning, --acade-info,
      --acade-text, --acade-text-muted, --acade-text-faint, --acade-text-inverse,
      --grade-a through --grade-f, --class-first through --class-fail)
   - Light mode variants under .light class
   - Type scale using clamp() (--text-xs through --text-hero, --cgpa-num)
   - @keyframes shimmer for skeleton loaders
   - @keyframes pulse-glow for arc endpoint dot
   - @keyframes starfield for landing background particles
   - Base html/body styles
   - Scrollbar styling (dark, thin)
   - Safe area padding for PWA bottom bar

2. app/layout.tsx — Root layout with:
   - next/font/google: Bricolage Grotesque + DM Sans loaded via nextjs
   - geist Mono from geist package
   - Font CSS variables applied to html element
   - ThemeProvider (next-themes, defaultTheme: 'dark')
   - Toaster (react-hot-toast, dark position: top-center)
   - Metadata: title 'AcadeGrade', description, og image, manifest link, theme-color

3. components/ui/Button.tsx — Complete Button component:
   variants: primary | ghost | outline | danger | gold
   sizes: sm (h-10) | md (h-12) | lg (h-14)  ← min 48px = h-12
   loading state: shows spinner, disables interaction
   motion whileTap: scale 0.96
   motion whileHover: scale 1.02 (desktop only, not touch)
   Full TypeScript props extending React.ButtonHTMLAttributes

4. components/ui/Input.tsx — Complete Input:
   label above, error message below with Motion height animation
   focus ring: --acade-primary, 2px
   variants: default | search | score
   score variant: Geist Mono, right-aligned, numeric keyboard on mobile
   min h-12 always

5. components/ui/Card.tsx — Base Card:
   variants: default | hover (lift + glow) | glass (glassmorphism)
   motion whileHover for hover variant

6. components/ui/Badge.tsx — Badge:
   variants: grade-a | grade-b | grade-c | grade-d | grade-e | grade-f
             | first-class | 2upper | 2lower | third | pass | fail
             | ongoing (amber) | status
   grade-b = indigo, NOT green

7. components/ui/Modal.tsx — Modal:
   AnimatePresence scale 0.92→1 + opacity
   backdrop: blur + dark overlay
   focus trap (ref + keydown Escape handler)
   confirm variant with destructive red button

8. components/ui/Toggle.tsx — Toggle switch:
   spring-animated thumb via motion layout
   leftLabel + rightLabel props
   persists nothing — caller handles state

9. components/ui/Skeleton.tsx — Skeleton:
   uses .skeleton CSS class from globals.css (shimmer)
   shape props: rect | circle | text

10. components/ui/Select.tsx — Custom select:
    fully custom dropdown (not native)
    searchable variant with input filtering
    min 48px touch targets on options

11. components/shared/PageTransition.tsx — Page wrapper:
    AnimatePresence mode="wait"
    fade + slide-up + blur-out variants
    useReducedMotion check

12. lib/utils/cn.ts — className merger utility
13. lib/utils/format.ts — formatGPA, formatDate, formatCredit helpers
14. lib/utils/constants.ts — GRADE_SCALE array, DEGREE_CLASSES array, APP_NAME

OUTPUT: Every file complete. Design tokens match DESIGN.md exactly. Zero shadcn.
```

---

## Phase 2 — CGPA Engine & Core Components

```
ACADEGRADE V2 — PHASE 2: CGPA ENGINE & CORE COMPONENTS

Build the CGPA/PI computation engine and the signature visual components.

FILES TO BUILD:

1. lib/cgpa/gradeScale.ts
   — GRADE_SCALE lookup: score → { grade, gradePoint }
   — Must handle all ranges: 70+→A/5, 60-69→B/4, 50-59→C/3, 45-49→D/2, 40-44→E/1, 0-39→F/0
   — Export: lookupGrade(score: number): { grade: Grade; gradePoint: number }

2. lib/cgpa/calculator.ts — CGPA + PI computation engine:
   — computeCourseMetrics(course: CourseInput): CourseMetrics
     → totalScore = caScore + examScore
     → grade + gradePoint via lookupGrade
     → piPoint = (totalScore / 100) * 5
   — computeSemesterGPA(courses: CourseMetrics[]): SemesterResult
     → gpa = Σ(gradePoint × units) / Σ(units)
     → pi  = Σ(piPoint × units) / Σ(units)
     → creditLoaded = Σ(units)
   — computeCumulativeCGPA(semesters: SemesterResult[]): CumulativeResult
     → cgpa = Σ(gpa × creditLoaded) / Σ(creditLoaded)
     → pi   = Σ(pi × creditLoaded) / Σ(creditLoaded)
   — All calculations: pure functions, no side effects, no Math.random()
   — Handle edge case: 0 credits loaded → return { cgpa: 0, pi: 0 }

3. lib/cgpa/degreeClass.ts
   — resolveDegreeClass(cgpa: number): DegreeClass
   — Returns: { label, colorToken, icon, range }
   — Thresholds: 4.50+ First, 3.50-4.49 2:1, 2.40-3.49 2:2, 1.50-2.39 Third, 1.00-1.49 Pass, <1.00 Fail

4. components/cgpa/CGPAArc.tsx — THE SIGNATURE COMPONENT:
   Props: { cgpa: number; pi: number; size: 'sm'|'md'|'lg'; animateOnMount?: boolean; showParticles?: boolean }
   
   Implementation:
   - SVG viewBox calculated per size: lg=280, md=180, sm=52
   - 270° sweep arc (1.5π to 1.5π + 270° in radians, open at bottom)
   - cx/cy = center, r_outer = size*0.42, r_inner = size*0.33
   - Outer arc (12px stroke on lg): CGPA — color via gradient based on value range
   - Inner arc (6px stroke on lg): PI — always --acade-gold
   - stroke-dasharray = circumference of partial circle
   - stroke-dashoffset animated via motion.circle (spring: stiffness 55, damping 16, mass 1.3)
   - Center: CGPA number (Geist Mono, react-countup, 2 decimals)
   - Center sub: "PI: X.XX" (smaller, --acade-text-muted)
   - Below arc: DegreeClassBadge
   - Arc tip: glowing dot (motion pulse animation)
   - Particles: canvas overlay, 20 dots, fires once at animation completion (only if showParticles && size==='lg')
   - useReducedMotion: if true, show static arc at final value, no spring

5. components/cgpa/DegreeClassBadge.tsx:
   Props: { cgpa: number; animated?: boolean }
   - Resolves class via degreeClass.ts
   - Renders: colored pill badge with icon + label
   - animated=true: scale 0.4→1.15→1.0 + glow pulse (runs once on mount, or when cgpa crosses threshold)
   - useReducedMotion support

6. hooks/useCGPA.ts:
   - Subscribes to user's semester data from Firestore
   - Runs computation engine on data change
   - Returns: { cgpa, pi, degreeClass, semesterHistory, loading, error }
   - Updates analytics/{uid} via POST to /api/ai/forecast when data changes

7. components/shared/SkeletonCard.tsx:
   - Variants matching the shapes of: StatCard | ArcHero | TrendChart | InsightCard
   - Uses .skeleton class from globals.css

OUTPUT: CGPA engine is pure and tested. CGPAArc renders correctly at all 3 sizes.
The signature element must look premium — this is the most important visual in the app.
```

---

## Phase 3 — Landing Page

```
ACADEGRADE V2 — PHASE 3: LANDING PAGE

Build the complete public landing page at app/(public)/page.tsx.

REQUIREMENTS:
- Single file for the page + all inline sub-components (no separate files for sections)
- 'use client' because of animations and canvas
- All 6 sections from DESIGN.md Section 6.1:

SECTION 1 — HERO (full viewport):
- Canvas starfield (80 particles, slow drift, respects reduced motion)
- Cycling word swap: "Track Your CGPA." → "Know Your Standing." → "Ace Your Degree."
  Using AnimatePresence: word fades out/in every 2.5s
- Sub-headline text
- Two buttons: primary CTA → /register, ghost → /calculator
- Demo CGPAArc below CTAs: size="md", cgpa=4.72, pi=4.81, animateOnMount=true, showParticles=false
  with subtle pulsing indigo glow around it

SECTION 2 — MARQUEE:
- Infinite horizontal scroll of university names
- CSS animation only (no JS): @keyframes marquee in globals.css
- Fade mask edges left and right via CSS mask-image

SECTION 3 — DUAL METRIC EXPLAINER:
- Section heading: "Why Two Metrics?"
- Two glassmorphism cards (grid-cols-1 mobile, grid-cols-2 desktop)
- CGPA card + PI card
- PI card copy: "Detects when 71% and 95% both print as A — but represent very different mastery."
- Each card: mini Recharts LineChart (mock data, 6 semesters, CGPA flat at 5.0, PI moving)
- Cards animate in with whileInView stagger

SECTION 4 — FEATURES GRID:
- 9 feature cards: 1 col mobile → 2 col tablet → 3 col desktop
- Each: lucide icon + title + 1-line description
- whileInView stagger (staggerChildren: 0.06)
- Card whileHover lift

SECTION 5 — HOW IT WORKS:
- 4 numbered steps, horizontal on desktop (flex-row), vertical on mobile (flex-col)
- Connected by a dashed line on desktop
- Each step: number circle (indigo) + title + short description
- whileInView reveal

SECTION 6 — AI PREVIEW:
- Mock card showing the Written Analysis tab output
- typing animation (character reveal) playing on the mock text
- "Gemini 3.1 Flash-Lite" badge bottom-right

FOOTER:
- 4 links + attribution line

STICKY NAVBAR (on scroll):
- Transparent on hero, --acade-deep + border on scroll (IntersectionObserver)
- Logo + nav links + [Sign In] + [Get Started] buttons
- Mobile: hamburger → fullscreen overlay menu

PERFORMANCE NOTES:
- Canvas starfield: requestAnimationFrame, cancel on unmount
- All whileInView: once={true} (don't re-animate on scroll back up)
- Charts: lazy loaded with next/dynamic + ssr: false
```

---

## Phase 4 — Auth Pages

```
ACADEGRADE V2 — PHASE 4: AUTH PAGES

Build login, register (onboarding wizard), and auth hooks.

FILES:

1. lib/firebase/auth.ts:
   - signInWithEmail(email, password)
   - signInWithGoogle() — Firebase Google OAuth
   - signUpWithEmail(email, password) → returns UserCredential
   - signOut()
   - onAuthStateChange(callback) wrapper

2. hooks/useAuth.ts:
   - Returns: { user, uid, loading, error }
   - Subscribes to onAuthStateChanged
   - Stores auth state in React context

3. components/layout/AuthProvider.tsx:
   - Context provider wrapping the app
   - Provides useAuth hook

4. app/(public)/login/page.tsx:
   - Email/password + Google Sign-In
   - Google button: white background, Google icon (inline SVG), "Continue with Google"
   - Form: react-hook-form + Zod validation
   - Error: "Invalid credentials" shake animation on form
   - After login: redirect to /dashboard
   - Link: "Don't have an account? Sign up →"
   - Forgot password: modal with email input → Firebase sendPasswordResetEmail

5. app/(public)/register/page.tsx — 5-STEP ONBOARDING WIZARD:
   
   Progress bar at top: animated width transition as step increases.
   Back button on steps 2–5. Next/Submit buttons. Zod validation per step.
   
   STEP 1 — Account:
     Fields: fullName, matric, email, password, confirmPassword
     Zod: email valid, password min 8 chars, passwords match
   
   STEP 2 — Programme:
     university (pre-filled 'ESUT Agbani', editable text input)
     department (custom Select dropdown, options from Firestore courses catalog depts)
     programme (text input, e.g. 'B.Sc Computer Science')
     currentLevel (radio/pill select: 100L | 200L | 300L | 400L | 500L)
     currentSession (text input, e.g. '2025/2026', placeholder shows format)
   
   STEP 3 — Record Mode:
     Two large card options (not radio, card click selects):
     [FROM SCRATCH card] | [COMPLETE RECORD card]
     Complete Record: show slider "Semesters completed: N" (1–10)
   
   STEP 4 — (Complete Record only) Confirm Past Semesters:
     Generate semester list from currentLevel + semestersCompleted
     e.g. if 400L and 6 semesters: 100L S1, 100L S2, 200L S1, 200L S2, 300L S1, 300L S2
     User sees list, [Edit] button per row to fix session year
     [Looks Good — Finish Setup] button
   
   STEP 5 — Success:
     Firebase Auth: createUserWithEmailAndPassword
     Firestore: create users/{uid} document
     Firestore: pre-create semesters subcollection (Complete Record mode)
     Send welcome email via /api/notifications/send (email type)
     Show confetti animation (pure CSS, no library)
     Auto-redirect to /dashboard after 2 seconds

6. app/(student)/layout.tsx — Auth guard:
   - useAuth hook → if !user && !loading → redirect to /login
   - If loading → full-page skeleton/spinner
   - Renders StudentShell wrapping {children}

7. app/(admin)/layout.tsx — Admin guard:
   - useAuth → if !user → redirect to /admin/login
   - Call server action or API to verify email in config/admins.emails[]
   - If not admin → redirect to /dashboard with toast "Access denied"

OUTPUT: Auth flow complete. Wizard feels smooth with spring transitions between steps.
```

---

## Phase 5 — Student Shell & Dashboard

```
ACADEGRADE V2 — PHASE 5: STUDENT SHELL & DASHBOARD

Build the student shell layout and main dashboard page.

FILES:

1. components/layout/BottomTabBar.tsx — MOBILE PRIMARY NAV:
   - 4 tabs: Dashboard (/dashboard) | Results (/results) | Insights (/insights) | Transcript (/transcript)
   - Lucide icons: LayoutDashboard | BookOpen | BrainCircuit | FileText
   - Active: filled icon + indigo color + motion animated indicator dot above icon
   - Height: 64px + pb-safe-area (env(safe-area-inset-bottom))
   - Background: --acade-deep + top border --acade-border
   - Only visible on < md screens (md:hidden)
   - Spring animation on tab switch

2. components/layout/MobileDrawer.tsx — SECONDARY MOBILE NAV:
   - Slides in from right, AnimatePresence x: 300→0
   - Backdrop: motion opacity 0→0.6, tap to close
   - Swipe-left to close (touch event listener)
   - Content: student identity (name + matric + mini arc) | Settings | Calculator | Notifications with badge | About | Sign Out
   - Admin variant: red shield icon header + "Admin Panel" label (passed via prop)

3. components/layout/StudentShell.tsx — MAIN STUDENT WRAPPER:
   - Renders: desktop sidebar (md+ only) + mobile header + BottomTabBar (mobile only)
   - Desktop sidebar: 240px fixed left, full-height
     - Mini CGPAArc (sm) as avatar ring
     - Name + matric number below avatar
     - Nav items with active state
   - Mobile header: logo left, notification bell + hamburger right
   - Content area: ml-[240px] on desktop, pb-[80px] on mobile (for bottom tab bar)
   - Notification bell: RTDB listener for unread count badge, tap → inline NotificationDropdown

4. components/layout/NotificationDropdown.tsx:
   - Inline dropdown (not navigation to /notifications)
   - Last 5 notifications from Firestore
   - "Mark all read" button
   - "View all →" link to /notifications page
   - AnimatePresence dropdown open/close

5. hooks/useNotifications.ts:
   - RTDB onValue listener on notif_counts/{uid}/unread
   - Returns: { unreadCount, notifications: Notification[] }

6. app/(student)/dashboard/page.tsx — COMPLETE DASHBOARD:
   
   'use server' page (data fetched server-side) OR 'use client' with Firestore hooks.
   Use 'use client' with useCGPA hook for live Firestore updates.
   
   LAYOUT (mobile-first):
   - Single column on mobile, 2-column (8-4 split) on desktop
   
   ARC HERO CARD (full width):
   - "Good morning/evening, {firstName} [wave emoji]"
   - CGPAArc: size="lg", animateOnMount=true, showParticles=true
   - Below arc: [CGPA mode ●────── PI mode] Toggle (inline on card)
   - Secondary metric shown in smaller text inside arc
   - DegreeClassBadge with animated unlock on mount
   
   STATS ROW (grid-cols-2 mobile, grid-cols-4 desktop):
   - Total Credits | Current Sem GPA | Courses Done | At Risk (E/F count)
   - Each card: stagger reveal with whileInView
   - Values: react-countup on mount
   
   TREND CHART CARD (full width):
   - TrendChart component, metric="both", showForecast=false
   - CGPA line (indigo) + PI line (gold)
   - Next/dynamic + ssr: false for recharts
   
   AI SUMMARY CARD:
   - Fetches from /api/ai/insights on mount (if lastAiCall > 24h ago)
   - Shows: 3-sentence summary + clickable "Degree Outlook →" link to /insights
   - Refresh button (icon) — shows loading state
   - "Powered by Gemini 3.1 Flash-Lite" badge bottom-right
   - Skeleton while loading
   
   RECENT ACTIVITY (last 5 courses):
   - Course code + title + grade badge + semester label
   - "View all results →" link
   
   QUICK ACTIONS ROW:
   - [+ Add Results] → /results
   - [View Insights] → /insights  
   - [Export PDF] → /transcript
   - [Share Card] → Web Share API (share CGPA as text + image)

OUTPUT: Dashboard feels alive. Arc animates on load. Numbers count up. Cards stagger in.
This is the page that makes first impressions.
```

---

## Phase 6 — Results Pages

```
ACADEGRADE V2 — PHASE 6: RESULTS PAGES

Build the results list page and semester detail/entry page.

FILES:

1. hooks/useSemesters.ts:
   - Firestore collection listener on users/{uid}/semesters
   - Returns: { semesters: SemesterWithCourses[], loading, error }
   - Sorted by level + semester number

2. components/cgpa/GradeTable.tsx — COURSE ENTRY TABLE:
   Props: { courses, semesterId, editable, onSave }
   - Table headers: # | Code | Title | Units | CA | Exam | Total | Grade | GP | PI
   - Each row: course code autocomplete from catalog, CA input, Exam input
   - totalScore auto-computed as CA + Exam (real-time, no submit needed)
   - grade + gradePoint auto-computed via gradeScale lookup
   - piPoint auto-computed
   - Invalid score: shake animation on that row's input
   - Animated row addition (spring slide-down)
   - Delete row: confirm inline, animate row out
   - Summary row at bottom: Semester GPA | PI | Total Credits | Grade dist bar

3. app/(student)/results/page.tsx — SEMESTER LIST:
   
   Page header (mobile):
   - Title "My Results" left, [+ New Semester] button right (TOP of page, not bottom)
   
   SemesterAccordion list (all semesters):
   - Each row collapsed: level badge + label + GPA badge + credits + "Ongoing" pill (if active)
   - Expand: spring height animation, shows GradeTable in read-only mode
   - [Edit] button → navigate to /results/[semesterId]
   - [Delete] button → confirm modal
   - Semesters sorted: 100L S1, 100L S2, 200L S1... (ascending)
   
   "Ongoing" badge: amber --grade-c color, shown on the isComplete=false semester
   
   Empty state: illustration + "Add your first semester to start tracking" + [+ Add Semester] CTA

4. app/(student)/results/[semesterId]/page.tsx — SEMESTER DETAIL:
   
   Params: { semesterId: string } — validate with Zod
   
   Fetch semester + courses from Firestore.
   
   Header: semester label + session + [Save] button (top-right)
   
   Course autocomplete search:
   - Type course code → searches Firestore courses catalog by dept + level
   - "Add manually" option if not in catalog
   
   GradeTable: editable=true
   
   Real-time summary below table:
   - "Semester GPA: 4.50 · PI: 4.72 · 18 Credit Units"
   - Grade distribution mini bar chart (instant, CSS widths)
   
   On Save:
   1. Write all courses to Firestore subcollection
   2. Compute GPA + PI
   3. Update semester document (gpa, pi, creditLoaded, isComplete)
   4. POST to /api/ai/forecast to recompute analytics/{uid}
   5. Toast success + navigate back to /results
   
   Mark semester complete toggle: changes isComplete → removes "Ongoing" badge

OUTPUT: Score entry feels fluid. Grade computed instantly as you type. The table is the core UX.
```

---

## Phase 7 — AI Insights Hub

```
ACADEGRADE V2 — PHASE 7: AI INSIGHTS HUB

Build the complete Insights page and all AI API routes.

FILES:

1. lib/ai/gemini.ts — Gemini client (server-side):
   import { GoogleGenAI } from '@google/genai';
   model: 'gemini-3.1-flash-lite'
   Export: generateContent(prompt: string): Promise<string>
   Export: generateJSON<T>(prompt: string): Promise<T>
   — generateJSON strips markdown backticks before JSON.parse

2. lib/ai/forecast.ts — Regression engine:
   import { linearRegression, linearRegressionLine } from 'simple-statistics';
   computeForecast(piHistory: number[]): ForecastResult
   - MUST clamp output: Math.max(0, Math.min(5, value))
   - Returns: { slope, projected: [next1, next2], riskScore, trend: 'improving'|'stable'|'declining' }

3. app/api/ai/insights/route.ts:
   - POST, requires Firebase Auth token
   - Verify token with firebase-admin
   - Check Firestore: if lastAiCall < 24h → return cached insight
   - Build prompt from student data
   - Call generateJSON<InsightResponse>()
   - Save result + timestamp to Firestore analytics/{uid}.lastInsight
   - Return { strengths, concerns, recommendations, degreeOutlook }

4. app/api/ai/whatif/route.ts:
   - POST: { currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad }
   - Pure math for requiredGPA (no Gemini)
   - Gemini only for feasibilityNote (1 sentence)
   - Return: { requiredGPA, requiredAvgScore, feasibilityNote }

5. app/api/ai/forecast/route.ts:
   - POST: { piHistory: number[] }
   - Runs computeForecast(piHistory)
   - Gemini writes trendLabel only
   - Writes result to analytics/{uid} via firebase-admin
   - Return: { slope, projected, riskScore, trendLabel }

6. components/ai/InsightCard.tsx:
   Props: { title, content, type }
   - Gemini icon badge top-right
   - Typing animation on content (character-by-character reveal)
   - type determines left border color

7. components/ai/WhatIfCalculator.tsx:
   Props: { currentCGPA, totalCredits, remainingSemesters }
   - Slider for targetCGPA (min=currentCGPA, max=5.0, step=0.01)
   - Number inputs: remainingSemesters, creditLoad per semester
   - Live computation client-side (same formula as API)
   - Calls API for feasibilityNote (debounced 800ms after slider stop)

8. components/charts/ForecastChart.tsx:
   - Recharts LineChart
   - Historical data: solid line
   - Projected 2 points: dashed line (strokeDasharray="5 5")
   - Light blue confidence band (ReferenceArea)
   - Tooltip shows: actual vs projected label

9. app/(student)/insights/page.tsx — COMPLETE INSIGHTS PAGE:
   
   Header: "AI Insights" + last updated timestamp + [Refresh] button
   
   TABS (4 tabs, spring-animated underline):
   
   TAB 1 — FORECAST:
   - ForecastChart (full width)
   - Projection callout: "Projected CGPA by [final semester]: 4.65 → First Class"
   - Confidence note: "Based on your last N semesters of Performance Index data"
   
   TAB 2 — WHAT-IF:
   - WhatIfCalculator component
   - "What score do I need?" sub-section: course-level breakdown
   
   TAB 3 — RISK ANALYSIS:
   - Risk score gauge (SVG arc, 1–5 scale)
   - Flagged courses table: courses scoring < 50 in last 2 semesters
   - Trend banner: "Declining trend detected ⚠️" OR "Stable 📊" OR "Improving ✅"
   - Dept breakdown: which course groups have lowest avg scores
   
   TAB 4 — WRITTEN ANALYSIS:
   - InsightCard: strengths, concerns, recommendations, degreeOutlook
   - Typing animation on first load
   - [Regenerate] button (checks 24h rate limit)

OUTPUT: Insights page is the AI showcase of the app. The typing animation + Gemini badge
makes it feel like a live AI advisor, not a static report.
```

---

## Phase 8 — Transcript, Settings & Notifications

```
ACADEGRADE V2 — PHASE 8: TRANSCRIPT, SETTINGS, NOTIFICATIONS

FILES:

1. lib/pdf/transcript.ts — jsPDF builder:
   buildTranscript(userData: User, semesters: SemesterWithCourses[], analytics: Analytics): jsPDF
   
   Layout:
   - Page: A4, portrait
   - Header: "ENUGU STATE UNIVERSITY OF SCIENCE AND TECHNOLOGY, AGBANI"
            (simulate ESUT logo with text if no image file)
   - Student details box: Name | Matric | Programme | Department | Level
   - Separator line
   - For each semester:
     - Semester label row (bold)
     - Columns: Code | Title | Units | CA | Exam | Total | Grade | GP | PI
     - Sub-total row: Semester GPA | PI | Credits
   - Cumulative section at bottom:
     - Cumulative CGPA: X.XX | PI: X.XX | Total Credits: XX
     - Degree Class: [class label] (PROJECTED)
   - Footer: "Generated by AcadeGrade · Not an official university document · Joshuazaza"
   - Page numbers

2. app/api/transcript/generate/route.ts:
   - POST, Firebase Auth required
   - Fetch user + semesters + courses + analytics from Firestore
   - Call buildTranscript()
   - Return PDF as application/pdf blob

3. app/(student)/transcript/page.tsx:
   - HTML preview matching the PDF layout (same data, HTML/CSS replica)
   - [Download PDF] button → fetch /api/transcript/generate → triggerDownload(blob, 'transcript.pdf')
   - [Share] button → Web Share API with PDF file
   - Print CSS: @media print styles for clean printing

4. app/(student)/settings/page.tsx — 5 SECTIONS:
   
   PROFILE SECTION:
   - Avatar: circular Cloudinary image upload
     → file input (hidden), trigger via button click
     → upload: fetch('https://api.cloudinary.com/v1_1/acadegrade/auto/upload', ...)
       with preset 'acadegrade_avatars'
     → update avatarUrl in Firestore
   - Editable: name, matric (read-only after register), department, level
   
   ACADEMIC SETUP SECTION:
   - Record Mode toggle: From Scratch ↔ Complete Record
     Migration warning modal when switching (data will not be deleted)
   - Default metric toggle: CGPA / PI
   - Both toggles persist to Firestore users/{uid} on change
   
   NOTIFICATIONS SECTION:
   - [Enable Push Notifications] button → requestNotificationPermission → save FCM token
   - Preference checkboxes: Semester saved | Degree class change | AI ready | Admin broadcast
   
   SECURITY SECTION:
   - [Change Password] → modal with current + new password fields
   
   DANGER SECTION:
   - [Delete Account] → modal requiring user to type "DELETE" to confirm
     → delete Firestore docs → Firebase Auth delete → redirect to /

5. app/(student)/notifications/page.tsx:
   - Full list of all notifications from Firestore notifications/{uid}/items
   - Sorted newest first
   - Read/unread visual distinction
   - [Mark all as read] button

6. components/layout/NotificationDropdown.tsx (if not built in Phase 5):
   - Inline dropdown, last 5, mark read, "View all" link
```

---

## Phase 9 — Admin Panel

```
ACADEGRADE V2 — PHASE 9: ADMIN PANEL

Build all admin pages. Admin shell is visually DISTINCT from student shell.

FILES:

1. components/layout/AdminShell.tsx:
   - Sidebar with RED shield icon + "Admin Panel" label at top
   - Red/danger-toned header strip: background color slightly red-tinted (#1A0A0A)
   - Nav: Dashboard | Users | Course Catalog | Analytics | Settings
   - Admin email shown at bottom
   - Mobile: MobileDrawer with admin variant prop (shows red shield header)
   - NO bottom tab bar for admin (not the primary use case)

2. app/admin/login/page.tsx:
   - Email/password only (no Google for admin)
   - Checks against config/admins.emails after Firebase Auth sign-in
   - If email not in admin list → sign out + show "Access denied"

3. app/admin/dashboard/page.tsx:
   - 4 stat cards: Total Users | Avg Platform CGPA | Avg PI | Active This Week
   - CGPA distribution histogram (Recharts BarChart, 0.5-point buckets)
   - Department breakdown horizontal bars
   - New signups line chart (last 30 days)
   - Activity feed: last 10 platform actions
   - All data: server-side fetch via firebase-admin for security

4. app/admin/users/page.tsx:
   - Searchable/filterable table (search by name or matric)
   - Columns: Name | Matric | Dept | Level | CGPA | PI | Joined | Status
   - Expandable rows: full profile + semester count + [Disable Account] [Send Email]
   - Disable: sets users/{uid}.disabled = true → Firebase Auth disable user

5. app/admin/courses/page.tsx — COURSE CATALOG CRUD:
   - Table: Code | Title | Units | Dept | Level | Sem | Actions
   - [+ Add Course] → modal form
   - Edit: same modal pre-filled
   - Delete: confirm modal
   - All writes via API route (not client-side Firestore — admin only)

6. app/admin/analytics/page.tsx:
   - CGPA distribution curve (ReferenceLine at class thresholds)
   - PI vs CGPA scatter plot (ScatterChart)
   - Department leaderboard (sorted by avg CGPA)
   - Degree class pie chart
   - [Export CSV] button → anonymized data download

7. app/admin/settings/page.tsx:
   - Grade scale table: editable (change thresholds, save to config/settings)
   - AI system prompt: large textarea → saves to config/settings.aiSystemPrompt
   - Announcement banner: text input + [Publish] + [Clear] → config/settings.announcementBanner
   - Maintenance mode toggle → config/settings.maintenanceMode

8. Show announcement banner:
   In StudentShell: check config/settings.announcementBanner on mount
   If not null: show dismissible banner at top of content area
   Dismiss stores uid in dismissed list (Firestore or localStorage)
```

---

## Phase 10 — PWA, FCM & Email

```
ACADEGRADE V2 — PHASE 10: PWA, FCM, EMAIL

FILES:

1. app/sw.ts — Serwist service worker:
   - Cache strategy: NetworkFirst for API routes, CacheFirst for static assets
   - Precache: all Next.js static files
   - Offline fallback: /offline page for navigation

2. app/offline/page.tsx — Offline page:
   - Clean offline message with indigo styling
   - "You're offline. Your last saved data is still available."
   - Link back to dashboard

3. public/manifest.json — complete PWA manifest

4. lib/firebase/fcm.ts (client-side):
   - requestNotificationPermission(): Promise<string|null>
     → requests browser permission → getToken(messaging, { vapidKey })
     → saves token to users/{uid}.fcmToken in Firestore
   - onForegroundMessage(callback): listens for foreground FCM messages

5. app/api/notifications/send/route.ts:
   - POST, admin service account only
   - Body: { uid?: string; token?: string; title; message; type }
   - Uses firebase-admin messaging().send()
   - Also creates Firestore notifications/{uid}/items/{notifId}
   - Also updates RTDB notif_counts/{uid}/unread + 1

6. Notification triggers (call /api/notifications/send from these server actions):
   - After /api/ai/forecast completes: if riskScore >= 4 → send risk notification
   - After semester saved (in /results/[semesterId] save handler): send GPA saved notification
   - After degree class change detected in analytics update: send achievement notification

7. lib/email/mailer.ts — COMPLETE Gmail SMTP config:
   nodemailer transporter with smtp.gmail.com:587
   process.env.GMAIL_USER + process.env.GMAIL_PASS
   
   Email templates (HTML strings, inline CSS):
   - welcomeEmail(name: string): string
   - semesterSavedEmail(name: string, gpa: number, semester: string): string
   - degreeClassEmail(name: string, class: string): string
   - adminNewUserEmail(name: string, matric: string): string
   
   All templates: dark #07090F background, indigo headers, branded footer

8. Trigger welcome email:
   In /register step 5 completion → POST /api/notifications/send with type='email'
   API route calls sendEmail() from mailer.ts

OUTPUT: Push notifications work on mobile Chrome/Android. Email sends via Gmail.
PWA installs cleanly from Chrome mobile on Android.
```

---

## Phase 11 — Quick Calculator & About

```
ACADEGRADE V2 — PHASE 11: QUICK CALCULATOR & ABOUT

FILES:

1. app/(public)/calculator/page.tsx — NO-LOGIN QUICK CALCULATOR:
   'use client'
   
   - Add courses: code (text), units (1-6 select), input mode toggle (Grade / Score)
   - Grade mode: select A|B|C|D|E|F per course
   - Score mode: number input 0-100 per course
   - Real-time CGPA + PI display as user adds/changes courses
   - Mini CGPAArc showing live CGPA (size="md", animateOnMount=false, updates on change)
   - DegreeClassBadge updating live
   - [Add Course] + [Clear All] + [Save to Account → /login]
   - Shareable link: encode courses as URL query params → share button
   - No Firebase, no API calls — pure client-side calculation using lib/cgpa/calculator.ts

2. app/(public)/about/page.tsx:
   - About AcadeGrade
   - About Joshuazaza (builder attribution)
   - Tech stack (visual display)
   - CSC 499 academic context
   - Links to GitHub (if public) and deployed site
   - Contact section
```

---

## Phase 12 — Polish & Deployment

```
ACADEGRADE V2 — PHASE 12: FINAL POLISH & DEPLOYMENT

CHECKLIST:

ANIMATIONS:
□ Every page has PageTransition wrapper
□ All cards have whileInView stagger reveal
□ All buttons have whileTap + whileHover
□ CGPAArc spring animation plays correctly on /dashboard and /calculator
□ Particle burst fires on dashboard arc load
□ Degree class badge unlock animation on threshold crossing
□ Skeleton loaders on every loading state
□ Number countup on all CGPA/GPA/score displays
□ useReducedMotion() respected everywhere
□ Mobile drawer slide-in/out smooth

MOBILE:
□ Bottom tab bar visible on mobile, hidden on desktop
□ All touch targets ≥ 48px height
□ Safe area inset on bottom tab bar
□ Notification bell opens dropdown (not page route) on mobile
□ "+New Semester" button in page header on Results (not at bottom)
□ "Ongoing" badge on active semester row
□ Admin drawer has red shield header

FUNCTIONALITY:
□ CGPA/PI toggle persists to Firestore
□ Record mode toggle persists to Firestore
□ Course autocomplete searches catalog
□ Score entry computes grade/GP/PI in real time
□ PDF transcript downloads correctly
□ Gemini AI insights load (check 24h rate limit)
□ Regression forecast clamps to [0, 5.00] range
□ Push notifications request permission
□ Gmail SMTP sends welcome email
□ Admin can CRUD course catalog
□ Firestore rules protect all user data

DEPLOYMENT:
□ .env.local → Vercel environment variables set
□ Vercel project connected to GitHub repo
□ Custom domain: acadegrade.vercel.app (or custom domain)
□ Firebase console: Firestore rules published manually
□ Firebase console: RTDB rules published manually
□ Firebase console: Authorized domains includes vercel deployment URL
□ Google AI Studio: GEMINI_API_KEY active and quota checked
□ Gmail: App Password active (2FA enabled on Gmail account)
□ Cloudinary: cloud 'acadegrade', upload preset 'acadegrade_avatars' created (unsigned)
□ PWA: lighthouse audit ≥ 90 PWA score
□ lighthouse performance ≥ 80 on mobile

FINAL TEST:
□ Register as student → onboarding wizard complete
□ Enter 2 semesters of results
□ View dashboard arc animating
□ Generate AI insights
□ Download PDF transcript
□ Install as PWA on Android Chrome
□ Register as admin → view admin dashboard
□ Add a course to catalog
□ Announce platform message from admin
□ Student sees announcement banner

OUTPUT: Production-ready AcadeGrade v2 deployed at acadegrade.vercel.app.
```

---

*PROMPT.md v1.0 · AcadeGrade v2 · Joshuazaza · ESUT CS 2026*  
*Use this with DESIGN.md as your complete build reference.*

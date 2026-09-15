# Theme and Design Tokens

## Part 1 — Compact token summary

### Source and status

- Runtime source of truth: `app/globals.css`.
- Tailwind: v4 CSS-first via `@import 'tailwindcss'` and `@theme inline`; there is no `tailwind.config.*`.
- Theme mechanism: `next-themes` adds `.light` or `.dark` to `<html>`, defaults new users to `system`, and disables blanket transitions during changes.
- Design direction: the implemented palette matches the v3 Academic Observatory contract in `upgrade/02-design-direction.md` and `upgrade/03-design-system-spec.md`.
- Component code should consume semantic `var(--acade-*)` tokens or their Tailwind aliases; raw hex belongs in the token layer, print-only transcript CSS, documented brand assets, or documented third-party marks.

### Color palette

| Role / token | Light (`:root` / `.light`) | Dark (`.dark`) |
|---|---:|---:|
| Canvas — `--acade-void` | `#F5F7FC` | `#080B16` |
| Raised canvas — `--acade-deep` | `#FFFFFF` | `#0C1120` |
| Surface — `--acade-surface` | `#FFFFFF` | `#101626` |
| Overlay — `--acade-overlay` | `#EEF1F8` | `#171E31` |
| Border — `--acade-border` | `#CDD3E0` | `#293249` |
| Subtle border — `--acade-border-subtle` | `#E5E8F0` | `#1C2539` |
| Control border — `--acade-control-border` | `#788399` | `#758198` |
| Text — `--acade-text` | `#141827` | `#F7F8FC` |
| Muted text — `--acade-text-muted` | `#5C6577` | `#A7B0C4` |
| Faint text — `--acade-text-faint` | `#636D80` | `#7E899F` |
| Primary — `--acade-primary` | `#5148DD` | `#7C74FF` |
| Primary hover | `#453CC5` | `#918BFF` |
| Primary dim | `#EEECFF` | `#211E40` |
| On primary | `#FFFFFF` | `#080B16` |
| Gold / warning | `#9A5A00` | `#F4B544` |
| Gold hover | `#804900` | `#FFCB70` |
| Gold dim | `#FFF3DD` | `#302617` |
| Success | `#067647` | `#46C98B` |
| Success dim | `#E9F7EF` | `#102C22` |
| Danger | `#C83232` | `#FF6B6B` |
| Danger dim | `#FDECEC` | `#361E28` |
| On danger | `#FFFFFF` | `#080B16` |
| Info | `#0B6B9E` | `#55BDEB` |
| Info dim | `#E8F4FC` | `#112A39` |
| Scrim | `rgba(8, 11, 22, 0.46)` | `rgba(0, 0, 0, 0.64)` |
| CGPA chart | `#5148DD` | `#A09AFF` |
| PI chart | `#9A5A00` | `#F4B544` |
| Chart grid | `#E5E8F0` | `#293249` |

Grade/classification ink pairs are A/First `#067647` → `#46C98B`; B/Second upper `#5148DD` → `#A09AFF`; C/Second lower `#9A5A00` → `#F4B544`; D/Third `#A9430D` → `#FFAA70`; E/Pass `#A63256` → `#F59AB7`; F/unknown `#5C6577` → `#A7B0C4`. Labels, not hue alone, distinguish failed, missing, and incomplete states.

### Typography

| Role | Family | Runtime variable |
|---|---|---|
| Display, page titles, major metrics | Bricolage Grotesque 400–800 | `--font-bricolage` / `.font-display` |
| UI and reading | DM Sans 400–700 | `--font-dm-sans` / `.font-body` |
| Numeric/data | Geist Mono | `--font-geist-mono` / `.font-mono` |

Runtime scale: `xs 12px`, `sm 14px`, `base 16px`, `lg clamp(16px,2.5vw,18px)`, `xl clamp(18px,3vw,20px)`, `2xl clamp(20px,4vw,24px)`, `3xl clamp(24px,5vw,30px)`, `4xl clamp(30px,6vw,36px)`, hero `clamp(36px,9vw,72px)`, CGPA number `clamp(44px,10vw,80px)`. Essential metadata does not go below 12px; body inputs remain at least 16px.

### Spacing, geometry, elevation, and layers

- Base rhythm: 4px. Preferred content steps from the upgrade contract: 8, 12, 16, 24, 32, 48, 64, 96px.
- Controls: `--control-height: 48px`, `--radius-control: 12px`.
- Surfaces: `--radius-surface: 16px`; hero artifacts may use 20px.
- Dialog/sheet: `--radius-dialog: 24px`.
- Shells: student rail 240px, admin rail 224px, header 64px desktop / 56px under 768px.
- Light elevation: card `0 2px 10px rgba(20,24,39,.04)`; popover `0 12px 36px rgba(20,24,39,.14)`.
- Dark elevation: cards use tonal contrast and borders with no default shadow; popover `0 16px 48px rgba(0,0,0,.36)`.
- Layers: base 0, sticky 100, non-modal dropdown 150, drawer/scrim 200, modal 300, dialog popover 320, toast 400, tooltip 420.
- Breakpoints: Tailwind defaults because no custom config exists — `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px`. Global CSS also applies the mobile shell height through `max-width: 767px`.

### Motion and accessibility

- Shared durations: fast 100ms, panel 160ms, route 220ms, completion 260ms.
- Navigation spring: 420/30/0.8; sheet spring: 360/30/0.9; disclosure spring: 360/34.
- Motion explains navigation, selection, disclosure, or completion; no looping decorative pulse, route-wide blur, scroll hijacking, or blanket hover lifts.
- `prefers-reduced-motion` collapses animation/transition durations globally, and animated React components use `useReducedMotion`.
- Focus-visible uses a 2px primary outline with 2px offset. Touch targets are designed around 48px controls. Theme, charts, overlays, and all states must remain usable in light/dark/system, keyboard-only, 200% zoom, and reduced motion.

## Part 2 — Raw source dumps

No `tailwind.config.*` exists. Tailwind's complete project-specific token layer is the CSS-first source below.

### Global CSS and complete token definitions

Path: `app/globals.css`

```css
@import 'tailwindcss';

/* ═══════════════════════════════════════════════════
   AcadeGrade v2 — Design System Tokens
   Tailwind CSS v4 CSS-first approach
   ═══════════════════════════════════════════════════ */

@theme inline {
  /* ── Backgrounds — layer stack ── */
  --color-acade-void: var(--acade-void);
  --color-acade-deep: var(--acade-deep);
  --color-acade-surface: var(--acade-surface);
  --color-acade-overlay: var(--acade-overlay);
  --color-acade-border: var(--acade-border);
  --color-acade-border-subtle: var(--acade-border-subtle);
  --color-acade-control-border: var(--acade-control-border);

  /* ── Primary — Electric Indigo ── */
  --color-acade-primary: var(--acade-primary);
  --color-acade-primary-hover: var(--acade-primary-hover);
  --color-acade-primary-glow: var(--acade-primary-glow);
  --color-acade-primary-dim: var(--acade-primary-dim);
  --color-acade-on-primary: var(--acade-on-primary);

  /* ── Accent — Nigerian Gold ── */
  --color-acade-gold: var(--acade-gold);
  --color-acade-gold-hover: var(--acade-gold-hover);
  --color-acade-gold-dim: var(--acade-gold-dim);

  /* ── Semantic ── */
  --color-acade-success: var(--acade-success);
  --color-acade-success-dim: var(--acade-success-dim);
  --color-acade-danger: var(--acade-danger);
  --color-acade-danger-dim: var(--acade-danger-dim);
  --color-acade-on-danger: var(--acade-on-danger);
  --color-acade-warning: var(--acade-warning);
  --color-acade-info: var(--acade-info);
  --color-acade-info-dim: var(--acade-info-dim);

  /* ── Text ── */
  --color-acade-text: var(--acade-text);
  --color-acade-text-muted: var(--acade-text-muted);
  --color-acade-text-faint: var(--acade-text-faint);
  --color-acade-text-inverse: var(--acade-text-inverse);

  /* ── Grade Colors ── */
  --color-grade-a: var(--grade-a);
  --color-grade-b: var(--grade-b);
  --color-grade-c: var(--grade-c);
  --color-grade-d: var(--grade-d);
  --color-grade-e: var(--grade-e);
  --color-grade-f: var(--grade-f);

  /* ── Degree Class Colors ── */
  --color-class-first: var(--class-first);
  --color-class-2upper: var(--class-2upper);
  --color-class-2lower: var(--class-2lower);
  --color-class-third: var(--class-third);
  --color-class-pass: var(--class-pass);
  --color-class-fail: var(--class-fail);
}

/* ═══════════════════════════════════════════════════
   CSS Custom Properties (non-Tailwind tokens)
   ═══════════════════════════════════════════════════ */

:root {
  color-scheme: light;
  /* ── Backgrounds ── */
  --acade-void: #F5F7FC;
  --acade-deep: #FFFFFF;
  --acade-surface: #FFFFFF;
  --acade-overlay: #EEF1F8;
  --acade-border: #CDD3E0;
  --acade-border-subtle: #E5E8F0;
  --acade-control-border: #788399;

  /* ── Primary ── */
  --acade-primary: #5148DD;
  --acade-primary-hover: #453CC5;
  --acade-primary-glow: #5148DD;
  --acade-primary-dim: #EEECFF;
  --acade-on-primary: #FFFFFF;

  /* ── Gold ── */
  --acade-gold: #9A5A00;
  --acade-gold-hover: #804900;
  --acade-gold-dim: #FFF3DD;

  /* ── Semantic ── */
  --acade-success: #067647;
  --acade-success-dim: #E9F7EF;
  --acade-danger: #C83232;
  --acade-danger-dim: #FDECEC;
  --acade-on-danger: #FFFFFF;
  --acade-warning: #9A5A00;
  --acade-info: #0B6B9E;
  --acade-info-dim: #E8F4FC;

  /* ── Text ── */
  --acade-text: #141827;
  --acade-text-muted: #5C6577;
  --acade-text-faint: #636D80;
  --acade-text-inverse: #FFFFFF;
  --acade-scrim: rgba(8, 11, 22, 0.46);

  /* ── Grade Colors ── */
  --grade-a: #067647;
  --grade-b: #5148DD;
  --grade-c: #9A5A00;
  --grade-d: #A9430D;
  --grade-e: #A63256;
  --grade-f: #5C6577;

  /* ── Degree Class ── */
  --class-first: #067647;
  --class-2upper: #5148DD;
  --class-2lower: #9A5A00;
  --class-third: #A9430D;
  --class-pass: #A63256;
  --class-fail: #5C6577;

  --chart-cgpa: #5148DD;
  --chart-pi: #9A5A00;
  --chart-grid: #E5E8F0;

  /* ── Type Scale — clamp() responsive ── */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: clamp(1rem, 2.5vw, 1.125rem);
  --text-xl: clamp(1.125rem, 3vw, 1.25rem);
  --text-2xl: clamp(1.25rem, 4vw, 1.5rem);
  --text-3xl: clamp(1.5rem, 5vw, 1.875rem);
  --text-4xl: clamp(1.875rem, 6vw, 2.25rem);
  --text-hero: clamp(2.25rem, 9vw, 4.5rem);
  --cgpa-num: clamp(2.75rem, 10vw, 5rem);

  /* ── Z-index scale ── */
  --radius-control: 12px;
  --radius-surface: 16px;
  --radius-dialog: 24px;
  --control-height: 48px;
  --student-rail-width: 240px;
  --admin-rail-width: 224px;
  --shell-header-height: 64px;
  --shadow-card: 0 2px 10px rgba(20, 24, 39, 0.04);
  --shadow-popover: 0 12px 36px rgba(20, 24, 39, 0.14);

  --z-base: 0;
  --z-sticky: 100;
  --z-dropdown: 150;
  --z-overlay: 200;
  --z-modal: 300;
  --z-dialog-popover: 320;
  --z-toast: 400;
  --z-tooltip: 420;
}

/* ── Light Mode ── */
.light {
  color-scheme: light;
  --acade-void: #F5F7FC;
  --acade-deep: #FFFFFF;
}

.dark {
  color-scheme: dark;
  --acade-void: #080B16;
  --acade-deep: #0C1120;
  --acade-surface: #101626;
  --acade-overlay: #171E31;
  --acade-border: #293249;
  --acade-border-subtle: #1C2539;
  --acade-control-border: #758198;
  --acade-primary: #7C74FF;
  --acade-primary-hover: #918BFF;
  --acade-primary-glow: #B0AAFF;
  --acade-primary-dim: #211E40;
  --acade-on-primary: #080B16;
  --acade-gold: #F4B544;
  --acade-gold-hover: #FFCB70;
  --acade-gold-dim: #302617;
  --acade-success: #46C98B;
  --acade-success-dim: #102C22;
  --acade-danger: #FF6B6B;
  --acade-danger-dim: #361E28;
  --acade-on-danger: #080B16;
  --acade-warning: #F4B544;
  --acade-info: #55BDEB;
  --acade-info-dim: #112A39;
  --acade-text: #F7F8FC;
  --acade-text-muted: #A7B0C4;
  --acade-text-faint: #7E899F;
  --acade-text-inverse: #080B16;
  --acade-scrim: rgba(0, 0, 0, 0.64);
  --grade-a: #46C98B;
  --grade-b: #A09AFF;
  --grade-c: #F4B544;
  --grade-d: #FFAA70;
  --grade-e: #F59AB7;
  --grade-f: #A7B0C4;
  --class-first: #46C98B;
  --class-2upper: #A09AFF;
  --class-2lower: #F4B544;
  --class-third: #FFAA70;
  --class-pass: #F59AB7;
  --class-fail: #A7B0C4;
  --chart-cgpa: #A09AFF;
  --chart-pi: #F4B544;
  --chart-grid: #293249;
  --shadow-card: none;
  --shadow-popover: 0 16px 48px rgba(0, 0, 0, 0.36);
}

/* ═══════════════════════════════════════════════════
   Base Styles
   ═══════════════════════════════════════════════════ */

html {
  scroll-behavior: auto;
  -webkit-tap-highlight-color: transparent;
}

body {
  background-color: var(--acade-void);
  color: var(--acade-text);
  min-height: 100dvh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hide default browser password reveal eye icon */
input::-ms-reveal,
input::-ms-clear {
  display: none !important;
}

input[type="password"]::-webkit-textfield-decoration-container {
  display: none !important;
  visibility: hidden !important;
}

input[type="password"]::-webkit-credentials-auto-fill-button {
  display: none !important;
  visibility: hidden !important;
}

/* ═══════════════════════════════════════════════════
   Scrollbar Styling — dark, thin
   ═══════════════════════════════════════════════════ */

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--acade-void);
}

::-webkit-scrollbar-thumb {
  background: var(--acade-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--acade-text-faint);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--acade-border) var(--acade-void);
}

/* ═══════════════════════════════════════════════════
   Keyframe Animations
   ═══════════════════════════════════════════════════ */

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.5);
  }
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

@keyframes typing-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes starfield {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

@keyframes arc-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 4px var(--acade-primary-glow));
  }
  50% {
    filter: drop-shadow(0 0 12px var(--acade-primary-glow));
  }
}

/* ═══════════════════════════════════════════════════
   Utility Classes
   ═══════════════════════════════════════════════════ */

.skeleton {
  background: linear-gradient(
    90deg,
    var(--acade-deep) 25%,
    var(--acade-overlay) 50%,
    var(--acade-deep) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.font-display {
  font-family: var(--font-bricolage), system-ui, sans-serif;
}

.font-body {
  font-family: var(--font-dm-sans), system-ui, sans-serif;
}

.font-mono {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}

/* ── Safe area padding for PWA bottom bar ── */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.pt-safe {
  padding-top: env(safe-area-inset-top, 0px);
}

/* ── Marquee for landing page ── */
.marquee-container {
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 10%,
    black 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 10%,
    black 90%,
    transparent 100%
  );
}

.marquee-track {
  animation: marquee 30s linear infinite;
}

/* ── Focus ring ── */
.focus-ring {
  outline: 2px solid var(--acade-primary);
  outline-offset: 2px;
}

*:focus-visible {
  outline: 2px solid var(--acade-primary);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  :root {
    --shell-header-height: 56px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── Selection ── */
::selection {
  background-color: var(--acade-primary);
  color: var(--acade-text-inverse);
}

.page-header-seam {
  isolation: isolate;
}

.page-header-seam::before,
.page-header-seam::after {
  content: '';
  position: absolute;
  inset: 0;
}

.page-header-seam::before {
  border-top: 1px solid color-mix(in srgb, var(--acade-text) 35%, transparent);
  opacity: var(--seam-line-opacity);
}

.page-header-seam::after {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--acade-void) 84%, transparent) 0%,
    color-mix(in srgb, var(--acade-void) 0%, transparent) 100%
  );
  opacity: var(--seam-fade-opacity);
}

.page-header-seam--curved::before,
.page-header-seam--curved::after {
  border-radius: 20px 20px 0 0;
}

input,
select,
textarea,
[contenteditable='true'] {
  scroll-margin-block: calc(var(--shell-header-height) + 24px) 24px;
}
```

### Theme provider, fonts, viewport theme colors, and toast styling

Path: `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { ServiceWorkerKill } from '@/components/shared/ServiceWorkerKill';
import { PWABanner } from '@/components/ui/PWABanner';
import {
  getSiteJsonLd,
  resolveSiteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
} from '@/lib/seo/site';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: {
    default: 'AcadeGrade — Understand your academic progress',
    template: '%s | AcadeGrade',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'CGPA calculator',
    'GPA tracker',
    'university grades',
    'academic performance',
    'AI academic advisor',
    'degree class calculator',
    'student dashboard',
    'Nigeria university grading',
    'academic trajectory',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Education',
  manifest: '/manifest.json',
  verification: {
    google: 'F3WW92_FNlQviz77sKTnTL-EnbLbWuh0P1snZC5e72o',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: '/',
    title: 'AcadeGrade — Understand your academic progress',
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'AcadeGrade academic progress workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AcadeGrade — Understand your academic progress',
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7FC' },
    { media: '(prefers-color-scheme: dark)', color: '#080B16' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(getSiteJsonLd()) }}
        />
        <ServiceWorkerKill />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: 'var(--z-toast)' }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--acade-deep)',
                  color: 'var(--acade-text)',
                  border: '1px solid var(--acade-border)',
                  borderRadius: '12px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-dm-sans)',
                  boxShadow: 'var(--shadow-popover)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--acade-success)',
                    secondary: 'var(--acade-deep)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--acade-danger)',
                    secondary: 'var(--acade-deep)',
                  },
                },
              }}
            />
            <PWABanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Shared motion presets

Path: `lib/ui/motion.ts`

```ts
export const motionDurations = {
  instant: 0,
  fast: 0.1,
  panel: 0.16,
  route: 0.22,
  complete: 0.26,
} as const;

export const navigationSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 30,
  mass: 0.8,
};

export const sheetSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 30,
  mass: 0.9,
};

export const disclosureSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 34,
};

export const routeEntry = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionDurations.route, ease: [0.22, 1, 0.36, 1] as const },
};

export const tabPanelEntry = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionDurations.panel, ease: [0.22, 1, 0.36, 1] as const },
};
```

### Reduced-motion adapter

Path: `hooks/useReducedMotion.ts`

```ts
'use client';

import { useReducedMotion as motionUseReducedMotion } from 'motion/react';

/**
 * Check if user prefers reduced motion.
 * Wraps motion/react's useReducedMotion for consistent API.
 * Must be checked in EVERY animated component.
 */
export function useReducedMotion(): boolean {
  const shouldReduce = motionUseReducedMotion();
  return shouldReduce ?? false;
}
```


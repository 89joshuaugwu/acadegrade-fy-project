# AcadeGrade: Data Architecture & Security

This document explains how data flows through the application, where it is stored, and how it is secured.

## 1. Database Structure (Firestore)

### Users Collection (`/users/{uid}`)
- Stores core profile data (`fullName`, `email`, `matric`, `department`, `avatarUrl`, `fcmTokens`).
- **Sub-collections**:
  - `/semesters/{semesterId}`: Represents a specific academic term (e.g., "100L - 1st Sem").
  - `/semesters/{semesterId}/courses/{courseId}`: The individual courses, their units, and grades.

### Other Collections
- `/analytics/{uid}`: Caches the AI-generated insights to prevent redundant API calls to DeepSeek/Groq.
- `/notifications/{uid}/items/{notifId}`: Stores specific push notifications sent to the user.
- `/api_logs/{logId}`: A fire-and-forget log of every external API call made by the server (used by the Admin API Monitor).
- `/shared_transcripts/{shareId}`: Time-limited snapshots of student data generated when a user clicks "Share Transcript".
- `/otps/{email_type}`: Temporary documents used for email verification and password resets. Includes attempt counters to prevent brute-forcing.
- `/config/{docId}`:
  - `settings`: Global platform state (maintenance mode, signups disabled).
  - `admins`: Array of whitelisted admin emails.

## 2. File Storage (Firebase Storage)
- Organized in paths like `/users/{uid}/avatars/{filename}`.
- Used primarily for profile pictures.

## 3. Realtime Database (RTDB)
- Used exclusively for ultra-fast, lightweight sync operations like **Unread Notification Counts**.
- Path: `/users/{uid}/unreadCount`.

## 4. Authentication & Security
- **Providers**: Firebase Authentication (Email/Password).
- **Security Rules (`firestore.rules`)**:
  - Strictly limits reads/writes so users can only access their own `uid` paths.
  - Admin access is granted via a helper function that checks if the request's email is present in the `config/admins` document.
- **API Security**: Next.js App Router API endpoints (`/api/...`) verify the Firebase Auth Bearer token in the headers before executing any logic or database queries.

## 5. API Call Logging Strategy
- To avoid slowing down user requests, API logging uses a **fire-and-forget** pattern.
- When an AI or Email route executes, it runs `logApiCall()` without `await`. This writes to Firestore asynchronously, meaning a database logging failure will never crash the main user request.

---

## 6. Architecture & Route Map

### 6.1 Hyper-Detailed Folder Structure

```text
acadegrade-v2/
├── .agents/                             ← AI agent skills & project rules
│   ├── frontend-developer/
│   ├── tailwind-design-system/
│   └── ui-skills/
├── app/
│   ├── (public)/                        ← Unauthenticated Pages
│   │   ├── page.tsx                     — Landing Page
│   │   ├── login/page.tsx               — Google SSO & Email login
│   │   ├── register/page.tsx            — 5-step onboarding wizard
│   │   ├── calculator/page.tsx          — No-login quick CGPA calc
│   │   ├── about/page.tsx               — Creator attribution
│   │   ├── forgot-password/page.tsx     — 3-step OTP reset flow
│   │   └── share/
│   │       └── [shareId]/page.tsx       — Public read-only transcript viewer
│   ├── (student)/                       ← Authenticated Student Pages
│   │   ├── layout.tsx                   — Auth guard + Student shell (Sidebar/Tabs)
│   │   ├── dashboard/page.tsx           — CGPA Arc, KPI Cards, AI Summary
│   │   ├── results/
│   │   │   ├── page.tsx                 — Semester list
│   │   │   ├── new/page.tsx             — OCR upload & manual entry
│   │   │   └── [semesterId]/page.tsx    — Edit existing semester
│   │   ├── insights/page.tsx            — AI Written Analysis & Forecaster
│   │   ├── transcript/page.tsx          — jsPDF exporter & Share link generator
│   │   ├── settings/page.tsx            — Profile edits, Cloudinary uploads
│   │   └── notifications/page.tsx       — Real-time FCM message inbox
│   ├── (admin)/                         ← Secured Admin Portal
│   │   ├── layout.tsx                   — Strict email array verification guard
│   │   └── admin/
│   │       ├── login/page.tsx           — Hidden admin entry point
│   │       ├── dashboard/page.tsx       — Global KPIs & Distribution charts
│   │       ├── users/page.tsx           — Searchable directory & moderation
│   │       ├── courses/page.tsx         — Global catalog CRUD
│   │       ├── api-analytics/page.tsx   — Live API polling, cost tracker, abuse matrix
│   │       └── settings/page.tsx        — Maintenance mode & Feature toggles
│   ├── api/                             ← Serverless API Endpoints
│   │   ├── admin/
│   │   │   ├── api-analytics/route.ts   — Aggregates fire-and-forget logs
│   │   │   ├── courses/route.ts         — Global catalog endpoint
│   │   │   ├── stats/route.ts           — Global KPIs
│   │   │   └── users/route.ts           — User list & Account enable/disable toggles
│   │   ├── auth/
│   │   │   ├── otp/send/route.ts        — Nodemailer dispatch
│   │   │   ├── otp/verify/route.ts      — Expiration and attempt checks
│   │   │   └── password/reset/route.ts  — 3-step adminAuth override
│   │   ├── results/
│   │   │   └── extract/route.ts         — Gemini 3.1 Multimodal OCR
│   │   ├── transcript/
│   │   │   └── share/route.ts           — Generates public JSON snapshot
│   │   └── user/
│   │       ├── fcm-token/route.ts       — Adds/Removes device tokens
│   │       └── insights/route.ts        — DeepSeek text generation
│   ├── layout.tsx                       — Root: Bricolage/DM Sans fonts, Providers
│   └── globals.css                      — Tailwind v4 @theme, custom CSS properties
├── components/                          ← Reusable React UI
│   ├── ui/                              — Base atoms (Button, Input, Card, Badge, Modal)
│   ├── layout/                          — Navigation shells (Navbar, Sidebar, BottomTab)
│   ├── cgpa/                            — Shared visual tools (CGPAArc, DegreeBadge)
│   └── admin/                           — Admin-specific graphs and tables
├── lib/
│   ├── firebase/                        — Client & Admin SDK configurations
│   ├── cgpa/                            — Math engines (calculator.ts, degreeClass.ts)
│   ├── utils/                           — Shared helpers (cn.ts, logApiCall.ts)
│   └── ...
├── docs/                                ← Handover Documentation
│   └── project_handover/                — The 8-part markdown bundle
├── public/                              ← Static Assets
│   ├── manifest.json                    — PWA configuration
│   └── sw.js                            — Serwist generated service worker
├── firestore.rules                      — Firebase Database Security Rules
├── tailwind.config.ts                   — Design tokens and animation variables
└── next.config.ts                       — Next.js compiler & PWA settings
```

### 6.2 Endpoint Route Map

```text
PUBLIC ROUTES
  /                    Landing Page
  /login               Authentication portal
  /register            Multi-step onboarding wizard
  /forgot-password     OTP-driven password recovery
  /calculator          No-login CGPA tool
  /about               Platform & Creator details
  /share/[shareId]     Read-only transcript viewer

STUDENT ROUTES (Requires Firebase Auth Token)
  /dashboard           Main overview
  /results             List of academic semesters
  /results/new         Add semester (Manual or OCR)
  /results/[id]        Edit existing semester
  /insights            AI analysis & Forecasting
  /transcript          PDF Generator
  /notifications       In-app inbox
  /settings            Profile & Preferences

ADMIN ROUTES (Requires Verified Admin Email)
  /admin/login         Hidden entry
  /admin/dashboard     Global statistics
  /admin/users         Student moderation
  /admin/courses       Catalog management
  /admin/api-analytics Live API abuse & cost tracking
  /admin/settings      Platform toggles (Maintenance mode)

KEY API ROUTES (Server-Side)
  POST   /api/auth/otp/send            (Sends Nodemailer verification)
  POST   /api/results/extract          (Gemini OCR Processing)
  GET    /api/admin/api-analytics      (Fetches backend usage logs)
  POST   /api/transcript/share         (Creates public snapshot)
  DELETE /api/user/fcm-token           (Prunes token on logout)
```

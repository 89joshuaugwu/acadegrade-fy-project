# AcadeGrade: Public Pages & Features

This document details the public-facing areas of the AcadeGrade platform, which are accessible to unauthenticated users.

## 1. Landing Page (`/`)
- **Purpose**: The front door of the platform, designed to convert visitors into users.
- **Design**: Premium "Phase 3" UI featuring deep dark aesthetics (`#07090F` background), glowing neon accents, and glassmorphic panels.
- **Key Sections**:
  - **Hero Section**: High-impact headline with staggered entrance animations, floating UI mockups, and strong CTA buttons.
  - **Features Grid**: Highlights platform capabilities (CGPA Tracking, AI Insights, Automated Transcripts).
  - **Interactive Demos**: Visual representations of the platform's core value propositions.
  - **FAQ**: Accordion-style frequently asked questions.
  - **Footer**: Navigation links, social links, and legal/copyright info.
- **Animations**: Extensive use of `motion/react` for scroll-triggered reveals and interactive hover states.

## 2. Quick Calculator (`/calculator`)
- **Purpose**: A lead-generation tool that allows users to quickly calculate their CGPA without signing up.
- **Features**:
  - **Client-Side Processing**: Purely local calculation using `lib/cgpa/calculator.ts` (No database writes or API calls).
  - **Live Degree Badge**: Real-time updating of the degree classification (e.g., "First Class", "Second Class Upper") as courses are added.
  - **Action Buttons**: `Add Course`, `Clear All`.
  - **Save to Account**: Prompts the user to `Sign Up / Login` to persist their data.
  - **Shareable Link**: Ability to encode the entered courses into base64 URL query parameters (e.g. `?m=grade&c=W3si...`) to share a specific calculation instantly.

## 3. Public Transcript Share (`/share/[shareId]`)
- **Purpose**: Allows users to share a read-only snapshot of their academic record with employers, parents, or institutions.
- **Features**:
  - **Dynamic Routing**: Fetches a pre-generated Firestore snapshot (`shared_transcripts` collection) via the `/api/transcript/share` route.
  - **Branding**: Displays the official AcadeGrade logo and computes the degree class dynamically.
  - **User Photo**: Conditionally renders the student's avatar based on their privacy preferences at the time of sharing.
  - **Edge Cases Handled**: Explicit, styled error screens for both "Link Expired" and "Transcript Not Found".

## 4. Authentication Flow & Security
The authentication layer is deeply robust, combining Firebase Auth with strict custom validation rules.

- **Login (`/login`)**:
  - **Email & Password**: Standard secure login via Firebase `signInWithEmailAndPassword`.
  - **Google SSO**: Instant login via Firebase `signInWithPopup(auth, googleProvider)`. The system checks if the Google user already has a completed profile in Firestore. If they don't, they are seamlessly redirected to the Registration wizard to complete their academic details.
- **Registration (`/register`)**:
  - **Multi-Step Wizard**: Built with `react-hook-form` and `zod` for extreme type-safety across 5 steps (Account -> Programme -> Record Mode -> Past Semesters -> OTP/Creation).
  - **Google Sign-Up Flow**: If a user signs up with Google, the wizard skips the password creation step but still collects their Matric number, Department, and academic history before officially creating their Firestore profile document.
  - **Email OTP Verification**: If signing up via Email/Password, an OTP is dispatched via Gmail SMTP (`/api/auth/otp/send`). The user must enter the exact 6-digit code to proceed. This actively blocks spam and bot accounts from cluttering Firebase Auth.
  - **Global Lockout**: Registration automatically checks `adminDb.collection('config').doc('settings')`. If an admin has enabled `disableSignups`, the wizard will lock and reject all new attempts.
- **Forgot Password (`/forgot-password`)**:
  - Instead of relying on Firebase's standard (and sometimes easily phished) email links, the platform uses a bespoke, 3-step OTP flow.
  - **Step 1**: User enters their registered email. The backend checks if the user exists and dispatches a secure 6-digit OTP via `/api/auth/password/reset` (Step: 'send').
  - **Step 2**: User enters the 6-digit OTP. The backend verifies the code and its expiration timestamp.
  - **Step 3**: If verified, the user enters a new password. The backend securely forces the password update via the Firebase Admin SDK (`adminAuth.updateUser()`).

## 5. About Page (`/about`)
- **Purpose**: Contextualizes the project and provides creator attribution.
- **Features**:
  - **Builder Profile**: Attribution to Joshuazaza.
  - **Academic Context**: Mentions the project's roots as a final year project (CSC 499).
  - **Tech Stack Visualization**: Displays the core technologies powering the platform.
  - **Contact & Links**: Links to GitHub and the deployed application.

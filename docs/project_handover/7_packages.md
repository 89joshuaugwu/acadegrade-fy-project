# AcadeGrade: Core Packages & Dependencies

This document provides a breakdown of all major NPM packages utilized within the AcadeGrade platform, categorized by their function. This will help future developers understand the building blocks of the application.

## 1. Core Framework & Library
- **`next`** (`v16.2.9`): The foundational framework running the App Router, server-side rendering, and API routes.
- **`react` & `react-dom`** (`v19.2.7`): The core UI library.

## 2. UI, Styling, and Animations
- **`tailwindcss`** (`v4.3.1`): The primary utility-first CSS framework used for all styling.
- **`motion`** (`v12.40.0`): Formerly Framer Motion. Used extensively for layout transitions, micro-interactions, and staggered list reveals.
- **`lucide-react`** (`v1.18.0`): The standard icon set used uniformly across the platform.
- **`next-themes`** (`v0.4.6`): Manages the Light/Dark mode state and hydration cleanly.

## 3. Data Visualization & UI Enhancements
- **`recharts`** (`v3.8.1`): Used for building all charts (Trend charts, Admin Histograms, Pie charts).
- **`react-countup`** (`v6.5.3`): Used on the Dashboards to animate numbers counting up from zero.
- **`react-hot-toast`** (`v2.6.0`): Provides sleek, non-blocking toast notifications for user actions (success/error states).

## 4. State Management, Data Fetching, & Forms
- **`swr`** (`v2.4.2`): React Hooks library for remote data fetching, highly utilized in the Admin API Analytics page for auto-polling and caching.
- **`react-hook-form`** (`v7.79.0`): Manages complex form states (like the multi-step registration wizard) efficiently without unneeded re-renders.
- **`zod`** (`v4.4.3`): TypeScript-first schema declaration. Used to validate form inputs.
- **`@hookform/resolvers`** (`v5.4.0`): Connects `react-hook-form` directly to `zod` for seamless validation.

## 5. Backend & Database Infrastructure
- **`firebase`** (`v12.14.0`): The Firebase Client SDK. Used in the browser for Authentication, direct Firestore reads, and Push Notifications.
- **`firebase-admin`** (`v13.0.0`): The Firebase Admin SDK. Used exclusively in the Node.js API routes to bypass security rules securely and verify tokens.

## 6. Artificial Intelligence Integration
- **`@google/genai`** (`v2.8.0`): Official Google SDK for interacting with Gemini models (used for OCR Result Extraction).
- **`groq-sdk`** (`v1.2.1`): Official Groq SDK for ultra-fast, low-latency LLM inference (used for the What-If forecaster).
- **`openai`** (`v6.43.0`): The OpenAI SDK, heavily utilized as a standard connector to access the **DeepSeek API** (which provides an OpenAI-compatible endpoint).

## 7. Transcript & PDF Tools
- **`jspdf`** (`v4.2.1`): Core engine for generating PDF documents entirely via JavaScript.
- **`jspdf-autotable`** (`v5.0.8`): Plugin for jsPDF that easily formats HTML tables into the PDF document (used for the transcript course lists).
- **`pdf-parse`** (`v2.4.5`): Used in the backend to explicitly parse text out of uploaded PDF result slips before sending them to Gemini for OCR extraction.

## 8. Specific Utilities
- **`nodemailer`** (`v8.0.11`): Used in the backend `/api/auth/otp/send` route to connect to Gmail's SMTP servers and dispatch verification emails.
- **`simple-statistics`** (`v7.9.0`): A lightweight mathematics library used on the frontend to perform Linear Regression forecasting on the student's historical Performance Index.
- **`date-fns`** (`v4.4.0`): A utility library for formatting and manipulating dates consistently.
- **`@serwist/next` & `serwist`** (`v9.5.11`): Tools for easily configuring Next.js as a Progressive Web App (PWA) with Service Workers.

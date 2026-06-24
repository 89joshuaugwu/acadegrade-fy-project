# AcadeGrade: Tech Stack & Environment configuration

This document outlines the libraries, frameworks, and environment variables required to run the AcadeGrade platform.

## 1. Core Framework
- **Next.js (v14/15/16)**: The foundational React framework. Utilizing the **App Router** (`app/` directory) for routing, server components, and API endpoints.
- **React 19**: Frontend UI library.
- **TypeScript**: Used strictly across the entire application for type safety, reducing runtime errors.

## 2. Infrastructure & Backend
- **Firebase Admin SDK (`firebase-admin`)**: Used exclusively in `/api/` routes for elevated, secure server-side operations.
- **Firebase Client SDK (`firebase`)**: Used in the browser for Authentication, direct Firestore reads (with security rules), and Cloud Messaging (FCM).
- **Vercel**: The target deployment platform, optimized for Next.js serverless functions.

## 3. Styling & UI
- **Tailwind CSS**: Core styling engine.
- **Framer Motion (`motion/react`)**: High-performance animation library for layout transitions and micro-interactions.
- **Lucide React**: Clean, consistent SVG icon set.
- **Recharts**: Data visualization library used heavily in the Admin Analytics dashboard.
- **React Hot Toast**: For clean, unobtrusive flash messages and notifications.

## 4. Specific Utilities
- **jsPDF & jsPDF-AutoTable**: Client-side (and server fallback) generation of PDF Transcripts.
- **Serwist**: Implementation of Progressive Web App (PWA) features and Service Workers for offline support and caching.
- **SWR**: Vercel's React Hooks library for data fetching, caching, and auto-polling (used to enhance the real-time feel of the Admin API monitor).
- **Nodemailer**: Used in the backend to send customized HTML emails via SMTP (Gmail) for OTPs and registration.

## 5. Artificial Intelligence Services
- **Gemini (Google)**: Multimodal AI used specifically for **OCR (Optical Character Recognition)**. It analyzes images/PDFs of academic result slips to automatically extract course codes, titles, and grades.
- **DeepSeek**: Large Language Model used to generate personalized, deep academic insights based on a student's semester history.
- **Groq**: Extremely fast inference engine used for the "What-If" CGPA forecaster, calculating the mathematical feasibility of reaching target grades.

---

## 6. Environment Variables
To run this project locally or in production, a `.env.local` file is required. 
*(Note: Actual keys are excluded for security. Refer to standard provider documentation to generate these).*

### Firebase Configuration (Client)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

### Firebase Configuration (Server / Admin SDK)
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### AI API Keys
```env
GEMINI_API_KEY=your_google_gemini_key
DEEPSEEK_API_KEY=your_deepseek_key
GROQ_API_KEY=your_groq_key
```

### Email (Nodemailer via Gmail)
```env
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_gmail_app_password
```

### Internal Security
```env
# Used to verify server-to-server requests within the app (e.g., triggering push notifications from another backend route)
INTERNAL_API_SECRET=a_long_random_string
```

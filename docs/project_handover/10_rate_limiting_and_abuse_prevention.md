# AcadeGrade: Rate Limiting & Abuse Prevention Architecture

To protect expensive third-party APIs (Gemini, DeepSeek, Groq) and infrastructure (Gmail SMTP, Firestore) from bot attacks, spam, or abusive users, the AcadeGrade platform employs a multi-layered rate limiting and abuse prevention strategy.

This document outlines how each layer is secured.

---

## 1. Authentication & OTP Protection (Gmail SMTP)
The custom Email OTP system (used for Registration and Password Resets) is highly targeted by bot spam. 

### Server-Side Protection (`/api/auth/otp/*`)
- **Max Attempts Firewall**: A user is strictly limited to 5 failed verification attempts before the OTP is invalidated.
- **Hard Expiration**: Every OTP code expires exactly 5 minutes after creation. 
- **Atomic Operations**: All OTP verifications and invalidations use Firestore atomic transactions to prevent race conditions.

### Client-Side UX Protection (`register` & `forgot-password` pages)
- **60-Second Smart Lock**: When a user clicks "Send OTP", the UI button is immediately disabled and a `setInterval` initiates a 60-second visible countdown ("Resend code in 59s"). 
- **Syncing with Server**: If a user refreshes the page and tries to bypass the UI lock, the server responds with a `429 Too Many Requests` containing a `cooldownRemaining` payload. The frontend catches this payload and instantly re-locks the button to match the server's remaining time exactly.

---

## 2. AI Capabilities & Analytics Endpoints
The platform utilizes multiple AI models (DeepSeek, Groq, Gemini). Because compute costs vary, the protection mechanisms are highly specialized per feature.

### A. Written Analysis (DeepSeek via `/api/ai/insights`)
This is the most expensive operation.
- **24-Hour Soft Caching**: If a user hits the endpoint *without* the `forceRegenerate` flag, the server returns the cached JSON data from Firestore instead of hitting DeepSeek.
- **12-Hour Server Cooldown**: If a user forces regeneration (`forceRegenerate: true`), the server strictly rejects the request with a `429` status if exactly 12 hours haven't passed.
- **Client-Side 12-Hour Lock**: The Insights UI calculates the time elapsed since `lastInsight.timestamp`. If it is under 12 hours, the UI sets `isCooldownActive = true`, completely disabling the "Regenerate" button and displaying a live visual countdown (`11h 45m`).
- **60-Second Refresh Debounce**: Even for non-forced requests, clicking "Refresh" triggers a `setRateLimitCooldown(59)` state, disabling the button for 60 seconds to prevent users from spam-clicking the refresh button.

### B. What-If Forecaster (`/api/ai/whatif`)
This route uses Groq to generate a 20-word feasibility note. Because Groq is nearly instantaneous and incredibly cheap, there is no strict hourly cooldown on the server. Instead, the primary abuse prevention happens at the UI layer (`WhatIfCalculator.tsx`) to prevent firing hundreds of requests while the user drags the continuous slider:
- **5-Second "Finalizing" Debounce**: When a student moves the target CGPA slider, the UI initiates a 5-second countdown timer ("Finalizing points..."). If the student moves the slider again, the timer resets. The API is only hit exactly *once*, 5 seconds after they stop moving the slider.
- **30-Second Slider Lock**: Immediately after a successful AI analysis is returned, the entire calculator (sliders and inputs) is locked into a strict 30-second cooldown state (`setCooldown(30)`) to prevent immediate spamming. The UI displays a red warning: "Analysis locked. Cooldown: 30s".

### C. Trend Forecast (`/api/ai/forecast`)
This route uses `simple-statistics` for linear regression and DeepSeek to generate a 5-word trend label.
- **Auth Guarding**: Unlike the WhatIf calculator, this route strictly requires and verifies a valid Firebase `Bearer` token before execution.
- **Risk Notification Trigger**: If the `riskScore >= 4`, it internally triggers the `/api/notifications/send` route to push an FCM warning to the student's device.

### D. Gemini Result OCR (`/api/results/extract`)
This route processes uploaded PDF or Image result slips.
- **Cost Optimization Firewall**: The server automatically attempts to extract raw text using `pdf-parse` first. If the text is "clean" and parseable, it skips expensive image processing and sends just the raw text to Gemini. It only falls back to expensive Multimodal processing if the text extraction fails or the upload is an image.

---

## 3. Global API Abuse Monitoring (`/admin/api-analytics`)
Even with cooldowns in place, a compromised account could theoretically attempt to bypass client-side checks to hit unprotected routes. To catch this, we built a global monitor.

### Security Mechanisms:
- **Fire-and-Forget Logging**: Every time an external API is called (e.g., an OTP is sent or an AI is queried), a helper function `logApiCall()` asynchronously writes a log to the `/api_logs` Firestore collection. This includes the `uid`, `endpoint`, and success status.
- **Admin Real-Time Dashboard**: The `/admin/api-analytics` page polls this data every 30 seconds. It automatically aggregates the data to show total costs and volume.
- **The "Abuse Matrix"**: The dashboard features an "API Usage by User" table. If a specific `uid` begins spamming requests (e.g., 50 requests in an hour), they are instantly flagged in red as a "High Usage" anomaly.
- **Kill Switch**: If the Admin detects an abusive user in the API Analytics dashboard, they can instantly navigate to `/admin/users`, search the `uid`, and toggle their account to **Disabled**, completely revoking their API access across the entire platform.

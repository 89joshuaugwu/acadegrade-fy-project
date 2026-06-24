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

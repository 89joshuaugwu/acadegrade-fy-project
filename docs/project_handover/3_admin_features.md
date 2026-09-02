# AcadeGrade: Admin Pages & Features

This document details the administrative backend of the AcadeGrade platform, restricted to verified super-users. It is based on a full code audit of the `app/(admin)` directory and `api/admin` routes.

## 1. Security & Authentication (`/api/admin/verify`)
- **Strict Access Control**: Security is not reliant on vulnerable client-side checks. On *every* admin API request, the backend extracts the user's Bearer token, verifies it via `firebase-admin`, and strictly checks if `decodedToken.email` exists within an array inside the `config/admins` Firestore document. If the email is not explicitly listed, the request is immediately rejected with a 403 Forbidden.
- **Admin Login (`/admin/login`)**: A separate, hidden entry point ensuring standard users cannot accidentally access the dashboard.

## 2. Overview Dashboard (`/admin/dashboard`)
- **API Integration**: Fetches data dynamically from `/api/admin/stats`.
- **KPI Cards**: Displays Total Users, Average Platform CGPA, Average Platform PI, and the number of users active this week.
- **CGPA Distribution**: Uses a `recharts` Histogram to group all students into 0.5-point CGPA ranges (e.g., 3.5 - 4.0), color-coded by degree classification.
- **Signups Chart**: A line graph mapping the exact volume of user registrations over the last 30 days.
- **Department Breakdown**: Ranks the top 10 departments by user count, rendering animated progress bars and computing the average CGPA per department.

## 3. User Management (`/admin/users`)
- **API Integration**: Fueled by `/api/admin/users` which safely aggregates user records without exposing sensitive auth tokens to the client.
- **Searchable Directory**: A responsive table allowing admins to search the entire student body by Name, Matric Number, or Email.
- **Accordion Profiles**: Clicking a user expands an accordion revealing their Email, Total Semesters, and Join Date.
- **Moderation Actions**: Includes buttons to explicitly `Disable` or `Enable` an account, immediately restricting their Firebase Auth access, and a quick-copy button for their email.

## 4. Global Course Catalog (`/admin/courses`)
- **CRUD Architecture**: Fully functional Create, Read, Update, and Delete operations interacting with the `courseCatalog` Firestore collection.
- **Standardization**: Enforces strict typing (Code, Title, Units, Department, Level, Semester) ensuring the auto-complete feature in the student's manual entry form remains perfectly standardized.

## 5. Real-time API Monitor (`/admin/api-analytics`)
- **Purpose**: A highly advanced "bonus" feature specifically built to track AI token costs, quota usage, and detect abusive behavior across Gemini, DeepSeek, and Groq.
- **Near-Real-Time Auto-Polling**: The dashboard uses a custom hook to fetch aggregated data from the `api_logs` collection every 30 seconds. Includes a "LIVE" pulsing UI indicator.
- **Time Filters**: Admins can scope the data to the 'Last 24h', 'Last 7 Days', or 'Last 30 Days'.
- **Metrics & Charts**:
  - **KPIs**: Total API Calls, Error Rate %, and Average Response Latency (ms).
  - **Category Pie Chart**: Visualizes usage spread across AI Models, Email/SMTP, OTP Verification, Transcripts, etc.
  - **Timeline Line Chart**: Shows call volume over time, automatically bucketed by hour (for 24h view) or by day (for weekly/monthly views).
  - **AI Provider Share**: A secondary Pie chart explicitly showing the traffic distribution between Groq, DeepSeek, Gemini, and Gmail.
- **Abuse Detection Matrix**: Aggregates the top 10 heaviest API consumers by UID. The backend resolves the UID to the student's actual Name and Email, allowing admins to instantly identify users who are spamming the AI insights or OCR tools.
- **Error Tracing**: A scrolling log of the most recent 400/500 errors, showing the endpoint, status code, exact error message, and timestamp for rapid debugging.

## 6. Platform Settings (`/admin/settings`)
- **Global Toggles**: Manages global variables via `/api/admin/settings`.
- **Feature Flags**: Admins can individually toggle major platform features on or off, such as `disableSignups` (stops new registrations), `ai_insights` (disables the Groq/DeepSeek route to save costs), and `edit_profile` (locks all user profiles).
- **Maintenance Mode**: An ultimate override switch that forces a platform-wide maintenance screen for all non-admin users.

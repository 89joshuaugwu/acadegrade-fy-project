# AcadeGrade: Deployment & Maintenance Guide

This document provides step-by-step instructions on how to deploy the AcadeGrade platform to production and how to handle ongoing maintenance.

## 1. Deployment (Vercel)

AcadeGrade is optimized for Vercel, which provides seamless support for Next.js App Router and serverless functions.

### Steps to Deploy:
1. Push the final codebase to a GitHub, GitLab, or Bitbucket repository.
2. Log in to Vercel and click **Add New Project**.
3. Import the repository.
4. Expand the **Environment Variables** section and meticulously paste all the variables listed in the `6_tech_stack_and_env.md` file. Ensure that `FIREBASE_PRIVATE_KEY` is formatted correctly (newlines should be preserved or entered exactly as provided by Google Cloud).
5. Click **Deploy**. Vercel will automatically run `npm run build` and provision the serverless infrastructure.

## 2. Firebase Configuration

If moving to a new Firebase project (or finalizing the current one), you must configure the following:

### Authentication
- Enable **Email/Password** provider in Firebase Authentication.

### Firestore Database
- Create the database in production mode.
- Deploy the security rules (found in `firestore.rules` in the root of the project).
- *Indexes*: Watch the Firebase console or the app console when running queries (especially in the Admin Dashboard or when sorting semesters). Firebase will provide a direct link to generate any required composite indexes.

### Cloud Storage
- Create the storage bucket.
- Deploy the storage rules (found in `storage.rules`).
- Ensure CORS is configured on your storage bucket if you experience issues generating PDFs with profile photos. (You can configure CORS via Google Cloud Console or gsutil).

## 3. Known Build Warnings

When running `npm run build`, you may encounter the following warning:

```
⚠ Compiled with warnings
./node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs
Critical dependency: the request of a dependency is an expression
```

**Status**: Safe to ignore. 
**Reason**: This is a known issue with the `pdf-parse` library interacting with Webpack. It occurs because the library dynamically requires modules. It does *not* affect the functionality of the OCR route (`/api/results/extract`) in production.

## 4. Maintenance & Future Scaling

- **Rate Limiting**: Currently, rate limiting is handled purely via client-side UI blocks (e.g., the 12-hour cooldown on AI Insights). If API abuse occurs (which can be monitored via the `/admin/api-analytics` dashboard), consider implementing standard HTTP 429 rate-limiting middleware using Upstash Redis.
- **FCM Token Cleanup**: The system currently attempts to clean up dead FCM tokens when notifications fail. Ensure you periodically check the `/notifications` paths in the database to ensure it isn't bloated with old devices.
- **Admin Moderation**: If the API Monitor flags a user for abuse, an Admin can navigate to the **User Management** tab and click `Disable Account` to instantly cut off their access.

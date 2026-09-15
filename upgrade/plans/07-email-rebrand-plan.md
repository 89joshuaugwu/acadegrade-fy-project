# Transactional Email Rebrand Plan

## Goal

Ship a cohesive, responsive AcadeGrade email family while preserving every route and function contract used by web and mobile.

## Tasks

1. Extract a safe email document wrapper, button, code panel, notice, and footer.
2. Use table-based layout, inline-safe CSS, hidden preheaders, alt text, and a wordmark fallback.
3. Rebuild OTP, reset, welcome, semester, degree-class, admin, and security templates.
4. Generate matching plain text and expose it to Nodemailer.
5. Resolve site origin/support identity centrally; remove obsolete hardcoded deployment URLs.
6. Keep OTP copy values in a URL fragment and preserve expiry/resend guidance.
7. Keep SMTP exceptions observable and test output escaping so student data cannot inject markup.

## Acceptance

- Existing exports and route payloads remain compatible.
- 320px HTML remains readable with images unavailable.
- OTP is selectable and copyable without appearing in a query string.
- Failed delivery cannot return a success response.

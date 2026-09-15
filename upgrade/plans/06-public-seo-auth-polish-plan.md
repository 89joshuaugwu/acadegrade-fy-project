# Public, SEO, and Authentication Polish Plan

## Goal

Finish the production public surface and registration presentation without changing the repaired account-finalization flow or any mobile API contract.

## Tasks

1. Add centralized site URL and metadata helpers with production-safe fallbacks.
2. Replace personal/project metadata, add truthful structured data, and create public-only sitemap entries.
3. Mark auth, student, admin, copy-code, and private share routes as noindex.
4. Add Features, Result Scanner, AI Insights, Support, Privacy, and Terms pages using shared public sections.
5. Correct the public mobile drawer height, CTA wrapping, About divider, and Product Story dead space.
6. Move registration onto `AuthShell` and `AuthProgress`; remove random confetti, reactive background, and holographic wrapper.
7. Preserve registration state, OTP ticket, Google identity, server finalization, profile guard, and all field validation.
8. Verify 320/390/768/1440 widths, both themes, keyboard flow, back/forward phases, interrupted Google setup, and From Scratch direct completion.

## Mobile Safety

Do not edit mobile. Web OTP routes retain the legacy `{ success }` response and accept the existing payload; a web registration ticket stays an optional additive field.

## Acceptance

- No primary CTA wraps awkwardly or overflows.
- Registration phases are announced, deterministic, and keep form state.
- Public pages have canonical metadata; private pages are noindex.
- No school-project or personal GitHub identity remains in public copy/metadata.

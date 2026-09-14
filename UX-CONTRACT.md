# AcadeGrade UX Contract

The maintained behavioral contract for the web experience is [upgrade/06-ux-contract.md](./upgrade/06-ux-contract.md). It governs navigation, screen states, registration preservation, academic editing, OCR/import behavior, feedback, permissions, destructive actions, and public sharing.

## Canonical ownership

| Capability | Owner | Decision |
|---|---|---|
| Form and validation | `components/ui/FormField.tsx` plus React Hook Form/Zod | Application validation with `noValidate` |
| Select/listbox | `components/ui/Select.tsx` | Authored, searchable combobox/listbox |
| Tabs and segmented choices | `components/ui/Tabs.tsx`, `components/ui/SegmentedControl.tsx` | Shared semantic primitives |
| Dialog, sheet, drawer | `components/ui/Modal.tsx`, `components/ui/Sheet.tsx` | Shared overlay and focus core |
| Toast/status | `lib/ui/feedback.ts` over the root toast provider | Deduplicated, sanitized feedback |
| Table and paging | `components/ui/DataTable.tsx`, `components/ui/Pagination.tsx` | Semantic table; server cursor for admin datasets |
| Scrollbar and layers | `app/globals.css` | Global tokenized baseline |
| Navigation metadata | `lib/ui/route-meta.ts` | Shared route map and parent relationships |

Visual intent and tokens are defined by `DESIGN.md`, `upgrade/02-design-direction.md`, and `upgrade/03-design-system-spec.md`. When they conflict, the precedence in `upgrade/README.md` applies.

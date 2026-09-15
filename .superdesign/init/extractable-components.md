# Extractable Components

This menu is limited to existing shared layout and basic presentation components. Domain/page-specific components are intentionally excluded. “Extractable props” lists page-varying state, navigation, or dynamic content only; styling, iconography, and CSS remain implementation details.

## Layout Components

## StudentShell
- Source: `components/layout/StudentShell.tsx`
- Category: layout
- Description: Persistent authenticated student rail/header/mobile navigation and content frame.
- Extractable props: children; active route is derived from pathname; notification count/profile are derived from hooks.
- Hardcoded: Student navigation labels/icons, shell geometry, settings/sign-out destinations, desktop/mobile breakpoint classes.

## AdminShell
- Source: `components/layout/AdminShell.tsx`
- Category: layout
- Description: Persistent protected admin rail/header/mobile navigation and content frame.
- Extractable props: children; active route is derived from pathname.
- Hardcoded: Admin navigation labels/icons, shield identity, sign-out behavior, rail/header CSS.

## PublicHeader
- Source: `components/layout/PublicShell.tsx`
- Category: layout
- Description: Compact public brand header with authentication-aware destination.
- Extractable props: signed-in state and resulting destination are hook-derived.
- Hardcoded: Logo placement, navigation/action labels, spacing, borders, theme control.

## PublicFooter
- Source: `components/layout/PublicShell.tsx`
- Category: layout
- Description: Shared public footer with product/legal navigation.
- Extractable props: none.
- Hardcoded: Link groups, copyright/product text, destinations, CSS.

## Navbar
- Source: `components/layout/Navbar.tsx`
- Category: layout
- Description: Responsive marketing navigation with desktop links and mobile sheet.
- Extractable props: authenticated state is hook-derived.
- Hardcoded: Product/About/Calculator labels and URLs, menu icon, CTA labels, layout classes.

## MobileDrawer
- Source: `components/layout/MobileDrawer.tsx`
- Category: layout
- Description: Shared mobile navigation drawer for student and admin contexts.
- Extractable props: open, onClose, mode, user.
- Hardcoded: Route icon mapping, account/sign-out labels, sheet geometry, navigation CSS.

## BottomTabBar
- Source: `components/layout/BottomTabBar.tsx`
- Category: layout
- Description: Mobile primary navigation for the student workspace.
- Extractable props: active route is pathname-derived.
- Hardcoded: Dashboard/Results/Insights/Transcript labels, route URLs, icons, safe-area geometry.

## NotificationDropdown
- Source: `components/layout/NotificationDropdown.tsx`
- Category: layout
- Description: Compact notification list and read actions in the student header.
- Extractable props: open state is internal; notification items/count/auth are hook-derived.
- Hardcoded: Type icon mapping, “View all” destination, date formatting, popover classes.

## AuthShell
- Source: `components/auth/AuthShell.tsx`
- Category: layout
- Description: Branded responsive shell for login, registration, and recovery flows.
- Extractable props: title, subtitle, eyebrow, children, compact, progress.
- Hardcoded: Academic-observatory proof points/icons, logo/theme positions, desktop two-pane composition.

## PageHeader
- Source: `components/shared/PageHeader.tsx`
- Category: layout
- Description: Consistent route title/context/action region with optional sticky seam.
- Extractable props: eyebrow, title, description, actions, sticky state.
- Hardcoded: Heading hierarchy, seam geometry, spacing, scroll-state CSS.

## Basic Components

## Button
- Source: `components/ui/Button.tsx`
- Category: basic
- Description: Canonical action control.
- Extractable props: loading, loadingText, disabled, onClick, children.
- Hardcoded: Variant/size CSS, loader icon, motion behavior, focus and disabled treatment.

## LinkButton
- Source: `components/ui/LinkButton.tsx`
- Category: basic
- Description: Next Link with canonical action appearance.
- Extractable props: href, children.
- Hardcoded: Variant/size CSS and interaction states.

## IconButton
- Source: `components/ui/IconButton.tsx`
- Category: basic
- Description: Accessible icon-only action.
- Extractable props: label, disabled, onClick, icon child.
- Hardcoded: Hit-area geometry, variant CSS, tooltip/label treatment.

## Card
- Source: `components/ui/Card.tsx`
- Category: basic
- Description: Canonical grouped surface.
- Extractable props: children.
- Hardcoded: Surface variants, border, radius, padding, optional hover behavior.

## Badge
- Source: `components/ui/Badge.tsx`
- Category: basic
- Description: Semantic status/classification label.
- Extractable props: children, status variant, dot/icon visibility.
- Hardcoded: Color mapping, typography, radius, spacing.

## Input
- Source: `components/ui/Input.tsx`
- Category: basic
- Description: Stable labeled field with errors, help text, and password reveal.
- Extractable props: value, label, description, error, disabled, required, input event handlers.
- Hardcoded: Field geometry, reveal icons, semantic token classes, animation treatment.

## Textarea
- Source: `components/ui/Textarea.tsx`
- Category: basic
- Description: Labeled multiline field.
- Extractable props: value, label, description, error, disabled, required, input event handlers.
- Hardcoded: Minimum height, resize policy, border/focus/error classes.

## FormField
- Source: `components/ui/FormField.tsx`
- Category: basic
- Description: Accessible label/description/error wrapper around a control.
- Extractable props: label, description, error, required, children.
- Hardcoded: ID linkage pattern, typography, spacing, semantic colors.

## FormSection
- Source: `components/forms/FormSection.tsx`
- Category: basic
- Description: Titled grouping for related form fields.
- Extractable props: title, description, children.
- Hardcoded: Section heading/description geometry and divider/surface treatment.

## Select
- Source: `components/ui/Select.tsx`
- Category: basic
- Description: Searchable single-value custom selector.
- Extractable props: value, options, onChange, label, error, disabled, searchable.
- Hardcoded: Chevron/search/check icons, keyboard behavior, option/popup CSS, no-results structure.

## Switch
- Source: `components/ui/Switch.tsx`
- Category: basic
- Description: Binary preference control.
- Extractable props: checked, onChange, disabled, accessible label.
- Hardcoded: Track/thumb geometry, semantic colors, motion.

## Tabs
- Source: `components/ui/Tabs.tsx`
- Category: basic
- Description: Keyboard-operable tab list, triggers, and panels.
- Extractable props: value, onValueChange, tab/panel children, activation mode.
- Hardcoded: ARIA relationships, arrow/Home/End keyboard logic, selected/focus CSS.

## SegmentedControl
- Source: `components/ui/SegmentedControl.tsx`
- Category: basic
- Description: Compact choice control for metrics and preferences.
- Extractable props: value, options, onChange, accessible group label.
- Hardcoded: Selected indicator, option geometry, semantic token classes.

## Modal
- Source: `components/ui/Modal.tsx`
- Category: basic
- Description: Shared dialog/focus/dismissal core.
- Extractable props: isOpen, onClose, title, description, children, confirm state/action.
- Hardcoded: Portal target, scrim/panel geometry, close icon, focus and scroll-lock behavior.

## Sheet
- Source: `components/ui/Sheet.tsx`
- Category: basic
- Description: Edge/mobile sheet using the Modal core.
- Extractable props: isOpen, onClose, title, children.
- Hardcoded: Presentation mode, handle/panel geometry, side/mobile behavior.

## DataTable
- Source: `components/ui/DataTable.tsx`
- Category: basic
- Description: Semantic read-only data table with sortable columns.
- Extractable props: columns, rows, sort state/change, loading, error, empty state.
- Hardcoded: Table semantics, row/cell geometry, sort indicator structure, overflow container CSS.

## Pagination
- Source: `components/ui/Pagination.tsx`
- Category: basic
- Description: Previous/next pagination with shown-count context.
- Extractable props: hasPrevious, hasNext, onPrevious, onNext, shownCount.
- Hardcoded: Previous/Next labels, chevron icons, layout classes.

## Disclosure
- Source: `components/ui/Disclosure.tsx`
- Category: basic
- Description: Accessible expandable trigger and content region.
- Extractable props: open, onOpenChange, title, children.
- Hardcoded: Chevron treatment, ARIA wiring, animation/spacing.

## Skeleton
- Source: `components/ui/Skeleton.tsx`
- Category: basic
- Description: Reserved loading geometry.
- Extractable props: shape, width, height.
- Hardcoded: Shape classes, semantic loading surface, animation policy.

## EmptyState
- Source: `components/shared/EmptyState.tsx`
- Category: basic
- Description: Shared empty-data explanation and next action.
- Extractable props: icon, title, description, primary action, optional secondary action.
- Hardcoded: Vertical composition, motion policy, typography and surface classes.

## ErrorState
- Source: `components/shared/ErrorState.tsx`
- Category: basic
- Description: Shared failure explanation and meaningful retry.
- Extractable props: title, description, retry visibility/action/label.
- Hardcoded: Error/retry icons, semantic danger treatment, layout classes.

## ThemeControl
- Source: `components/ui/ThemeControl.tsx`
- Category: basic
- Description: Light/dark/system preference chooser.
- Extractable props: selected theme is next-themes-derived.
- Hardcoded: Light/Dark/System options, icons, storage/provider behavior, compact/full presentation.

## Logo
- Source: `components/ui/Logo.tsx`
- Category: basic
- Description: Canonical linked AcadeGrade mark.
- Extractable props: href, size, onClick.
- Hardcoded: Brand image source, alt text, aspect/size mapping.

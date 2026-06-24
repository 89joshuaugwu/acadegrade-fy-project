# AcadeGrade: Design System & Animations

This document outlines the visual language, design principles, and animation architecture of AcadeGrade.

## 1. Core Aesthetic (Phase 3 Design Constraints)
- **Theme**: A "Premium Dark Mode" aesthetic designed to look professional, modern, and engaging.
- **Backgrounds**: Deep, rich dark blues/blacks (e.g., `#07090F`) rather than flat `#000000`.
- **Glassmorphism**: Heavy use of semi-transparent backgrounds with backdrop-blur effects (`backdrop-blur-md`, `bg-white/5`) to create depth and hierarchy.
- **Gradients & Glows**: Subtle radial gradients and drop shadows behind primary buttons and key elements to create a "glowing neon" effect.

## 2. CSS Architecture
- **CSS Variables**: `globals.css` defines a strict set of design tokens:
  - `--acade-primary`: Main brand color (Vibrant Indigo).
  - `--acade-secondary`: Accent color.
  - `--acade-danger`, `--acade-success`, `--acade-gold`: Semantic state colors.
  - `--acade-surface`, `--acade-deep`: Background tiers.
- **Tailwind CSS**: Used extensively for utility classes, mapping custom CSS variables into the Tailwind configuration.

## 3. Typography
- **Primary Font**: `Bricolage Grotesque` (Headers, aggressive display text).
- **Secondary Font**: `DM Sans` (Body copy, UI elements).
- **Monospace Font**: `Geist Mono` (Numbers, codes, CGPA scores).

## 4. Animation Architecture (`motion/react`)
- **Philosophy**: Animations should feel snappy and purposeful, never sluggish. 
- **Page Transitions**: Smooth fade-ins and slight vertical slides when navigating between routes.
- **Stagger Effects**: Lists (like the Course Catalog or Notification feed) render items sequentially using Framer Motion's `staggerChildren`.
- **Micro-interactions**: 
  - Buttons scale down slightly on tap (`whileTap={{ scale: 0.95 }}`).
  - Cards lift and glow slightly on hover.
- **Accessibility (a11y)**: Implemented a custom `useReducedMotion` hook. If a user's OS is set to "reduce motion", all Framer Motion animations immediately default to `0` duration, ensuring compliance with accessibility standards.

## 5. UI Components
- Designed as a bespoke, reusable library within `components/ui/`:
  - `Card.tsx`: Supports 'glass', 'solid', and 'outline' variants.
  - `Button.tsx`: Supports 'primary', 'secondary', 'danger', 'ghost' with built-in loading spinners.
  - `Input.tsx` & `Select.tsx`: Animated borders and focus rings.

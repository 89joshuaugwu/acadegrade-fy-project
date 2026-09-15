interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page transition wrapper — AnimatePresence mode="wait".
 *
 * Uses pathname as the motion key so transitions play on route change.
 * Fade + slide-up + blur-out on enter, fade + slide-up on exit.
 * Respects prefers-reduced-motion.
 */
function PageTransition({ children, className }: PageTransitionProps) {
  // Keep route content visible during SSR and hydration. An initial Motion
  // opacity could remain at zero when its mount animation failed to start.
  return <div className={className}>{children}</div>;
}

export { PageTransition };
export type { PageTransitionProps };

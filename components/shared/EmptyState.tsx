'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState — shown when a list or section has no data.
 * Always includes one clear next-action CTA.
 */
function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--acade-text-faint)]">
          {icon}
        </div>
      )}
      <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] mb-2 text-balance">
        {title}
      </h3>
      <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] max-w-sm mb-6 text-pretty">
        {description}
      </p>
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

export { EmptyState };
export type { EmptyStateProps };

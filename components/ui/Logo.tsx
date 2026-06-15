import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, href = '/dashboard', onClick, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const iconSizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const content = (
    <div className={cn("flex items-center gap-2.5 group cursor-pointer", className)} onClick={onClick}>
      {/* Icon Graphic */}
      <div className={cn(
        "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--acade-primary)] to-[var(--acade-primary-glow)] shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]",
        iconSizes[size]
      )}>
        {/* Subtle inner ring */}
        <div className="absolute inset-0 rounded-xl border border-white/20"></div>
        {/* Sleek stylized 'A' */}
        <span className="font-[family-name:var(--font-bricolage)] font-extrabold text-white tracking-tighter drop-shadow-md">
          A
        </span>
        {/* Little decorative dot */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--acade-gold)] border border-[var(--acade-deep)]"></div>
      </div>

      {/* Text Wordmark */}
      <div className="flex flex-col justify-center">
        <span 
          className={cn(
            "font-[family-name:var(--font-bricolage)] font-extrabold tracking-tight leading-none",
            "bg-gradient-to-r from-white via-indigo-100 to-[var(--acade-primary-glow)] text-transparent bg-clip-text",
            "drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:drop-shadow-[0_4px_8px_rgba(99,102,241,0.3)]",
            sizeClasses[size]
          )}
        >
          AcadeGrade
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

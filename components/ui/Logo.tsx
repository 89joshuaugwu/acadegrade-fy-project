import Link from 'next/link';
import Image from 'next/image';
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

  const imageSizes = {
    sm: '24px',
    md: '32px',
    lg: '48px',
  };

  const content = (
    <span className={cn('group flex items-center gap-2.5', className)}>
      <div className={cn(
        'relative flex shrink-0 items-center justify-center rounded-lg',
        iconSizes[size]
      )}>
        <Image 
          src="/logo.png" 
          alt="" 
          fill 
          sizes={imageSizes[size]}
          className="object-contain" 
          priority 
        />
      </div>

      <span className="flex flex-col justify-center">
        <span 
          className={cn(
            'font-[family-name:var(--font-bricolage)] font-extrabold leading-none tracking-tight text-[var(--acade-text)]',
            sizeClasses[size]
          )}
        >
          AcadeGrade
        </span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label="AcadeGrade home"
        className="inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]"
      >
        {content}
      </Link>
    );
  }

  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]">
      {content}
    </button>
  ) : content;
}

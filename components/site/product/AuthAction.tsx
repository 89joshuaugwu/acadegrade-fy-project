'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTimetableEnabled } from '@/hooks/useTimetableEnabled';
import { buttonClass } from '@/components/site/ui';

/**
 * A page's main action, aware of sign-in (brand v2). The server renders the
 * signed-out label and target; once useAuth resolves, a signed-in visitor
 * gets the signed-in pair (for example "Open dashboard", /dashboard). On the
 * timetable page a signed-in visitor whose `timetable` switch is off gets
 * `timetableOff`, so the action never lands on the paused notice.
 */

export interface ActionTarget {
  href: string;
  label: string;
}

type Variant = Parameters<typeof buttonClass>[0];

interface AuthActionProps extends ActionTarget {
  signedIn: ActionTarget;
  timetableOff?: ActionTarget;
  /** button: a v2 button; link: an underlined text link. */
  kind?: 'button' | 'link';
  variant?: Variant;
  size?: 'md' | 'lg';
  block?: boolean;
  /** Text link colour on dark grounds. */
  onDark?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

type RenderProps = Omit<AuthActionProps, 'href' | 'label' | 'signedIn' | 'timetableOff'> & { target: ActionTarget };

function Render({ target, kind = 'button', variant = 'gold', size = 'md', block = false, onDark = false, className = '', ...rest }: RenderProps) {
  const describedBy = rest['aria-describedby'];
  if (kind === 'link') {
    const tone = onDark
      ? 'text-white decoration-white/35 hover:decoration-ag-gold'
      : 'text-ag-violet decoration-ag-violet/30 hover:decoration-ag-violet';
    return (
      <Link href={target.href} aria-describedby={describedBy} className={`ag-focus rounded font-semibold underline underline-offset-4 ${tone} ${className}`}>
        {target.label}
      </Link>
    );
  }
  return (
    <Link href={target.href} aria-describedby={describedBy} className={`${buttonClass(variant, size, block)} ${className}`}>
      {target.label}
    </Link>
  );
}

function TimetableAware({ signedIn, off, ...rest }: { signedIn: ActionTarget; off: ActionTarget } & Omit<RenderProps, 'target'>) {
  const enabled = useTimetableEnabled();
  return <Render target={enabled ? signedIn : off} {...rest} />;
}

export function AuthAction({ href, label, signedIn, timetableOff, ...rest }: AuthActionProps) {
  const { user } = useAuth();
  if (user && timetableOff) return <TimetableAware signedIn={signedIn} off={timetableOff} {...rest} />;
  return <Render target={user ? signedIn : { href, label }} {...rest} />;
}

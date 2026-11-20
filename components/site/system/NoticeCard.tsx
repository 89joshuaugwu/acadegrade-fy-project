import type { ReactNode } from 'react';

/**
 * Brand v2 system notice (share states, course-list states, maintenance,
 * offline): a white card on the haze ground with an icon tile, one h1, one
 * sentence, the actions and an optional foot under a rule. Server-safe; no
 * data, no client JavaScript.
 */

export type NoticeIconName = 'lock' | 'clock' | 'signal' | 'tools' | 'offline' | 'list' | 'pause';

const PATHS: Record<NoticeIconName, ReactNode> = {
  lock: (
    <>
      <rect x="5" y="11" width="16" height="11" rx="3" />
      <path d="M8.5 11V8.2a4.5 4.5 0 0 1 9 0V11" />
      <path d="M13 15.2v2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="13" cy="13" r="9" />
      <path d="M13 8v5.2l3.4 2.1" />
    </>
  ),
  signal: (
    <>
      <path d="M4 10.5a13 13 0 0 1 18 0" />
      <path d="M7.5 14a8 8 0 0 1 11 0" />
      <path d="M11 17.5a3 3 0 0 1 4 0" />
      <path d="M4 4l18 18" />
    </>
  ),
  tools: (
    <>
      <path d="M15.5 5.2a4.6 4.6 0 0 0-5.7 5.9L4.6 16.3a2 2 0 0 0 2.8 2.8l5.2-5.2a4.6 4.6 0 0 0 5.9-5.7l-2.8 2.8-2.4-.6-.6-2.4z" />
    </>
  ),
  offline: (
    <>
      <path d="M8 19h10.5a4 4 0 0 0 .9-7.9A6.5 6.5 0 0 0 8 8.6" />
      <path d="M6 11.2A4 4 0 0 0 8 19" />
      <path d="M4 4l18 18" />
    </>
  ),
  list: (
    <>
      <rect x="5" y="4" width="16" height="18" rx="3" />
      <path d="M9 9.5h8M9 13h8M9 16.5h5" />
    </>
  ),
  pause: (
    <>
      <circle cx="13" cy="13" r="9" />
      <path d="M11 9.5v7M15 9.5v7" />
    </>
  ),
};

export function NoticeIcon({ name, className = '' }: { name: NoticeIconName; className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[name]}
    </svg>
  );
}

interface NoticeCardProps {
  title: ReactNode;
  sentence?: ReactNode;
  /** Actions and status lines under the sentence. */
  children?: ReactNode;
  /** A small foot under a rule (support contact, Android line). */
  foot?: ReactNode;
  icon?: NoticeIconName;
  /** 480px (PIN, states) or 600px (maintenance, offline). */
  width?: 'narrow' | 'wide';
  titleId?: string;
  className?: string;
}

export function NoticeCard({ title, sentence, children, foot, icon, width = 'narrow', titleId = 'notice-title', className = '' }: NoticeCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={`w-full ${width === 'wide' ? 'max-w-[600px]' : 'max-w-[480px]'} rounded-[28px] bg-white p-7 ring-1 ring-ag-ink/[0.06] sm:p-10 ${className}`}
    >
      {icon ? (
        <div className="mb-7 grid size-14 place-items-center rounded-2xl bg-ag-night text-ag-gold">
          <NoticeIcon name={icon} />
        </div>
      ) : null}
      <h1 id={titleId} className="ag-display text-[2rem] font-bold leading-[1.06] text-ag-ink sm:text-[2.375rem]">
        {title}
      </h1>
      {sentence ? <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist sm:text-[1.0625rem]">{sentence}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
      {foot ? <div className="mt-8 flex flex-col items-start gap-2 border-t border-ag-ink/10 pt-6 text-[0.9375rem] leading-relaxed text-ag-ink">{foot}</div> : null}
    </section>
  );
}

/** Centres a system page's card in the minimal shell's main. */
export function SystemStage({ children, top = false }: { children: ReactNode; top?: boolean }) {
  return <div className={`flex flex-1 justify-center px-4 py-10 sm:px-8 sm:py-16 ${top ? 'items-start' : 'items-start sm:items-center'}`}>{children}</div>;
}

/** A row of actions: the primary first, then text links; stacked on phones. */
export function NoticeActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-stretch gap-x-6 gap-y-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

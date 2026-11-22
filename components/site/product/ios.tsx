import type { ReactNode } from 'react';
import { siteHost } from '@/lib/public/features-android';
import { AcadeGradeMark } from '@/components/public/Logo';
import { PhoneFrame } from '@/components/site/ui';
import { CountUpText } from '@/components/motion/CountUp';

/**
 * iPhone pieces (brand v2): Safari's share sheet with Add to Home Screen,
 * drawn in HTML. Used on /app (#iphone) and /app/download/ios.
 */

function ShareRow({ label, highlight = false, icon }: { label: string; highlight?: boolean; icon: ReactNode }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 px-4 py-3 text-[0.9375rem] ${
        highlight ? 'relative z-10 rounded-xl bg-white font-semibold text-ag-ink ring-2 ring-ag-violet' : 'text-ag-ink'
      }`}
    >
      <span>{label}</span>
      <span className={highlight ? 'text-ag-violet' : 'text-ag-mist'}>{icon}</span>
    </li>
  );
}

const plus = (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <rect x="3" y="3" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const copy = (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <rect x="6.5" y="6.5" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13.5 6.5V4.5a1 1 0 00-1-1h-8a1 1 0 00-1 1v8a1 1 0 001 1h2" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const glasses = (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="6" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="14" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 12h2M3 11l1.5-5M17 11l-1.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const search = (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** Safari on an iPhone with the share sheet open and Add to Home Screen picked out. Decorative; the steps are text beside it. */
export function SafariShareSheet() {
  return (
    <PhoneFrame className="max-w-[320px]">
      <div className="relative flex h-[600px] flex-col bg-[#EDEBF5]">
        <div className="flex items-center justify-between px-6 pt-4 text-[0.8125rem] font-semibold">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-[#05040F]" />
          <span>5G</span>
        </div>
        <div className="mx-4 mt-3 rounded-xl bg-white px-3 py-2 text-center text-[0.8125rem] text-ag-ink shadow-sm">{siteHost()}</div>
        <div className="mx-4 mt-4 rounded-[20px] bg-ag-night p-4 text-white opacity-60">
          <div className="flex items-center gap-2">
            <AcadeGradeMark size={20} />
            <span className="text-[0.875rem] font-semibold">AcadeGrade</span>
          </div>
          <p className="ag-display ag-num mt-3 text-[2.25rem] font-bold leading-none"><CountUpText text="4.43" /></p>
          <p className="mt-1 text-[0.8125rem] text-ag-mist-night">Second Class Upper</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#F7F6FB] px-3 pb-6 pt-3 shadow-[0_-20px_50px_-20px_rgba(14,11,43,0.4)]">
          <span className="mx-auto block h-1 w-10 rounded-full bg-ag-ink/20" />
          <div className="mt-3 flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ag-night">
              <AcadeGradeMark size={28} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-semibold text-ag-ink">AcadeGrade</span>
              <span className="block truncate text-[0.8125rem] text-ag-mist">{siteHost()}</span>
            </span>
          </div>
          <ul className="mt-4 divide-y divide-ag-ink/8 rounded-xl bg-white/70">
            <ShareRow label="Copy" icon={copy} />
            <ShareRow label="Add to Reading List" icon={glasses} />
            <ShareRow label="Add to Home Screen" icon={plus} highlight />
            <ShareRow label="Find on Page" icon={search} />
          </ul>
        </div>
      </div>
    </PhoneFrame>
  );
}

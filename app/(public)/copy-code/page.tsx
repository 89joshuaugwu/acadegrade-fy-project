'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';

function readCodeFromFragment() {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.hash.slice(1)).get('code') ?? '';
  return value.replace(/\D/g, '').slice(0, 6);
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Clipboard copy is unavailable in this browser.');
}

/**
 * Email clients do not allow scripts or clipboard access. OTP emails link to
 * this small first-party page instead. The code is stored in the URL fragment,
 * which never reaches the server, and copying still requires an explicit tap.
 */
export default function CopyCodePage() {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    const nextCode = readCodeFromFragment();
    setCode(nextCode);
    // Keep the code out of browser history after it has been read.
    if (nextCode) window.history.replaceState(null, '', '/copy-code');
  }, []);

  async function copyCode() {
    if (!code) return;
    setCopyError('');
    try {
      await writeToClipboard(code);
      setCopied(true);
    } catch (error: any) {
      setCopyError(error?.message ?? 'Could not copy the code. Select it manually instead.');
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#07090F] px-4 py-8 text-[#E8EDFF]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(99,102,241,0.26),transparent_32%),radial-gradient(circle_at_86%_92%,rgba(245,158,11,0.14),transparent_34%)]" />
      <section className="relative w-full max-w-md rounded-[28px] border border-[#2A3656] bg-[#0E1322] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#6366F1]/15 ring-1 ring-[#818CF8]/45">
            <ShieldCheck size={22} className="text-[#A5B4FC]" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">AcadeGrade</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8892B0]">Secure verification</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-[-0.045em]">Copy your secure code</h1>
        <p className="mt-3 text-sm leading-6 text-[#AAB4D0]">Copy it once, return to AcadeGrade, and paste it into the verification field. It expires after five minutes.</p>

        {code ? (
          <>
            <div className="mt-7 rounded-2xl border-2 border-[#818CF8] bg-[#141B2E] px-4 py-6 text-center shadow-[0_0_42px_rgba(99,102,241,0.18)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8892B0]">One-time code</p>
              <p className="mt-3 font-mono text-[clamp(2rem,10vw,3rem)] font-black leading-none tracking-[0.2em] text-[#A5B4FC]">{code}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-extrabold text-white transition hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#A5B4FC] focus:ring-offset-2 focus:ring-offset-[#0E1322] active:scale-[0.99]"
            >
              {copied ? <Check size={19} /> : <Copy size={19} />}
              {copied ? 'Code copied — return to the app' : 'Copy code'}
            </button>
            <a href="acadegrade://" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#2A3656] bg-[#141B2E] px-5 text-sm font-bold text-[#E8EDFF] transition hover:border-[#6366F1]">
              Open AcadeGrade <ExternalLink size={15} />
            </a>
          </>
        ) : (
          <div className="mt-7 rounded-2xl border border-[#EF4444]/45 bg-[#EF4444]/10 p-5">
            <p className="font-bold text-[#FCA5A5]">This copy link is incomplete.</p>
            <p className="mt-1 text-sm leading-5 text-[#D1D8EF]">Open the latest email and use its “Copy code on this device” button, or manually copy the six-digit code from the email.</p>
          </div>
        )}

        <p aria-live="polite" className="mt-4 min-h-5 text-center text-xs text-[#AAB4D0]">{copied ? 'Your clipboard is ready.' : copyError}</p>
        <p className="mt-5 border-t border-[#1F2B47] pt-5 text-center text-[11px] leading-5 text-[#74809F]">For your security, never share this code. AcadeGrade support will never ask for it.</p>
        <Link href="/" className="mt-4 block text-center text-xs font-bold text-[#A5B4FC] hover:text-white">Back to acadegrade.vercel.app</Link>
      </section>
    </main>
  );
}

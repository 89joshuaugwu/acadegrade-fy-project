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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--acade-void)] px-4 py-10 text-[var(--acade-text)]">
      <section aria-labelledby="copy-code-title" className="w-full max-w-md rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-6 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck size={24} className="text-[var(--acade-success)]" aria-hidden="true" />
          <p className="font-[family-name:var(--font-bricolage)] text-lg font-bold tracking-[-0.02em]">AcadeGrade <span className="font-sans text-[0.9375rem] font-medium text-[var(--acade-text-muted)]">· secure verification</span></p>
        </div>

        <h1 id="copy-code-title" className="font-[family-name:var(--font-bricolage)] text-[2rem] font-bold leading-tight tracking-[-0.035em]">Copy your secure code</h1>
        <p className="mt-3 text-[0.9375rem] leading-6 text-[var(--acade-text-muted)]">Copy it once, return to AcadeGrade, and paste it into the verification field. It expires after five minutes.</p>

        {code ? (
          <>
            <div className="mt-7 rounded-[var(--radius-surface)] bg-[var(--acade-primary-dim)] px-4 py-6 text-center">
              <p className="text-[0.8125rem] font-semibold text-[var(--acade-text-muted)]">One-time code</p>
              <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[clamp(2rem,10vw,3rem)] font-bold leading-none tracking-[0.2em] text-[var(--acade-primary)] tabular-nums">{code}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 font-semibold text-[var(--acade-on-primary)] transition-colors hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] active:scale-[0.99]"
            >
              {copied ? <Check size={19} aria-hidden="true" /> : <Copy size={19} aria-hidden="true" />}
              {copied ? 'Code copied — return to the app' : 'Copy code'}
            </button>
            <a href="acadegrade://" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-5 font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]">
              Open AcadeGrade <ExternalLink size={15} aria-hidden="true" />
            </a>
          </>
        ) : (
          <div role="alert" className="mt-7 rounded-[var(--radius-surface)] bg-[var(--acade-danger-dim)] p-5">
            <p className="font-semibold text-[var(--acade-danger)]">This copy link is incomplete.</p>
            <p className="mt-1 text-[0.9375rem] leading-6 text-[var(--acade-text)]">Open the latest email and use its “Copy code on this device” button, or manually copy the six-digit code from the email.</p>
          </div>
        )}

        <p aria-live="polite" className="mt-4 min-h-5 text-center text-[0.875rem] text-[var(--acade-text-muted)]">{copied ? 'Your clipboard is ready.' : copyError}</p>
        <p className="mt-5 text-center text-[0.875rem] leading-6 text-[var(--acade-text-muted)]">For your security, never share this code. AcadeGrade support will never ask for it.</p>
        <Link href="/" className="mt-4 flex min-h-11 items-center justify-center text-[0.875rem] font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline">Back to acadegrade.vercel.app</Link>
      </section>
    </main>
  );
}

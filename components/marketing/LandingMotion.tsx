'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './LandingMotion.css';

/** Wrap the landing content once; descendants opt in with data-landing-motion. */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container || !window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-landing-motion]'));
    let observer: IntersectionObserver | undefined;

    container.dataset.landingMotionReady = 'true';

    const configure = () => {
      observer?.disconnect();
      if (preference.matches) {
        // Finish pending entrances too, so switching preferences never replays them.
        targets.forEach((target) => { target.dataset.landingEntered = 'done'; });
        return;
      }
      if (!('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.landingEntered = 'true';
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0 });
      targets.forEach((target) => {
        if (!target.dataset.landingEntered) observer?.observe(target);
      });
    };

    configure();
    preference.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', configure);
      delete container.dataset.landingMotionReady;
    };
  }, []);

  return <div ref={root} data-landing-motion-root="">{children}</div>;
}

type ReplayTypingTextProps = {
  text: string;
  className?: string;
  typeIntervalMs?: number;
  replayDelayMs?: number;
};

type HeroTypedPhrasesProps = {
  phrases: readonly [string, ...string[]];
  typeIntervalMs?: number;
  holdDelayMs?: number;
  switchDelayMs?: number;
};

/** A stable, SSR-first type loop for the home hero. */
export function HeroTypedPhrases({
  phrases,
  typeIntervalMs = 54,
  holdDelayMs = 1_900,
  switchDelayMs = 320,
}: HeroTypedPhrasesProps) {
  const [active, setActive] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(phrases[0].length);

  useLayoutEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (preference?.matches) {
      setActive(false);
      setPhraseIndex(0);
      setVisibleLength(phrases[0].length);
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let currentPhrase = 0;

    const typePhrase = () => {
      if (cancelled) return;
      const phrase = phrases[currentPhrase];
      let cursor = 0;
      setPhraseIndex(currentPhrase);
      setVisibleLength(0);

      const typeNextCharacter = () => {
        if (cancelled) return;
        cursor += 1;
        setVisibleLength(cursor);
        if (cursor < phrase.length) {
          timeout = setTimeout(typeNextCharacter, typeIntervalMs);
          return;
        }

        timeout = setTimeout(() => {
          if (cancelled) return;
          setVisibleLength(0);
          currentPhrase = (currentPhrase + 1) % phrases.length;
          timeout = setTimeout(typePhrase, switchDelayMs);
        }, holdDelayMs);
      };

      timeout = setTimeout(typeNextCharacter, typeIntervalMs);
    };

    setActive(true);
    typePhrase();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [holdDelayMs, phrases, switchDelayMs, typeIntervalMs]);

  return (
    <span
      aria-label={phrases[0]}
      className="marketing-hero-type-loop"
      data-hero-type-loop=""
      data-typing-active={active || undefined}
    >
      <span aria-hidden="true" className="marketing-hero-type-sizer">{phrases[phrases.length - 1]}</span>
      <span
        aria-hidden="true"
        className="marketing-hero-type-output"
        data-phrase-index={phraseIndex}
        data-typing-output=""
      >
        {phrases[phraseIndex].slice(0, visibleLength)}
        {active ? <span className="marketing-type-caret" /> : null}
      </span>
    </span>
  );
}

/** Keeps the full insight available to assistive technology and no-JS clients. */
export function ReplayTypingText({
  text,
  className,
  typeIntervalMs = 22,
  replayDelayMs = 15_000,
}: ReplayTypingTextProps) {
  const [active, setActive] = useState(false);
  const [visibleLength, setVisibleLength] = useState(text.length);

  useLayoutEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (preference?.matches) {
      setActive(false);
      setVisibleLength(text.length);
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const typeFromStart = () => {
      if (cancelled) return;
      let cursor = 0;
      setVisibleLength(0);

      const typeNextCharacter = () => {
        if (cancelled) return;
        cursor += 1;
        setVisibleLength(cursor);
        timeout = setTimeout(
          cursor < text.length ? typeNextCharacter : typeFromStart,
          cursor < text.length ? typeIntervalMs : replayDelayMs
        );
      };

      timeout = setTimeout(typeNextCharacter, typeIntervalMs);
    };

    setActive(true);
    typeFromStart();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [replayDelayMs, text, typeIntervalMs]);

  return (
    <p aria-label={text} className={`marketing-replay-type relative ${className || ''}`.trim()} data-typing-active={active || undefined}>
      <span aria-hidden="true" className="marketing-replay-fallback block" data-typing-fallback="">{text}</span>
      {active ? (
        <span aria-hidden="true" className="absolute inset-0 block" data-typing-output="">
          {visibleLength > 3 ? (
            <>
              {/* Settled text — normal color */}
              <span>{text.slice(0, visibleLength - 3)}</span>
              {/* Frontier — the live typing edge gets a gold gradient highlight */}
              <span
                style={{
                  background: 'linear-gradient(90deg, var(--acade-text), var(--acade-gold))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {text.slice(visibleLength - 3, visibleLength)}
              </span>
            </>
          ) : (
            // Still in the first few chars — color everything
            <span
              style={{
                background: 'linear-gradient(90deg, var(--acade-primary), var(--acade-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {text.slice(0, visibleLength)}
            </span>
          )}
          <span className="marketing-type-caret" />
        </span>
      ) : null}
    </p>
  );
}


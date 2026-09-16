import type { CSSProperties } from 'react';
import './PublicTextMotion.css';

export const AUTH_TEXT_MOTION_CLASS = 'auth-expressive auth-public-text-motion';

type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

type ExpressiveTextProps = {
  as?: TextTag;
  text: string;
  id?: string;
  className?: string;
  accentWords?: number;
};

type WordStyle = CSSProperties & { '--public-word-index': number };

/**
 * Server-renders the complete label, then applies a visual-only word reveal.
 * The aria label remains stable while the decorative word spans animate.
 */
export function DirectionalText({
  as: Tag = 'span',
  text,
  id,
  className,
  accentWords = 0,
}: ExpressiveTextProps) {
  const words = text.trim().split(/\s+/);
  const accentFrom = Math.max(words.length - accentWords, 0);

  return (
    <Tag
      aria-label={text}
      id={id}
      className={className}
      data-public-text-motion="directional"
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true">
          <span
            className={index >= accentFrom && accentWords > 0
              ? 'public-directional-word public-directional-accent'
              : 'public-directional-word'}
            style={{ '--public-word-index': index } as WordStyle}
          >
            {word}
          </span>
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}

/** A layout-stable, CSS-only typed reveal with a short-lived brand caret. */
export function TypedText({ as: Tag = 'span', text, id, className }: ExpressiveTextProps) {
  return (
    <Tag
      aria-label={text}
      id={id}
      className={className}
      data-public-text-motion="typed"
    >
      <span aria-hidden="true" className="public-typed-copy">{text}</span>
    </Tag>
  );
}

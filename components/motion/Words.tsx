import type { CSSProperties, ReactNode } from 'react';

/**
 * Splits a heading's text into words, each rising into its own mask, so a
 * heading arrives line by line whatever the line breaks are at this width.
 * Server-safe. Spaces stay real text nodes, so the heading reads and copies
 * exactly as written. Non-string children are returned untouched.
 *
 * mode 'load': plays on first paint (CSS only), for the hero headline.
 * mode 'scroll': plays when its nearest [data-mo='words'] ancestor enters the
 * viewport (Heading and the section headings put that on the h2).
 */
export function Words({ children, start = 0 }: { children: ReactNode; start?: number }) {
  if (typeof children !== 'string') return <>{children}</>;
  const words = children.split(/(\s+)/);
  let index = start;
  return (
    <>
      {words.map((part, i) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return part;
        const style = { '--mo-i': index++ } as CSSProperties;
        return (
          <span key={i} className="mo-w">
            <span style={style}>{part}</span>
          </span>
        );
      })}
    </>
  );
}

/** "Skip to content": the first focusable element on every public page. */
export function SkipLink({ target = 'content' }: { target?: string }) {
  return (
    <a href={`#${target}`} className="pg-skip">
      Skip to content
    </a>
  );
}

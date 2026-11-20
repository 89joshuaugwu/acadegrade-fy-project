/** "Skip to content": the first focusable element on the auth and minimal shells. Needs no page CSS. */
export function SkipLink({ target = 'content' }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[200] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-[0.9375rem] focus:font-semibold focus:text-ag-ink focus:shadow-lg focus:outline-2 focus:outline-ag-violet"
    >
      Skip to content
    </a>
  );
}

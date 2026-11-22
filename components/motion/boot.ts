/**
 * The public-site motion runtime (brand v2 "Gold hour"). Plain DOM, no React,
 * so it can run from an inline script before hydration: entrances never wait
 * on the JavaScript bundle, and nothing is hidden unless this ran.
 *
 * What it does:
 * - Bails out (content stays as server-rendered, fully visible) when the
 *   visitor asked for reduced motion, turned Data saver on, the browser sends
 *   Save-Data, or IntersectionObserver is missing.
 * - Otherwise puts `ag-mo` on <html>. Only then does components/motion/motion.css
 *   start [data-mo] elements from their hidden state.
 * - Watches every [data-mo] element (including ones streamed in or added by
 *   client navigation) and sets `data-mo-in` once it is 10% inside the
 *   viewport. CSS plays the entrance. Once only.
 *
 * Keep this function self-contained (no imports, no closures over module
 * scope) and free of comments: MotionScript inlines its source with
 * Function.prototype.toString. Reduced motion switched on mid-visit and
 * printing are handled in motion.css.
 */
export function bootAgMotion(): void {
  const w = window as Window & { __agMo?: boolean };
  if (w.__agMo) return;
  w.__agMo = true;
  const root = document.documentElement;
  try {
    if (!('IntersectionObserver' in w) || !w.matchMedia) return;
    if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (w.localStorage.getItem('acadegrade:data-saver:v1') === '1') return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection && connection.saveData) return;
  } catch {
    return;
  }

  root.classList.add('ag-mo');
  const seen = new WeakSet<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-mo-in', '');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  const watch = (el: Element) => {
    if (seen.has(el) || el.hasAttribute('data-mo-in')) return;
    seen.add(el);
    io.observe(el);
  };
  const scan = (node: ParentNode) => {
    if ((node as Element).hasAttribute && (node as Element).hasAttribute('data-mo')) watch(node as Element);
    node.querySelectorAll('[data-mo]').forEach(watch);
  };

  scan(document);
  new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scan(node as Element);
      });
    }
  }).observe(root, { childList: true, subtree: true });
}

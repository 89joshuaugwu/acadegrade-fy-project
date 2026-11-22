import { bootAgMotion } from './boot';
import { MotionBoot } from './MotionBoot';
import './motion.css';

const SOURCE = `(${bootAgMotion.toString()})();`;

/**
 * Put once near the top of a public shell. The inline script starts the
 * motion runtime while the page is still parsing (so entrances never wait for
 * hydration); MotionBoot starts it after a client-side navigation, when React
 * inserts the script without running it. With JavaScript off neither runs and
 * the page is simply static and fully visible.
 */
export function MotionScript() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SOURCE }} />
      <MotionBoot />
    </>
  );
}

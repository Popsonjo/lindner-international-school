import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the element matching the URL hash on every navigation, since
 *  React Router does not do this automatically like a classic full page load.
 *  The target page mounts a beat after the route change (AnimatePresence runs
 *  an exit transition on the outgoing page first), so the element frequently
 *  doesn't exist in the DOM yet when this effect first runs — poll a few
 *  animation frames until it appears instead of giving up on the first miss. */
export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }

    let rafId: number;
    let attempts = 0;
    const targetId = hash.slice(1);

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < 60) {
        rafId = requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();

    return () => cancelAnimationFrame(rafId);
  }, [pathname, hash]);

  return null;
}

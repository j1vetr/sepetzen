import { useEffect } from 'react';
import Lenis from 'lenis';

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Skip Lenis on touch devices: iOS Safari and Android Chrome already provide
    // excellent native momentum/rubber-band behavior, and intercepting touchmove
    // breaks pinned sections, sticky elements, and pull-to-refresh.
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window && window.innerWidth < 1024);
    if (isTouch) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
  return null;
}

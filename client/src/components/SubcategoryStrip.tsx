import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';

type Item = { id: string; slug: string; name: string };

const SPEED_PX_PER_SEC = 22;
const RESUME_DELAY_MS = 2200;

/**
 * Alt kategoriler: tek satır, küçük etiketler. Kendiliğinden yavaşça kayar, dokununca veya
 * üzerine gelince durur, kullanıcı da elle kaydırabilir. Sığmıyorsa sonsuz döngü olur.
 */
export function SubcategoryStrip({ items }: { items: Item[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState(false);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // İçerik taşıyorsa döngü için listeyi iki kez göster
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => {
      const single = loop ? el.scrollWidth / 2 : el.scrollWidth;
      setLoop(single > el.clientWidth + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, loop]);

  // Yavaş otomatik kaydırma
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !loop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const half = el.scrollWidth / 2;
      if (pausedRef.current) {
        pos = el.scrollLeft;
      } else {
        pos += (SPEED_PX_PER_SEC * dt) / 1000;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      // Elle geriye kaydırınca da döngü bozulmasın
      if (el.scrollLeft <= 0 && pausedRef.current) {
        el.scrollLeft = half;
        pos = half;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loop]);

  const pause = () => {
    pausedRef.current = true;
    clearTimeout(resumeTimer.current);
  };
  const resumeSoon = (delay = RESUME_DELAY_MS) => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, delay);
  };
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const renderItems = (copy: number) =>
    items.map(child => (
      <Link key={`${copy}-${child.id}`} href={`/kategori/${child.slug}`}>
        <span
          className="inline-block shrink-0 whitespace-nowrap border border-white/20 text-white text-[10.5px] tracking-[0.1em] uppercase px-3.5 py-2 cursor-pointer transition-colors hover:border-white hover:bg-white hover:text-black"
          data-testid={copy === 0 ? `link-subcategory-${child.slug}` : undefined}
          tabIndex={copy === 0 ? undefined : -1}
        >
          {child.name}
        </span>
      </Link>
    ));

  return (
    <div
      ref={scrollerRef}
      className="flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain"
      style={{
        WebkitOverflowScrolling: 'touch',
        maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
      }}
      onMouseEnter={pause}
      onMouseLeave={() => resumeSoon(400)}
      onTouchStart={pause}
      onTouchEnd={() => resumeSoon()}
      onPointerDown={pause}
      onPointerUp={() => resumeSoon()}
      onWheel={() => { pause(); resumeSoon(); }}
      onFocus={pause}
      onBlur={() => resumeSoon()}
    >
      {renderItems(0)}
      {loop && <span className="contents" aria-hidden="true">{renderItems(1)}</span>}
    </div>
  );
}

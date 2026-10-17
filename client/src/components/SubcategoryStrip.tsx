import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Item = { id: string; slug: string; name: string };

/**
 * Alt kategoriler: tek satır, küçük sade etiketler. Elle kaydırılır, taşarsa
 * sol ve sağ ok düğmeleri çıkar.
 */
export function SubcategoryStrip({ items, testIdPrefix = 'link-subcategory' }: { items: Item[]; testIdPrefix?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const arrowCls = 'shrink-0 w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors';

  return (
    <div className="flex items-center gap-1">
      {(canLeft || canRight) && (
        <button type="button" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label="Geri" className={`${arrowCls} disabled:opacity-25 disabled:hover:text-white/60`} data-testid={`${testIdPrefix}-prev`}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div ref={scrollerRef} onScroll={update} className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar overscroll-x-contain">
        {items.map(child => (
          <Link key={child.id} href={`/kategori/${child.slug}`}>
            <span
              className="inline-block shrink-0 whitespace-nowrap rounded-sm bg-white/[0.06] text-white/80 text-[11px] font-medium tracking-wide uppercase px-3 py-1.5 cursor-pointer transition-colors hover:bg-white hover:text-black"
              data-testid={`${testIdPrefix}-${child.slug}`}
            >
              {child.name}
            </span>
          </Link>
        ))}
      </div>
      {(canLeft || canRight) && (
        <button type="button" onClick={() => scrollBy(1)} disabled={!canRight} aria-label="İleri" className={`${arrowCls} disabled:opacity-25 disabled:hover:text-white/60`} data-testid={`${testIdPrefix}-next`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

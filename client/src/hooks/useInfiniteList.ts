import { useCallback, useEffect, useState } from 'react';

/**
 * Listeyi parça parça gösterir: sayfa aşağı kaydırıldıkça sıradaki parça eklenir.
 * `items` değişince (filtre, sıralama, kategori) liste başa döner.
 * Dönen `sentinelRef` listenin altındaki boş bir öğeye verilmelidir.
 */
export function useInfiniteList<T>(items: T[], pageSize = 12, revealDelayMs = 450) {
  const [count, setCount] = useState(pageSize);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setCount(pageSize);
  }, [items, pageSize]);

  const hasMore = count < items.length;

  useEffect(() => {
    if (!node || !hasMore) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Sıradaki ürünler kısa bir bekleyişten sonra gelir, iskelet kartlar bu sürede görünür
          if (timer !== null) return;
          timer = setTimeout(() => {
            timer = null;
            setCount((c) => Math.min(c + pageSize, items.length));
          }, revealDelayMs);
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
    };
  }, [node, hasMore, count, items.length, pageSize]);

  const sentinelRef = useCallback((el: HTMLElement | null) => setNode(el), []);

  return { visible: items.slice(0, count), hasMore, sentinelRef };
}

import { useCallback, useEffect, useState } from 'react';

/**
 * Listeyi parça parça gösterir: sayfa aşağı kaydırıldıkça sıradaki parça eklenir.
 * `items` değişince (filtre, sıralama, kategori) liste başa döner.
 * Dönen `sentinelRef` listenin altındaki boş bir öğeye verilmelidir.
 */
export function useInfiniteList<T>(items: T[], pageSize = 24) {
  const [count, setCount] = useState(pageSize);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setCount(pageSize);
  }, [items, pageSize]);

  const hasMore = count < items.length;

  useEffect(() => {
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, hasMore, count, items.length, pageSize]);

  const sentinelRef = useCallback((el: HTMLElement | null) => setNode(el), []);

  return { visible: items.slice(0, count), hasMore, sentinelRef };
}

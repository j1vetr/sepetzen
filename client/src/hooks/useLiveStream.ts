import { useQuery } from '@tanstack/react-query';
import type { Product } from '@shared/schema';

export type PublicLiveStream =
  | { isActive: false; liveProductIds?: string[] }
  | { isActive: true; title: string; description: string; streamUrl: string; startedAt: string | null; products: Product[]; liveProductIds?: string[] };

export function useLiveStream() {
  return useQuery<PublicLiveStream>({
    queryKey: ['/api/live-stream'],
    queryFn: async () => {
      const res = await fetch('/api/live-stream');
      if (!res.ok) return { isActive: false };
      return res.json();
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Sepette canlı yayın listesinde yayına alınmış bir ürün var mı? Varsa kargo alıcı ödemeli işlenir. */
export function useHasLiveStreamItems(items: Array<{ product?: { id?: string } | null; productId?: string }>): boolean {
  const { data } = useLiveStream();
  // Yayın kapalı olsa bile listedeki yayındaki ürünler canlı yayın ürünü sayılır
  const liveIds = new Set(data?.liveProductIds ?? (data?.isActive ? data.products.map((p) => p.id) : []));
  if (liveIds.size === 0) return false;
  return items.some((i) => {
    const id = i.product?.id ?? i.productId;
    return !!id && liveIds.has(id);
  });
}

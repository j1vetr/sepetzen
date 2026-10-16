import { useQuery } from '@tanstack/react-query';
import type { Product } from '@shared/schema';

export type PublicLiveStream =
  | { isActive: false }
  | { isActive: true; title: string; description: string; streamUrl: string; startedAt: string | null; products: Product[] };

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

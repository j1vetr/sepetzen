import { useQuery } from '@tanstack/react-query';

const DEFAULT_FREE_SHIPPING_THRESHOLD = 1500;

interface ShippingSettingsResponse {
  freeShippingThreshold?: number;
}

export function useFreeShippingThreshold() {
  const { data } = useQuery<ShippingSettingsResponse>({
    queryKey: ['/api/shipping/settings'],
    queryFn: async () => {
      const response = await fetch('/api/shipping/settings');
      if (!response.ok) throw new Error('Kargo ayarları alınamadı');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const configuredThreshold = Number(data?.freeShippingThreshold);
  return Number.isFinite(configuredThreshold) && configuredThreshold > 0
    ? configuredThreshold
    : DEFAULT_FREE_SHIPPING_THRESHOLD;
}
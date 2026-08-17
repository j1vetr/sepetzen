import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  DEFAULT_DOMESTIC_SHIPPING_COST,
  DEFAULT_INTERNATIONAL_SHIPPING_COST,
  type CountryShippingRate,
} from '@shared/shipping';

interface ShippingSettingsResponse {
  freeShippingThreshold?: number;
  domesticShippingCost?: number;
  internationalShippingCost?: number;
  countryShippingRates?: CountryShippingRate[];
}

export interface ShippingSettings {
  freeShippingThreshold: number;
  domesticShippingCost: number;
  internationalShippingCost: number;
  countryShippingRates: CountryShippingRate[];
}

function useShippingSettingsQuery() {
  return useQuery<ShippingSettingsResponse>({
    queryKey: ['/api/shipping/settings'],
    queryFn: async () => {
      const response = await fetch('/api/shipping/settings');
      if (!response.ok) throw new Error('Kargo ayarları alınamadı');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Tüm kargo ayarlarını döner; DB'den okuyamadığında fallback değerleri kullanır. */
export function useShippingSettings(): ShippingSettings {
  const { data } = useShippingSettingsQuery();

  const freeShippingThreshold =
    Number.isFinite(Number(data?.freeShippingThreshold)) && Number(data?.freeShippingThreshold) > 0
      ? Number(data!.freeShippingThreshold)
      : DEFAULT_FREE_SHIPPING_THRESHOLD;

  const domesticShippingCost =
    Number.isFinite(Number(data?.domesticShippingCost)) && Number(data?.domesticShippingCost) >= 0
      ? Number(data!.domesticShippingCost)
      : DEFAULT_DOMESTIC_SHIPPING_COST;

  const internationalShippingCost =
    Number.isFinite(Number(data?.internationalShippingCost)) && Number(data?.internationalShippingCost) >= 0
      ? Number(data!.internationalShippingCost)
      : DEFAULT_INTERNATIONAL_SHIPPING_COST;

  const countryShippingRates = Array.isArray(data?.countryShippingRates)
    ? data!.countryShippingRates
    : [];

  return { freeShippingThreshold, domesticShippingCost, internationalShippingCost, countryShippingRates };
}

/** Geriye dönük uyumluluk: sadece eşiği döner. */
export function useFreeShippingThreshold(): number {
  return useShippingSettings().freeShippingThreshold;
}

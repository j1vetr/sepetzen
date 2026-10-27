import { useQuery } from '@tanstack/react-query';

export interface VariantOptionItem {
  id: string;
  type: 'color' | 'size';
  name: string;
  key: string;
  hex: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export const VARIANT_OPTIONS_KEY = ['/api/admin/variant-options'];

export function useVariantOptions() {
  return useQuery<VariantOptionItem[]>({
    queryKey: VARIANT_OPTIONS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/variant-options', { credentials: 'include' });
      if (!res.ok) throw new Error('Varyasyonlar yüklenemedi');
      return res.json();
    },
  });
}

export async function createVariantOption(input: { type: 'color' | 'size'; name: string; hex?: string | null }) {
  const res = await fetch('/api/admin/variant-options', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Değer eklenemedi');
  return data as VariantOptionItem;
}

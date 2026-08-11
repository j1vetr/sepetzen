import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Product {
  id: string;

  name: string;

  slug: string;

  description?: string;

  sku?: string;

  categoryId?: string;

  basePrice: string;

  images: string[];

  availableSizes: string[];

  availableColors: { name: string; hex: string | null }[];

  isActive: boolean;

  isFeatured: boolean;

  isNew: boolean;

  discountBadge?: string | null;

  brand?: string | null;

  specs?: {
    urunCinsi?: string;
    tamUzunluk?: string;
    namluUzunlugu?: string;
    etKalinligi?: string;
    agirlik?: string;
    celikCinsi?: string;
    sapCinsi?: string;

  } | null;

  createdAt: string;

  updatedAt: string;

  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: string;
  stock: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  displayOrder: number;
  /** SEO ve kategori açıklaması alanları /api/categories yanıtında döner. */
  seoTitle?: string | null;
  seoDescription?: string | null;
  contentHtml?: string | null;
  /** Üst kategori kimliği; null ise ana kategoridir. */
  parentId?: string | null;
}

export interface ProductFilters {
  categoryId?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.isFeatured !== undefined) params.append('isFeatured', String(filters.isFeatured));
      if (filters?.isNew !== undefined) params.append('isNew', String(filters.isNew));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.minPrice !== undefined) params.append('minPrice', String(filters.minPrice));
      if (filters?.maxPrice !== undefined) params.append('maxPrice', String(filters.maxPrice));
      if (filters?.sort) params.append('sort', filters.sort);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json() as Promise<Product[]>;
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['products', slug],
    queryFn: async () => {
      const response = await fetch(`/api/products/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json() as Promise<Product>;
    },
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<Category[]>;
    },
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: async () => {
      const response = await fetch(`/api/categories/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json() as Promise<Category>;
    },
    enabled: !!slug,
  });
}

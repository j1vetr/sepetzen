import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import { isDiscountBadgeActive } from '@/lib/discountBadgeActive';
import { normalizeBadge } from '@/lib/discountPrice';
export type ProductSortValue = 'recommended' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'discounted';

export const productSortOptions: { value: ProductSortValue; label: string }[] = [
  { value: 'recommended', label: 'Önerilen' },
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'discounted', label: 'İndirimdekiler' },
];

type DiscountSortable = {
  id: string;
  basePrice?: string | null;
  discountBadge?: string | null;
  discountBadgeStartDate?: string | null;
  discountBadgeEndDate?: string | null;
  variants?: { stock?: number | null }[] | null;
};

/** Şu an geçerli indirim yüzdesi (yoksa 0). Tükenen ürün indirimli sayılmaz. */
function activeDiscountPercent(p: DiscountSortable): number {
  if (!p.discountBadge || isFreeShippingPromotion(p.discountBadge)) return 0;
  if (!isDiscountBadgeActive(p.discountBadge, p.discountBadgeStartDate, p.discountBadgeEndDate)) return 0;
  if (p.variants && p.variants.length > 0 && p.variants.every((v) => !((v.stock ?? 0) > 0))) return 0;
  const m = normalizeBadge(p.discountBadge).match(/%(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** İndirimdekiler: geçerli indirimi olanlar önce (yüzdesi yüksek olan üstte), diğerleri mevcut sırasıyla arkada. */
export function sortDiscountedFirst<T extends DiscountSortable>(list: T[]): T[] {
  return list
    .map((p, i) => ({ p, i, d: activeDiscountPercent(p) }))
    .sort((a, b) => Number(b.d > 0) - Number(a.d > 0) || b.d - a.d || a.i - b.i)
    .map((x) => x.p);
}

// Sayfa her yüklendiğinde değişen, ama oturum boyunca sabit kalan tohum:
// filtre değiştirirken ürünler sürekli yer değiştirmesin, yenilemede karışsın.
const PAGE_SEED = Math.floor(Math.random() * 2 ** 31);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** "Önerilen" sıralaması: ürün kimliğine bağlı, sayfa yüklemesine göre değişen karışık sıra. */
export function sortRecommended<T extends { id: string }>(list: T[]): T[] {
  return list
    .map((p) => ({ p, k: mulberry32(hashId(p.id) ^ PAGE_SEED)() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.p);
}

/** Marka sayfası gibi sunucudan sıralanmamış listeler için tam istemci sıralaması. */
export function sortProductsClient<T extends DiscountSortable & { id: string; basePrice?: string | null; createdAt?: string | Date | null; isFeatured?: boolean | null }>(
  list: T[],
  sort: ProductSortValue,
): T[] {
  const price = (p: T) => parseFloat(p.basePrice || '0') || 0;
  const time = (p: T) => (p.createdAt ? new Date(p.createdAt).getTime() : 0);
  switch (sort) {
    case 'recommended':
      return sortRecommended(list);
    case 'price_asc':
      return [...list].sort((a, b) => price(a) - price(b));
    case 'price_desc':
      return [...list].sort((a, b) => price(b) - price(a));
    case 'discounted':
      return sortDiscountedFirst(list);
    case 'popular':
      return [...list].sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || time(b) - time(a));
    default:
      return [...list].sort((a, b) => time(b) - time(a));
  }
}

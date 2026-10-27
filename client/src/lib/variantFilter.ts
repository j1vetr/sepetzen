import { colorSlug } from '@/lib/colorSlug';
import { compareSizeNames } from '@shared/variantKey';

interface SummaryProduct {
  colorSummary?: { name: string; hex: string | null; slug: string }[];
  sizeSummary?: string[];
  variantPairs?: [string, string][];
}

export function parseVariantParams(search: string): { colors: string[]; sizes: string[] } {
  const p = new URLSearchParams(search);
  const split = (v: string | null) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);
  return { colors: split(p.get('renk')).map(colorSlug), sizes: split(p.get('beden')) };
}

/** Seçimi sayfa yenilemeden adres çubuğuna yazar; diğer parametrelere dokunmaz. */
export function writeVariantParams(colors: string[], sizes: string[]) {
  const url = new URL(window.location.href);
  if (colors.length) url.searchParams.set('renk', colors.join(',')); else url.searchParams.delete('renk');
  if (sizes.length) url.searchParams.set('beden', sizes.join(',')); else url.searchParams.delete('beden');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

/** Yalnızca satışta olan (aktif ve stoklu) varyantlardan gelen seçenekler. */
export function collectVariantOptions(products: SummaryProduct[]) {
  const colorBySlug = new Map<string, string>();
  const colorCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};
  for (const p of products) {
    for (const c of p.colorSummary ?? []) {
      if (!colorBySlug.has(c.slug)) colorBySlug.set(c.slug, c.name);
      colorCounts[c.name] = (colorCounts[c.name] ?? 0) + 1;
    }
    for (const s of p.sizeSummary ?? []) sizeCounts[s] = (sizeCounts[s] ?? 0) + 1;
  }
  const nameToSlug = new Map<string, string>();
  colorBySlug.forEach((name, slug) => nameToSlug.set(name, slug));
  return {
    colorOptions: Array.from(colorBySlug.values()).sort((a, b) => a.localeCompare(b, 'tr')),
    colorCounts,
    colorSlugOf: (name: string) => nameToSlug.get(name) ?? colorSlug(name),
    sizeOptions: Object.keys(sizeCounts).sort(compareSizeNames),
    sizeCounts,
    slugToName: (slug: string) => colorBySlug.get(slug) ?? slug,
  };
}

export function filterByVariants<T extends SummaryProduct>(products: T[], colors: string[], sizes: string[]): T[] {
  if (colors.length === 0 && sizes.length === 0) return products;
  return products.filter(p => {
    // Renk ve beden aynı satıştaki varyantta birlikte bulunmalı
    return (p.variantPairs ?? []).some(([c, s]) =>
      (colors.length === 0 || colors.includes(c)) && (sizes.length === 0 || sizes.includes(s)));
  });
}

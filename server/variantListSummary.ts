import { and, eq, inArray, asc, gt } from "drizzle-orm";
import { db } from "./storage";
import { productVariants, variantOptions } from "@shared/schema";
import { foldVariantKey, compareSizeNames } from "@shared/variantKey";

export interface ListColor { name: string; hex: string | null; slug: string }
export interface VariantListSummary {
  /** Satışta olan (aktif ve stoklu) renkler, kütüphane sırasına göre */
  colorSummary: ListColor[];
  /** Satışta olan bedenler, kütüphane sırasına göre */
  sizeSummary: string[];
  /** En düşük satışta olan varyant fiyatı; varyant yoksa null */
  startingPrice: number | null;
  /** Satıştaki varyant fiyatları birbirinden farklıysa true */
  priceVaries: boolean;
  /** Satışta olan renk/beden çiftleri: [renk adresi, beden] (boş alan ''), birlikte süzmek için */
  variantPairs: [string, string][];
}

function slugOf(name: string): string {
  return foldVariantKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Liste çıktılarına hafif renk, beden ve başlangıç fiyatı özeti ekler (görseller taşınmaz). */
export async function attachVariantListSummary<T extends { id: string }>(items: T[]): Promise<Array<T & VariantListSummary>> {
  if (items.length === 0) return [];
  const ids = items.map((p) => p.id);
  const [rows, opts] = await Promise.all([
    db
      .select({
        productId: productVariants.productId,
        color: productVariants.color,
        colorHex: productVariants.colorHex,
        size: productVariants.size,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true), gt(productVariants.stock, 0))),
    db.select().from(variantOptions).orderBy(asc(variantOptions.sortOrder)),
  ]);
  const order = new Map<string, number>();
  const libHex = new Map<string, string | null>();
  opts.forEach((o) => {
    order.set(`${o.type}:${o.key}`, o.sortOrder);
    if (o.type === "color") libHex.set(o.key, o.hex);
  });
  const byProduct = new Map<string, typeof rows>();
  for (const r of rows) {
    const l = byProduct.get(r.productId);
    if (l) l.push(r); else byProduct.set(r.productId, [r]);
  }
  const rank = (type: string, name: string) => order.get(`${type}:${foldVariantKey(name)}`) ?? Number.MAX_SAFE_INTEGER;

  return items.map((item) => {
    const vs = byProduct.get(item.id) ?? [];
    const colors = new Map<string, ListColor>();
    const sizes = new Set<string>();
    const prices: number[] = [];
    const pairKeys = new Map<string, [string, string]>();
    for (const v of vs) {
      if (v.color) {
        const key = foldVariantKey(v.color);
        const existing = colors.get(key);
        const hex = v.colorHex || libHex.get(key) || null;
        if (!existing) colors.set(key, { name: v.color, hex, slug: slugOf(v.color) });
        else if (!existing.hex && hex) existing.hex = hex;
      }
      if (v.size) sizes.add(v.size);
      const pc = v.color ? slugOf(v.color) : "";
      const ps = v.size ?? "";
      pairKeys.set(`${pc}|${ps}`, [pc, ps]);
      const n = parseFloat(v.price);
      if (Number.isFinite(n)) prices.push(n);
    }
    const colorSummary = Array.from(colors.values()).sort(
      (a, b) => rank("color", a.name) - rank("color", b.name) || a.name.localeCompare(b.name, "tr"),
    );
    const sizeSummary = Array.from(sizes).sort(
      (a, b) => rank("size", a) - rank("size", b) || compareSizeNames(a, b),
    );
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    return { ...item, colorSummary, sizeSummary, startingPrice: min, priceVaries: min !== null && max !== null && min !== max, variantPairs: Array.from(pairKeys.values()) };
  });
}

/** Varyasyonlar kütüphanesindeki sıra: katlanmış anahtar listesi (renk ve beden ayrı). */
export async function getVariantOptionOrder(): Promise<{ color: string[]; size: string[] }> {
  const opts = await db.select().from(variantOptions).orderBy(asc(variantOptions.sortOrder), asc(variantOptions.name));
  return {
    color: opts.filter((o) => o.type === "color").map((o) => o.key),
    size: opts.filter((o) => o.type === "size").map((o) => o.key),
  };
}

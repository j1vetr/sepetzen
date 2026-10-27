import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./storage";
import { products, productVariants, productColorMerges, cartItems } from "@shared/schema";
import { ensureVariantOptions } from "./variantOptions";

type ColorEntry = { name?: string; hex?: string | null; slug?: string | null };

interface MemberPlan {
  productId: string;
  name: string;
  slug: string;
  isPrimary: boolean;
  isActive: boolean;
  colorName: string | null;
  hex: string | null;
  photoCount: number;
  variantCount: number;
  price: string | null;
  stock: number | null;
  warnings: string[];
}

interface GroupPlan {
  groupKey: string;
  primaryProductId: string;
  members: MemberPlan[];
  warnings: string[];
  canMerge: boolean;
}

const isPhoto = (u: string) => !/\.(mp4|webm|mov)(\?.*)?$/i.test(u) && !/youtu\.?be/i.test(u);

export function colorSlugOf(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

/** Renk linkleriyle birbirine bağlı ürün gruplarını bulur ve her biri için birleştirme planı çıkarır. */
export async function buildPlans(): Promise<{ groups: GroupPlan[]; merged: Set<string> }> {
  const [allProducts, allVariants, activeMerges] = await Promise.all([
    db.select().from(products),
    db.select().from(productVariants),
    db.select().from(productColorMerges).where(isNull(productColorMerges.undoneAt)),
  ]);

  const merged = new Set<string>();
  activeMerges.forEach((m) => { merged.add(m.primaryProductId); merged.add(m.sourceProductId); });

  const bySlug = new Map<string, ProductRow>();
  allProducts.forEach((p) => bySlug.set(p.slug, p));
  const variantsOf = new Map<string, VariantRow[]>();
  allVariants.forEach((v) => {
    const l = variantsOf.get(v.productId);
    if (l) l.push(v); else variantsOf.set(v.productId, [v]);
  });

  // Birleşik kümeler (union-find)
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  };

  const colorsOf = (p: ProductRow): ColorEntry[] => (Array.isArray(p.availableColors) ? (p.availableColors as ColorEntry[]) : []);
  for (const p of allProducts) {
    const colors = colorsOf(p);
    if (colors.length < 2) continue;
    for (const c of colors) {
      if (!c.slug || c.slug === p.slug) continue;
      const target = bySlug.get(c.slug);
      if (target) union(p.id, target.id);
    }
  }

  const clusters = new Map<string, ProductRow[]>();
  for (const p of allProducts) {
    if (!parent.has(p.id)) continue;
    const root = find(p.id);
    const l = clusters.get(root);
    if (l) l.push(p); else clusters.set(root, [p]);
  }

  const groups: GroupPlan[] = [];
  for (const members of Array.from(clusters.values())) {
    if (members.length < 2) continue;
    if (members.some((m) => merged.has(m.id))) continue;
    groups.push(planGroup(members, variantsOf, bySlug));
  }
  return { groups, merged };
}

function planGroup(
  members: ProductRow[],
  variantsOf: Map<string, VariantRow[]>,
  bySlug: Map<string, ProductRow>,
  forcedPrimaryId?: string,
): GroupPlan {
  const sorted = [...members].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name, "tr"));
  const groupKey = sorted.map((m) => m.id).sort().join(",");
  const primary = sorted.find((m) => m.id === forcedPrimaryId) ?? sorted[0];
  const groupWarnings: string[] = [];

  // Her ürünün renk adı: kendi girişi (bağlantısız) veya başka ürünün listesinde kendisine verilen ad
  const names = new Map<string, Map<string, ColorEntry>>();
  const note = (productId: string, entry: ColorEntry) => {
    if (!entry.name || !entry.name.trim()) return;
    const key = entry.name.trim().toLocaleLowerCase("tr");
    const m = names.get(productId) ?? new Map<string, ColorEntry>();
    if (!m.has(key)) m.set(key, entry);
    names.set(productId, m);
  };
  const entryCountBySlug = new Map<string, number>();
  for (const p of members) {
    const colors = Array.isArray(p.availableColors) ? (p.availableColors as ColorEntry[]) : [];
    for (const c of colors) {
      const targetSlug = c.slug && c.slug.trim() ? c.slug : p.slug;
      const target = bySlug.get(targetSlug);
      if (!target) {
        groupWarnings.push(`"${c.name}" rengi bulunamayan bir ürün adresine bağlı (${targetSlug}).`);
        continue;
      }
      note(target.id, c);
    }
    // Aynı listede iki rengin aynı ürüne bağlanması
    const seen = new Map<string, string>();
    for (const c of colors) {
      const t = c.slug && c.slug.trim() ? c.slug : p.slug;
      const prev = seen.get(t);
      if (prev && prev !== (c.name || "")) {
        groupWarnings.push(`${p.name}: "${prev}" ve "${c.name}" renkleri aynı ürüne bağlı. Önce ürünün renk bağlantılarını düzeltin.`);
        entryCountBySlug.set(t, 2);
      }
      seen.set(t, c.name || "");
    }
  }

  const memberPlans: MemberPlan[] = sorted.map((p) => {
    const warnings: string[] = [];
    const vs = variantsOf.get(p.id) ?? [];
    const active = vs.filter((v) => v.isActive);
    const nameMap = names.get(p.id);
    let colorName: string | null = null;
    let hex: string | null = null;
    if (!nameMap || nameMap.size === 0) {
      warnings.push("Bu ürün için renk adı bulunamadı.");
    } else if (nameMap.size > 1) {
      warnings.push(`Farklı listelerde farklı renk adları var: ${Array.from(nameMap.values()).map((e) => e.name).join(", ")}.`);
    } else {
      const e = Array.from(nameMap.values())[0];
      colorName = (e.name || "").trim();
      hex = e.hex && /^#[0-9a-fA-F]{6}$/.test(e.hex) ? e.hex.toLowerCase() : null;
    }
    if (!p.isActive) warnings.push("Ürün pasif.");
    if (active.length !== 1) warnings.push(active.length === 0 ? "Aktif varyantı yok, stok bilgisi alınamıyor." : "Kendi varyantları (beden/çoklu) var.");
    if (active.some((v) => v.size || v.color)) warnings.push("Mevcut varyantında beden veya renk tanımlı.");
    const v = active.length === 1 ? active[0] : null;
    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      isPrimary: p.id === primary.id,
      isActive: p.isActive,
      colorName,
      hex,
      photoCount: (Array.isArray(p.images) ? p.images : []).filter(isPhoto).length,
      variantCount: active.length,
      price: v ? String(v.price) : null,
      stock: v ? v.stock : null,
      warnings,
    };
  });

  // Aynı renk adı iki üründe
  const seenNames = new Map<string, string>();
  for (const m of memberPlans) {
    if (!m.colorName) continue;
    const k = m.colorName.toLocaleLowerCase("tr");
    if (seenNames.has(k)) groupWarnings.push(`"${m.colorName}" rengi birden fazla üründe var.`);
    seenNames.set(k, m.productId);
  }

  const canMerge = groupWarnings.length === 0 && memberPlans.every((m) => m.warnings.length === 0);
  return { groupKey, primaryProductId: primary.id, members: memberPlans, warnings: Array.from(new Set(groupWarnings)), canMerge };
}

export async function applyGroup(groupKey: string, primaryProductId: string | undefined, adminId: string | undefined) {
  return db.transaction(async (tx) => {
    const ids = groupKey.split(",").filter(Boolean);
    if (ids.length < 2) throw new MergeError("Geçersiz grup.");
    const rows = await tx.select().from(products).where(inArray(products.id, ids));
    if (rows.length !== ids.length) throw new MergeError("Gruptaki ürünlerden biri bulunamadı.");
    const existing = await tx.select().from(productColorMerges)
      .where(and(isNull(productColorMerges.undoneAt), inArray(productColorMerges.sourceProductId, ids)));
    const existingPrimary = await tx.select().from(productColorMerges)
      .where(and(isNull(productColorMerges.undoneAt), inArray(productColorMerges.primaryProductId, ids)));
    if (existing.length > 0 || existingPrimary.length > 0) throw new MergeError("Bu ürünler zaten birleştirilmiş.");

    const vrows = await tx.select().from(productVariants).where(inArray(productVariants.productId, ids));
    const variantsOf = new Map<string, VariantRow[]>();
    vrows.forEach((v) => {
      const l = variantsOf.get(v.productId);
      if (l) l.push(v); else variantsOf.set(v.productId, [v]);
    });
    // Renk adı çözümü için tüm komşu ürünler gerekir: grup içi slug'lar yeterli
    const bySlug = new Map<string, ProductRow>();
    rows.forEach((p) => bySlug.set(p.slug, p));

    if (primaryProductId && !ids.includes(primaryProductId)) throw new MergeError("Ana ürün bu grupta değil.");
    const plan = planGroup(rows, variantsOf, bySlug, primaryProductId);
    if (plan.groupKey !== groupKey) throw new MergeError("Grup değişmiş. Sayfayı yenileyip tekrar deneyin.");
    if (!plan.canMerge) throw new MergeError("Bu grupta uyarılar var, otomatik birleştirilemez.");

    const batchId = crypto.randomUUID();
    const primary = rows.find((r) => r.id === plan.primaryProductId)!;
    const primaryPlan = plan.members.find((m) => m.isPrimary)!;
    const primaryVariant = (variantsOf.get(primary.id) ?? []).find((v) => v.isActive)!;
    const primaryPhotos = (Array.isArray(primary.images) ? primary.images : []).filter(isPhoto);

    // Ana ürünün kendi varyantı kendi rengini alır
    const primarySnapshot = {
      variant: { id: primaryVariant.id, color: primaryVariant.color, colorHex: primaryVariant.colorHex, images: primaryVariant.images },
      availableColors: primary.availableColors,
    };
    await tx.update(productVariants)
      .set({ color: primaryPlan.colorName, colorHex: primaryPlan.hex, images: primaryPhotos })
      .where(eq(productVariants.id, primaryVariant.id));

    const newColors: { name: string; hex: string | null; slug: null }[] = [
      { name: primaryPlan.colorName!, hex: primaryPlan.hex, slug: null },
    ];
    const inserts: (typeof productColorMerges.$inferInsert)[] = [{
      batchId,
      primaryProductId: primary.id,
      sourceProductId: primary.id,
      sourceSlug: primary.slug,
      colorName: primaryPlan.colorName!,
      createdVariantId: null,
      snapshot: { role: "primary", adminId: adminId ?? null, ...primarySnapshot },
    }];

    for (const m of plan.members) {
      if (m.isPrimary) continue;
      const src = rows.find((r) => r.id === m.productId)!;
      const srcVariant = (variantsOf.get(src.id) ?? []).find((v) => v.isActive)!;
      const photos = (Array.isArray(src.images) ? src.images : []).filter(isPhoto);
      const [created] = await tx.insert(productVariants).values({
        productId: primary.id,
        size: null,
        color: m.colorName,
        colorHex: m.hex,
        images: photos,
        price: String(srcVariant.price),
        stock: srcVariant.stock,
        isActive: true,
      }).returning();
      // Aynı fiziksel stok iki kayıtta satılmasın: kaynak varyantın stoğu yeni varyanta taşınır
      await tx.update(productVariants).set({ stock: 0 }).where(eq(productVariants.id, srcVariant.id));
      // Açık sepetler yeni varyantı göstersin, ödeme adımında eski varyant stoksuz sayılmasın
      await tx.update(cartItems).set({ productId: primary.id, variantId: created.id }).where(eq(cartItems.variantId, srcVariant.id));
      await tx.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, src.id));
      newColors.push({ name: m.colorName!, hex: m.hex, slug: null });
      inserts.push({
        batchId,
        primaryProductId: primary.id,
        sourceProductId: src.id,
        sourceSlug: src.slug,
        colorName: m.colorName!,
        createdVariantId: created.id,
        snapshot: {
          role: "source",
          sourceVariantId: srcVariant.id,
          sourceVariantStock: srcVariant.stock,
          sourceWasActive: src.isActive,
          price: String(srcVariant.price),
        },
      });
    }

    await tx.update(products).set({ availableColors: newColors, updatedAt: new Date() }).where(eq(products.id, primary.id));
    await tx.insert(productColorMerges).values(inserts);
    return { batchId, primarySlug: primary.slug, variantsCreated: inserts.length - 1, colors: newColors };
  }).then(async (result) => {
    // Birleştirilen renkler varyasyon kütüphanesine de eklenir
    await ensureVariantOptions(result.colors.map((c) => ({ type: "color" as const, name: c.name, hex: c.hex }))).catch((e) => console.error("[color-merge library]", e));
    const { colors: _c, ...rest } = result;
    return rest;
  });
}

export async function undoBatch(batchId: string) {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(productColorMerges).where(eq(productColorMerges.batchId, batchId));
    if (rows.length === 0) throw new MergeError("İşlem bulunamadı.");
    if (rows.some((r) => r.undoneAt)) throw new MergeError("Bu işlem zaten geri alınmış.");
    for (const r of rows) {
      const snap = r.snapshot as any;
      if (snap.role === "primary") {
        const v = snap.variant;
        await tx.update(productVariants)
          .set({ color: v.color ?? null, colorHex: v.colorHex ?? null, images: Array.isArray(v.images) ? v.images : [] })
          .where(eq(productVariants.id, v.id));
        await tx.update(products).set({ availableColors: snap.availableColors ?? [], updatedAt: new Date() }).where(eq(products.id, r.primaryProductId));
      } else if (r.createdVariantId) {
        // Eklenen varyant pasife alınır (geçmişi olabilir, silinmez). Kalan stok eski varyanta döner.
        const [created] = await tx.select().from(productVariants).where(eq(productVariants.id, r.createdVariantId));
        if (!created) throw new MergeError(`"${r.colorName}" varyantı bulunamadı, geri alma güvenli değil.`);
        const [srcNow] = await tx.select().from(productVariants).where(eq(productVariants.id, snap.sourceVariantId));
        if (!srcNow) throw new MergeError(`"${r.colorName}" için eski varyant bulunamadı, geri alma güvenli değil.`);
        if (srcNow.stock !== 0) {
          throw new MergeError(`"${r.colorName}" eski varyantının stoğu birleştirmeden sonra değişmiş (${srcNow.stock}). Stokları elle uzlaştırıp tekrar deneyin.`);
        }
        const carried = created.stock;
        await tx.update(productVariants).set({ isActive: false, stock: 0 }).where(eq(productVariants.id, created.id));
        await tx.update(cartItems).set({ productId: r.sourceProductId, variantId: snap.sourceVariantId }).where(eq(cartItems.variantId, r.createdVariantId));
        await tx.update(productVariants).set({ stock: carried }).where(eq(productVariants.id, snap.sourceVariantId));
        await tx.update(products).set({ isActive: snap.sourceWasActive !== false, updatedAt: new Date() }).where(eq(products.id, r.sourceProductId));
      }
    }
    await tx.update(productColorMerges).set({ undoneAt: new Date() }).where(eq(productColorMerges.batchId, batchId));
    return { restored: rows.length };
  });
}

class MergeError extends Error {}

/** Eski (birleştirilmiş) ürün adresi için ana ürün adresi; yoksa null. */
export async function findMergeRedirect(slug: string): Promise<string | null> {
  const [m] = await db.select().from(productColorMerges)
    .where(and(eq(productColorMerges.sourceSlug, slug), isNull(productColorMerges.undoneAt)));
  if (!m || m.sourceProductId === m.primaryProductId) return null;
  const [primary] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, m.primaryProductId));
  if (!primary) return null;
  return `/urun/${primary.slug}?renk=${encodeURIComponent(colorSlugOf(m.colorName))}`;
}

/** Tarayıcı ve arama motoru için kalıcı yönlendirme (301). */
export const mergedProductRedirect: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = await findMergeRedirect(req.params.slug);
    if (target) return res.redirect(301, target);
  } catch (error) {
    console.error("[color-merge redirect]", error);
  }
  next();
};

export function registerColorMergeRoutes(app: Express, requireAdmin: RequestHandler) {
  // Tablo yoksa oluştur (db:push çalıştırılmamış ortamlarda uçlar çökmesin)
  (async () => {
    await db.execute(sql`create table if not exists product_color_merges (
      id varchar primary key default gen_random_uuid(),
      batch_id varchar not null,
      primary_product_id varchar not null references products(id) on delete cascade,
      source_product_id varchar not null references products(id) on delete cascade,
      source_slug text not null,
      color_name text not null,
      created_variant_id varchar,
      snapshot jsonb not null default '{}'::jsonb,
      created_at timestamp not null default now(),
      undone_at timestamp
    )`);
    await db.execute(sql`create index if not exists product_color_merges_source_slug_idx on product_color_merges(source_slug)`);
  })().catch((e) => console.error("[color-merge table]", e));
  app.get("/api/admin/color-merge", requireAdmin, async (_req, res) => {
    try {
      const { groups } = await buildPlans();
      const merges = await db.select().from(productColorMerges);
      const ids = Array.from(new Set(merges.flatMap((m) => [m.primaryProductId, m.sourceProductId])));
      const named = ids.length ? await db.select({ id: products.id, name: products.name, slug: products.slug }).from(products).where(inArray(products.id, ids)) : [];
      const nameOf = new Map(named.map((p) => [p.id, p]));
      const batches = new Map<string, any>();
      for (const m of merges) {
        const b = batches.get(m.batchId) ?? {
          batchId: m.batchId,
          primary: nameOf.get(m.primaryProductId) ?? null,
          createdAt: m.createdAt,
          undoneAt: m.undoneAt,
          items: [] as { colorName: string; sourceName: string; sourceSlug: string }[],
        };
        b.items.push({ colorName: m.colorName, sourceName: nameOf.get(m.sourceProductId)?.name ?? m.sourceSlug, sourceSlug: m.sourceSlug });
        batches.set(m.batchId, b);
      }
      const history = Array.from(batches.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      res.json({ groups, history });
    } catch (error) {
      console.error("[color-merge list]", error);
      res.status(500).json({ error: "Gruplar yüklenemedi" });
    }
  });

  // Ana ürün seçimi değişince önizlemeyi yeniden hesaplar
  app.post("/api/admin/color-merge/preview", requireAdmin, async (req, res) => {
    try {
      const groupKey = String(req.body?.groupKey || "");
      const primaryProductId = req.body?.primaryProductId ? String(req.body.primaryProductId) : undefined;
      const ids = groupKey.split(",").filter(Boolean);
      const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
      if (rows.length < 2 || rows.length !== ids.length) return res.status(404).json({ error: "Grup bulunamadı" });
      const vrows = await db.select().from(productVariants).where(inArray(productVariants.productId, ids));
      const variantsOf = new Map<string, VariantRow[]>();
      vrows.forEach((v) => { const l = variantsOf.get(v.productId); if (l) l.push(v); else variantsOf.set(v.productId, [v]); });
      const bySlug = new Map(rows.map((p) => [p.slug, p] as [string, ProductRow]));
      res.json(planGroup(rows, variantsOf, bySlug, primaryProductId));
    } catch (error) {
      console.error("[color-merge preview]", error);
      res.status(500).json({ error: "Önizleme hazırlanamadı" });
    }
  });

  app.post("/api/admin/color-merge/apply", requireAdmin, async (req, res) => {
    try {
      const groupKey = String(req.body?.groupKey || "");
      const primaryProductId = req.body?.primaryProductId ? String(req.body.primaryProductId) : undefined;
      const result = await applyGroup(groupKey, primaryProductId, (req as any).adminUser?.id);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof MergeError) return res.status(400).json({ error: error.message });
      console.error("[color-merge apply]", error);
      res.status(500).json({ error: "Birleştirme yapılamadı, hiçbir değişiklik uygulanmadı." });
    }
  });

  app.post("/api/admin/color-merge/:batchId/undo", requireAdmin, async (req, res) => {
    try {
      const result = await undoBatch(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof MergeError) return res.status(400).json({ error: error.message });
      console.error("[color-merge undo]", error);
      res.status(500).json({ error: "Geri alınamadı, hiçbir değişiklik uygulanmadı." });
    }
  });
}

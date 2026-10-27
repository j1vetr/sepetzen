import type { Express, RequestHandler } from "express";
import { and, eq, asc, sql } from "drizzle-orm";
import { db } from "./storage";
import { products, productVariants, variantOptions } from "@shared/schema";
import { foldVariantKey, compareSizeNames } from "@shared/variantKey";

type OptionType = "color" | "size";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const cleanHex = (h: unknown): string | null => (typeof h === "string" && HEX_RE.test(h.trim()) ? h.trim().toLowerCase() : null);
const cleanName = (n: unknown): string => (typeof n === "string" ? n.trim().replace(/\s+/g, " ") : "");
const isType = (t: unknown): t is OptionType => t === "color" || t === "size";

type ColorEntry = { name?: string; hex?: string | null };

/** Hangi üründe hangi değer kullanılıyor: "color:key" veya "size:key" -> ürün kimlikleri */
async function loadUsage(): Promise<Map<string, Set<string>>> {
  const [vs, ps] = await Promise.all([
    db.select({ productId: productVariants.productId, color: productVariants.color, size: productVariants.size }).from(productVariants),
    db.select({ id: products.id, availableColors: products.availableColors }).from(products),
  ]);
  const usage = new Map<string, Set<string>>();
  const add = (k: string, productId: string) => {
    const s = usage.get(k);
    if (s) s.add(productId); else usage.set(k, new Set([productId]));
  };
  for (const v of vs) {
    if (v.color && foldVariantKey(v.color)) add(`color:${foldVariantKey(v.color)}`, v.productId);
    if (v.size && foldVariantKey(v.size)) add(`size:${foldVariantKey(v.size)}`, v.productId);
  }
  for (const p of ps) {
    for (const c of (Array.isArray(p.availableColors) ? (p.availableColors as ColorEntry[]) : [])) {
      if (c?.name && foldVariantKey(c.name)) add(`color:${foldVariantKey(c.name)}`, p.id);
    }
  }
  return usage;
}

/**
 * Kütüphane boşken mevcut varyant ve renk verisinden ilk değerleri ekler.
 * Tekrar çalışması kopya üretmez (benzersiz anahtar), var olan değerlere dokunmaz.
 */
export async function seedVariantOptions(): Promise<number> {
  // Yalnızca kütüphane boşken doldurulur. Sonradan yapılan yeniden adlandırma
  // ve silmeler her istekte eski değerlerin geri gelmesine yol açmasın.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(variantOptions);
  if (Number(n) > 0) return 0;
  const [vs, ps, existing] = await Promise.all([
    db.select({ color: productVariants.color, colorHex: productVariants.colorHex, size: productVariants.size }).from(productVariants),
    db.select({ availableColors: products.availableColors }).from(products),
    db.select().from(variantOptions),
  ]);
  const spellings = { color: new Map<string, Map<string, number>>(), size: new Map<string, Map<string, number>>() };
  const hexes = new Map<string, string>();
  const note = (type: OptionType, raw: string | null | undefined, hex?: string | null) => {
    const name = cleanName(raw);
    const key = foldVariantKey(name);
    if (!key) return;
    const m = spellings[type].get(key) ?? new Map<string, number>();
    m.set(name, (m.get(name) ?? 0) + 1);
    spellings[type].set(key, m);
    const h = cleanHex(hex);
    if (type === "color" && h && !hexes.has(key)) hexes.set(key, h);
  };
  vs.forEach((v) => { note("color", v.color, v.colorHex); note("size", v.size); });
  ps.forEach((p) => (Array.isArray(p.availableColors) ? (p.availableColors as ColorEntry[]) : []).forEach((c) => note("color", c?.name, c?.hex)));

  const have = new Set(existing.map((o) => `${o.type}:${o.key}`));
  const maxOrder = { color: 0, size: 0 };
  existing.forEach((o) => { if (isType(o.type)) maxOrder[o.type] = Math.max(maxOrder[o.type], o.sortOrder); });

  const toInsert: (typeof variantOptions.$inferInsert)[] = [];
  (["color", "size"] as OptionType[]).forEach((type) => {
    const fresh = Array.from(spellings[type].entries())
      .filter(([key]) => !have.has(`${type}:${key}`))
      .map(([key, names]) => ({
        key,
        name: Array.from(names.entries()).sort((a, b) => b[1] - a[1])[0][0],
      }));
    fresh.sort((a, b) => (type === "size" ? compareSizeNames(a.name, b.name) : a.name.localeCompare(b.name, "tr")));
    fresh.forEach((f, i) => {
      toInsert.push({ type, name: f.name, key: f.key, hex: type === "color" ? hexes.get(f.key) ?? null : null, sortOrder: maxOrder[type] + i + 1 });
    });
  });
  if (toInsert.length === 0) return 0;
  const inserted = await db.insert(variantOptions).values(toInsert).onConflictDoNothing().returning({ id: variantOptions.id });
  return inserted.length;
}

/** Verilen değerleri kütüphanede yoksa ekler (birleştirme aracı vb. için). */
export async function ensureVariantOptions(entries: { type: OptionType; name: string; hex?: string | null }[]): Promise<void> {
  for (const e of entries) {
    const name = cleanName(e.name);
    const key = foldVariantKey(name);
    if (!key) continue;
    const [max] = await db.select({ m: sql<number>`coalesce(max(${variantOptions.sortOrder}), 0)` }).from(variantOptions).where(eq(variantOptions.type, e.type));
    await db.insert(variantOptions)
      .values({ type: e.type, name, key, hex: e.type === "color" ? cleanHex(e.hex) : null, sortOrder: Number(max?.m ?? 0) + 1 })
      .onConflictDoNothing();
  }
}

/** Tablo yoksa oluşturur (db:push çalıştırılmamış ortamlarda uçlar çökmesin). */
export async function ensureVariantOptionsTable(): Promise<void> {
  await db.execute(sql`create table if not exists variant_options (
    id varchar primary key default gen_random_uuid(),
    type text not null,
    name text not null,
    key text not null,
    hex text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp not null default now()
  )`);
  await db.execute(sql`create unique index if not exists variant_options_type_key_idx on variant_options(type, key)`);
}

export function registerVariantOptionRoutes(app: Express, requireAdmin: RequestHandler) {
  ensureVariantOptionsTable().catch((e) => console.error("[variant-options table]", e));
  app.get("/api/admin/variant-options", requireAdmin, async (_req, res) => {
    try {
      await seedVariantOptions();
      const [rows, usage] = await Promise.all([
        db.select().from(variantOptions).orderBy(asc(variantOptions.type), asc(variantOptions.sortOrder), asc(variantOptions.name)),
        loadUsage(),
      ]);
      res.json(rows.map((o) => ({ ...o, productCount: usage.get(`${o.type}:${o.key}`)?.size ?? 0 })));
    } catch (error) {
      console.error("[variant-options list]", error);
      res.status(500).json({ error: "Varyasyonlar yüklenemedi" });
    }
  });

  app.post("/api/admin/variant-options", requireAdmin, async (req, res) => {
    try {
      const { type } = req.body ?? {};
      const name = cleanName(req.body?.name);
      if (!isType(type)) return res.status(400).json({ error: "Geçersiz tür" });
      if (!name || name.length > 60) return res.status(400).json({ error: "Ad 1 ile 60 karakter arasında olmalı" });
      const key = foldVariantKey(name);
      const [existing] = await db.select().from(variantOptions).where(and(eq(variantOptions.type, type), eq(variantOptions.key, key)));
      if (existing) {
        // Pasifse yeniden etkinleştirmek yerine aynen döner, yinelenen kayıt oluşmaz
        return res.json({ ...existing, existed: true });
      }
      const [max] = await db.select({ m: sql<number>`coalesce(max(${variantOptions.sortOrder}), 0)` }).from(variantOptions).where(eq(variantOptions.type, type));
      const [created] = await db.insert(variantOptions)
        .values({ type, name, key, hex: type === "color" ? cleanHex(req.body?.hex) : null, sortOrder: Number(max?.m ?? 0) + 1 })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("[variant-options create]", error);
      res.status(500).json({ error: "Değer eklenemedi" });
    }
  });

  // Sıralama: gelen kimlik listesi sırasıyla yeniden numaralanır
  app.put("/api/admin/variant-options/reorder", requireAdmin, async (req, res) => {
    try {
      const { type, ids } = req.body ?? {};
      if (!isType(type) || !Array.isArray(ids)) return res.status(400).json({ error: "Geçersiz istek" });
      await db.transaction(async (tx) => {
        for (let i = 0; i < ids.length; i++) {
          await tx.update(variantOptions).set({ sortOrder: i + 1 }).where(and(eq(variantOptions.id, String(ids[i])), eq(variantOptions.type, type)));
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[variant-options reorder]", error);
      res.status(500).json({ error: "Sıralama kaydedilemedi" });
    }
  });

  // Ad veya renk kodu değişince etkilenecek ürün/varyant sayısı
  app.get("/api/admin/variant-options/:id/impact", requireAdmin, async (req, res) => {
    try {
      const [opt] = await db.select().from(variantOptions).where(eq(variantOptions.id, req.params.id));
      if (!opt) return res.status(404).json({ error: "Değer bulunamadı" });
      const vs = await db.select({ id: productVariants.id, productId: productVariants.productId, color: productVariants.color, size: productVariants.size }).from(productVariants);
      const mine = vs.filter((v) => foldVariantKey(opt.type === "color" ? v.color : v.size) === opt.key);
      const productIds = new Set(mine.map((v) => v.productId));
      res.json({ variantCount: mine.length, productCount: productIds.size });
    } catch (error) {
      console.error("[variant-options impact]", error);
      res.status(500).json({ error: "Etki hesaplanamadı" });
    }
  });

  app.patch("/api/admin/variant-options/:id", requireAdmin, async (req, res) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [opt] = await tx.select().from(variantOptions).where(eq(variantOptions.id, req.params.id));
        if (!opt) return { status: 404 as const, error: "Değer bulunamadı" };
        const patch: Partial<typeof variantOptions.$inferInsert> = {};
        let newName = opt.name;
        let newKey = opt.key;
        if (req.body?.name !== undefined) {
          newName = cleanName(req.body.name);
          if (!newName || newName.length > 60) return { status: 400 as const, error: "Ad 1 ile 60 karakter arasında olmalı" };
          newKey = foldVariantKey(newName);
          if (newKey !== opt.key) {
            const [clash] = await tx.select().from(variantOptions).where(and(eq(variantOptions.type, opt.type), eq(variantOptions.key, newKey)));
            if (clash) return { status: 409 as const, error: "Bu adla başka bir değer zaten var" };
          }
          patch.name = newName;
          patch.key = newKey;
        }
        let newHex = opt.hex;
        if (opt.type === "color" && req.body?.hex !== undefined) {
          newHex = req.body.hex === null || req.body.hex === "" ? null : cleanHex(req.body.hex);
          if (req.body.hex && !newHex) return { status: 400 as const, error: "Renk kodu #RRGGBB biçiminde olmalı" };
          patch.hex = newHex;
        }
        if (typeof req.body?.isActive === "boolean") patch.isActive = req.body.isActive;
        if (Number.isInteger(req.body?.sortOrder)) patch.sortOrder = req.body.sortOrder;
        if (Object.keys(patch).length === 0) return { status: 200 as const, option: opt, propagated: 0 };

        const [updated] = await tx.update(variantOptions).set(patch).where(eq(variantOptions.id, opt.id)).returning();

        // İsteğe bağlı: ürünlerdeki varyantlara ve renk listelerine yansıt
        let propagated = 0;
        const changedName = newName !== opt.name;
        const changedHex = opt.type === "color" && newHex !== opt.hex;
        if (req.body?.propagate === true && (changedName || changedHex)) {
          const vs = await tx.select().from(productVariants);
          for (const v of vs) {
            const val = opt.type === "color" ? v.color : v.size;
            if (foldVariantKey(val) !== opt.key) continue;
            const set: Partial<typeof productVariants.$inferInsert> = {};
            if (opt.type === "color") {
              set.color = newName;
              if (changedHex) set.colorHex = newHex;
            } else {
              set.size = newName;
            }
            await tx.update(productVariants).set(set).where(eq(productVariants.id, v.id));
            propagated++;
          }
          if (opt.type === "color") {
            const ps = await tx.select({ id: products.id, availableColors: products.availableColors }).from(products);
            for (const p of ps) {
              const list = Array.isArray(p.availableColors) ? (p.availableColors as { name: string; hex: string | null; slug?: string | null }[]) : [];
              if (!list.some((c) => foldVariantKey(c?.name) === opt.key)) continue;
              const next = list.map((c) => (foldVariantKey(c?.name) === opt.key ? { ...c, name: newName, hex: changedHex ? newHex : c.hex } : c));
              await tx.update(products).set({ availableColors: next, updatedAt: new Date() }).where(eq(products.id, p.id));
            }
          }
        }
        return { status: 200 as const, option: updated, propagated };
      });
      if (result.status !== 200) return res.status(result.status).json({ error: (result as { error: string }).error });
      res.json({ ...(result as { option: object }).option, propagated: (result as { propagated: number }).propagated });
    } catch (error) {
      console.error("[variant-options update]", error);
      res.status(500).json({ error: "Değer güncellenemedi" });
    }
  });

  // Kullanımdaki değer silinmez, yalnızca pasife alınır
  app.delete("/api/admin/variant-options/:id", requireAdmin, async (req, res) => {
    try {
      const [opt] = await db.select().from(variantOptions).where(eq(variantOptions.id, req.params.id));
      if (!opt) return res.status(404).json({ error: "Değer bulunamadı" });
      const usage = await loadUsage();
      const count = usage.get(`${opt.type}:${opt.key}`)?.size ?? 0;
      if (count > 0) {
        return res.status(409).json({ error: `Bu değer ${count} üründe kullanılıyor, silinemez. Pasife alabilirsiniz.` });
      }
      await db.delete(variantOptions).where(eq(variantOptions.id, opt.id));
      res.json({ success: true });
    } catch (error) {
      console.error("[variant-options delete]", error);
      res.status(500).json({ error: "Değer silinemedi" });
    }
  });
}

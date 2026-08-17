/**
 * Pazaryeri admin endpoint'leri. Tümü `requireAdmin` middleware'i ile korunur.
 * Pazaryerinden bağımsız: route handler'lar tipi parametre alır, registry'ye
 * delege eder; yarın N11 eklenirse route'lara dokunmaya gerek yok.
 */

import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { encryptCredentials, decryptCredentials, maskSecret } from "./crypto";
import { listRegisteredAdapters, createAdapter, getAdapterEntry } from "./registry";
import { runSync, adapterFromMarketplace, type SyncMode } from "./sync/engine";
import {
  processPushQueue,
  enqueueStockPricePush,
  applyPriceRule,
  type PriceRule,
} from "./push/engine";
import { supportsWrites } from "./types";
import { suggestCategoryMappings } from "./category-suggester";
import type { Marketplace, InsertMarketplace } from "@shared/schema";
import type {
  MarketplaceConfig,
  MarketplaceCredentials,
  MarketplaceType,
} from "./types";
// Bootstrap registers all adapters (Trendyol today, N11/Hepsiburada/Amazon later).
// Adding a new marketplace = adding one import in `./index.ts` — no edits here.
import "./index";

const TYPE_VALUES = ["trendyol", "n11", "hepsiburada", "amazon"] as const;

const createSchema = z.object({
  type: z.enum(TYPE_VALUES),
  name: z.string().min(2).max(80),
  isActive: z.boolean().default(true),
  credentials: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  config: z.record(z.unknown()).default({}),
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  isActive: z.boolean().optional(),
  credentials: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  config: z.record(z.unknown()).optional(),
});

const syncSchema = z.object({
  mode: z.enum(["delta", "full"]).default("full"),
});

const mappingSchema = z.object({
  siteCategoryId: z.string().nullable(),
});

/** UI'a kredensiyalleri dönerken sadece son 4 hane. */
function publicMarketplace(mp: Awaited<ReturnType<typeof storage.getMarketplace>>) {
  if (!mp) return null;
  let masked: Record<string, string> = {};
  try {
    const decrypted = decryptCredentials(mp.encryptedCredentials);
    masked = Object.fromEntries(
      Object.entries(decrypted).map(([k, v]) => [k, maskSecret(String(v ?? ""))]),
    );
  } catch {
    masked = { _error: "decrypt-failed" };
  }
  // encryptedCredentials'ı düşürüp güvenli versiyonu döndür
  const { encryptedCredentials: _omit, ...rest } = mp;
  void _omit;
  return { ...rest, maskedCredentials: masked };
}

export function registerMarketplaceRoutes(
  app: Express,
  requireAdmin: (req: Request, res: Response, next: NextFunction) => unknown,
): void {
  // Mevcut adapter'lar (UI form generation için)
  app.get("/api/admin/marketplaces/adapters", requireAdmin, (_req, res) => {
    res.json(listRegisteredAdapters());
  });

  // Liste
  app.get("/api/admin/marketplaces", requireAdmin, async (_req, res) => {
    const rows = await storage.getMarketplaces();
    res.json(rows.map((r) => publicMarketplace(r)));
  });

  // Detay
  app.get("/api/admin/marketplaces/:id", requireAdmin, async (req, res) => {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });
    res.json(publicMarketplace(mp));
  });

  // Yeni
  app.post("/api/admin/marketplaces", requireAdmin, async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
    }
    // Adapter kayıtlı mı?
    let entry;
    try {
      entry = getAdapterEntry(parsed.data.type as MarketplaceType);
    } catch {
      return res.status(400).json({ message: `'${parsed.data.type}' adapter'ı kayıtlı değil` });
    }
    // Adapter'ın bildirdiği zorunlu credential alanları doldurulmuş mu?
    const creds = (parsed.data.credentials ?? {}) as Record<string, unknown>;
    const missing = entry.credentialFields
      .filter((f) => f.required)
      .filter((f) => {
        const v = creds[f.key];
        return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
      })
      .map((f) => f.label || f.key);
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Eksik kredensiyel alanları: ${missing.join(", ")}`,
      });
    }
    const encrypted = encryptCredentials(creds);
    const created = await storage.createMarketplace({
      type: parsed.data.type,
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      encryptedCredentials: encrypted,
      config: parsed.data.config ?? {},
    });
    res.status(201).json(publicMarketplace(created));
  });

  // Güncelle
  app.put("/api/admin/marketplaces/:id", requireAdmin, async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
    }
    const existing = await storage.getMarketplace(req.params.id);
    if (!existing) return res.status(404).json({ message: "Bulunamadı" });

    const patch: Partial<InsertMarketplace> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;
    if (parsed.data.config !== undefined) patch.config = parsed.data.config;
    if (parsed.data.credentials) {
      // Mevcut kredensiyallere merge et — partial güncelleme destekle
      let current: Record<string, unknown> = {};
      try {
        current = decryptCredentials(existing.encryptedCredentials);
      } catch {
        current = {};
      }
      const merged = { ...current, ...parsed.data.credentials } as Record<string, unknown>;
      // Adapter'ın bildirdiği zorunlu alanlar merge sonrası dolu mu?
      try {
        const entry = getAdapterEntry(existing.type as MarketplaceType);
        const missing = entry.credentialFields
          .filter((f) => f.required)
          .filter((f) => {
            const v = merged[f.key];
            return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
          })
          .map((f) => f.label || f.key);
        if (missing.length > 0) {
          return res.status(400).json({
            message: `Eksik kredensiyel alanları: ${missing.join(", ")}`,
          });
        }
      } catch {
        // adapter kaydı yoksa update'i bloklama (eski kayıt korumacılığı)
      }
      patch.encryptedCredentials = encryptCredentials(merged);
    }
    const updated = await storage.updateMarketplace(req.params.id, patch);
    if (!updated) return res.status(404).json({ message: "Bulunamadı" });
    res.json(publicMarketplace(updated));
  });

  // Sil
  app.delete("/api/admin/marketplaces/:id", requireAdmin, async (req, res) => {
    await storage.deleteMarketplace(req.params.id);
    res.status(204).end();
  });

  // Tüm push ürünlerine toplu fiyat kuralı uygula
  app.post(
    "/api/admin/marketplaces/:id/bulk-apply-price-rule",
    requireAdmin,
    async (req, res) => {
      const schema = z.object({
        priceRule: z
          .object({
            type: z.enum(["percent", "fixed"]),
            value: z.number().positive().max(1_000_000),
          })
          .nullable(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Geçersiz veri" });
      const mp = await storage.getMarketplace(req.params.id);
      if (!mp) return res.status(404).json({ message: "Bulunamadı" });
      const links = await storage.getMarketplaceProducts(req.params.id);
      const pushLinks = links.filter((l) => l.syncDirection === "push");
      let updated = 0;
      for (const link of pushLinks) {
        const meta = { ...((link.pushMeta ?? {}) as Record<string, unknown>) };
        if (parsed.data.priceRule === null) delete meta.priceRule;
        else meta.priceRule = parsed.data.priceRule;
        await storage.updateMarketplaceProduct(link.id, { pushMeta: meta });
        if (link.productId) await enqueueStockPricePush(link.productId);
        updated++;
      }
      if (updated > 0) void processPushQueue(req.params.id).catch(() => {});
      res.json({ updated });
    },
  );

  // Bağlantı testi
  // Kayıttan ÖNCE: form'da girilen ham kredensiyallerle bağlantı testi.
  // Kredensiyaller bellekte kalır, DB'ye yazılmaz.
  app.post("/api/admin/marketplaces/test-credentials", requireAdmin, async (req, res) => {
    const schema = z.object({
      type: z.string().min(1),
      credentials: z.record(z.unknown()),
      config: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: "Geçersiz istek" });
    }
    // Bilinmeyen tip → 400 (getAdapterEntry throw eder, biz yakalayıp döneriz)
    try {
      getAdapterEntry(parsed.data.type as MarketplaceType);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        message: err instanceof Error ? err.message : `Bilinmeyen pazaryeri: ${parsed.data.type}`,
      });
    }
    try {
      const adapter = createAdapter(
        parsed.data.type as MarketplaceType,
        parsed.data.credentials as MarketplaceCredentials,
        (parsed.data.config ?? {}) as MarketplaceConfig,
      );
      const result = await adapter.testConnection();
      res.json(result);
    } catch (err) {
      res.status(200).json({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post("/api/admin/marketplaces/:id/test-connection", requireAdmin, async (req, res) => {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });
    try {
      const creds = decryptCredentials<MarketplaceCredentials>(mp.encryptedCredentials);
      const adapter = createAdapter(
        mp.type as MarketplaceType,
        creds,
        (mp.config ?? {}) as MarketplaceConfig,
      );
      const result = await adapter.testConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Manuel sync tetikle. Önce lock kontrolü yapıp 409 döndürür; aksi halde
  // 202 ile başlatır (run async devam eder).
  app.post("/api/admin/marketplaces/:id/sync-now", requireAdmin, async (req, res) => {
    const parsed = syncSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz mod" });
    }
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });
    if (!mp.isActive) {
      return res.status(400).json({ message: "Pazaryeri pasif - önce etkinleştirin." });
    }
    // Pre-check: lock zaten alınmış mı?
    const running = await storage.getRunningSyncRun(mp.id);
    if (running) {
      return res.status(409).json({
        ok: false,
        message: `Zaten çalışan bir senkron var (${running.mode}, ${new Date(running.startedAt).toLocaleString("tr-TR")}).`,
      });
    }
    // Async başlat
    void runSync(mp.id, parsed.data.mode as SyncMode, "manual").catch((err) => {
      console.error(`[marketplaces] manual sync error (${mp.name}):`, err);
    });
    res.status(202).json({ ok: true, message: `${parsed.data.mode} senkron başlatıldı` });
  });

  // Sync geçmişi
  app.get("/api/admin/marketplaces/:id/sync-runs", requireAdmin, async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const rows = await storage.getRecentSyncRuns(req.params.id, limit);
    res.json(rows);
  });

  // Kategori eşleme — listele
  app.get("/api/admin/marketplaces/:id/category-mappings", requireAdmin, async (req, res) => {
    const rows = await storage.getMarketplaceCategories(req.params.id);
    res.json(rows);
  });

  // Kategori ağacı snapshot cache'ini elle yenile.
  // categoryTreeFetchedAt = NULL → bir sonraki sync (full) cache'i tazeler.
  // Sync ANINDA fetchCategoryTree çağırmıyoruz; bu uçnokta sadece "stale" işaretler
  // ki yetkisiz/çok ağır indirme ile admin isteğini bloklamayalım.
  app.post(
    "/api/admin/marketplaces/:id/refresh-category-cache",
    requireAdmin,
    async (req, res) => {
      const mp = await storage.getMarketplace(req.params.id);
      if (!mp) return res.status(404).json({ message: "Bulunamadı" });
      await storage.clearCategoryTreeCache(req.params.id);
      res.json({ ok: true });
    },
  );

  // Kategori eşleme — akıllı öneriler.
  // Sadece henüz eşlenmemiş (siteCategoryId=null) pazaryeri kategorileri için
  // string benzerliğine göre en olası site kategorisi adayını döner.
  // İstemci her satırda "Önerilen: …" rozeti gösterir; "Tüm önerileri uygula"
  // tek tıkla draft state'e doldurur ve mevcut Kaydet (N) akışı çalışır.
  app.get(
    "/api/admin/marketplaces/:id/category-mappings/suggestions",
    requireAdmin,
    async (req, res) => {
      const mp = await storage.getMarketplace(req.params.id);
      if (!mp) return res.status(404).json({ message: "Bulunamadı" });
      const [mappings, siteCats] = await Promise.all([
        storage.getMarketplaceCategories(req.params.id),
        storage.getCategories(),
      ]);
      const unmatched = mappings
        .filter((m) => !m.siteCategoryId)
        .map((m) => ({ id: m.id, name: m.name }));
      const sites = siteCats.map((c) => ({ id: c.id, name: c.name }));
      const suggestions = suggestCategoryMappings(unmatched, sites);
      res.json(suggestions);
    },
  );

  // Kategori eşleme — güncelle
  app.put(
    "/api/admin/marketplaces/:id/category-mappings/:mappingId",
    requireAdmin,
    async (req, res) => {
      const parsed = mappingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Geçersiz veri" });
      const updated = await storage.setMarketplaceCategoryMapping(
        req.params.mappingId,
        parsed.data.siteCategoryId,
      );
      if (!updated) return res.status(404).json({ message: "Eşleme bulunamadı" });
      res.json(updated);
    },
  );

  // ==========================================================================
  // PUSH (site → pazaryeri) endpoint'leri
  // ==========================================================================

  /** Yazma destekli adapter'ı getir; yoksa 400 yaz ve null dön. */
  async function writeAdapterOr400(req: Request, res: Response) {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) {
      res.status(404).json({ message: "Bulunamadı" });
      return null;
    }
    let adapter;
    try {
      adapter = adapterFromMarketplace(mp);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
      return null;
    }
    if (!supportsWrites(adapter)) {
      res.status(400).json({ message: `${mp.type} ürün gönderimini desteklemiyor` });
      return null;
    }
    return { mp, adapter };
  }

  // Ürün bağlantıları — pazaryeri ↔ site ürünü köprüleri (yön + push durumu)
  app.get("/api/admin/marketplaces/:id/product-links", requireAdmin, async (req, res) => {
    const rows = await storage.getMarketplaceProducts(req.params.id);
    const out = [] as Array<Record<string, unknown>>;
    for (const r of rows) {
      const product = r.productId ? await storage.getProduct(r.productId) : undefined;
      const meta = (r.pushMeta ?? {}) as { priceRule?: PriceRule };
      const sitePrice = product ? Number(product.basePrice) : null;
      out.push({
        id: r.id,
        productId: r.productId,
        productName: product?.name ?? null,
        sitePrice,
        priceRule: meta.priceRule ?? null,
        pushPrice: sitePrice !== null ? applyPriceRule(sitePrice, meta.priceRule) : null,
        externalId: r.externalId,
        syncDirection: r.syncDirection,
        barcode: r.barcode,
        stockCode: r.stockCode,
        pushStatus: r.pushStatus,
        pushError: r.pushError,
        lastPushedAt: r.lastPushedAt,
        tyBrandName: r.tyBrandName,
        tyCategoryId: r.tyCategoryId,
        tyBrandId: r.tyBrandId,
        pushAttributes: r.pushAttributes ?? {},
        lastSyncedAt: r.lastSyncedAt,
      });
    }
    res.json(out);
  });

  // Sipariş satırları — Trendyol siparişlerinin stok düşümü izleme listesi.
  // Eşleşmeyen (productId null) satırlar admin panelde vurgulanır.
  app.get("/api/admin/marketplaces/:id/order-lines", requireAdmin, async (req, res) => {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });
    const rows = await storage.listMarketplaceOrderLines(req.params.id, 200);
    res.json(
      rows.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        lineId: r.lineId,
        barcode: r.barcode,
        quantity: r.quantity,
        status: r.status,
        productId: r.productId,
        productName: r.productName,
        stockApplied: r.stockApplied,
        stockRestored: r.stockRestored,
        note: r.note,
        orderedAt: r.orderedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    );
  });

  // Bekleyen pazaryeri siparişi sayısı — sidebar rozeti için hafif endpoint.
  // Son 30 günde 'new' veya 'preparing' grubundaki siparişleri sayar.
  app.get("/api/admin/marketplace-orders/pending-count", requireAdmin, async (req, res) => {
    const groupOf = (status: string | null): string => {
      const s = String(status ?? "").toLowerCase();
      if (["cancelled", "unsupplied"].includes(s)) return "cancelled";
      if (["returned", "undeliveredandreturned"].includes(s)) return "returned";
      if (s === "delivered") return "delivered";
      if (s === "shipped") return "shipped";
      if (["picking", "invoiced", "readytoship"].includes(s)) return "preparing";
      return "new";
    };
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const marketplaces = await storage.getMarketplaces();
    let count = 0;
    for (const mp of marketplaces.filter((m) => m.isActive)) {
      const lines = await storage.listMarketplaceOrderLines(mp.id, 10_000, since);
      const orderNumbers = new Set<string>();
      for (const line of lines) {
        const g = groupOf(line.status);
        if (g === "new" || g === "preparing") {
          orderNumbers.add(line.orderNumber);
        }
      }
      count += orderNumbers.size;
    }
    res.json({ count });
  });

  // Siparişleri elle şimdi çek (cron beklemeden).
  app.post("/api/admin/marketplaces/:id/pull-orders", requireAdmin, async (req, res) => {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });
    try {
      const { pullMarketplaceOrders } = await import("./orders/engine");
      await pullMarketplaceOrders(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        message: err instanceof Error ? err.message : "Sipariş çekme başarısız",
      });
    }
  });

  // Trendyol siparişleri — sipariş numarasına göre gruplu tam görünüm.
  // Filtreler: status (durum grubu), days (tarih aralığı). Özet sayılar dahil.
  app.get("/api/admin/marketplaces/:id/orders", requireAdmin, async (req, res) => {
    const mp = await storage.getMarketplace(req.params.id);
    if (!mp) return res.status(404).json({ message: "Bulunamadı" });

    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    // Tarih filtresi DB tarafında — limit yüksek bir güvenlik tavanı.
    const inRange = await storage.listMarketplaceOrderLines(req.params.id, 10_000, since);

    // Durum grupları: new / preparing / shipped / delivered / cancelled / returned
    const groupOf = (status: string | null): string => {
      const s = String(status ?? "").toLowerCase();
      if (["cancelled", "unsupplied"].includes(s)) return "cancelled";
      if (["returned", "undeliveredandreturned"].includes(s)) return "returned";
      if (s === "delivered") return "delivered";
      if (s === "shipped") return "shipped";
      if (["picking", "invoiced", "readytoship"].includes(s)) return "preparing";
      return "new";
    };

    type Row = (typeof inRange)[number];
    const byOrder = new Map<string, Row[]>();
    for (const r of inRange) {
      const list = byOrder.get(r.orderNumber) ?? [];
      list.push(r);
      byOrder.set(r.orderNumber, list);
    }

    const orders = Array.from(byOrder.entries()).map(([orderNumber, lines]) => {
      const first = lines[0];
      const total = lines.reduce((sum, l) => sum + (l.totalPrice ? Number(l.totalPrice) : 0), 0);
      // Sipariş grubu: en "ileri" olmayan, sorun öncelikli — iptal/iade varsa o görünür
      const groups = lines.map((l) => groupOf(l.status));
      const group =
        groups.find((g) => g === "cancelled" || g === "returned") ??
        groups[0];
      return {
        orderNumber,
        orderedAt: first.orderedAt ?? first.createdAt,
        customerName: first.customerName,
        cargoProvider: first.cargoProvider,
        cargoTracking: first.cargoTracking,
        statusGroup: group,
        totalPrice: total > 0 ? total : null,
        hasIssue: lines.some(
          (l) =>
            (!l.productId && !groupOf(l.status).match(/cancelled|returned/)) ||
            (l.note != null && !l.stockApplied && !l.stockRestored && l.productId != null),
        ),
        lines: lines.map((l) => ({
          id: l.id,
          lineId: l.lineId,
          barcode: l.barcode,
          quantity: l.quantity,
          status: l.status,
          statusGroup: groupOf(l.status),
          productId: l.productId,
          productName: l.productName,
          productTitle: l.productTitle,
          unitPrice: l.unitPrice ? Number(l.unitPrice) : null,
          totalPrice: l.totalPrice ? Number(l.totalPrice) : null,
          stockApplied: l.stockApplied,
          stockRestored: l.stockRestored,
          note: l.note,
        })),
      };
    });

    orders.sort(
      (a, b) => new Date(b.orderedAt as any).getTime() - new Date(a.orderedAt as any).getTime(),
    );

    const summary = {
      total: orders.length,
      unmatched: inRange.filter((r) => !r.productId).length,
      restored: inRange.filter((r) => r.stockRestored).length,
      byGroup: orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.statusGroup] = (acc[o.statusGroup] ?? 0) + 1;
        return acc;
      }, {}),
    };

    const statusFilter = String(req.query.status ?? "");
    const filtered = statusFilter ? orders.filter((o) => o.statusGroup === statusFilter) : orders;

    res.json({ summary, orders: filtered });
  });

  // Bağlantı güncelle (yön / barkod / stok kodu). Toplu yön değişimi de buradan.
  app.put(
    "/api/admin/marketplaces/:id/product-links/:linkId",
    requireAdmin,
    async (req, res) => {
      const schema = z.object({
        syncDirection: z.enum(["pull", "push"]).optional(),
        barcode: z.string().trim().max(64).nullable().optional(),
        stockCode: z.string().trim().max(64).nullable().optional(),
        priceRule: z
          .object({
            type: z.enum(["percent", "fixed"]),
            value: z.number().positive().max(1_000_000),
          })
          .nullable()
          .optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Geçersiz veri" });
      const link = await storage.getMarketplaceProduct(req.params.linkId);
      if (!link || link.marketplaceId !== req.params.id) {
        return res.status(404).json({ message: "Bağlantı bulunamadı" });
      }
      if (parsed.data.syncDirection === "push") {
        const barcode = parsed.data.barcode ?? link.barcode;
        if (!barcode) {
          return res
            .status(400)
            .json({ message: "Push yönü için barkod zorunlu (Trendyol'daki barkod)." });
        }
      }
      const { priceRule, ...rest } = parsed.data;
      const patch: Record<string, unknown> = { ...rest };
      let priceRuleChanged = false;
      if (priceRule !== undefined) {
        const meta = { ...((link.pushMeta ?? {}) as Record<string, unknown>) };
        if (priceRule === null) delete meta.priceRule;
        else meta.priceRule = priceRule;
        patch.pushMeta = meta;
        priceRuleChanged = true;
      }
      const updated = await storage.updateMarketplaceProduct(link.id, patch);
      // Kural değişince yeni fiyat otomatik Trendyol'a gitsin
      if (priceRuleChanged && updated?.syncDirection === "push" && updated.productId) {
        await enqueueStockPricePush(updated.productId);
        void processPushQueue(req.params.id).catch(() => {});
      }
      res.json(updated);
    },
  );

  // Marka arama (ürün gönderim sihirbazı)
  app.get("/api/admin/marketplaces/:id/brands", requireAdmin, async (req, res) => {
    const ctx = await writeAdapterOr400(req, res);
    if (!ctx) return;
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);
    try {
      res.json(await ctx.adapter.searchBrands(q));
    } catch (err) {
      res.status(502).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // Kategori özellikleri (zorunlu attribute formu için)
  app.get(
    "/api/admin/marketplaces/:id/categories/:externalId/attributes",
    requireAdmin,
    async (req, res) => {
      const ctx = await writeAdapterOr400(req, res);
      if (!ctx) return;
      try {
        res.json(await ctx.adapter.fetchCategoryAttributes(req.params.externalId));
      } catch (err) {
        res.status(502).json({ message: err instanceof Error ? err.message : String(err) });
      }
    },
  );

  // Ürün gönder (sihirbaz submit) — payload hazırla, bağlantıyı push'a çevir, kuyruğa yaz
  app.post("/api/admin/marketplaces/:id/push-product", requireAdmin, async (req, res) => {
    const schema = z.object({
      productId: z.string().min(1),
      barcode: z.string().trim().min(3).max(64),
      stockCode: z.string().trim().max(64).optional(),
      tyCategoryId: z.string().min(1),
      tyBrandId: z.string().min(1),
      tyBrandName: z.string().min(1),
      attributes: z
        .array(
          z.object({
            attributeId: z.string(),
            attributeValueId: z.string().optional(),
            customAttributeValue: z.string().optional(),
          }),
        )
        .default([]),
      vatRate: z.number().int().min(0).max(20).default(20),
      listPrice: z.number().positive().optional(),
      priceRule: z
        .object({
          type: z.enum(["percent", "fixed"]),
          value: z.number().positive().max(1_000_000),
        })
        .nullable()
        .optional(),
      dimensionalWeight: z.number().min(0).default(1),
      deliveryDuration: z.number().int().min(1).max(30).optional(),
      cargoCompanyId: z.number().int().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
    }
    const ctx = await writeAdapterOr400(req, res);
    if (!ctx) return;
    const d = parsed.data;

    const product = await storage.getProduct(d.productId);
    if (!product) return res.status(404).json({ message: "Ürün bulunamadı" });
    const images = (product.images ?? []).filter(Boolean);
    if (images.length === 0) {
      return res.status(400).json({ message: "Ürünün en az bir görseli olmalı." });
    }
    // Fiyat kuralı: yüzde artış veya sabit Trendyol fiyatı (yoksa site fiyatı)
    const salePrice = applyPriceRule(Number(product.basePrice), d.priceRule);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return res.status(400).json({ message: "Ürün fiyatı geçersiz." });
    }
    const variants = await storage.getProductVariants(d.productId);
    const totalStock = variants
      .filter((v) => v.isActive !== false)
      .reduce((s, v) => s + (v.stock ?? 0), 0);

    // Zorunlu attribute pre-validation (Trendyol reddetmeden önce yakala)
    try {
      const defs = await ctx.adapter.fetchCategoryAttributes(d.tyCategoryId);
      const givenIds = new Set(d.attributes.map((a) => a.attributeId));
      const missing = defs
        .filter((a) => a.required && !givenIds.has(a.attributeId))
        .map((a) => a.name);
      if (missing.length > 0) {
        return res
          .status(400)
          .json({ message: `Zorunlu özellikler eksik: ${missing.join(", ")}` });
      }
    } catch {
      /* attribute servisi erişilemezse Trendyol batch sonucu yakalar */
    }

    // Görselleri mutlak URL'e çevir (Trendyol dış URL ister)
    const origin = `${req.protocol}://${req.get("host")}`;
    const absImages = images.map((u) =>
      /^https?:\/\//i.test(u) ? { url: u } : { url: `${origin}${u.startsWith("/") ? "" : "/"}${u}` },
    );

    const listPrice = d.listPrice && d.listPrice >= salePrice ? d.listPrice : salePrice;
    const stockCode = d.stockCode || d.barcode;
    const item: Record<string, unknown> = {
      barcode: d.barcode,
      title: product.name.slice(0, 100),
      productMainId: stockCode,
      brandId: Number(d.tyBrandId),
      categoryId: Number(d.tyCategoryId),
      quantity: totalStock,
      stockCode,
      dimensionalWeight: d.dimensionalWeight,
      description: (product.description || product.name).slice(0, 30000),
      currencyType: "TRY",
      listPrice,
      salePrice,
      vatRate: d.vatRate,
      images: absImages,
      attributes: d.attributes.map((a) => ({
        attributeId: Number(a.attributeId),
        ...(a.attributeValueId ? { attributeValueId: Number(a.attributeValueId) } : {}),
        ...(a.customAttributeValue ? { customAttributeValue: a.customAttributeValue } : {}),
      })),
      ...(d.deliveryDuration ? { deliveryDuration: d.deliveryDuration } : {}),
      ...(d.cargoCompanyId ? { cargoCompanyId: d.cargoCompanyId } : {}),
    };

    // Bağlantıyı oluştur/güncelle — yön 'push', externalId = barkod
    const existing = await storage.getMarketplaceProductByProduct(ctx.mp.id, d.productId);
    const patch = {
      syncDirection: "push" as const,
      barcode: d.barcode,
      stockCode,
      pushStatus: "sent" as const,
      pushError: null,
      tyCategoryId: d.tyCategoryId,
      tyBrandId: d.tyBrandId,
      tyBrandName: d.tyBrandName,
      pushAttributes: Object.fromEntries(
        d.attributes.map((a) => [a.attributeId, a.attributeValueId ?? a.customAttributeValue ?? ""]),
      ),
      pushMeta: {
        vatRate: d.vatRate,
        listPrice,
        ...(d.priceRule ? { priceRule: d.priceRule } : {}),
        dimensionalWeight: d.dimensionalWeight,
        ...(d.deliveryDuration ? { deliveryDuration: d.deliveryDuration } : {}),
        ...(d.cargoCompanyId ? { cargoCompanyId: d.cargoCompanyId } : {}),
      },
    };
    let link;
    if (existing) {
      link = await storage.updateMarketplaceProduct(existing.id, patch);
    } else {
      link = await storage.createMarketplaceProductLink({
        marketplaceId: ctx.mp.id,
        externalId: d.barcode,
        productId: d.productId,
        imageHashes: [],
        ...patch,
      });
    }

    const isUpdate = !!existing?.pushStatus && existing.pushStatus !== "rejected";
    await storage.enqueuePushItem({
      marketplaceId: ctx.mp.id,
      productId: d.productId,
      kind: isUpdate ? "update" : "create",
      payload: { item },
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
    });
    // Hemen işlemeyi dene (arka planda; sonuç poll ile netleşir).
    // marketplaceId geçilince yalnız bu pazaryerinin item'ları işlenir.
    void processPushQueue(ctx.mp.id).catch(() => {});
    res.status(202).json({ ok: true, link });
  });

  // Push kuyruğu görünümü
  app.get("/api/admin/marketplaces/:id/push-queue", requireAdmin, async (req, res) => {
    const rows = await storage.getPushQueue(req.params.id, 100);
    const out = [] as Array<Record<string, unknown>>;
    for (const r of rows) {
      const product = await storage.getProduct(r.productId);
      out.push({ ...r, productName: product?.name ?? null });
    }
    res.json(out);
  });

  // Kuyruk item'ını yeniden dene
  app.post(
    "/api/admin/marketplaces/:id/push-queue/:queueId/retry",
    requireAdmin,
    async (req, res) => {
      const item = (await storage.getPushQueue(req.params.id)).find(
        (i) => i.id === req.params.queueId,
      );
      if (!item) return res.status(404).json({ message: "Kuyruk kaydı bulunamadı" });
      const updated = await storage.updatePushItem(req.params.queueId, {
        status: "pending",
        attempts: 0,
        error: null,
        nextAttemptAt: new Date(),
      });
      if (!updated) return res.status(404).json({ message: "Kuyruk kaydı bulunamadı" });
      void processPushQueue(req.params.id).catch(() => {});
      res.json(updated);
    },
  );

  // Kuyruğu hemen işle (manuel tetik)
  app.post("/api/admin/marketplaces/:id/push-now", requireAdmin, async (req, res) => {
    void processPushQueue(req.params.id).catch(() => {});
    res.status(202).json({ ok: true, message: "Push kuyruğu işleniyor" });
  });

  // Tek ürünün stok/fiyatını hemen gönder
  app.post(
    "/api/admin/marketplaces/:id/product-links/:linkId/push-stock",
    requireAdmin,
    async (req, res) => {
      const link = await storage.getMarketplaceProduct(req.params.linkId);
      if (!link || link.marketplaceId !== req.params.id || !link.productId) {
        return res.status(404).json({ message: "Bağlantı bulunamadı" });
      }
      if (link.syncDirection !== "push") {
        return res.status(400).json({ message: "Bu bağlantı push yönünde değil." });
      }
      await enqueueStockPricePush(link.productId);
      void processPushQueue(req.params.id).catch(() => {});
      res.status(202).json({ ok: true });
    },
  );
}

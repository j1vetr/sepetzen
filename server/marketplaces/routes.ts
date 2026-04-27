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
import { runSync, type SyncMode } from "./sync/engine";
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
      return res.status(400).json({ message: "Pazaryeri pasif — önce etkinleştirin." });
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
}

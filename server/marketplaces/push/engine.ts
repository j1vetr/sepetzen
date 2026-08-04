/**
 * Push (outbox) motoru — site → pazaryeri yönü.
 *
 * Akış:
 *   1. Stok/fiyat değişince storage hook'ları enqueueStockPricePush() çağırır
 *      (yalnız syncDirection='push' bağlantısı olan ürünler kuyruğa girer).
 *   2. Scheduler periyodik processPushQueue() çalıştırır:
 *      - pending 'stock_price' item'ları pazaryeri bazında gruplanıp tek
 *        batch halinde gönderilir (Trendyol price-and-inventory — rate limitsiz).
 *      - pending 'create'/'update' item'ları payload'larıyla V2 servisine gider.
 *      - Başarılı gönderim → status='sent' + batchRequestId.
 *   3. pollSentBatches(): 'sent' item'ların batch sonucu poll edilir →
 *      'confirmed' veya 'failed' (+hata mesajı). create/update için
 *      marketplace_products.pushStatus da güncellenir.
 *
 * Yön koruması: pull motoru 'push' satırlarına dokunmaz (engine.ts guard'ları),
 * push motoru yalnız syncDirection='push' bağlantılarını gönderir. Böylece
 * merkezi stok kaynağı site DB'si olur, loop oluşmaz.
 */

// Adapter registry bootstrap (Trendyol vb. kayıtları) — scheduler bu modülü
// routes'tan bağımsız import edebildiği için burada da garanti altına al.
import "../index";
import { storage } from "../../storage";
import { adapterFromMarketplace } from "../sync/engine";
import { supportsWrites, MarketplaceError, type StockPricePushItem } from "../types";
import type { MarketplacePushQueueItem, MarketplaceProduct } from "@shared/schema";

const MAX_ATTEMPTS = 8;

function backoffDate(attempts: number): Date {
  const ms = Math.min(60_000 * 2 ** attempts, 60 * 60_000);
  return new Date(Date.now() + ms);
}

/**
 * Bir ürünün stok/fiyatı değişti → push-yönlü tüm pazaryeri bağlantıları için
 * kuyruğa 'stock_price' item'ı yaz (pending dedupe storage'da).
 */
export async function enqueueStockPricePush(productId: string): Promise<void> {
  const links = await storage.getPushLinksForProduct(productId);
  for (const link of links) {
    if (!link.barcode) continue; // barkodsuz bağlantı gönderilemez
    await storage.enqueuePushItem({
      marketplaceId: link.marketplaceId,
      productId,
      kind: "stock_price",
      payload: {},
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
    });
  }
}

/** Bir bağlantı için güncel stok+fiyat push item'ını hesapla. */
/**
 * Bağlantı bazlı fiyat kuralı. Sitede 1000 TL olan ürün Trendyol'a
 * yüzde 30 artışla 1300 TL veya elle girilen sabit fiyatla gidebilir.
 * Kural yoksa site fiyatı aynen kullanılır.
 */
export type PriceRule = { type: "percent" | "fixed"; value: number };

export function applyPriceRule(basePrice: number, rule?: PriceRule | null): number {
  if (!rule || !Number.isFinite(rule.value) || rule.value <= 0) return basePrice;
  if (rule.type === "fixed") return Math.round(rule.value * 100) / 100;
  if (rule.type === "percent") return Math.round(basePrice * (1 + rule.value / 100) * 100) / 100;
  return basePrice;
}

async function buildStockPriceItem(
  link: MarketplaceProduct,
): Promise<StockPricePushItem | null> {
  if (!link.productId || !link.barcode) return null;
  const product = await storage.getProduct(link.productId);
  if (!product) return null;
  const variants = await storage.getProductVariants(link.productId);
  const active = variants.filter((v) => v.isActive !== false);
  // Trendyol'da barcode başına tek satır. Çok varyantlı ürünlerde toplam stok
  // gönderilir (katalogdaki ürünler ağırlıkla tek varyant — bıçaklar).
  const totalStock = active.reduce((s, v) => s + (v.stock ?? 0), 0);
  const meta = (link.pushMeta ?? {}) as { listPrice?: number; priceRule?: PriceRule };
  const salePrice = applyPriceRule(Number(product.basePrice), meta.priceRule);
  const listPrice = typeof meta.listPrice === "number" && meta.listPrice >= salePrice
    ? meta.listPrice
    : salePrice;
  // Site'da pasif ürün → stok 0 gönder (Trendyol'da satışı durdurur).
  const quantity = product.isActive ? totalStock : 0;
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;
  return { barcode: link.barcode, quantity, salePrice, listPrice };
}

async function markFailedAttempt(item: MarketplacePushQueueItem, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const attempts = (item.attempts ?? 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await storage.updatePushItem(item.id, { status: "failed", attempts, error: message });
  } else {
    await storage.updatePushItem(item.id, {
      attempts,
      error: message,
      nextAttemptAt: backoffDate(attempts),
    });
  }
}

let running = false;

/**
 * Kuyruğu işle: pending item'ları pazaryerine gönder + sent'leri poll et.
 * `onlyMarketplaceId` verilirse yalnızca o pazaryerinin item'ları işlenir
 * (admin panelinden manuel tetikte yanlışlıkla başka pazaryerine dokunmamak için).
 */
export async function processPushQueue(onlyMarketplaceId?: string): Promise<void> {
  if (running) return; // tek instance koruması
  running = true;
  try {
    await sendPending(onlyMarketplaceId);
    await pollSentBatches(onlyMarketplaceId);
  } finally {
    running = false;
  }
}

async function sendPending(onlyMarketplaceId?: string): Promise<void> {
  let due = await storage.getDuePushItems(200);
  if (onlyMarketplaceId) due = due.filter((i) => i.marketplaceId === onlyMarketplaceId);
  if (due.length === 0) return;

  // Pazaryeri bazında grupla
  const byMp = new Map<string, MarketplacePushQueueItem[]>();
  for (const item of due) {
    const list = byMp.get(item.marketplaceId) ?? [];
    list.push(item);
    byMp.set(item.marketplaceId, list);
  }

  for (const [marketplaceId, items] of Array.from(byMp.entries())) {
    const mp = await storage.getMarketplace(marketplaceId);
    if (!mp || !mp.isActive) {
      for (const it of items) {
        await markFailedAttempt(it, new Error("Pazaryeri pasif veya silinmiş"));
      }
      continue;
    }
    let adapter;
    try {
      adapter = adapterFromMarketplace(mp);
    } catch (err) {
      for (const it of items) await markFailedAttempt(it, err);
      continue;
    }
    if (!supportsWrites(adapter)) {
      for (const it of items) {
        await storage.updatePushItem(it.id, {
          status: "failed",
          error: `${mp.type} adapter'ı push desteklemiyor`,
        });
      }
      continue;
    }

    // --- stock_price: tek batch ---
    const stockItems = items.filter((i: MarketplacePushQueueItem) => i.kind === "stock_price");
    if (stockItems.length > 0) {
      const payloadItems: StockPricePushItem[] = [];
      const okQueueItems: MarketplacePushQueueItem[] = [];
      for (const qi of stockItems) {
        const link = await storage.getMarketplaceProductByProduct(marketplaceId, qi.productId);
        if (!link || link.syncDirection !== "push" || !link.barcode) {
          await storage.updatePushItem(qi.id, {
            status: "failed",
            error: "Push bağlantısı bulunamadı veya yön 'push' değil",
          });
          continue;
        }
        const built = await buildStockPriceItem(link);
        if (!built) {
          await storage.updatePushItem(qi.id, {
            status: "failed",
            error: "Stok/fiyat item'ı oluşturulamadı (ürün silinmiş veya fiyat geçersiz)",
          });
          continue;
        }
        payloadItems.push(built);
        okQueueItems.push(qi);
      }
      if (payloadItems.length > 0) {
        try {
          const batchId = await adapter.updateStockAndPrice(payloadItems);
          for (const qi of okQueueItems) {
            await storage.updatePushItem(qi.id, { status: "sent", batchRequestId: batchId, error: null });
            const link = await storage.getMarketplaceProductByProduct(marketplaceId, qi.productId);
            if (link) {
              await storage.updateMarketplaceProduct(link.id, {
                lastBatchRequestId: batchId,
                lastPushedAt: new Date(),
              });
            }
          }
        } catch (err) {
          for (const qi of okQueueItems) await markFailedAttempt(qi, err);
        }
      }
    }

    // --- create / update: payload'lı gönderim ---
    for (const qi of items.filter(
      (i: MarketplacePushQueueItem) => i.kind === "create" || i.kind === "update",
    )) {
      const payload = qi.payload as { item?: Record<string, unknown> };
      if (!payload?.item) {
        await storage.updatePushItem(qi.id, { status: "failed", error: "Payload boş" });
        continue;
      }
      try {
        const batchId =
          qi.kind === "create"
            ? await adapter.createProducts([payload.item])
            : await adapter.updateProducts([payload.item]);
        await storage.updatePushItem(qi.id, { status: "sent", batchRequestId: batchId, error: null });
        const link = await storage.getMarketplaceProductByProduct(marketplaceId, qi.productId);
        if (link) {
          await storage.updateMarketplaceProduct(link.id, {
            pushStatus: "sent",
            pushError: null,
            lastBatchRequestId: batchId,
            lastPushedAt: new Date(),
          });
        }
      } catch (err) {
        await markFailedAttempt(qi, err);
        const link = await storage.getMarketplaceProductByProduct(marketplaceId, qi.productId);
        if (link) {
          await storage.updateMarketplaceProduct(link.id, {
            pushStatus: "error",
            pushError: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
}

/** 'sent' item'ların batch sonuçlarını poll et → confirmed / failed. */
export async function pollSentBatches(onlyMarketplaceId?: string): Promise<void> {
  let sent = await storage.getSentPushItems(200);
  if (onlyMarketplaceId) sent = sent.filter((i) => i.marketplaceId === onlyMarketplaceId);
  if (sent.length === 0) return;

  // (marketplaceId, batchRequestId) bazında tek poll
  const cache = new Map<string, Awaited<ReturnType<typeof pollOne>> | null>();
  for (const item of sent) {
    if (!item.batchRequestId) {
      await storage.updatePushItem(item.id, { status: "failed", error: "batchRequestId yok" });
      continue;
    }
    const key = `${item.marketplaceId}:${item.batchRequestId}`;
    if (!cache.has(key)) {
      cache.set(key, await pollOne(item.marketplaceId, item.batchRequestId));
    }
    const result = cache.get(key);
    if (!result) continue; // poll hatası → sonraki turda tekrar dene
    if (result.status === "IN_PROGRESS") continue;

    // DONE → bu item'ın barkoduna özel failure var mı?
    const link = await storage.getMarketplaceProductByProduct(item.marketplaceId, item.productId);
    const barcode = link?.barcode ?? null;
    const failure =
      result.failures.find((f) => barcode && f.key === barcode) ??
      // barkod eşleşmesi yoksa ve batch'te tek item varsa genel failure'ı uygula
      (result.itemCount <= 1 && result.failures.length > 0 ? result.failures[0] : undefined);

    if (failure) {
      const msg = failure.reasons.join("; ").slice(0, 500);
      await storage.updatePushItem(item.id, { status: "failed", error: msg });
      if (link && (item.kind === "create" || item.kind === "update")) {
        await storage.updateMarketplaceProduct(link.id, { pushStatus: "rejected", pushError: msg });
      }
    } else {
      await storage.updatePushItem(item.id, { status: "confirmed", error: null });
      if (link && (item.kind === "create" || item.kind === "update")) {
        // Batch kabul edildi — ürün Trendyol onay sürecine girdi.
        await storage.updateMarketplaceProduct(link.id, { pushStatus: "approved", pushError: null });
      }
    }
  }
}

async function pollOne(marketplaceId: string, batchRequestId: string) {
  try {
    const mp = await storage.getMarketplace(marketplaceId);
    if (!mp) return null;
    const adapter = adapterFromMarketplace(mp);
    if (!supportsWrites(adapter)) return null;
    return await adapter.getBatchResult(batchRequestId);
  } catch (err) {
    // 404/erken poll vs — sonraki turda tekrar
    if (err instanceof MarketplaceError && err.statusCode === 404) return null;
    console.error("[push] batch poll failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

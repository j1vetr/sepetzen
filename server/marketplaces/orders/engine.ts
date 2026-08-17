/**
 * Sipariş çekme motoru — pazaryeri → site stok düşümü.
 *
 * Akış:
 *   1. Scheduler periyodik pullMarketplaceOrders() çalıştırır.
 *   2. Her aktif, sipariş destekli pazaryeri için son LOOKBACK penceresindeki
 *      siparişler sayfa sayfa çekilir.
 *   3. Her sipariş satırı (marketplaceId, orderNumber, lineId) anahtarıyla
 *      idempotent kaydedilir; İLK görüldüğünde push-yönlü bağlantının site
 *      stoğu satılan adet kadar düşürülür.
 *   4. Stok düşümü storage.updateProductVariant üzerinden yapılır → mevcut
 *      awaited push outbox (notifyPushOutbox) tetiklenir ve değişiklik diğer
 *      kanallara yayılır.
 *   5. Daha önce düşülen bir satır sonradan iptal/iade/tedarik-edilemedi
 *      durumuna geçerse stok bir kez geri eklenir (stockRestored).
 *
 * Yön koruması: yalnız syncDirection='push' bağlantıları etkilenir. Pull
 * yönlü ürünlerin stoğu zaten Trendyol'dan delta sync ile gelir; onlara
 * dokunmak çift düşüme yol açardı.
 */

// Adapter registry bootstrap — scheduler bu modülü bağımsız import edebilir.
import "../index";
import { storage } from "../../storage";
import { adapterFromMarketplace } from "../sync/engine";
import { supportsOrders, type NormalizedOrder, type PageCursor } from "../types";
import type { MarketplaceProduct } from "@shared/schema";

/** Kaç saat geriye bakılır. Cron 10 dk'da bir çalışır; 24 saat geniş bir
 *  güvenlik payı bırakır (kaçırılan tick, downtime). Idempotency sayesinde
 *  pencere örtüşmesi zararsızdır. */
const LOOKBACK_HOURS = 24;
const MAX_PAGES = 50;

/** Bu durumlarda satış gerçekleşmemiş/geri dönmüş sayılır → stok düşülmez,
 *  düşülmüşse geri eklenir. */
const CANCELLED_STATUSES = new Set(["cancelled", "unsupplied", "returned", "undeliveredandreturned"]);

function isCancelled(status: string | null | undefined): boolean {
  return CANCELLED_STATUSES.has(String(status ?? "").toLowerCase());
}

let running = false;

/**
 * Tüm aktif pazaryerlerinin siparişlerini çek ve push-yönlü ürünlerin
 * stoğunu düşür. `onlyMarketplaceId` verilirse yalnız o pazaryeri işlenir.
 */
export async function pullMarketplaceOrders(onlyMarketplaceId?: string): Promise<void> {
  if (running) return; // tek instance koruması
  running = true;
  try {
    const marketplaces = await storage.getMarketplaces();
    const active = marketplaces.filter(
      (m) => m.isActive && (!onlyMarketplaceId || m.id === onlyMarketplaceId),
    );
    for (const mp of active) {
      try {
        await pullOrdersForMarketplace(mp.id);
      } catch (err) {
        console.error(
          `[orders] ${mp.name} sipariş çekme hatası:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  } finally {
    running = false;
  }
}

async function pullOrdersForMarketplace(marketplaceId: string): Promise<void> {
  const mp = await storage.getMarketplace(marketplaceId);
  if (!mp || !mp.isActive) return;
  const adapter = adapterFromMarketplace(mp);
  if (!supportsOrders(adapter)) return;

  const endDate = Date.now();
  const startDate = endDate - LOOKBACK_HOURS * 60 * 60_000;

  let cursor: PageCursor = null;
  let pages = 0;
  let applied = 0;
  let restored = 0;
  do {
    const page = await adapter.fetchOrdersPage(startDate, endDate, cursor);
    for (const order of page.orders) {
      const r = await processOrder(marketplaceId, order);
      applied += r.applied;
      restored += r.restored;
    }
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor != null && pages < MAX_PAGES);

  if (applied > 0 || restored > 0) {
    console.log(
      `[orders] ${mp.name}: ${applied} satır stok düşümü, ${restored} satır stok iadesi uygulandı`,
    );
  }
}

/** Exported: test edilebilirlik için (scheduler pullMarketplaceOrders kullanır). */
export async function processOrder(
  marketplaceId: string,
  order: NormalizedOrder,
): Promise<{ applied: number; restored: number }> {
  let applied = 0;
  let restored = 0;
  for (const line of order.lines) {
    const qty = Math.floor(line.quantity);
    if (!line.lineId || qty <= 0) continue;

    // Barkod → push bağlantısı eşleşmesi (yalnız syncDirection='push').
    const link = line.barcode
      ? await storage.getPushLinkByBarcode(marketplaceId, line.barcode)
      : undefined;

    const cancelled = isCancelled(line.status) || isCancelled(order.status);

    const unitPrice = line.unitPrice != null ? line.unitPrice.toFixed(2) : null;
    const totalPrice = line.unitPrice != null ? (line.unitPrice * qty).toFixed(2) : null;

    const { line: row, inserted } = await storage.recordMarketplaceOrderLine({
      marketplaceId,
      orderNumber: order.orderNumber,
      lineId: line.lineId,
      packageId: order.externalPackageId ?? null,
      barcode: line.barcode,
      quantity: qty,
      status: line.status || order.status || null,
      productId: link?.productId ?? null,
      stockApplied: false,
      stockRestored: false,
      note: link ? null : "Push bağlantısı bulunamadı — stok düşümü yok",
      unitPrice,
      totalPrice,
      productTitle: line.productTitle,
      customerName: order.customerName,
      cargoProvider: order.cargoProvider,
      cargoTracking: order.cargoTracking,
      orderedAt: order.orderedAt,
    });
    if (!row) continue;

    if (inserted) {
      // İlk görüş: iptal değilse ve push bağlantısı varsa stoğu düş.
      if (!cancelled && link?.productId) {
        const ok = await adjustStock(link, -qty);
        await storage.updateMarketplaceOrderLine(row.id, {
          stockApplied: ok,
          note: ok ? null : "Stok düşümü uygulanamadı (aktif varyant yok)",
        });
        if (ok) applied += 1;
      }
      continue;
    }

    // Tekrar görülen satır: durum/kargo/müşteri bilgisi güncelle; iptal/iadeye
    // dönmüşse ve daha önce düşüm uygulandıysa stoğu BİR KEZ geri ekle.
    const statusChanged = (line.status || null) !== (row.status ?? null);
    const infoPatch = {
      ...(order.externalPackageId && !row.packageId
        ? { packageId: order.externalPackageId }
        : {}),
      ...(unitPrice != null && row.unitPrice == null ? { unitPrice, totalPrice } : {}),
      ...(line.productTitle && !row.productTitle ? { productTitle: line.productTitle } : {}),
      ...(order.customerName && !row.customerName ? { customerName: order.customerName } : {}),
      ...(order.cargoProvider && order.cargoProvider !== row.cargoProvider
        ? { cargoProvider: order.cargoProvider }
        : {}),
      ...(order.cargoTracking && order.cargoTracking !== row.cargoTracking
        ? { cargoTracking: order.cargoTracking }
        : {}),
    };
    if (cancelled && row.stockApplied && !row.stockRestored && link?.productId) {
      const ok = await adjustStock(link, +row.quantity);
      await storage.updateMarketplaceOrderLine(row.id, {
        ...infoPatch,
        status: line.status || order.status || row.status,
        stockRestored: ok,
        note: ok ? "İptal/iade — stok geri eklendi" : "Stok iadesi uygulanamadı",
      });
      if (ok) restored += 1;
    } else if (statusChanged || Object.keys(infoPatch).length > 0) {
      await storage.updateMarketplaceOrderLine(row.id, {
        ...infoPatch,
        status: line.status || order.status || row.status,
      });
    }
  }
  return { applied, restored };
}

/**
 * Site stoğunu delta kadar değiştir (negatif = düşüm). Varyant seçimi:
 * bağlantı barkodu tek bir varyantın SKU'suyla eşleşiyorsa o varyant,
 * yoksa stoğu en yüksek aktif varyant (push ürünleri ağırlıkla tek varyant).
 * updateProductVariant push outbox'ı awaited tetikler → diğer kanallara yayılır.
 */
async function adjustStock(link: MarketplaceProduct, delta: number): Promise<boolean> {
  if (!link.productId) return false;
  const variants = await storage.getProductVariants(link.productId);
  const active = variants.filter((v) => v.isActive !== false);
  if (active.length === 0) return false;

  const bySku =
    (link.stockCode && active.find((v) => v.sku === link.stockCode)) ||
    (link.barcode && active.find((v) => v.sku === link.barcode)) ||
    null;
  const target = bySku ?? active.reduce((a, b) => ((b.stock ?? 0) > (a.stock ?? 0) ? b : a));

  const next = Math.max(0, (target.stock ?? 0) + delta);
  await storage.updateProductVariant(target.id, { stock: next });
  return true;
}

/**
 * Pazaryerinden bağımsız senkron motoru.
 *
 * İki mod:
 *   - delta: yalnız fiyat + stok güncellemesi (saatte bir cron)
 *   - full : kategori ağacı + tüm ürün detayları + görseller + varyantlar (gece 03:00)
 *
 * Kuralları:
 *   - Aynı pazaryeri için iki sync paralel ÇALIŞMAZ (status='running' lock).
 *   - Per-item try/catch — bir ürünün hatası senkronu öldürmez, errors[]'a yazılır.
 *   - Görseller içerik hash'i ile dedupe edilir, sharp ile optimize edilir,
 *     `client/public/uploads/products/` altına yazılır.
 *   - Trendyol'da olmayan ürün soft-delete (isActive=false), tekrar gelirse re-activate.
 *   - Eşlenmemiş kategoriden gelen ürün için geçici Polen Stone kategorisi
 *     otomatik oluşturulur (Türkçe karakter normalize edilmiş slug).
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../../storage";
import { optimizeImageBuffer } from "../../imageOptimizer";
import { decryptCredentials } from "../crypto";
import { createAdapter } from "../registry";
import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceConfig,
  MarketplaceType,
  NormalizedCategory,
  NormalizedProduct,
  PageCursor,
  ProductsPage,
} from "../types";
import type {
  Marketplace,
  MarketplaceProduct as MarketplaceProductRow,
  MarketplaceSyncRun,
  Product,
  Category,
  InsertProduct,
  InsertCategory,
} from "@shared/schema";

export type SyncMode = "delta" | "full";
export type SyncTrigger = "manual" | "cron";

/**
 * SyncStats: bilinçli olarak Record<string, number>'a uyumlu yapıldı
 * (index signature) → storage interface ile cast'siz çalışır.
 */
type SyncStats = {
  [k: string]: number;
  categoriesAdded: number;
  categoriesUpdated: number;
  productsAdded: number;
  productsUpdated: number;
  productsDeactivated: number;
  productsReactivated: number;
  /** Stok/fiyat uygulanan varyant satırı sayısı (delta). */
  variantsUpdated: number;
  /** Snapshot SKU eşleşemeyen varyant sayısı — diagnostik. */
  variantsUnmatched: number;
  imagesDownloaded: number;
  imagesSkipped: number;
  pagesProcessed: number;
};

interface SyncErrorEntry {
  context: string;
  message: string;
}

const UPLOAD_DIR = path.join(process.cwd(), "client", "public", "uploads", "products");

function emptyStats(): SyncStats {
  return {
    categoriesAdded: 0,
    categoriesUpdated: 0,
    productsAdded: 0,
    productsUpdated: 0,
    productsDeactivated: 0,
    productsReactivated: 0,
    variantsUpdated: 0,
    variantsUnmatched: 0,
    imagesDownloaded: 0,
    imagesSkipped: 0,
    pagesProcessed: 0,
  };
}

/** Türkçe karakter normalize edip slug üretir. */
export function turkishSlugify(input: string): string {
  const map: Record<string, string> = {
    ş: "s", Ş: "s", ı: "i", İ: "i", ğ: "g", Ğ: "g",
    ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
  };
  return (input || "")
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "kategori";
}

/** Trendyol contentId/productCode'dan deterministik ürün slug. */
function deterministicProductSlug(p: NormalizedProduct): string {
  const baseFromCode = p.externalProductCode
    ? turkishSlugify(p.externalProductCode)
    : turkishSlugify(p.name);
  const suffix = p.externalId.toString().slice(-6);
  return `${baseFromCode}-${suffix}`.replace(/-+/g, "-").slice(0, 100);
}

function contentHash(p: NormalizedProduct): string {
  const blob = JSON.stringify({
    name: p.name,
    description: p.description ?? "",
    basePrice: p.basePrice,
    totalStock: p.totalStock,
    isActive: p.isActive,
    images: p.images.map((i) => i.url),
    variants: p.variants.map((v) => ({
      barcode: v.barcode,
      price: v.price,
      stock: v.stock,
      size: v.size,
      color: v.color?.name ?? null,
    })),
  });
  return crypto.createHash("sha256").update(blob).digest("hex");
}

import * as dns from "node:dns/promises";
import * as net from "node:net";

/** Block IPv4 sınıfları + metadata + RFC1918 + link-local. */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Block IPv6 loopback, link-local, ULA, mapped-IPv4. */
function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fec0:")) return true; // link/site-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  // ::ffff:a.b.c.d  (mapped IPv4) — pull out and re-check as v4
  const m = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isBlockedIPv4(m[1]);
  return false;
}

function isBlockedHostnameLiteral(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (h === "metadata" || h === "metadata.google.internal") return true;
  return false;
}

/** SSRF guard: validates protocol/host AND resolves DNS, blocking private targets. */
async function assertSafeImageUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`invalid image URL: ${raw}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`disallowed protocol: ${u.protocol}`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostnameLiteral(host)) {
    throw new Error(`internal host not allowed: ${host}`);
  }
  // Literal IP?
  const family = net.isIP(host);
  if (family === 4) {
    if (isBlockedIPv4(host)) throw new Error(`private IPv4 not allowed: ${host}`);
    return u;
  }
  if (family === 6) {
    if (isBlockedIPv6(host)) throw new Error(`private IPv6 not allowed: ${host}`);
    return u;
  }
  // Hostname → DNS lookup all addresses, reject if any is private (DNS rebinding guard)
  type DnsAddr = { address: string; family: number };
  let addrs: DnsAddr[];
  try {
    addrs = (await dns.lookup(host, { all: true })) as DnsAddr[];
  } catch (err) {
    throw new Error(`dns lookup failed for ${host}: ${(err as Error).message}`);
  }
  for (const a of addrs) {
    if (a.family === 4 && isBlockedIPv4(a.address)) {
      throw new Error(`host ${host} resolves to private IPv4 ${a.address}`);
    }
    if (a.family === 6 && isBlockedIPv6(a.address)) {
      throw new Error(`host ${host} resolves to private IPv6 ${a.address}`);
    }
  }
  return u;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_REDIRECTS = 5;

/** Manuel redirect zinciri: her hop'u SSRF guard'tan geçir. */
async function fetchImageWithSafeRedirects(initialUrl: string): Promise<Response> {
  let urlStr = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeImageUrl(urlStr);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let resp: Response;
    try {
      resp = await fetch(urlStr, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "PolenStone-MarketplaceSync/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) throw new Error(`redirect ${resp.status} without Location header`);
      urlStr = new URL(loc, urlStr).toString();
      continue;
    }
    return resp;
  }
  throw new Error(`too many redirects (>${MAX_REDIRECTS})`);
}

async function downloadImage(
  url: string,
): Promise<{ relativePath: string; hash: string; bytes: number } | null> {
  const resp = await fetchImageWithSafeRedirects(url);
  if (!resp.ok) {
    throw new Error(`image fetch failed (${resp.status}) for ${url}`);
  }
  const ct = resp.headers.get("content-type") ?? "";
  if (ct && !/^image\//i.test(ct)) {
    throw new Error(`non-image content-type: ${ct}`);
  }
  const len = Number(resp.headers.get("content-length") ?? 0);
  if (len > MAX_IMAGE_BYTES) {
    throw new Error(`image too large: ${len} bytes`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length === 0) return null;
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new Error(`image too large: ${buf.length} bytes`);
  }
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const webpPath = path.join(UPLOAD_DIR, `${hash}.webp`);
  const jpgPath = path.join(UPLOAD_DIR, `${hash}.jpg`);
  let written: string | null = null;
  if (fs.existsSync(webpPath)) written = webpPath;
  else if (fs.existsSync(jpgPath)) written = jpgPath;
  else {
    const out = await optimizeImageBuffer(buf, webpPath);
    written = out;
  }
  const publicRoot = path.join(process.cwd(), "client", "public");
  const relative =
    "/" + path.relative(publicRoot, written).split(path.sep).join("/");
  return { relativePath: relative, hash, bytes: buf.length };
}

/** Bir görsel listesini paralel (batch=5) indirir, dedupe uygular. */
async function syncImages(
  product: NormalizedProduct,
  knownHashes: string[],
  stats: SyncStats,
  errors: SyncErrorEntry[],
  ctx: string,
): Promise<{ images: string[]; hashes: string[] }> {
  const ordered = [...product.images].sort((a, b) => a.order - b.order);
  const concurrency = 5;
  const results: Array<{ relativePath: string; hash: string } | null> = new Array(ordered.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < ordered.length) {
      const i = cursor++;
      const img = ordered[i];
      try {
        const downloaded = await downloadImage(img.url);
        if (!downloaded) {
          stats.imagesSkipped += 1;
          results[i] = null;
          continue;
        }
        if (knownHashes.includes(downloaded.hash)) {
          stats.imagesSkipped += 1;
        } else {
          stats.imagesDownloaded += 1;
        }
        results[i] = { relativePath: downloaded.relativePath, hash: downloaded.hash };
      } catch (err) {
        errors.push({
          context: `${ctx} image ${img.url}`,
          message: err instanceof Error ? err.message : String(err),
        });
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ordered.length) }, worker));
  const filtered = results.filter((x): x is { relativePath: string; hash: string } => x !== null);
  return {
    images: filtered.map((r) => r.relativePath),
    hashes: filtered.map((r) => r.hash),
  };
}

/** Kategori upsert — Trendyol kategorisi → Polen Stone kategorisi. */
async function ensureSiteCategory(
  marketplaceId: string,
  externalId: string,
  externalName: string,
  cache: Map<string, string>,
  stats: SyncStats,
): Promise<string | null> {
  if (cache.has(externalId)) return cache.get(externalId)!;

  const mapping = await storage.getMarketplaceCategoryByExternal(marketplaceId, externalId);
  if (mapping?.siteCategoryId) {
    cache.set(externalId, mapping.siteCategoryId);
    return mapping.siteCategoryId;
  }

  // Henüz eşlenmemiş → otomatik bir Polen Stone kategorisi yarat (display_order=200, gizli)
  const slug = turkishSlugify(externalName);
  let siteCat = await storage.getCategoryBySlug(slug);
  if (!siteCat) {
    const newCat: InsertCategory = {
      name: externalName,
      slug,
      // 200+ aralığı: legacy/auto kategoriler — UI bunları gizliyor
      displayOrder: 200,
    };
    siteCat = await storage.createCategory(newCat);
    stats.categoriesAdded += 1;
  }
  await storage.upsertMarketplaceCategoryMapping(
    marketplaceId,
    externalId,
    externalName,
    null,
    siteCat.id,
  );
  cache.set(externalId, siteCat.id);
  return siteCat.id;
}

/** Bir ürünü site DB'sine yaz. */
async function upsertProduct(
  marketplace: Marketplace,
  np: NormalizedProduct,
  siteCategoryId: string,
  existingMpRow: MarketplaceProductRow | undefined,
  stats: SyncStats,
  errors: SyncErrorEntry[],
): Promise<void> {
  const ctx = `[${marketplace.type}] ${np.name} (${np.externalId})`;

  // İçerik hash'i değişmediyse hiç dokunmadan geç
  const newHash = contentHash(np);
  if (existingMpRow?.contentHash === newHash && existingMpRow.productId) {
    return;
  }

  // Görselleri indir / dedupe
  const known = existingMpRow?.imageHashes ?? [];
  const { images, hashes } = await syncImages(np, known, stats, errors, ctx);

  const slug = deterministicProductSlug(np);

  let siteProduct: Product | undefined;
  if (existingMpRow?.productId) {
    siteProduct = await storage.getProduct(existingMpRow.productId);
  }
  // Slug çakışması önlemi: aynı slug başka bir üründeyse, slug üret farklı.
  if (!siteProduct) {
    const bySlug = await storage.getProductBySlug(slug);
    if (bySlug) siteProduct = bySlug;
  }

  const wasInactive = siteProduct ? !siteProduct.isActive : false;

  const productPayload: InsertProduct = {
    name: np.name,
    slug,
    description: np.description ?? "",
    sku: np.externalProductCode ?? null,
    basePrice: np.basePrice.toFixed(2),
    categoryId: siteCategoryId,
    images: images.length > 0 ? images : siteProduct?.images ?? [],
    availableSizes: np.variants.map((v) => v.size).filter((s): s is string => !!s),
    availableColors: np.variants
      .map((v) => v.color)
      .filter((c): c is { name: string; hex?: string | null } => !!c)
      .map((c) => ({ name: c.name, hex: c.hex ?? "#cccccc" })),
    isActive: np.isActive,
    isFeatured: siteProduct?.isFeatured ?? false,
    isNew: siteProduct?.isNew ?? false,
  };

  if (siteProduct) {
    await storage.updateProduct(siteProduct.id, productPayload);
    if (np.isActive && wasInactive) stats.productsReactivated += 1;
    stats.productsUpdated += 1;
  } else {
    siteProduct = await storage.createProduct(productPayload);
    stats.productsAdded += 1;
  }

  // Varyantları senkronize et (basit: mevcutları sil + yeniden yaz)
  try {
    const existingVariants = await storage.getProductVariants(siteProduct.id);
    for (const v of existingVariants) {
      await storage.deleteProductVariant(v.id);
    }
    // sku alanını doldur ki delta sync SKU üzerinden deterministik eşleşsin.
    // sku UNIQUE — pazaryerine prefix ekleyerek başka kaynaklarla çakışmayı önle.
    const skuPrefix = `${marketplace.type}:`;
    for (const v of np.variants) {
      const rawSku = v.sku ?? v.barcode ?? v.externalVariantId ?? null;
      const sku = rawSku ? `${skuPrefix}${rawSku}` : null;
      await storage.createProductVariant({
        productId: siteProduct.id,
        sku,
        size: v.size ?? "Tek Beden",
        color: v.color?.name ?? "—",
        colorHex: v.color?.hex ?? null,
        price: v.price.toFixed(2),
        stock: v.stock,
        isActive: true,
      });
    }
  } catch (err) {
    errors.push({
      context: `${ctx} variants`,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // marketplace_products köprüsünü güncelle
  await storage.upsertMarketplaceProduct({
    marketplaceId: marketplace.id,
    externalId: np.externalId,
    externalProductCode: np.externalProductCode ?? null,
    productId: siteProduct.id,
    imageHashes: hashes.length > 0 ? hashes : known,
    contentHash: newHash,
  });
}

/** Bu pazaryerinin yetimleri (artık Trendyol'da yok) → soft-delete. */
async function deactivateMissing(
  marketplaceId: string,
  seenExternalIds: Set<string>,
  stats: SyncStats,
): Promise<void> {
  const allRows = await storage.getMarketplaceProducts(marketplaceId);
  for (const row of allRows) {
    if (seenExternalIds.has(row.externalId)) continue;
    if (!row.productId) continue;
    const p = await storage.getProduct(row.productId);
    if (p && p.isActive) {
      await storage.updateProduct(row.productId, { isActive: false });
      stats.productsDeactivated += 1;
    }
  }
}

/** Marketplace satırından adapter instance üret. */
export function adapterFromMarketplace(mp: Marketplace): MarketplaceAdapter {
  const creds = decryptCredentials<MarketplaceCredentials>(mp.encryptedCredentials);
  return createAdapter(mp.type as MarketplaceType, creds, (mp.config ?? {}) as MarketplaceConfig);
}

/**
 * Ana giriş: bir pazaryeri için sync çalıştır.
 *
 * @returns marketplace_sync_runs satırı
 */
export async function runSync(
  marketplaceId: string,
  mode: SyncMode,
  trigger: SyncTrigger = "manual",
): Promise<MarketplaceSyncRun> {
  const mp = await storage.getMarketplace(marketplaceId);
  if (!mp) throw new Error(`Marketplace ${marketplaceId} not found`);
  if (!mp.isActive) throw new Error(`Marketplace ${mp.name} is inactive`);

  // Race-safe lock: marketplace_sync_runs üzerinde "yalnız bir running per marketplace"
  // kuralı için kısmi unique index var. INSERT denenir; çakışırsa 'already running'.
  let run: MarketplaceSyncRun;
  try {
    run = await storage.createSyncRun({
      marketplaceId,
      mode,
      status: "running",
      trigger,
      stats: {},
      errors: [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      const existing = await storage.getRunningSyncRun(marketplaceId);
      throw new Error(
        `Bu pazaryeri için zaten çalışan bir senkron var (${existing?.mode ?? "?"}).`,
      );
    }
    throw err;
  }

  const stats = emptyStats();
  const errors: SyncErrorEntry[] = [];

  let adapter: MarketplaceAdapter;
  try {
    adapter = adapterFromMarketplace(mp);
  } catch (err) {
    return await storage.completeSyncRun(run.id, {
      status: "failed",
      stats,
      errors: [
        {
          context: "adapter.init",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    });
  }

  try {
    if (mode === "full") {
      await runFullSync(mp, adapter, stats, errors);
    } else {
      await runDeltaSync(mp, adapter, stats, errors);
    }

    const status = errors.length === 0 ? "completed" : "partial";
    const updated = await storage.completeSyncRun(run.id, {
      status,
      stats,
      errors: errors.slice(0, 100),
    });
    if (mode === "full") await storage.updateMarketplaceSyncTime(marketplaceId, "full");
    else await storage.updateMarketplaceSyncTime(marketplaceId, "delta");
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ context: "sync.fatal", message });
    return await storage.completeSyncRun(run.id, {
      status: "failed",
      stats,
      errors: errors.slice(0, 100),
    });
  }
}

async function runFullSync(
  mp: Marketplace,
  adapter: MarketplaceAdapter,
  stats: SyncStats,
  errors: SyncErrorEntry[],
): Promise<void> {
  // 1. Kategori ağacını çek + DB'ye marketplace_categories satırlarına yaz
  let tree: NormalizedCategory[] = [];
  try {
    tree = await adapter.fetchCategoryTree();
  } catch (err) {
    errors.push({
      context: "fetchCategoryTree",
      message: err instanceof Error ? err.message : String(err),
    });
  }
  for (const c of tree) {
    try {
      const existing = await storage.getMarketplaceCategoryByExternal(mp.id, c.externalId);
      await storage.upsertMarketplaceCategoryMapping(
        mp.id,
        c.externalId,
        c.name,
        c.parentExternalId ?? null,
        existing?.siteCategoryId ?? null,
      );
      if (existing) stats.categoriesUpdated += 1;
    } catch (err) {
      errors.push({
        context: `category ${c.externalId}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Sayfa sayfa ürünleri çek
  const seen = new Set<string>();
  const catCache = new Map<string, string>();
  let cursor: PageCursor = null;
  let page = 0;
  // Bu bayrak deactivateMissing'in kararını yönetir: yalnız tüm sayfalar
  // başarıyla okunduysa "missing = orphan" varsayımı güvenlidir. Aksi halde
  // bir sayfa hatası tüm kataloğun deactive edilmesine yol açabilir.
  let fullScanCompleted = false;
  while (true) {
    let resp: ProductsPage;
    try {
      resp = await adapter.fetchProductsPage(cursor);
    } catch (err) {
      errors.push({
        context: `fetchProductsPage page=${page}`,
        message: err instanceof Error ? err.message : String(err),
      });
      break;
    }
    stats.pagesProcessed += 1;
    for (const np of resp.products) {
      seen.add(np.externalId);
      try {
        // Doğru kategori adı: kategori ağacından oku; yoksa marketplace kategorisi
        // olarak kayıtlı olanı (full sync sırasında daha önce upsert ettik); o da
        // yoksa "Genel".
        const treeNode = tree.find((t) => t.externalId === np.externalCategoryId);
        const existingMapping = treeNode
          ? null
          : await storage.getMarketplaceCategoryByExternal(mp.id, np.externalCategoryId);
        const categoryName = treeNode?.name ?? existingMapping?.name ?? "Genel";
        const finalCatId = await ensureSiteCategory(
          mp.id,
          np.externalCategoryId,
          categoryName,
          catCache,
          stats,
        );
        if (!finalCatId) continue;
        const mpRow = await storage.getMarketplaceProductByExternal(mp.id, np.externalId);
        await upsertProduct(mp, np, finalCatId, mpRow, stats, errors);
      } catch (err) {
        errors.push({
          context: `product ${np.externalId}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (resp.nextCursor == null) {
      fullScanCompleted = true;
      break;
    }
    cursor = resp.nextCursor;
    page += 1;
    if (page > 1000) break; // sonsuz loop koruması; full scan kabul EDİLMEZ
  }

  // 3. Yetimleri pasifle — yalnız tarama başarıyla tamamlandıysa.
  if (!fullScanCompleted) {
    errors.push({
      context: "deactivateMissing",
      message:
        "Sayfalama tam tamamlanmadı; güvenlik nedeniyle deactivateMissing atlandı (catalog kısmen okundu).",
    });
    return;
  }

  // 3a. Failsafe: önceki tur ile karşılaştır. Eğer mevcut DB'deki ürün sayısı
  // yeni gelen seen'in 2 katından fazlaysa (yani %50'den fazla "kayıp"),
  // bunu mass-deactivation tehlikesi say ve atla. Eşik 10'dan az ürün için
  // uygulanmaz (yeni kurulum / küçük katalog).
  try {
    const existingRows = await storage.getMarketplaceProducts(mp.id);
    const existingCount = existingRows.length;
    if (existingCount >= 10 && seen.size * 2 < existingCount) {
      errors.push({
        context: "deactivateMissing",
        message: `Şüpheli kayıp tespit edildi (gelen=${seen.size}, mevcut=${existingCount}). Mass-deactivation atlandı; bir sonraki tarama tekrar denenecek.`,
      });
      return;
    }
    await deactivateMissing(mp.id, seen, stats);
  } catch (err) {
    errors.push({
      context: "deactivateMissing",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function runDeltaSync(
  mp: Marketplace,
  adapter: MarketplaceAdapter,
  stats: SyncStats,
  errors: SyncErrorEntry[],
): Promise<void> {
  const rows = await storage.getMarketplaceProducts(mp.id);
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.externalId);
  // Trendyol'da batch endpoint yok — adapter sayfa tarayıp filtreler.
  let snapshots;
  try {
    snapshots = await adapter.fetchStockAndPrice(ids);
  } catch (err) {
    errors.push({
      context: "fetchStockAndPrice",
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const byExt = new Map(snapshots.map((s) => [s.externalId, s]));
  for (const row of rows) {
    if (!row.productId) continue;
    const snap = byExt.get(row.externalId);
    if (!snap) continue;
    try {
      const p = await storage.getProduct(row.productId);
      if (!p) continue;
      const newPrice = snap.basePrice.toFixed(2);
      const isActiveChanged = p.isActive !== snap.isActive;
      const priceChanged = String(p.basePrice) !== newPrice;
      if (priceChanged || isActiveChanged) {
        await storage.updateProduct(row.productId, {
          basePrice: newPrice,
          isActive: snap.isActive,
        });
        stats.productsUpdated += 1;
        if (snap.isActive && !p.isActive) stats.productsReactivated += 1;
        if (!snap.isActive && p.isActive) stats.productsDeactivated += 1;
      }
      // Varyant düzeyinde stok güncellemesi.
      // Eşleştirme önceliği:
      //   1) snap.variants[i].sku  ↔  productVariants.sku
      //   2) snap.variants[i].barcode ↔ productVariants.sku (Trendyol bazen
      //      stockCode yerine sadece barcode'u SKU gibi kullanır)
      //   3) Tek varyantlı ürün → o tek varyanta uygula
      //   4) Hiçbiri tutmazsa: tek varyant + tek snapshot ise totalStock'u uygula
      const variants = await storage.getProductVariants(row.productId);
      const snapVariants = snap.variants ?? [];
      let stockApplied = false;

      // Full sync `${type}:${rawSku}` formatında yazıyor — delta da aynı prefix'le
      // arasın. Geriye dönük uyum için prefix'siz halini de fallback olarak kontrol et.
      const skuPrefix = `${mp.type}:`;
      for (const v of snapVariants) {
        let target: typeof variants[number] | undefined;
        const rawKey = v.sku ?? v.barcode ?? null;
        if (rawKey) {
          const prefixedKey = `${skuPrefix}${rawKey}`;
          target =
            variants.find((existing) => existing.sku === prefixedKey) ??
            variants.find((existing) => existing.sku === rawKey);
        }
        if (!target && variants.length === 1) {
          target = variants[0];
        }
        if (target) {
          await storage.updateProductVariant(target.id, {
            price: v.price.toFixed(2),
            stock: v.stock,
          });
          stockApplied = true;
          stats.variantsUpdated += 1;
        } else {
          stats.variantsUnmatched += 1;
        }
      }

      // Fallback: snapshot variants vermediyse veya hiç eşleşme olmadıysa,
      // tek varyantlı ürünlerde totalStock'u doğrudan uygula. Bu sayede
      // hourly delta job, en az tek-SKU vakalarda stok güncellemesini
      // garanti eder (acceptance: "fiyat/stok 1 saat içinde yansır").
      if (!stockApplied && variants.length === 1) {
        await storage.updateProductVariant(variants[0].id, {
          price: snap.basePrice.toFixed(2),
          stock: snap.totalStock,
        });
        stats.variantsUpdated += 1;
      }
    } catch (err) {
      errors.push({
        context: `delta ${row.externalId}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

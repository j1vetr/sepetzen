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
import { MarketplaceHttpClient } from "../http";
import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceConfig,
  MarketplaceType,
  MarketplaceError,
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
 * SyncStats — sync sırasında biriken canlı sayım/dize alanları.
 *
 * Önceden `[k: string]: number` index signature'ı vardı ama "currentProductName"
 * gibi string alanlar gerekince bu çıkarıldı. Storage tarafı `Record<string, unknown>`
 * kabul ediyor, bu yüzden cast'siz geçer.
 */
interface SyncStats {
  // Sayısal counter'lar
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
  /** İndirme sırasında patlayıp atlanan görsel sayısı (404, SSRF, format vb.). */
  imagesFailed: number;
  pagesProcessed: number;
  /** Canlı ilerleme — şu ana kadar işlenmiş ürün sayısı. */
  processedTotal: number;
  /** Canlı ilerleme — beklenen toplam ürün sayısı (adapter veya tahmin). */
  expectedTotal: number;
  /** HTTP retry sayacı — http.ts onRetry callback ile artar. */
  retriedRequests: number;
  /** Retry sonrası başarıyla dönen istek sayısı — onRecover callback ile artar. */
  recoveredRequests: number;
  /** Bu sync'te kategori ağacı snapshot'ından eşleşen leaf sayısı (debug/UX). */
  categoriesCachedFromTree: number;
  // Live UI alanları (string / nullable)
  /** Şu an işlenmekte olan ürün adı (UI marquee). */
  currentProductName?: string;
  /** Şu an okunmakta olan sayfa indeksi (0-based). */
  currentPage?: number;
}

interface SyncErrorEntry {
  context: string;
  message: string;
  /** İsteğe bağlı: kategorize edilmiş HTTP status — error grouping için. */
  statusCode?: number;
  /** İsteğe bağlı: hata kategorisi (network/parse/...). Otomatik tespit için klasik hata mesajı kullanılır. */
  kind?: ErrorKind;
}

type ErrorKind = "http4xx" | "http5xx" | "network" | "parse" | "other";

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
    imagesFailed: 0,
    pagesProcessed: 0,
    processedTotal: 0,
    expectedTotal: 0,
    retriedRequests: 0,
    recoveredRequests: 0,
    categoriesCachedFromTree: 0,
  };
}

/**
 * Bir Error/MarketplaceError kaydını gruba sokar.
 * - statusCode varsa 4xx / 5xx kullan.
 * - mesajda timeout/abort/ECONN/ENOTFOUND/socket → network
 * - JSON.parse / SyntaxError / Unexpected token → parse
 * - aksi → other
 */
function classifyError(err: unknown, statusCodeHint?: number): ErrorKind {
  const status =
    statusCodeHint ?? (err instanceof MarketplaceError ? err.statusCode : undefined);
  if (typeof status === "number") {
    if (status >= 400 && status < 500) return "http4xx";
    if (status >= 500 && status < 700) return "http5xx"; // 556 dahil
  }
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  if (/abort|timeout|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up|network/i.test(msg)) {
    return "network";
  }
  if (/SyntaxError|JSON\.parse|Unexpected token|Unexpected end of JSON/i.test(msg)) {
    return "parse";
  }
  return "other";
}

/** Bir SyncErrorEntry zaten kind taşımıyorsa, mesajından çıkar. */
function ensureClassified(entry: SyncErrorEntry): Required<Pick<SyncErrorEntry, "kind">> & SyncErrorEntry {
  if (entry.kind) return entry as Required<Pick<SyncErrorEntry, "kind">> & SyncErrorEntry;
  // Status'u mesajdan tahmin et: "(429)" veya "Marketplace upstream 503:" gibi
  let status: number | undefined = entry.statusCode;
  if (!status) {
    const m = entry.message.match(/\((\d{3})\)|(?:upstream|failed)\s+(\d{3})/i);
    if (m) status = Number(m[1] ?? m[2]);
  }
  const kind = classifyError(entry.message, status);
  return { ...entry, kind, statusCode: status } as Required<Pick<SyncErrorEntry, "kind">> & SyncErrorEntry;
}

/** errors[] -> errorSummary jsonb'ı üret (her gruptan max 5 örnek). */
function buildErrorSummary(
  errors: SyncErrorEntry[],
  imagesFailed: number,
): Record<ErrorKind, { count: number; samples: string[] }> & { imagesFailed: number } {
  const groups: Record<ErrorKind, { count: number; samples: string[] }> = {
    http4xx: { count: 0, samples: [] },
    http5xx: { count: 0, samples: [] },
    network: { count: 0, samples: [] },
    parse: { count: 0, samples: [] },
    other: { count: 0, samples: [] },
  };
  for (const e of errors) {
    const c = ensureClassified(e);
    const g = groups[c.kind];
    g.count += 1;
    if (g.samples.length < 5) {
      g.samples.push(`${c.context}: ${c.message}`.slice(0, 300));
    }
  }
  return Object.assign(groups, { imagesFailed });
}

/**
 * Canlı ilerleme yazıcı — kart UI'sındaki progress bar için stats jsonb'ı
 * periyodik olarak günceller. Hata yutar (best-effort): bir DB hıçkırığı
 * tüm sync'i öldürmemeli.
 */
async function publishProgress(
  runId: string,
  stats: SyncStats,
): Promise<void> {
  try {
    // SyncStats interface'i index signature taşımaz; storage Record<string, unknown>
    // bekliyor. Yapısal olarak uyumlu — spread ile genişletip cast'liyoruz.
    await storage.updateSyncRunStats(runId, { ...stats } as Record<string, unknown>);
  } catch (err) {
    console.warn(
      `[marketplaces] live progress write failed for run ${runId}:`,
      err instanceof Error ? err.message : err,
    );
  }
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
  /**
   * Sync süresince paylaşılan URL → indirilmiş sonuç cache'i. Aynı görsel
   * URL'i farklı ürünlerde tekrar gelirse (Trendyol kataloğunda yaygın),
   * downloadImage'i tekrar çağırmadan cache'ten döner. Sync arası persist
   * değildir; sadece tek bir runFullSync süresinde geçerlidir.
   */
  urlCache?: Map<string, { relativePath: string; hash: string } | null>,
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
        let downloaded: { relativePath: string; hash: string } | null;
        if (urlCache && urlCache.has(img.url)) {
          downloaded = urlCache.get(img.url) ?? null;
        } else {
          downloaded = await downloadImage(img.url);
          if (urlCache) urlCache.set(img.url, downloaded);
        }
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
        // Görsel indirme/optimize hatası — sync'i öldürmez, ürün indirilen
        // diğer görselleriyle devam eder. imagesFailed counter UI'da
        // "X görsel atlandı" rozeti olarak gösterilir.
        stats.imagesFailed += 1;
        const status = err instanceof MarketplaceError ? err.statusCode : undefined;
        errors.push({
          context: `${ctx} image ${img.url}`,
          message: err instanceof Error ? err.message : String(err),
          statusCode: status,
          kind: classifyError(err, status),
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

/**
 * Kategori upsert — Trendyol kategorisi → Polen Stone kategorisi.
 *
 * `cameFromTree=true` ise externalName güvenilir leaf adıdır. Bu durumda mevcut
 * mapping admin tarafından elle yönetiliyorsa korunur; aksi halde (auto-create
 * izi taşıyorsa = mevcut site kategorisi adı eski mapping.name ile eşit) snapshot
 * leaf adına göre yeniden eşlenir. Bu, daha önce yanlışlıkla tek bir parent
 * kategoriye ("Saksı" gibi) toplanmış stale mapping'leri kendi kendine onarır.
 */
async function ensureSiteCategory(
  marketplaceId: string,
  externalId: string,
  externalName: string,
  cache: Map<string, string>,
  stats: SyncStats,
  fullPath: string | null = null,
  cameFromTree: boolean = false,
): Promise<string | null> {
  if (cache.has(externalId)) return cache.get(externalId)!;

  const mapping = await storage.getMarketplaceCategoryByExternal(marketplaceId, externalId);

  if (mapping?.siteCategoryId) {
    // Mapping var → admin elle eşlemiş mi yoksa eski auto-create mi?
    // Auto-create izi: mapping satırının kendi `name`'i, işaret ettiği site
    // kategorisinin `name`'i ile eşit. Admin elle eşleseydi adlar genellikle
    // farklı olurdu (mapping name = pazaryeri leaf, site name = farklı).
    let isAutoCreated = false;
    let needsRemap = false;
    if (cameFromTree && mapping.name !== externalName) {
      // Tree'den gelen leaf adı eski mapping.name ile aynı değilse, mapping
      // muhtemelen eski yanlış davranıştan (parent adı leaf sanılarak) kalma.
      const currentSiteCat = await storage.getCategory(mapping.siteCategoryId);
      isAutoCreated = !!currentSiteCat && currentSiteCat.name === mapping.name;
      needsRemap = isAutoCreated;
    }
    if (!needsRemap) {
      cache.set(externalId, mapping.siteCategoryId);
      // Mapping korunuyor ama tree'den daha güncel bir name/fullPath geldiyse
      // metadata'yı güncelle (siteCategoryId ezilmez).
      if (cameFromTree && (mapping.name !== externalName || mapping.fullPath !== fullPath)) {
        await storage.upsertMarketplaceCategoryMapping(
          marketplaceId,
          externalId,
          externalName,
          mapping.parentExternalId ?? null,
          mapping.siteCategoryId,
          fullPath,
        );
      }
      return mapping.siteCategoryId;
    }
    // needsRemap → aşağıdaki auto-create akışına düş (yeni leaf adıyla site
    // kategorisi bul/yarat ve mapping'i güncelle). Eski auto-create site
    // kategorisi orphan kalabilir; UI zaten 200+ display_order'da gizliyor.
  }

  // Henüz eşlenmemiş veya remap gerekiyor → leaf adıyla bir Polen Stone
  // kategorisi bul (slug eşleşirse var olanı kullan), yoksa yarat (200+).
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
    fullPath,
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
  imageUrlCache?: Map<string, { relativePath: string; hash: string } | null>,
): Promise<void> {
  const ctx = `[${marketplace.type}] ${np.name} (${np.externalId})`;

  // İçerik hash'i değişmediyse fast-path. ANCAK iki şeyi reconcile et:
  //   (a) isActive: pazaryeri "aktif" diyor ama site soft-deactivated ise
  //       (önceki tarama yetimlemişti, ürün geri geldi) — reactivate.
  //   (b) categoryId: admin sonradan kategori eşlemesini değiştirmiş olabilir;
  //       contentHash bunu içermez (np.externalCategoryId üründe değişmez),
  //       o yüzden mapping → siteCategoryId değiştiyse ürünü taşı.
  const newHash = contentHash(np);
  if (existingMpRow?.contentHash === newHash && existingMpRow.productId) {
    const current = await storage.getProduct(existingMpRow.productId);
    if (current) {
      const patch: Partial<InsertProduct> = {};
      if (current.isActive !== np.isActive) patch.isActive = np.isActive;
      if (current.categoryId !== siteCategoryId) patch.categoryId = siteCategoryId;
      if (Object.keys(patch).length > 0) {
        await storage.updateProduct(current.id, patch);
        stats.productsUpdated += 1;
        if (patch.isActive === true && !current.isActive) stats.productsReactivated += 1;
        if (patch.isActive === false && current.isActive) stats.productsDeactivated += 1;
        await storage.upsertMarketplaceProduct({
          marketplaceId: marketplace.id,
          externalId: np.externalId,
          externalProductCode: np.externalProductCode ?? null,
          productId: current.id,
          imageHashes: existingMpRow.imageHashes ?? [],
          contentHash: newHash,
        });
      }
    }
    return;
  }

  // Görselleri indir / dedupe
  const known = existingMpRow?.imageHashes ?? [];
  const { images, hashes } = await syncImages(np, known, stats, errors, ctx, imageUrlCache);

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
        color: v.color?.name ?? "-",
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
 * Adapter'ın iç HTTP client'larını yakalayıp retry/recover sayaçlarını
 * stats'a bağlar. Adapter implementasyonu MarketplaceHttpClient instance'ını
 * `client` field'ında tutar (Trendyol bunu yapar). Field yoksa sessiz no-op.
 */
function attachHttpMetrics(adapter: MarketplaceAdapter, stats: SyncStats): void {
  // Adapter sözleşmesinde public field değil; ama tüm built-in adapter'lar bu konvansiyonu
  // izliyor. `as any` reflection — telemetri opsiyonel olduğu için risksiz.
  const client = (adapter as unknown as { client?: MarketplaceHttpClient }).client;
  if (!client || typeof client.setMetrics !== "function") return;
  client.setMetrics({
    onRetry: () => {
      stats.retriedRequests += 1;
    },
    onRecover: () => {
      stats.recoveredRequests += 1;
    },
  });
}

const CATEGORY_TREE_TTL_MS = 60 * 60 * 1000; // 1 saat

/**
 * Kategori ağacını "1 saatlik" snapshot olarak DB'de tutar.
 * - categoryTreeFetchedAt > 1 saat eski (veya null) → adapter.fetchCategoryTree
 *   çağrılır, fullPath hesaplanır, marketplaceCategories'e bulk upsert edilir.
 * - Aksi halde DB'deki snapshot okunur ve döndürülür.
 *
 * @returns externalId → { name, fullPath } cache + isFresh (bu çağrıda ağ tazelendi mi)
 */
async function loadOrRefreshCategoryTree(
  mp: Marketplace,
  adapter: MarketplaceAdapter,
  stats: SyncStats,
  errors: SyncErrorEntry[],
): Promise<{ map: Map<string, { name: string; fullPath: string | null }>; isFresh: boolean }> {
  const fetchedAt = await storage.getCategoryTreeFetchedAt(mp.id);
  const stale =
    fetchedAt == null || Date.now() - fetchedAt.getTime() > CATEGORY_TREE_TTL_MS;
  let isFresh = false;

  if (stale) {
    try {
      const tree = await adapter.fetchCategoryTree();
      const withPath = computeFullPaths(tree);
      const result = await storage.bulkUpsertCategoryTree(mp.id, withPath);
      stats.categoriesAdded += result.inserted;
      stats.categoriesUpdated += result.updated;
      await storage.setCategoryTreeFetchedAt(mp.id, new Date());
      isFresh = true;
    } catch (err) {
      // Cache yenileme başarısız → eldeki snapshot'la devam et. Önemli: hata
      // sync'i öldürmez, errors[]'a yazılır ve UI'da "kategori cache yenilenemedi"
      // banner'ı gösterilir.
      const status = err instanceof MarketplaceError ? err.statusCode : undefined;
      errors.push({
        context: "categoryTree.refresh",
        message: err instanceof Error ? err.message : String(err),
        statusCode: status,
        kind: classifyError(err, status),
      });
    }
  }

  // DB'den tüm kategori satırlarını oku → lookup map.
  const rows = await storage.getMarketplaceCategories(mp.id);
  const map = new Map<string, { name: string; fullPath: string | null }>();
  for (const r of rows) {
    map.set(r.externalId, { name: r.name, fullPath: r.fullPath ?? null });
  }
  return { map, isFresh };
}

/** Tree'yi tarayıp her node için "Anne > Çocuk > Torun" şeklinde fullPath üretir. */
function computeFullPaths(
  tree: NormalizedCategory[],
): Array<{
  externalId: string;
  name: string;
  parentExternalId: string | null;
  fullPath: string;
}> {
  const byId = new Map(tree.map((n) => [n.externalId, n]));
  const out: Array<{
    externalId: string;
    name: string;
    parentExternalId: string | null;
    fullPath: string;
  }> = [];
  for (const n of tree) {
    const parts: string[] = [];
    let cursor: NormalizedCategory | undefined = n;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor.externalId)) break; // siklik koruma
      visited.add(cursor.externalId);
      parts.unshift(cursor.name);
      const parentId = cursor.parentExternalId;
      if (!parentId) break;
      cursor = byId.get(parentId);
    }
    out.push({
      externalId: n.externalId,
      name: n.name,
      parentExternalId: n.parentExternalId ?? null,
      fullPath: parts.join(" > "),
    });
  }
  return out;
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
    const initErr: SyncErrorEntry = {
      context: "adapter.init",
      message: err instanceof Error ? err.message : String(err),
      kind: "other",
    };
    return await storage.completeSyncRun(run.id, {
      status: "failed",
      stats: { ...stats } as Record<string, unknown>,
      errors: [initErr],
      errorSummary: buildErrorSummary([initErr], 0),
    });
  }

  // Adapter'ın HTTP client'ına retry/recover metrics callback'lerini bağla.
  // (Reflection — adapter sözleşmesi opsiyonel telemetri için yumuşak.)
  attachHttpMetrics(adapter, stats);

  try {
    if (mode === "full") {
      await runFullSync(mp, adapter, stats, errors, run.id);
    } else {
      await runDeltaSync(mp, adapter, stats, errors, run.id);
    }

    const status = errors.length === 0 ? "completed" : "partial";
    const updated = await storage.completeSyncRun(run.id, {
      status,
      stats: { ...stats } as Record<string, unknown>,
      errors: errors.slice(0, 100),
      errorSummary: buildErrorSummary(errors, stats.imagesFailed),
    });
    if (mode === "full") await storage.updateMarketplaceSyncTime(marketplaceId, "full");
    else await storage.updateMarketplaceSyncTime(marketplaceId, "delta");
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof MarketplaceError ? err.statusCode : undefined;
    errors.push({
      context: "sync.fatal",
      message,
      statusCode: status,
      kind: classifyError(err, status),
    });
    return await storage.completeSyncRun(run.id, {
      status: "failed",
      stats: { ...stats } as Record<string, unknown>,
      errors: errors.slice(0, 100),
      errorSummary: buildErrorSummary(errors, stats.imagesFailed),
    });
  }
}

async function runFullSync(
  mp: Marketplace,
  adapter: MarketplaceAdapter,
  stats: SyncStats,
  errors: SyncErrorEntry[],
  runId: string,
): Promise<void> {
  // İlk tahmin: önceki tarama sonucu mevcut katalog büyüklüğü.
  // Adapter ilk sayfayı döndürene kadar bar bu sayıya göre çalışır;
  // sonra resp.total ile değiştirilir.
  try {
    const existingRows = await storage.getMarketplaceProducts(mp.id);
    if (existingRows.length > 0) {
      stats.expectedTotal = existingRows.length;
      await publishProgress(runId, stats);
    }
  } catch {
    /* tahmin opsiyonel — sessiz geç */
  }

  // 1. Kategori ağacını snapshot'la (1 saatlik TTL). Bu, ürün payload'ındaki
  //    `categoryName`'in sıkça leaf değil parent olduğu durumda DB'den doğru
  //    leaf adını + fullPath'i lookup edebilmek için. Snapshot başarısız olsa
  //    bile DB'deki eski snapshot kullanılır; hiç snapshot yoksa payload adına
  //    düşeriz (eski davranış).
  const treeCache = await loadOrRefreshCategoryTree(mp, adapter, stats, errors);

  // 2. Sayfa sayfa ürünleri çek
  const seen = new Set<string>();
  const catCache = new Map<string, string>();
  // Sync süresince paylaşılan görsel URL → indirme sonucu cache'i. Aynı görsel
  // URL'i farklı ürünlerde tekrar geçtiğinde downloadImage'i atlatır
  // (network/disk tasarrufu). Sync arası persist DEĞİL — sadece bu run.
  const imageUrlCache = new Map<string, { relativePath: string; hash: string } | null>();
  let cursor: PageCursor = null;
  let page = 0;
  // Bu bayrak deactivateMissing'in kararını yönetir: yalnız tüm sayfalar
  // başarıyla okunduysa "missing = orphan" varsayımı güvenlidir. Aksi halde
  // bir sayfa hatası tüm kataloğun deactive edilmesine yol açabilir.
  let fullScanCompleted = false;
  while (true) {
    stats.currentPage = page;
    let resp: ProductsPage;
    try {
      resp = await adapter.fetchProductsPage(cursor);
    } catch (err) {
      const status = err instanceof MarketplaceError ? err.statusCode : undefined;
      errors.push({
        context: `fetchProductsPage page=${page}`,
        message: err instanceof Error ? err.message : String(err),
        statusCode: status,
        kind: classifyError(err, status),
      });
      break;
    }
    stats.pagesProcessed += 1;
    // Adapter total verdiyse, expectedTotal'ı buna sabitle.
    if (typeof resp.total === "number" && resp.total >= 0) {
      stats.expectedTotal = resp.total;
    } else if (stats.processedTotal + resp.products.length > stats.expectedTotal) {
      // Total bilinmiyor: alt sınır olarak şimdiye kadar gördüklerimizi kullan.
      stats.expectedTotal = stats.processedTotal + resp.products.length;
    }
    let processedSinceFlush = 0;
    for (const np of resp.products) {
      seen.add(np.externalId);
      stats.currentProductName = np.name;
      try {
        // Kategori adı önceliği (yeni):
        //   1) Snapshot'tan leaf — `treeCache.map[externalCategoryId]` (en güvenilir).
        //   2) Ürünün kendi payload'ı (`externalCategoryName`) — leaf olmayabilir
        //      (Trendyol bazen parent adı veriyor; bu durumda snapshot kazanır).
        //   3) Daha önce upsert edilmiş marketplace_categories satırı.
        //   4) "Genel" — hiçbiri yoksa.
        const treeHit = treeCache.map.get(np.externalCategoryId);
        let categoryName: string | null = treeHit?.name ?? null;
        let categoryFullPath: string | null = treeHit?.fullPath ?? null;
        if (treeHit) stats.categoriesCachedFromTree += 1;
        if (!categoryName) categoryName = np.externalCategoryName ?? null;
        if (!categoryName) {
          const existingMapping = await storage.getMarketplaceCategoryByExternal(
            mp.id,
            np.externalCategoryId,
          );
          categoryName = existingMapping?.name ?? "Genel";
          categoryFullPath = categoryFullPath ?? existingMapping?.fullPath ?? null;
        }
        // cameFromTree=true: leaf adı snapshot'tan geldi → ensureSiteCategory
        // stale auto-mapping'leri (ör. tüm ürünler "Saksı"ya pin'lenmiş) kendi
        // kendine onarsın. Tree miss olduğunda payload adına güveniyoruz ama
        // remap riski almıyoruz (admin override'larını kaybetmemek için).
        const finalCatId = await ensureSiteCategory(
          mp.id,
          np.externalCategoryId,
          categoryName,
          catCache,
          stats,
          categoryFullPath,
          treeHit !== undefined,
        );
        if (!finalCatId) continue;
        const mpRow = await storage.getMarketplaceProductByExternal(mp.id, np.externalId);
        await upsertProduct(mp, np, finalCatId, mpRow, stats, errors, imageUrlCache);
      } catch (err) {
        const status = err instanceof MarketplaceError ? err.statusCode : undefined;
        errors.push({
          context: `product ${np.externalId}`,
          message: err instanceof Error ? err.message : String(err),
          statusCode: status,
          kind: classifyError(err, status),
        });
      } finally {
        stats.processedTotal += 1;
        processedSinceFlush += 1;
        // 10 üründe bir canlı ilerlemeyi yayımla (sayfa içi de görünsün).
        if (processedSinceFlush >= 10) {
          await publishProgress(runId, stats);
          processedSinceFlush = 0;
        }
      }
    }
    // Sayfa tamamlanınca son ilerleme snapshot'ı.
    await publishProgress(runId, stats);
    if (resp.nextCursor == null) {
      fullScanCompleted = true;
      break;
    }
    cursor = resp.nextCursor;
    page += 1;
    if (page > 1000) break; // sonsuz loop koruması; full scan kabul EDİLMEZ
  }
  // Sync sonu — current* alanlarını temizle ki UI'da takılı kalmasın.
  delete stats.currentProductName;
  delete stats.currentPage;

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
  runId: string,
): Promise<void> {
  const rows = await storage.getMarketplaceProducts(mp.id);
  if (rows.length === 0) return;
  // Delta için beklenen toplam = mevcut köprü satırı sayısı (her satır
  // bir snapshot'a bakılıp güncellenmeyi dener).
  stats.expectedTotal = rows.length;
  await publishProgress(runId, stats);
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
  let processedSinceFlush = 0;
  for (const row of rows) {
    // Bu satır da işlenmiş sayılır; köprüde productId yoksa atla ama bar ilerlesin.
    stats.processedTotal += 1;
    processedSinceFlush += 1;
    if (processedSinceFlush >= 25) {
      await publishProgress(runId, stats);
      processedSinceFlush = 0;
    }
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

import { storage, db } from "./storage";
import { productVariants } from "@shared/schema";
import { cache } from "./cache";

/**
 * Google Merchant Center (Google Shopping) RSS 2.0 ürün beslemesi.
 *
 * - Yalnızca aktif ürünler ve aktif varyantlar akışa girer.
 * - Varyantlı ürünler her varyant için ayrı <item> üretir ve g:item_group_id ile gruplanır.
 * - Fiyatlar KDV dahil TRY olarak "1234.00 TRY" biçiminde verilir.
 * - GTIN/MPN bulunmadığı için g:identifier_exists=no gönderilir.
 */

export const GOOGLE_MERCHANT_FEED_PATH = "/google-merchant.xml";

const FEED_CACHE_KEY = "feed:google-merchant";
const FEED_CACHE_TTL = 30 * 60 * 1000; // 30 dakika

const DEFAULT_SITE_URL = "https://sepetzen.com";
const DEFAULT_BRAND = "Sepetzen";

export interface GoogleMerchantSettings {
  enabled: boolean;
  brand: string;
  googleProductCategory: string;
  includeOutOfStock: boolean;
  siteUrl: string;
}

function normalizeSiteUrl(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return DEFAULT_SITE_URL;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

export async function getGoogleMerchantSettings(): Promise<GoogleMerchantSettings> {
  const settings = await storage.getSiteSettings();
  return {
    enabled: settings.google_merchant_enabled === "true",
    brand: (settings.google_merchant_brand || "").trim() || (settings.site_name || "").trim() || DEFAULT_BRAND,
    googleProductCategory: (settings.google_merchant_category || "").trim(),
    includeOutOfStock: settings.google_merchant_include_out_of_stock === "true",
    siteUrl: normalizeSiteUrl(settings.site_url),
  };
}

export function invalidateGoogleMerchantFeedCache(): void {
  cache.delete(FEED_CACHE_KEY);
}

function escapeXml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** XML 1.0'da geçersiz olan kontrol karakterlerini temizler */
function stripInvalidXmlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(maybePath: string | null | undefined, siteUrl: string): string {
  if (!maybePath) return "";
  const trimmed = String(maybePath).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${siteUrl}${trimmed}`;
  return `${siteUrl}/${trimmed}`;
}

function formatPriceTRY(value: string | number | null | undefined): string | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toFixed(2)} TRY`;
}

function tag(name: string, value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const clean = stripInvalidXmlChars(String(value)).trim();
  if (!clean) return null;
  return `    <${name}>${escapeXml(clean)}</${name}>`;
}

interface FeedItemInput {
  id: string;
  title: string;
  description: string;
  link: string;
  mainImage: string;
  additionalImages: string[];
  price: string;
  availability: "in_stock" | "out_of_stock";
  brand: string;
  productType: string;
  googleProductCategory: string;
  itemGroupId?: string;
  size?: string | null;
  color?: string | null;
}

function renderItem(item: FeedItemInput): string {
  const lines: (string | null)[] = [
    "  <item>",
    tag("g:id", item.id),
    tag("title", item.title.slice(0, 150)),
    tag("description", item.description.slice(0, 5000)),
    tag("link", item.link),
    tag("g:image_link", item.mainImage),
    ...item.additionalImages.slice(0, 10).map((url) => tag("g:additional_image_link", url)),
    tag("g:availability", item.availability),
    tag("g:condition", "new"),
    tag("g:price", item.price),
    tag("g:brand", item.brand),
    tag("g:identifier_exists", "no"),
    tag("g:google_product_category", item.googleProductCategory || null),
    tag("g:product_type", item.productType || null),
    tag("g:item_group_id", item.itemGroupId || null),
    tag("g:size", item.size || null),
    tag("g:color", item.color || null),
    "  </item>",
  ];
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export interface GoogleMerchantFeedResult {
  xml: string;
  itemCount: number;
  productCount: number;
}

export async function buildGoogleMerchantFeed(
  settings: GoogleMerchantSettings,
): Promise<GoogleMerchantFeedResult> {
  const [allProducts, allCategories, allVariants] = await Promise.all([
    storage.getAllProducts(),
    storage.getCategories(),
    db.select().from(productVariants),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  const variantsByProduct = new Map<string, typeof allVariants>();
  for (const v of allVariants) {
    if (!v.isActive) continue;
    const list = variantsByProduct.get(v.productId);
    if (list) list.push(v);
    else variantsByProduct.set(v.productId, [v]);
  }

  const siteUrl = settings.siteUrl;
  const items: string[] = [];
  const usedIds = new Set<string>();
  let productCount = 0;

  for (const p of allProducts) {
    if (!p.isActive) continue;

    const images = (Array.isArray(p.images) ? p.images : [])
      .map((img) => absoluteUrl(img, siteUrl))
      .filter(Boolean);
    // Görseli olmayan ürünler Google tarafından reddedilir; akışa hiç koymuyoruz.
    if (images.length === 0) continue;

    const mainImage = images[0];
    const additionalImages = images.slice(1);

    const category = p.categoryId ? categoryById.get(p.categoryId) : undefined;
    const productType = category?.name ? category.name : "";
    const link = `${siteUrl}/urun/${p.slug}`;
    const title = (p.name || "").trim();
    if (!title) continue;
    const description = stripHtml(p.description) || title;
    const brand = (p.brand || "").trim() || settings.brand;
    const baseId = (p.sku && p.sku.trim()) || p.id;

    const variants = variantsByProduct.get(p.id) ?? [];
    const groupItems: FeedItemInput[] = [];

    if (variants.length > 0) {
      const hasVariantAxis = variants.length > 1 || variants.some((v) => v.size || v.color);
      for (const v of variants) {
        const price = formatPriceTRY(v.price) ?? formatPriceTRY(p.basePrice);
        if (!price) continue;
        const availability: "in_stock" | "out_of_stock" = (v.stock ?? 0) > 0 ? "in_stock" : "out_of_stock";
        if (availability === "out_of_stock" && !settings.includeOutOfStock) continue;
        const variantId = (v.sku && v.sku.trim()) || `${baseId}-${v.id}`;
        const variantTitleParts = [title, v.size, v.color].filter(Boolean) as string[];
        groupItems.push({
          id: variantId,
          title: hasVariantAxis ? variantTitleParts.join(" - ") : title,
          description,
          link,
          mainImage,
          additionalImages,
          price,
          availability,
          brand,
          productType,
          googleProductCategory: settings.googleProductCategory,
          itemGroupId: hasVariantAxis ? baseId : undefined,
          size: v.size,
          color: v.color,
        });
      }
    } else {
      const price = formatPriceTRY(p.basePrice);
      if (!price) continue;
      // Varyantı olmayan ürünlerde stok bilgisi yoktur; satışa açık kabul edilir.
      groupItems.push({
        id: baseId,
        title,
        description,
        link,
        mainImage,
        additionalImages,
        price,
        availability: "in_stock",
        brand,
        productType,
        googleProductCategory: settings.googleProductCategory,
      });
    }

    if (groupItems.length === 0) continue;
    productCount += 1;

    for (const item of groupItems) {
      // Aynı g:id iki kez gönderilirse Google akışı reddeder
      let uniqueId = item.id;
      let suffix = 2;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${item.id}-${suffix++}`;
      }
      usedIds.add(uniqueId);
      items.push(renderItem({ ...item, id: uniqueId }));
    }
  }

  const feedTitle = `${settings.brand} - Ürün Kataloğu`;
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(stripInvalidXmlChars(feedTitle))}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(stripInvalidXmlChars(`${settings.brand} Google Merchant Center ürün beslemesi`))}</description>`;

  const footer = `  </channel>
</rss>`;

  const xml = `${header}\n${items.join("\n")}\n${footer}\n`;
  return { xml, itemCount: items.length, productCount };
}

export async function getGoogleMerchantFeed(
  settings: GoogleMerchantSettings,
): Promise<GoogleMerchantFeedResult> {
  const cached = cache.get<GoogleMerchantFeedResult>(FEED_CACHE_KEY);
  if (cached) return cached;
  const result = await buildGoogleMerchantFeed(settings);
  cache.set(FEED_CACHE_KEY, result, FEED_CACHE_TTL);
  return result;
}

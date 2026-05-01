import { storage, db } from "./storage";
import { productVariants } from "@shared/schema";

const SITE_URL = "https://polenstone.com";
const BRAND_NAME = "Polen Stone";

function escapeXml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(maybePath: string | null | undefined): string {
  if (!maybePath) return "";
  const trimmed = String(maybePath).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${SITE_URL}${trimmed}`;
  return `${SITE_URL}/${trimmed}`;
}

function formatPriceTRY(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  if (!Number.isFinite(n)) return "0.00 TRY";
  return `${n.toFixed(2)} TRY`;
}

export async function buildMetaCatalogXml(): Promise<string> {
  const [allProducts, allCategories, allVariants] = await Promise.all([
    storage.getAllProducts(),
    storage.getCategories(),
    db.select().from(productVariants),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  // Toplam stok = ürünün tüm varyantlarının stok toplamı (sitedeki kuralla aynı)
  const totalStockByProduct = new Map<string, number>();
  for (const v of allVariants) {
    const prev = totalStockByProduct.get(v.productId) ?? 0;
    totalStockByProduct.set(v.productId, prev + (v.stock ?? 0));
  }

  const items: string[] = [];

  for (const p of allProducts) {
    if (!p.isActive) continue;

    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (images.length === 0) continue;

    // Stokta olmayan ürünleri akışa hiç koyma (sitedeki davranışla tutarlı)
    const totalStock = totalStockByProduct.get(p.id) ?? 0;
    if (totalStock <= 0) continue;

    const mainImage = absoluteUrl(images[0]);
    const additionalImages = images
      .slice(1, 11)
      .map(absoluteUrl)
      .filter(Boolean);

    const category = p.categoryId ? categoryById.get(p.categoryId) : undefined;
    const productType = category?.name ? `Doğal Taş > ${category.name}` : "Doğal Taş";

    const link = `${SITE_URL}/urun/${p.slug}`;
    const id = p.sku && p.sku.trim() ? p.sku.trim() : p.id;
    const title = (p.name || "").slice(0, 200);
    const descriptionRaw = stripHtml(p.description) || p.name || "";
    const description = descriptionRaw.slice(0, 5000);
    const price = formatPriceTRY(p.basePrice);

    const additionalImageTags = additionalImages
      .map((u) => `    <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`)
      .join("\n");

    const updatedAt = (p.updatedAt instanceof Date ? p.updatedAt : new Date()).toISOString();

    items.push(
      [
        "  <entry>",
        `    <g:id>${escapeXml(id)}</g:id>`,
        `    <title>${escapeXml(title)}</title>`,
        `    <link rel="alternate" href="${escapeXml(link)}" />`,
        `    <updated>${escapeXml(updatedAt)}</updated>`,
        `    <summary>${escapeXml(description.slice(0, 500))}</summary>`,
        `    <g:description>${escapeXml(description)}</g:description>`,
        `    <g:link>${escapeXml(link)}</g:link>`,
        `    <g:image_link>${escapeXml(mainImage)}</g:image_link>`,
        additionalImageTags,
        `    <g:availability>in stock</g:availability>`,
        `    <g:condition>new</g:condition>`,
        `    <g:price>${escapeXml(price)}</g:price>`,
        `    <g:brand>${escapeXml(BRAND_NAME)}</g:brand>`,
        `    <g:product_type>${escapeXml(productType)}</g:product_type>`,
        `    <g:identifier_exists>no</g:identifier_exists>`,
        "  </entry>",
      ]
        .filter((line) => line && line.length > 0)
        .join("\n"),
    );
  }

  const feedUpdated = new Date().toISOString();
  const feedSelf = `${SITE_URL}/feed/meta-catalog.xml`;

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>${escapeXml(BRAND_NAME)} - Ürün Kataloğu</title>
  <link rel="self" href="${escapeXml(feedSelf)}" />
  <link rel="alternate" href="${escapeXml(SITE_URL)}" />
  <updated>${escapeXml(feedUpdated)}</updated>
  <author><name>${escapeXml(BRAND_NAME)}</name></author>
  <id>${escapeXml(feedSelf)}</id>`;

  const footer = `</feed>`;

  return `${header}\n${items.join("\n")}\n${footer}\n`;
}

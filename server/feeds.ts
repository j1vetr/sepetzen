import { storage } from "./storage";

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
  const [allProducts, allCategories] = await Promise.all([
    storage.getAllProducts(),
    storage.getCategories(),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  const items: string[] = [];

  for (const p of allProducts) {
    if (!p.isActive) continue;

    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (images.length === 0) continue;

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
      .map((u) => `      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`)
      .join("\n");

    items.push(
      [
        "    <item>",
        `      <g:id>${escapeXml(id)}</g:id>`,
        `      <g:title>${escapeXml(title)}</g:title>`,
        `      <g:description>${escapeXml(description)}</g:description>`,
        `      <g:link>${escapeXml(link)}</g:link>`,
        `      <g:image_link>${escapeXml(mainImage)}</g:image_link>`,
        additionalImageTags,
        `      <g:availability>in stock</g:availability>`,
        `      <g:condition>new</g:condition>`,
        `      <g:price>${escapeXml(price)}</g:price>`,
        `      <g:brand>${escapeXml(BRAND_NAME)}</g:brand>`,
        `      <g:product_type>${escapeXml(productType)}</g:product_type>`,
        `      <g:identifier_exists>no</g:identifier_exists>`,
        "    </item>",
      ]
        .filter((line) => line && line.length > 0)
        .join("\n"),
    );
  }

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(BRAND_NAME)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Doğal Taş ve Mermer Ürün Kataloğu</description>`;

  const footer = `  </channel>
</rss>`;

  return `${header}\n${items.join("\n")}\n${footer}\n`;
}

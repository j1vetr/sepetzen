import { storage } from "./storage";

const BRAND_PATH = /^\/marka\/([^/?#]+)/;

export interface BrandSeo {
  title: string;
  description: string;
  path: string;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function getBrandSeo(url: string): Promise<BrandSeo | null> {
  const match = url.match(BRAND_PATH);
  if (!match) return null;

  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  const brand = await storage.getBrandBySlug(slug);
  if (!brand || !brand.isActive) return null;

  return {
    title: `${brand.name} Ürünleri | Sepetzen`,
    description: `${brand.name} ürünlerini Sepetzen'de keşfedin. ${brand.name} markasının kamp, outdoor ve bıçak koleksiyonunu inceleyin.`,
    path: `/marka/${encodeURIComponent(brand.slug)}`,
  };
}

export function applyBrandSeo(template: string, seo: BrandSeo, origin: string): string {
  const title = escapeAttribute(seo.title);
  const description = escapeAttribute(seo.description);
  const pageUrl = escapeAttribute(`${origin.replace(/\/+$/, "")}${seo.path}`);
  return template
    .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${description}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${pageUrl}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${pageUrl}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, `$1${description}$2`);
}
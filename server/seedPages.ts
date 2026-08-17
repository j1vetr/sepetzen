import { storage } from "./storage";
import { DEFAULT_PAGES } from "./defaultPages";
import { sanitizeStoredHtml } from "./htmlSanitize";

/**
 * Yasal/bilgi sayfalarini idempotent olarak tohumlar.
 *
 * - Yalnizca 'pages' tablosunda EKSIK olan slug'lar icin varsayilan icerikle
 *   yayinlanmis sayfa olusturur.
 * - Mevcut kayitlara (admin duzenlemeleri dahil) asla dokunmaz; icerigi bos
 *   veya yayindan kaldirilmis olsa bile mevcut kayit korunur.
 * - Tek bir sayfadaki hata digerlerini engellemez.
 */
export async function seedDefaultPages(): Promise<void> {
  let created = 0;
  for (const page of DEFAULT_PAGES) {
    try {
      const existing = await storage.getPageBySlug(page.slug);
      if (existing) continue;
      await storage.createPage({
        slug: page.slug,
        title: page.title,
        content: sanitizeStoredHtml(page.content),
        isPublished: true,
      });
      created++;
      console.log(`[seedPages] varsayilan sayfa olusturuldu: /sayfa/${page.slug}`);
    } catch (err) {
      console.error(`[seedPages] '${page.slug}' olusturulamadi:`, err);
    }
  }
  if (created > 0) {
    console.log(`[seedPages] toplam ${created} yasal/bilgi sayfasi tohumlandi`);
  }
}

// Ücretsiz kargo eşiği — tek merkezi fallback.
// Gerçek değer admin panelindeki `free_shipping_threshold` site ayarından okunur;
// bu sabit yalnızca ayar hiç yokken veya geçersizken devreye girer.
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 1500;

/** Eşiği Türkçe biçimde yazar: 1500 -> "1.500" */
export function formatShippingThreshold(threshold: number): string {
  return threshold.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

/**
 * "1500 TL ve Üzeri Ücretsiz Kargo!" veya "1.500 ₺ Üzeri Ücretsiz Kargo" gibi
 * ücretsiz kargo metinlerindeki eşik tutarını güncel ayara göre yeniden yazar.
 * Yalnızca hem "ücretsiz" hem "kargo" geçen metinlere dokunur ve öncelikle
 * "X TL/₺ (ve) üzeri" kalıbına bağlı tutarı hedefler; metinde birden fazla,
 * kalıba bağlı olmayan tutar varsa hiçbirine dokunmaz (ör. ayrı bir indirim tutarı).
 */
export function bindShippingThresholdText(text: string, threshold: number): string {
  if (!/ücretsiz/i.test(text) || !/kargo/i.test(text)) return text;
  const formatted = formatShippingThreshold(threshold);
  // "İ" (U+0130) i-flag ile "i" ile eşleşmediği için üzer[iİ] kullanılır.
  const anchored = /(\d[\d.,]*)\s*(₺|TL)(?=\s*(?:ve\s+)?(?:üzer[iİ]|üzer[iİ]nde|üstü))/gi;
  if (text.match(anchored)) {
    return text.replace(anchored, (_m, _amt, currency: string) => `${formatted} ${currency}`);
  }
  const amounts = text.match(/\d[\d.,]*\s*(₺|TL)/gi);
  if (amounts && amounts.length === 1) {
    return text.replace(/(\d[\d.,]*)\s*(₺|TL)/i, (_m, _amt, currency: string) => `${formatted} ${currency}`);
  }
  return text;
}

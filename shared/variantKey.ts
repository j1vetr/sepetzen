/**
 * Varyasyon değerlerini (renk, beden) büyük/küçük harf ve Türkçe karakter
 * farkını yok sayarak eşleştirmek için ortak anahtar.
 * "Yeşil", "YEŞİL" ve "yesil" aynı anahtarı üretir.
 */
export function foldVariantKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, " ");
}

const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl", "5xl"];

/** Beden sıralaması: harf bedenleri (S, M, L), sonra sayılar, sonra alfabetik. */
export function compareSizeNames(a: string, b: string): number {
  const ka = foldVariantKey(a);
  const kb = foldVariantKey(b);
  const ia = SIZE_ORDER.indexOf(ka);
  const ib = SIZE_ORDER.indexOf(kb);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  const na = parseFloat(ka.replace(",", "."));
  const nb = parseFloat(kb.replace(",", "."));
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum && na !== nb) return na - nb;
  if (aNum !== bNum) return aNum ? -1 : 1;
  return ka.localeCompare(kb, "tr");
}

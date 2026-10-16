interface SpecProduct {
  specs?: object | null;
  availableColors?: { name: string }[] | null;
}

/** Renk filtresi için ürün formundaki "renk seçenekleri" kullanılır. */
const COLOR_KEYS = new Set(['renk', 'color', 'colors', 'renkler']);

/** Bir filtre alanının ürün üzerindeki değerleri (renk için birden fazla olabilir). */
export function getSpecValues(p: SpecProduct, key: string): string[] {
  if (COLOR_KEYS.has(key.toLowerCase())) {
    return (p.availableColors ?? []).map((c) => c.name?.trim()).filter((n): n is string => !!n);
  }
  const val = (p.specs as Record<string, string | undefined> | null | undefined)?.[key];
  return val ? [val] : [];
}

/** Bitiş değeri "YYYY-MM-DDTHH:mm" ise tam o an, sadece tarih ise o günün sonu. */
export function parseDiscountEnd(endDate?: string | null): number | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return null;
  if (!endDate.includes('T')) d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function parseDiscountStart(startDate?: string | null): number | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  if (!startDate.includes('T')) d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Badge'in şu an gösterilip gösterilmeyeceğini hesaplar.
 * - Her iki tarih de boşsa: her zaman göster.
 * - Başlangıç zamanı gelmediyse veya bitiş zamanı geçtiyse gizle.
 */
export function isDiscountBadgeActive(
  badge: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
): boolean {
  if (!badge) return false;
  const now = Date.now();
  const start = parseDiscountStart(startDate);
  const end = parseDiscountEnd(endDate);
  if (start !== null && now < start) return false;
  if (end !== null && now > end) return false;
  return true;
}

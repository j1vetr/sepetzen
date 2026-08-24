/**
 * Badge'in şu an gösterilip gösterilmeyeceğini hesaplar.
 * - Her iki tarih de boşsa: her zaman göster (geriye uyumlu).
 * - startDate varsa ve bugün < startDate ise: gizle.
 * - endDate varsa ve bugün > endDate ise: gizle.
 */
export function isDiscountBadgeActive(
  badge: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
): boolean {
  if (!badge) return false;
  if (!startDate && !endDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (today < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (today > end) return false;
  }
  return true;
}

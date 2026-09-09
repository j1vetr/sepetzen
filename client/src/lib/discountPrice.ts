/** Sayısal girişe otomatik % ekler: "15" → "%15", "15%" → "%15", "%20" → "%20", "KAMPANYA" → "KAMPANYA" */
export function normalizeBadge(badge: string): string {
  const trimmed = badge.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `%${trimmed}`;
  if (/^\d+(\.\d+)?%$/.test(trimmed)) return `%${trimmed.replace('%', '')}`;
  return trimmed;
}

export function getOriginalPrice(currentPrice: number, discountBadge?: string | null): number | null {
  if (!discountBadge) return null;
  const normalized = normalizeBadge(discountBadge);
  const match = normalized.match(/%(\d+)/);
  if (!match) return null;
  const discountPercent = parseInt(match[1], 10);
  if (discountPercent <= 0 || discountPercent >= 100) return null;
  return currentPrice / (1 - discountPercent / 100);
}

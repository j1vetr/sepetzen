/**
 * "Ücretsiz Kargo" is calculated from the current shipping threshold and is
 * rendered by FreeShippingBadge. Catalog entries using the same phrase must
 * not create a second, promotional badge.
 */
export function isFreeShippingPromotion(badge?: string | null): boolean {
  return badge?.trim().toLocaleLowerCase('tr-TR') === 'ücretsiz kargo';
}
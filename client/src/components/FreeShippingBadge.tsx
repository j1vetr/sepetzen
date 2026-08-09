import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreeShippingBadgeProps {
  className?: string;
  size?: 'compact' | 'default';
  productPrice: number;
  threshold: number;
}

/**
 * Storefront-only badge used wherever a product is displayed.
 * The visual treatment intentionally mirrors the warm, frosted-glass reference.
 */
export function FreeShippingBadge({
  className,
  size = 'default',
  productPrice,
  threshold,
}: FreeShippingBadgeProps) {
  if (productPrice < threshold) return null;

  return (
    <span
      className={cn(
        'free-shipping-badge',
        size === 'compact' && 'free-shipping-badge--compact',
        className,
      )}
      aria-label="Ücretsiz kargo"
    >
      <Truck aria-hidden="true" strokeWidth={2} />
      <span>Ücretsiz Kargo</span>
    </span>
  );
}
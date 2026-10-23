import { useEffect, useState } from 'react';

/** Ürün kartıyla aynı yerleşimde, yüklenirken gösterilen hareketli iskelet kart. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" data-testid="product-card-skeleton">
      <div className="aspect-[3/4] bg-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>
      <div className="mt-3 space-y-2 animate-pulse">
        <div className="h-3 bg-white/[0.08] w-4/5" />
        <div className="h-3 bg-white/[0.06] w-3/5" />
        <div className="h-3 bg-white/[0.08] w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-label="Ürünler yükleniyor" data-testid="product-grid-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Veri çok hızlı gelse bile iskeletin en az `ms` kadar görünmesini sağlar,
 * böylece kullanıcı ürünlerin yüklendiğini hisseder.
 */
export function useMinimumSkeleton(isLoading: boolean, ms = 700) {
  const [holding, setHolding] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setHolding(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return isLoading || holding;
}

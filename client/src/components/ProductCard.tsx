import React, { useState, memo } from 'react';
import { Heart, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { QuickViewModal } from './QuickViewModal';
import { getOriginalPrice } from '@/lib/discountPrice';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: string;
  stock: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  isNew?: boolean;
  discountBadge?: string | null;
  variants?: ProductVariant[];
  availableSizes?: string[];
  availableColors?: { name: string; hex: string | null }[];
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { data: favoriteIds = [] } = useFavoriteIds();
  const { toggleFavorite, isLoading: isFavoriteLoading } = useToggleFavorite();

  const isLiked = favoriteIds.includes(product.id);
  const price = parseFloat(product.basePrice || '0') || 0;
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const mainImage = product.images && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop';

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const isOutOfStock = product.variants && product.variants.length > 0 && totalStock === 0;

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <Link href={`/urun/${product.slug}`}>
        <div
          data-testid={`card-product-${product.id}`}
          className="group relative cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Image container */}
          <div className="relative aspect-[3/4] overflow-hidden bg-[#151515]">
            <motion.img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              animate={{ scale: isHovered ? 1.06 : 1 }}
              transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
              data-testid={`img-product-${product.id}`}
            />

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/70 border border-white/25 px-3 py-1.5">
                  Tükendi
                </span>
              </div>
            )}

            {/* Badges */}
            {product.discountBadge && !isOutOfStock && (
              <div
                className="absolute top-3 left-3 z-10"
                data-testid={`badge-discount-${product.id}`}
              >
                <span className="bg-white text-black text-[10px] font-bold tracking-wider px-2.5 py-1 uppercase">
                  {product.discountBadge}
                </span>
              </div>
            )}

            {product.isNew && !isOutOfStock && !product.discountBadge && (
              <span
                className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] px-2.5 py-1 uppercase z-10"
                data-testid={`badge-new-${product.id}`}
              >
                Yeni
              </span>
            )}

            {/* Favorite button */}
            <motion.button
              data-testid={`button-like-${product.id}`}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (!isFavoriteLoading) toggleFavorite(product.id, isLiked);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered || isLiked ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              disabled={isFavoriteLoading}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/10 backdrop-blur-md border border-white/12 flex items-center justify-center shadow-sm"
            >
              {isFavoriteLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'text-white/80'}`} />
              )}
            </motion.button>

            {/* Quick view */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 hidden sm:block"
            >
              <button
                data-testid={`button-quick-view-${product.id}`}
                onClick={handleQuickView}
                className="w-full bg-black/55 backdrop-blur-md border-t border-white/15 text-white py-3 text-[11px] font-semibold tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-black/75 transition-colors"
              >
                Hızlı Bakış
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          </div>

          {/* Info */}
          <div className="mt-3 space-y-1">
            <h3
              className="text-sm font-medium text-white line-clamp-1 leading-snug"
              data-testid={`text-product-name-${product.id}`}
            >
              {product.name}
            </h3>
            <div className="flex items-center gap-2">
              {originalPrice && (
                <span
                  className="text-xs text-white/35 line-through"
                  data-testid={`text-original-price-${product.id}`}
                >
                  {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </span>
              )}
              <span
                className="text-sm font-semibold text-white"
                data-testid={`text-price-${product.id}`}
              >
                {price.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
        </div>
      </Link>

      <QuickViewModal
        product={product}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
});

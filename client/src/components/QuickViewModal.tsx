import { useState, useEffect } from 'react';
import { X, Minus, Plus, Loader2, ShoppingBag, Play } from 'lucide-react';

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0];
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
}
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { getOriginalPrice } from '@/lib/discountPrice';
import { FreeShippingBadge } from './FreeShippingBadge';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';

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
  discountBadge?: string | null;
  variants?: ProductVariant[];
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart } = useCart();
  const { showModal } = useCartModal();

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setCurrentImageIndex(0);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!product) return null;

  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);
  const freeShippingThreshold = useFreeShippingThreshold();

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const isOutOfStock =
    !!product.variants && product.variants.length > 0 && totalStock === 0;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      // Her ölçü/varyant zaten ayrı ürün; legacy varyantlı ürünler için ilk
      // aktif varyantı kullan, yoksa ürünün temel fiyatını.
      const variant = product.variants?.find((v) => v.isActive);
      await addToCart(product.id, variant?.id, quantity);
      showModal({
        name: product.name,
        image: product.images[0],
        price: price * quantity,
        quantity,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/8"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/8 flex items-center justify-center hover:bg-white/12 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square md:aspect-auto md:h-full bg-[#151515]">
                {isVideoUrl(product.images[currentImageIndex] || '') ? (
                  <video
                    src={product.images[currentImageIndex]}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={product.images[currentImageIndex] || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {!isOutOfStock && (
                  <FreeShippingBadge
                    className="absolute top-4 left-4 z-10"
                    productPrice={price}
                    threshold={freeShippingThreshold}
                  />
                )}
                {product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {product.images.slice(0, 5).map((img, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative w-12 h-12 overflow-hidden border-2 transition-colors ${
                          currentImageIndex === index
                            ? 'border-white'
                            : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                      >
                        {isVideoUrl(img) ? (
                          <>
                            <video src={img} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-3 h-3 text-white fill-white" />
                            </div>
                          </>
                        ) : (
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col">
                <h2 className="font-display text-2xl md:text-3xl tracking-wide mb-2 text-white">
                  {product.name}
                </h2>

                <div className="flex items-baseline gap-3 mb-8">
                  {originalPrice && (
                    <span className="text-lg text-white/30 line-through">
                      {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                    </span>
                  )}
                  <p className="text-2xl font-bold text-white">
                    {price.toLocaleString('tr-TR')} ₺
                  </p>
                </div>

                {/* Quantity */}
                <div className="mb-6">
                  <p className="text-xs text-white/45 mb-3 uppercase tracking-wider">Adet</p>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 border border-white/15 flex items-center justify-center hover:border-white/50 transition-colors"
                      aria-label="Azalt"
                    >
                      <Minus className="w-4 h-4 text-white/60" />
                    </button>
                    <span className="text-xl font-medium w-8 text-center text-white tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 border border-white/15 flex items-center justify-center hover:border-white/50 transition-colors"
                      aria-label="Artır"
                    >
                      <Plus className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/8">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock}
                    className={`w-full py-4 font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-colors ${
                      isOutOfStock
                        ? 'bg-white/8 text-white/35 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-white/90'
                    } disabled:cursor-not-allowed`}
                  >
                    {isAdding ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-5 h-5" />
                    )}
                    {isAdding ? 'Ekleniyor...' : isOutOfStock ? 'Tükendi' : 'Sepete Ekle'}
                  </button>

                  <a
                    href={`/urun/${product.slug}`}
                    className="block text-center text-sm text-white/50 hover:text-white mt-4 transition-colors"
                  >
                    Ürün Detaylarını Gör →
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

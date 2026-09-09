import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import { Heart, Loader2, ArrowRight, Play, Volume2, VolumeX } from 'lucide-react';
import { isYouTubeUrl, getYouTubeThumbnail } from '@/lib/youtube';

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0];
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
}


import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { QuickViewModal } from './QuickViewModal';
import { FreeShippingBadge } from './FreeShippingBadge';
import { getOriginalPrice, normalizeBadge } from '@/lib/discountPrice';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';
import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import { isDiscountBadgeActive } from '@/lib/discountBadgeActive';

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
  discountBadgeStartDate?: string | null;
  discountBadgeEndDate?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubBarRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [mobileScrubbingActive, setMobileScrubbingActive] = useState(false);

  // muted prop React'te DOM mount sonrası dinamik güncellenmiyor;
  // ref ile doğrudan DOM property'si set edilmesi gerekiyor.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !isHovered;
  }, [isHovered]);

  // Hover'da video oynar, ayrılınca durur ve başa döner.
  // autoPlay kaldırıldı — her kartta otomatik yükleme/oynatma
  // bant genişliğini ve CPU'yu gereksiz tüketiyordu.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isHovered) {
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isHovered]);

  // Video süre takibi
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => { if (el.duration) setVideoProgress(el.currentTime / el.duration); };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, []);

  const seekTo = useCallback((clientX: number) => {
    const bar = scrubBarRef.current;
    const el = videoRef.current;
    if (!bar || !el || !el.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setVideoProgress(ratio);
  }, []);

  // Global fare hareketi (scrubbing sırasında)
  useEffect(() => {
    if (!isScrubbing) return;
    const onMove = (e: MouseEvent) => seekTo(e.clientX);
    const onUp = () => setIsScrubbing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isScrubbing, seekTo]);
  const { data: favoriteIds = [] } = useFavoriteIds();
  const { toggleFavorite, isLoading: isFavoriteLoading } = useToggleFavorite();

  const isLiked = favoriteIds.includes(product.id);
  const price = parseFloat(product.basePrice || '0') || 0;
  const freeShippingThreshold = useFreeShippingThreshold();
  const rawBadge = product.discountBadge ?? null;
  const normalizedBadge = rawBadge ? normalizeBadge(rawBadge) : null;
  const visibleDiscountBadge =
    normalizedBadge &&
    !isFreeShippingPromotion(normalizedBadge) &&
    isDiscountBadgeActive(rawBadge, product.discountBadgeStartDate, product.discountBadgeEndDate)
      ? normalizedBadge
      : null;
  const originalPrice = getOriginalPrice(price, visibleDiscountBadge);
  const mainImage = product.images && product.images.length > 0
    ? (product.images.find(u => !/\.(mp4|webm|mov)(\?|$)/i.test(u)) ?? product.images[0])
    : 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop';
  // Üründe video varsa hover'da oynatmak için ayrıca sakla
  const hoverVideoSrc = product.images?.find(u => isVideoUrl(u)) ?? null;

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
            {isYouTubeUrl(mainImage) ? (
              <>
                <motion.img
                  src={getYouTubeThumbnail(mainImage, 'hq')}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  animate={{ scale: isHovered ? 1.06 : 1 }}
                  transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                  data-testid={`img-product-${product.id}`}
                />
                <div className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shadow">
                  <Play className="w-3 h-3 text-white fill-white ml-px" />
                </div>
              </>
            ) : isVideoUrl(mainImage) ? (
              <>
                <motion.video
                  ref={videoRef}
                  src={hoverVideoSrc ?? mainImage}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                  loop
                  playsInline
                  animate={{ scale: isHovered ? 1.06 : 1 }}
                  transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                  data-testid={`img-product-${product.id}`}
                  onTouchStart={() => {
                    longPressRef.current = setTimeout(() => setMobileScrubbingActive(true), 380);
                  }}
                  onTouchMove={() => {
                    if (longPressRef.current && !mobileScrubbingActive) {
                      clearTimeout(longPressRef.current);
                      longPressRef.current = null;
                    }
                  }}
                  onTouchEnd={() => {
                    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
                  }}
                />
                {/* Ses göstergesi — hover'da mikrofon ikonu */}
                <motion.div
                  className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                  animate={{ opacity: 1 }}
                >
                  {isHovered
                    ? <Volume2 className="w-3.5 h-3.5 text-white" />
                    : <VolumeX className="w-3.5 h-3.5 text-white/70" />
                  }
                </motion.div>

                {/* Scrubber bar — masaüstünde hover'da, mobilde uzun basışta görünür */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered || mobileScrubbingActive ? 1 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-0 left-0 right-0 z-30 px-2 pb-2 pt-5"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
                >
                  {/* Track */}
                  <div
                    ref={scrubBarRef}
                    className="w-full relative cursor-pointer"
                    style={{ height: 20, display: 'flex', alignItems: 'center' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsScrubbing(true);
                      seekTo(e.clientX);
                    }}
                    onClick={(e) => e.preventDefault()}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setIsScrubbing(true);
                      seekTo(e.touches[0].clientX);
                    }}
                    onTouchMove={(e) => {
                      if (!isScrubbing) return;
                      e.preventDefault();
                      e.stopPropagation();
                      seekTo(e.touches[0].clientX);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      setIsScrubbing(false);
                      setMobileScrubbingActive(false);
                    }}
                  >
                    <div className="w-full h-[3px] bg-white/25 rounded-full overflow-visible relative">
                      <div
                        className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
                        style={{ width: `${videoProgress * 100}%`, transition: isScrubbing ? 'none' : 'width 0.25s linear' }}
                      />
                      {/* Sürükleme topu */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"
                        style={{ left: `calc(${videoProgress * 100}% - 6px)`, transition: isScrubbing ? 'none' : 'left 0.25s linear' }}
                      />
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
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
                {/* Video hover katmanı — ürünün videosu varsa hover'da fade-in ile oynar */}
                {hoverVideoSrc && (
                  <motion.video
                    ref={videoRef}
                    src={hoverVideoSrc}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    muted
                    preload="none"
                    loop
                    playsInline
                    animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.06 : 1 }}
                    transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                  />
                )}
              </>
            )}

            {/* Tükendi — görsel dimmer + alt-orta pill badge */}
            {isOutOfStock && (
              <>
                {/* Hafif karartma katmanı */}
                <div className="absolute inset-0 z-10 bg-black/30 pointer-events-none" />
                {/* Pill badge — alt orta, diğer badge'lerle çakışmaz */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <span className="backdrop-blur-md bg-black/55 border border-white/15 text-white/60 text-[9px] font-semibold tracking-[0.22em] uppercase px-3 py-1 rounded-full whitespace-nowrap">
                    Tükendi
                  </span>
                </div>
              </>
            )}

            {/* Badges — sol üstte dikey yığın; video/YT kartlarda play butonunun altından başlar */}
            {(
              <div className={`absolute left-3 z-10 flex flex-col items-start gap-1.5 ${(isYouTubeUrl(mainImage) || isVideoUrl(mainImage)) ? 'top-12' : 'top-3'}`}>
                {visibleDiscountBadge && (
                  <span
                    className="backdrop-blur-md bg-red-600/55 border border-red-400/20 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 uppercase rounded-md shadow-[0_2px_8px_rgba(220,38,38,0.35)]"
                    data-testid={`badge-discount-${product.id}`}
                  >
                    {visibleDiscountBadge}
                  </span>
                )}
                {product.isNew && (
                  <span className="storefront-new-badge" data-testid={`badge-new-${product.id}`}>
                    Yeni
                  </span>
                )}
                <FreeShippingBadge
                  size="compact"
                  productPrice={price}
                  threshold={freeShippingThreshold}
                />
              </div>
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
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/12 flex items-center justify-center shadow-sm"
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
                className="w-full bg-black/55 backdrop-blur-md border-t border-transparent text-white py-3 text-[11px] font-semibold tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-black/75 transition-colors"
              >
                Hızlı Bakış
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          </div>

          {/* Info */}
          <div className="mt-3 space-y-1.5">
            <h3
              className="text-sm font-medium text-white line-clamp-1 leading-snug"
              data-testid={`text-product-name-${product.id}`}
            >
              {product.name}
            </h3>

            {/* Yıldız puanı */}
            {!!product.reviewCount && product.reviewCount > 0 && !!product.avgRating && product.avgRating > 0 && (
              <div className="flex items-center gap-1.5" data-testid={`rating-${product.id}`}>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => {
                    const filled = product.avgRating! >= star;
                    const half = !filled && product.avgRating! >= star - 0.5;
                    return (
                      <svg key={star} viewBox="0 0 12 12" className="w-3 h-3 shrink-0">
                        <defs>
                          <linearGradient id={`half-${product.id}-${star}`} x1="0" x2="1" y1="0" y2="0">
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="50%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points="6,1 7.5,4.5 11,4.8 8.5,7 9.2,11 6,9 2.8,11 3.5,7 1,4.8 4.5,4.5"
                          fill={filled ? '#F59E0B' : half ? `url(#half-${product.id}-${star})` : 'none'}
                          stroke="#F59E0B"
                          strokeWidth={filled || half ? 0 : 0.8}
                          opacity={filled || half ? 1 : 0.3}
                        />
                      </svg>
                    );
                  })}
                </div>
                <span className="text-[10px] text-white/45 leading-none">
                  {product.avgRating!.toFixed(1)} <span className="text-white/25">({product.reviewCount})</span>
                </span>
              </div>
            )}

            {/* Fiyat */}
            <div className="flex flex-col gap-0.5">
              {originalPrice && visibleDiscountBadge && (
                <span
                  className="text-[11px] text-white/35 line-through leading-none"
                  data-testid={`text-original-price-${product.id}`}
                >
                  {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </span>
              )}
              <span
                className={`text-sm font-semibold leading-none ${originalPrice && visibleDiscountBadge ? 'text-amber-400' : 'text-white'}`}
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

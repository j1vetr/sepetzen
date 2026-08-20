import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';

interface CartSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    image: string;
    price: number;
    size?: string;
    quantity: number;
  } | null;
  cartTotal: number;
  cartItemCount: number;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function CartSuccessModal({ isOpen, onClose, product, cartTotal, cartItemCount }: CartSuccessModalProps) {
  const isMobile = useIsMobile();
  const freeShippingThreshold = useFreeShippingThreshold();

  if (!product) return null;

  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartTotal);
  const shippingProgress = Math.min((cartTotal / freeShippingThreshold) * 100, 100);
  const freeShipReached = remainingForFreeShipping === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 z-[100]"
          />

          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={
              isMobile
                ? 'fixed left-0 right-0 bottom-0 z-[101] w-full'
                : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md px-4'
            }
            style={{ willChange: 'transform, opacity' }}
          >
            <div
              className={
                isMobile
                  ? 'relative bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/40 rounded-t-2xl overflow-hidden'
                  : 'relative bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden'
              }
            >
              {isMobile && (
                <div className="pt-2 pb-1 flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
              )}

              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors z-10 rounded-full"
                data-testid="button-close-modal"
                aria-label="Kapat"
              >
                <X className="w-4 h-4 text-white/60" strokeWidth={2} />
              </button>

              <div
                className="px-5 sm:px-6 pt-4 pb-5"
                style={isMobile ? { paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' } : undefined}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-black" strokeWidth={3} />
                  </span>
                  <div className="leading-tight">
                    <h3 className="font-display text-[15px] tracking-[0.14em] uppercase text-white">
                      Sepete Eklendi
                    </h3>
                    <p className="text-[11px] text-white/45 mt-0.5">Harika seçim</p>
                  </div>
                </div>

                <div className="flex gap-3.5 bg-white/[0.04] border border-white/10 p-3.5">
                  <div className="relative w-20 h-24 sm:w-24 sm:h-28 overflow-hidden shrink-0 bg-white/[0.04]">
                    {/\.(mp4|webm|mov)$/i.test(product.image) ? (
                      <video
                        src={product.image}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h4
                      className="font-medium text-[13px] sm:text-sm leading-snug line-clamp-2 mb-2 text-white"
                      data-testid="text-modal-product-name"
                    >
                      {product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-white/55 mb-auto">
                      {product.size && (
                        <span className="px-1.5 py-0.5 bg-white/[0.06] border border-white/10 text-white/70">
                          {product.size}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-white/[0.06] border border-white/10 text-white/70">
                        Adet: {product.quantity}
                      </span>
                    </div>
                    <p
                      className="font-bold text-[17px] text-white mt-1.5"
                      data-testid="text-modal-price"
                    >
                      {product.price.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                </div>

                <div className="mt-3.5">
                  {freeShipReached ? (
                    <div className="bg-white/12 border border-white/40 px-3 py-2.5 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-white shrink-0" strokeWidth={2} />
                      <span className="text-[12px] text-white/90 font-medium">
                        Ücretsiz kargo kazandınız.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white/[0.04] border border-white/10 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Truck className="w-4 h-4 text-white shrink-0" strokeWidth={2} />
                        <span className="text-[11.5px] text-white/65 leading-tight">
                          Ücretsiz kargo için{' '}
                          <span className="font-semibold text-white">
                            {remainingForFreeShipping.toLocaleString('tr-TR')} ₺
                          </span>{' '}
                          daha ekleyin
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.08] overflow-hidden rounded-full">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${shippingProgress}%`, transitionDuration: '300ms' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3.5 py-2.5 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[12px] text-white/55">
                    <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Sepetinizde {cartItemCount} ürün</span>
                  </div>
                  <span className="font-bold text-[14px] text-white">
                    {cartTotal.toLocaleString('tr-TR')} ₺
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-11 bg-transparent border-white/20 text-white hover:bg-white/[0.06] hover:text-white rounded-md text-[11.5px] font-semibold tracking-[0.08em] uppercase"
                    data-testid="button-continue-shopping"
                  >
                    Alışverişe Devam
                  </Button>
                  <Link href="/sepet" onClick={onClose}>
                    <Button
                      className="w-full h-11 bg-white text-black hover:bg-white/85 font-semibold tracking-[0.08em] text-[11.5px] uppercase group rounded-md"
                      data-testid="button-go-to-cart"
                    >
                      Sepete Git
                      <ArrowRight
                        className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2.5}
                      />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

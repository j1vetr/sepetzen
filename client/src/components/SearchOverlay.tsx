import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { FreeShippingBadge } from './FreeShippingBadge';
import { isFreeShippingPromotion } from '@/lib/promotionBadge';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  isNew?: boolean;
  discountBadge?: string | null;
}

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPrice = (val: string) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(parseFloat(val || '0'));

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const freeShippingThreshold = useFreeShippingThreshold();

  // Focus + reset on open/close
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  // ESC ile kapat
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  const hasQuery = debouncedQuery.length >= 2;

  // Aktif arama (en az 2 karakter)
  const { data: searchResults = [], isLoading: searching } = useQuery<SearchProduct[]>({
    queryKey: ['search-products', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: isOpen && hasQuery,
    staleTime: 30_000,
  });

  // Boş ekran için "Öne Çıkanlar" — overlay açıldığı an gözüksün
  const { data: featured = [] } = useQuery<SearchProduct[]>({
    queryKey: ['search-featured'],
    queryFn: async () => {
      const res = await fetch('/api/products?isFeatured=true');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery<SearchCategory[]>({
    queryKey: ['categories'],
    enabled: isOpen,
    staleTime: 60_000,
  });

  const visibleCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => (c.displayOrder ?? 0) < 100)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .slice(0, 6),
    [categories],
  );

  const displayedProducts = hasQuery ? searchResults : featured.slice(0, 8);

  const handleProductClick = () => onClose();

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/magaza?search=${encodeURIComponent(q)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Frosted backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] overflow-hidden bg-[#050505]/55 backdrop-blur-[22px]"
            data-testid="overlay-search"
          >
            <div className="absolute -top-[22%] left-[8%] h-[58vw] w-[58vw] rounded-full bg-white/[0.09] blur-[120px]" />
            <div className="absolute -bottom-[30%] right-[3%] h-[55vw] w-[55vw] rounded-full bg-slate-300/[0.07] blur-[130px]" />
          </motion.div>

          {/* ── Floating glass panel ── */}
          <motion.div
            initial={{ opacity: 0, y: -34, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.99 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-2 top-2 bottom-2 z-[101] mx-auto flex max-w-[1380px] flex-col overflow-hidden rounded-[26px] border border-white/[0.18] bg-[linear-gradient(135deg,rgba(34,34,38,0.78),rgba(12,12,14,0.67)_48%,rgba(27,27,30,0.73))] shadow-[0_32px_100px_-20px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[34px] sm:inset-x-4 sm:top-4 sm:bottom-4 lg:top-7 lg:bottom-7"
            data-testid="panel-search"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/[0.07] blur-3xl" />
            {/* Header satırı */}
            <div className="relative border-b border-white/[0.12]">
              <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-9 lg:py-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                  <Search className="h-4 w-4 text-white/75 lg:h-5 lg:w-5" strokeWidth={1.7} />
                </div>
                <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-white/[0.14] bg-black/[0.18] px-3 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] sm:px-4 lg:py-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch();
                  }}
                  placeholder="Av bıçağı, kamp çakısı, outdoor ekipmanı ara..."
                  className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-light tracking-tight text-white outline-none placeholder:text-white/35 lg:text-[19px]"
                  data-testid="input-search"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query.length > 0 && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setDebouncedQuery('');
                      inputRef.current?.focus();
                    }}
                    className="px-1.5 text-[9px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white sm:px-2 sm:text-[10px]"
                    data-testid="button-clear-search"
                  >
                    Temizle
                  </button>
                )}
                </div>
                <button
                  onClick={onClose}
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-all hover:rotate-90 hover:border-white/60 hover:bg-white/[0.14]"
                  data-testid="button-close-search"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4 text-white/70 transition-colors group-hover:text-white" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* İçerik alanı (scroll) */}
            <div className="relative flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-9 lg:py-9">
                {/* Hızlı kategori chip'leri */}
                {visibleCategories.length > 0 && (
                  <div className="mb-8 rounded-2xl border border-white/[0.12] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:p-5">
                    <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                      Hızlı Erişim
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleCategories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/kategori/${c.slug}`}
                          onClick={onClose}
                          className="inline-flex items-center rounded-full border border-white/[0.13] bg-black/[0.13] px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-white/75 transition-all hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/[0.13] hover:text-white"
                          data-testid={`link-search-cat-${c.slug}`}
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading */}
                {hasQuery && searching && (
                  <div className="flex items-center justify-center py-16 text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {/* No results */}
                {hasQuery && !searching && searchResults.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-2">
                      Sonuç Bulunamadı
                    </div>
                    <p className="text-[15px] text-white/70">
                      "<span className="font-semibold text-white">{debouncedQuery}</span>" için ürün bulamadık.
                    </p>
                    <p className="text-[13px] text-white/45 mt-2">
                      Farklı bir kelime deneyin ya da tüm koleksiyonu inceleyin.
                    </p>
                    <Link
                      href="/magaza"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase font-semibold bg-white text-black hover:bg-white/90 transition-colors"
                    >
                      Mağazaya Git <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Results / Featured grid */}
                {!searching && displayedProducts.length > 0 && (
                  <div>
                    <div className="flex items-end justify-between mb-4">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-mono">
                        {hasQuery
                          ? `${searchResults.length} Sonuç`
                          : 'Öne Çıkan Ürünler'}
                      </div>
                      {hasQuery && searchResults.length > 0 && (
                        <button
                          onClick={submitSearch}
                          className="text-[10px] tracking-[0.18em] uppercase font-semibold text-white hover:text-white/70 transition-colors inline-flex items-center gap-1"
                        >
                          Tümünü Gör <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                      {displayedProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.25) }}
                        >
                          <Link
                            href={`/urun/${product.slug}`}
                            onClick={handleProductClick}
                            data-testid={`link-search-result-${product.id}`}
                            className="group block overflow-hidden rounded-2xl border border-white/[0.11] bg-white/[0.045] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.09] hover:shadow-[0_18px_36px_-18px_rgba(0,0,0,0.75)]"
                          >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-black/30">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                                  <Search className="w-6 h-6" strokeWidth={1.25} />
                                </div>
                              )}

                              {/* Badges */}
                              {(product.isNew || (product.discountBadge && !isFreeShippingPromotion(product.discountBadge))) && (
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                  {product.isNew && (
                                    <span className="storefront-new-badge storefront-new-badge--compact">
                                      Yeni
                                    </span>
                                  )}
                                  {!isFreeShippingPromotion(product.discountBadge) && product.discountBadge && (
                                    <span className="text-[8.5px] tracking-[0.18em] uppercase font-bold bg-white text-black px-1.5 py-1">
                                      {product.discountBadge}
                                    </span>
                                  )}
                                </div>
                              )}
                              <FreeShippingBadge
                                className="absolute top-2 left-2 z-10"
                                size="compact"
                                productPrice={parseFloat(product.basePrice || '0') || 0}
                                threshold={freeShippingThreshold}
                              />
                            </div>

                            <h4
                              className="px-1 text-[12px] font-medium leading-snug text-white/90 line-clamp-2 transition-colors group-hover:text-white lg:text-[13px]"
                              data-testid={`text-search-name-${product.id}`}
                            >
                              {product.name}
                            </h4>
                            <p
                              className="mt-1 px-1 pb-1 text-[13px] font-semibold tracking-tight text-white lg:text-[14px]"
                              data-testid={`text-search-price-${product.id}`}
                            >
                              {formatPrice(product.basePrice)} ₺
                            </p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty (no query, no featured) */}
                {!hasQuery && featured.length === 0 && (
                  <div className="text-center py-16 text-[13px] text-white/45">
                    Aramaya başlamak için yukarıdaki kutuya yazın.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

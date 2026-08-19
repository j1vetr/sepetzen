import { useState, useEffect, useRef, useMemo } from 'react';
import { pickThumbUrl, isVideoUrl } from '@/lib/mediaUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
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

function ProductThumb({ images, name }: { images: string[]; name: string }) {
  const src = pickThumbUrl(images);
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Search className="w-5 h-5 text-white/15" strokeWidth={1.25} />
      </div>
    );
  }
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        muted
        autoPlay
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
      />
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
    />
  );
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const freeShippingThreshold = useFreeShippingThreshold();

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  const hasQuery = debouncedQuery.length >= 2;

  const { data: searchResults = [], isLoading: searching } = useQuery<SearchProduct[]>({
    queryKey: ['search-products', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedQuery)}&limit=4`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: isOpen && hasQuery,
    staleTime: 30_000,
  });

  const { data: featured = [] } = useQuery<SearchProduct[]>({
    queryKey: ['search-featured'],
    queryFn: async () => {
      const res = await fetch('/api/products?isFeatured=true&limit=4');
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
        .slice(0, 8),
    [categories],
  );

  const displayedProducts = hasQuery ? searchResults.slice(0, 4) : featured.slice(0, 4);

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
          {/* ── Koyu cam arka plan ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm"
            data-testid="overlay-search"
          />

          {/* ── Panel ── */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-3 z-[101] mx-auto flex max-w-[920px] flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.055] shadow-[0_40px_120px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:inset-x-6 sm:top-5 lg:top-8"
            data-testid="panel-search"
            style={{ maxHeight: 'calc(100dvh - 48px)' }}
          >
            {/* Üst ışık şeridi */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* ── Arama çubuğu ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
              {searching ? (
                <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-white/40" strokeWidth={1.75} />
              ) : (
                <Search className="h-[18px] w-[18px] shrink-0 text-white/40" strokeWidth={1.75} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                placeholder="Ürün, kategori veya marka ara…"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-light text-white outline-none placeholder:text-white/30 sm:text-[16px]"
                data-testid="input-search"
                autoComplete="off"
                spellCheck={false}
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                  className="text-[9.5px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white/70"
                  data-testid="button-clear-search"
                >
                  Temizle
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.07] text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.13] hover:text-white"
                data-testid="button-close-search"
                aria-label="Kapat"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Ayırıcı */}
            <div className="mx-4 h-px bg-white/[0.08] sm:mx-5" />

            {/* ── İçerik (scroll) ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 py-5 sm:px-5 sm:py-6">

                {/* Kategoriler */}
                {!hasQuery && visibleCategories.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-3 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/30">
                      <TrendingUp className="h-3 w-3" strokeWidth={2} />
                      Kategoriler
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleCategories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/kategori/${c.slug}`}
                          onClick={onClose}
                          className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium text-white/65 transition-all hover:border-white/25 hover:bg-white/[0.12] hover:text-white"
                          data-testid={`link-search-cat-${c.slug}`}
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sonuç yok */}
                {hasQuery && !searching && searchResults.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-[13px] text-white/50">
                      "<span className="font-semibold text-white/80">{debouncedQuery}</span>" için ürün bulunamadı.
                    </p>
                    <Link
                      href="/magaza"
                      onClick={onClose}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.07] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:bg-white/[0.13] hover:text-white"
                    >
                      Tüm ürünleri gör <ArrowRight className="h-3 h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Ürün grid */}
                {!searching && displayedProducts.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/30">
                        {hasQuery ? `${searchResults.length} Sonuç` : 'Öne Çıkanlar'}
                      </p>
                      {hasQuery && searchResults.length > 0 && (
                        <button
                          onClick={submitSearch}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/80"
                        >
                          Tümünü gör <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                      {displayedProducts.map((product) => (
                        <Link
                          key={product.id}
                          href={`/urun/${product.slug}`}
                          onClick={handleProductClick}
                          data-testid={`link-search-result-${product.id}`}
                          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          {/* Görsel */}
                          <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                            <ProductThumb images={product.images} name={product.name} />
                            {/* Degrade örtüsü */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

                            {/* Badge'ler */}
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                              {product.isNew && (
                                <span className="storefront-new-badge storefront-new-badge--compact">Yeni</span>
                              )}
                              {!isFreeShippingPromotion(product.discountBadge) && product.discountBadge && (
                                <span className="rounded-sm bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-black">
                                  {product.discountBadge}
                                </span>
                              )}
                            </div>

                            <FreeShippingBadge
                              className="absolute top-2 left-2 z-10"
                              size="compact"
                              productPrice={parseFloat(product.basePrice || '0') || 0}
                              threshold={freeShippingThreshold}
                            />

                            {/* Fiyat altta */}
                            <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
                              <p
                                className="text-[13px] font-bold text-white"
                                data-testid={`text-search-price-${product.id}`}
                              >
                                {formatPrice(product.basePrice)} ₺
                              </p>
                            </div>
                          </div>

                          {/* İsim */}
                          <div className="px-2.5 py-2">
                            <h4
                              className="line-clamp-2 text-[11.5px] font-medium leading-snug text-white/75 transition-colors group-hover:text-white"
                              data-testid={`text-search-name-${product.id}`}
                            >
                              {product.name}
                            </h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boş durum */}
                {!hasQuery && featured.length === 0 && (
                  <p className="py-12 text-center text-[13px] text-white/35">
                    Aramak istediğiniz ürünü yazın…
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

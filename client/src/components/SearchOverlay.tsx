import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
          {/* ── Light backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#1a1612]/40 backdrop-blur-[6px]"
            data-testid="overlay-search"
          />

          {/* ── Panel ── */}
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-[101] bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh]"
            data-testid="panel-search"
          >
            {/* Header satırı */}
            <div className="border-b border-black/[0.08]">
              <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-5 lg:py-7 flex items-center gap-4">
                <Search className="w-5 h-5 lg:w-6 lg:h-6 text-black/45 shrink-0" strokeWidth={1.6} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch();
                  }}
                  placeholder="Av bıçağı, kamp çakısı, outdoor ekipmanı ara..."
                  className="flex-1 bg-transparent outline-none border-none text-[16px] lg:text-[20px] font-light text-black placeholder:text-black/30 tracking-tight"
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
                    className="text-[10px] tracking-[0.2em] uppercase text-black/45 hover:text-polen-orange transition-colors px-2"
                    data-testid="button-clear-search"
                  >
                    Temizle
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="group flex items-center justify-center w-9 h-9 rounded-full border border-black/10 hover:border-polen-orange transition-colors shrink-0"
                  data-testid="button-close-search"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4 text-black/55 group-hover:text-polen-orange transition-colors" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* İçerik alanı (scroll) */}
            <div className="overflow-y-auto flex-1">
              <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6 lg:py-10">
                {/* Hızlı kategori chip'leri */}
                {visibleCategories.length > 0 && (
                  <div className="mb-8">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-black/40 font-mono mb-3">
                      Hızlı Erişim
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleCategories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/kategori/${c.slug}`}
                          onClick={onClose}
                          className="inline-flex items-center px-3.5 py-2 text-[11px] tracking-[0.14em] uppercase text-black/75 border border-black/10 hover:border-polen-orange hover:text-polen-orange hover:bg-[hsl(var(--polen-cream))] transition-colors"
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
                  <div className="flex items-center justify-center py-16 text-black/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {/* No results */}
                {hasQuery && !searching && searchResults.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="text-[11px] tracking-[0.2em] uppercase text-black/40 mb-2">
                      Sonuç Bulunamadı
                    </div>
                    <p className="text-[15px] text-black/70">
                      "<span className="font-semibold text-black">{debouncedQuery}</span>" için ürün bulamadık.
                    </p>
                    <p className="text-[13px] text-black/45 mt-2">
                      Farklı bir kelime deneyin ya da tüm koleksiyonu inceleyin.
                    </p>
                    <Link
                      href="/magaza"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase font-semibold bg-black text-white hover:bg-polen-orange transition-colors"
                    >
                      Mağazaya Git <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Results / Featured grid */}
                {!searching && displayedProducts.length > 0 && (
                  <div>
                    <div className="flex items-end justify-between mb-4">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-black/40 font-mono">
                        {hasQuery
                          ? `${searchResults.length} Sonuç`
                          : 'Öne Çıkan Ürünler'}
                      </div>
                      {hasQuery && searchResults.length > 0 && (
                        <button
                          onClick={submitSearch}
                          className="text-[10px] tracking-[0.18em] uppercase font-semibold text-polen-orange hover:text-[hsl(var(--polen-orange-deep))] transition-colors inline-flex items-center gap-1"
                        >
                          Tümünü Gör <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5">
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
                            className="group block"
                          >
                            <div className="relative aspect-[4/5] bg-[hsl(var(--polen-cream))] overflow-hidden mb-3">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-black/20">
                                  <Search className="w-6 h-6" strokeWidth={1.25} />
                                </div>
                              )}

                              {/* Badges */}
                              {(product.isNew || product.discountBadge) && (
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                  {product.isNew && (
                                    <span className="text-[8.5px] tracking-[0.18em] uppercase font-bold bg-black text-white px-1.5 py-1">
                                      Yeni
                                    </span>
                                  )}
                                  {product.discountBadge && (
                                    <span className="text-[8.5px] tracking-[0.18em] uppercase font-bold bg-polen-orange text-white px-1.5 py-1">
                                      {product.discountBadge}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <h4
                              className="text-[12.5px] lg:text-[13px] font-medium text-black leading-snug line-clamp-2 group-hover:text-polen-orange transition-colors"
                              data-testid={`text-search-name-${product.id}`}
                            >
                              {product.name}
                            </h4>
                            <p
                              className="mt-1 text-[13px] lg:text-[14px] font-semibold text-black tracking-tight"
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
                  <div className="text-center py-16 text-[13px] text-black/45">
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

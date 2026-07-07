import { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useParams, useSearch } from 'wouter';
import { ChevronRight, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, type ProductFilters } from '@/hooks/useProducts';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
];

function parseSearchParams(search: string) {
  const params = new URLSearchParams(search);
  const sort = (params.get('sort') || 'newest') as ProductFilters['sort'];
  const minPrice = parseInt(params.get('minPrice') || '0', 10);
  const maxPrice = parseInt(params.get('maxPrice') || '10000', 10);
  const isNew = params.get('isNew') === '1';
  const discounted = params.get('discounted') === '1';
  return { sort, minPrice, maxPrice, isNew, discounted };
}

export default function Category() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '';
  const search = useSearch();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const category = categories.find(c => c.slug === slug);

  const parsed = useMemo(() => parseSearchParams(search), [search]);

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>(parsed.sort);
  const [priceRange, setPriceRange] = useState<[number, number]>([parsed.minPrice, parsed.maxPrice]);
  const [showOnlyNew, setShowOnlyNew] = useState(parsed.isNew);
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(parsed.discounted);
  const [filterOpen, setFilterOpen] = useState(false);

  const updateUrl = useCallback(
    (overrides?: {
      sort?: ProductFilters['sort'];
      minPrice?: number;
      maxPrice?: number;
      isNew?: boolean;
      discounted?: boolean;
    }) => {
      const p = new URLSearchParams();
      const s = overrides?.sort ?? sortBy;
      const minP = overrides?.minPrice ?? priceRange[0];
      const maxP = overrides?.maxPrice ?? priceRange[1];
      const n = overrides?.isNew ?? showOnlyNew;
      const d = overrides?.discounted ?? showOnlyDiscounted;

      if (s && s !== 'newest') p.set('sort', s);
      if (minP > 0) p.set('minPrice', String(minP));
      if (maxP < 10000) p.set('maxPrice', String(maxP));
      if (n) p.set('isNew', '1');
      if (d) p.set('discounted', '1');

      const qs = p.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState(null, '', newUrl);
    },
    [sortBy, priceRange, showOnlyNew, showOnlyDiscounted]
  );

  const handleSortChange = useCallback(
    (v: string) => {
      const val = v as ProductFilters['sort'];
      setSortBy(val);
      updateUrl({ sort: val });
    },
    [updateUrl]
  );

  const handlePriceChange = useCallback(
    (v: number[]) => {
      const range = v as [number, number];
      setPriceRange(range);
      updateUrl({ minPrice: range[0], maxPrice: range[1] });
    },
    [updateUrl]
  );

  const handleToggleNew = useCallback(() => {
    const next = !showOnlyNew;
    setShowOnlyNew(next);
    updateUrl({ isNew: next });
  }, [showOnlyNew, updateUrl]);

  const handleToggleDiscounted = useCallback(() => {
    const next = !showOnlyDiscounted;
    setShowOnlyDiscounted(next);
    updateUrl({ discounted: next });
  }, [showOnlyDiscounted, updateUrl]);

  const clearFilters = useCallback(() => {
    setShowOnlyNew(false);
    setShowOnlyDiscounted(false);
    setSortBy('newest');
    setPriceRange([0, 10000]);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const reparsed = parseSearchParams(window.location.search);
    setSortBy(reparsed.sort);
    setPriceRange([reparsed.minPrice, reparsed.maxPrice]);
    setShowOnlyNew(reparsed.isNew);
    setShowOnlyDiscounted(reparsed.discounted);
  }, [slug]);

  const filters: ProductFilters = {
    categoryId: category?.id,
    sort: sortBy,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
  };

  const { data: products = [], isLoading: productsLoading } = useProducts(filters);
  const isLoading = categoriesLoading || (category && productsLoading);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (showOnlyNew) result = result.filter((p) => p.isNew);
    if (showOnlyDiscounted) result = result.filter((p) => !!p.discountBadge);
    return result;
  }, [products, showOnlyNew, showOnlyDiscounted]);

  const priceActive = priceRange[0] > 0 || priceRange[1] < 10000;
  const hasActiveFilters = showOnlyNew || showOnlyDiscounted || priceActive;
  const activeFilterCount =
    (showOnlyNew ? 1 : 0) + (showOnlyDiscounted ? 1 : 0) + (priceActive ? 1 : 0);

  if (!category && !isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-20 lg:pt-8 pb-12 px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            <h1 className="font-display text-5xl mb-4 text-black">Kategori Bulunamadı</h1>
            <Link href="/">
              <span className="text-sm text-black/40 hover:text-black transition-colors underline underline-offset-4">
                Ana Sayfaya Dön
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title={category?.name || 'Kategori'}
        description={`${category?.name || 'Ürünler'} - Sepetzen kamp, outdoor ve bıçak koleksiyonu`}
        url={`/kategori/${slug}`}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: category?.name || 'Kategori', url: `/kategori/${slug}` },
        ]}
      />
      <Header />

      {/* ─── CATEGORY HERO (compact) ─── */}
      <section className="relative overflow-hidden bg-black" style={{ height: '18vh', minHeight: 140, maxHeight: 200 }}>
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {category?.image && (
            <img
              src={category.image}
              alt={category.name || 'Kategori'}
              className="w-full h-full object-cover opacity-45"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              data-testid="img-category-hero"
            />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-4 lg:pb-5 w-full">
            <motion.nav
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 text-[10px] text-white/45 tracking-wider uppercase mb-1.5"
              data-testid="breadcrumb"
            >
              <Link href="/"><span className="hover:text-white transition-colors">Ana Sayfa</span></Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/75">{category?.name}</span>
            </motion.nav>

            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-[1.1]"
                data-testid="text-category-title"
              >
                {category?.name?.toUpperCase()}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/45 text-[10px] tracking-[0.2em] uppercase"
              >
                {filteredProducts.length} ürün
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <div className="border-b border-black/8 sticky top-16 lg:top-0 bg-white z-30">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* Left: filter trigger + active tags */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-medium text-black shrink-0 hover:text-black/60 transition-colors"
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtrele
                {hasActiveFilters && (
                  <span className="w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Active filter chips */}
              {showOnlyNew && (
                <button
                  onClick={() => { setShowOnlyNew(false); updateUrl({ isNew: false }); }}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black px-2.5 py-1 shrink-0 hover:bg-black hover:text-white transition-colors"
                  data-testid="button-remove-filter-new"
                >
                  Yeni
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {showOnlyDiscounted && (
                <button
                  onClick={() => { setShowOnlyDiscounted(false); updateUrl({ discounted: false }); }}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-[var(--sepetzen-green)] text-[var(--sepetzen-green)] px-2.5 py-1 shrink-0 hover:bg-[var(--sepetzen-green)] hover:text-white transition-colors"
                  data-testid="button-remove-filter-discount"
                >
                  İndirimli
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {priceActive && (
                <button
                  onClick={() => { setPriceRange([0, 10000]); updateUrl({ minPrice: 0, maxPrice: 10000 }); }}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-black/30 text-black/60 px-2.5 py-1 shrink-0 hover:border-black hover:text-black transition-colors"
                  data-testid="button-remove-filter-price"
                >
                  {priceRange[0].toLocaleString('tr-TR')}–{priceRange[1].toLocaleString('tr-TR')} ₺
                  <X className="w-2.5 h-2.5" />
                </button>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] tracking-[0.1em] uppercase text-black/35 hover:text-black transition-colors shrink-0 underline underline-offset-2"
                  data-testid="button-clear-filters"
                >
                  Temizle
                </button>
              )}
            </div>

            {/* Right: sort */}
            <div className="shrink-0">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger
                  className="h-8 border-0 bg-transparent text-[11px] tracking-[0.12em] uppercase font-medium text-black/50 hover:text-black focus:ring-0 focus:ring-offset-0 gap-1 pr-0 shadow-none"
                  data-testid="select-sort"
                >
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="bg-white border-black/10 shadow-lg">
                  {sortOptions.map(opt => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs text-black focus:bg-black/5 cursor-pointer"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILTER PANEL (slide down) ─── */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            className="overflow-hidden border-b border-black/8 bg-white"
          >
            <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 max-w-xl">

                {/* Price range */}
                <div>
                  <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Fiyat Aralığı</h4>
                  <Slider
                    value={priceRange}
                    onValueChange={handlePriceChange}
                    min={0}
                    max={10000}
                    step={100}
                    className="mb-3"
                    data-testid="slider-price-range"
                  />
                  <div className="flex justify-between text-xs text-black/50">
                    <span data-testid="text-price-min">{priceRange[0].toLocaleString('tr-TR')} ₺</span>
                    <span data-testid="text-price-max">{priceRange[1].toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                {/* Quick filters */}
                <div>
                  <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Hızlı Filtre</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleToggleNew}
                      className={`px-4 h-11 border text-[11px] tracking-[0.12em] uppercase font-medium transition-all ${
                        showOnlyNew
                          ? 'bg-black text-white border-black'
                          : 'border-black/20 text-black hover:border-black'
                      }`}
                      data-testid="button-filter-new"
                    >
                      Yeni Gelenler
                    </button>
                    <button
                      onClick={handleToggleDiscounted}
                      className={`px-4 h-11 border text-[11px] tracking-[0.12em] uppercase font-medium transition-all ${
                        showOnlyDiscounted
                          ? 'bg-[var(--sepetzen-green)] text-white border-[var(--sepetzen-green)]'
                          : 'border-black/20 text-black hover:border-[var(--sepetzen-green)] hover:text-[var(--sepetzen-green)]'
                      }`}
                      data-testid="button-filter-discounted"
                    >
                      İndirimli
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PRODUCT GRID ─── */}
      <main className="py-10 lg:py-14 px-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="font-display text-3xl text-black mb-2">Ürün Bulunamadı</p>
              <p className="text-sm text-black/40 mb-8">
                {hasActiveFilters ? 'Filtreleri değiştirerek tekrar deneyin.' : 'Bu kategoride henüz ürün bulunmuyor.'}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="text-[11px] tracking-[0.15em] uppercase border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors">
                  Filtreleri Temizle
                </button>
              ) : (
                <Link href="/">
                  <span className="text-[11px] tracking-[0.15em] uppercase border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors">
                    Alışverişe Devam Et
                  </span>
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─── OTHER CATEGORIES ─── */}
      {categories.length > 1 && (
        <section className="py-12 px-5 lg:px-8 border-t border-black/8">
          <div className="max-w-[1400px] mx-auto">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-black/35 font-medium mb-6">Diğer Kategoriler</h3>
            <div className="flex flex-wrap gap-2">
              {categories.filter(c => c.slug !== slug).map(cat => (
                <Link key={cat.id} href={`/kategori/${cat.slug}`}>
                  <motion.span
                    whileHover={{ backgroundColor: '#000', color: '#fff' }}
                    transition={{ duration: 0.2 }}
                    className="inline-block border border-black/20 text-black text-[11px] tracking-[0.12em] uppercase px-4 py-2.5 cursor-pointer transition-colors hover:border-black"
                    data-testid={`button-other-category-${cat.slug}`}
                  >
                    {cat.name}
                  </motion.span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

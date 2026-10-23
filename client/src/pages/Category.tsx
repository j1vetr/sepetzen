import { useState, useMemo, useEffect, useCallback } from 'react';
import { getSpecValues } from '@/lib/specFilter';
import { ProductGridSkeleton, ProductCardSkeleton, useMinimumSkeleton } from '@/components/ProductGridSkeleton';
import { sortRecommended, sortDiscountedFirst } from '@/lib/productSort';
import { getAncestors } from '@/lib/categoryTree';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useParams, useSearch } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, ChevronDown, Grid3X3, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, useFilterAttributes, type ProductFilters } from '@/hooks/useProducts';
import { sanitizeAdminHtml } from '@/lib/sanitizeHtml';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import { SubcategoryStrip } from '@/components/SubcategoryStrip';
import { PriceRangeFilter } from '@/components/PriceRangeFilter';
import { FilterDrawer } from '@/components/FilterDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const sortOptions = [
  { value: 'recommended', label: 'Önerilen' },
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'discounted', label: 'İndirimdekiler' },
];


// ── Ürün ızgarası animasyon varyantları ──────────────────────────────────────
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

// ── Yardımcı bileşenler ──────────────────────────────────────────────────────

function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full mb-4 group">
        <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/50 group-hover:text-white transition-colors">
          {title}
        </h4>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckItem({ label, checked, onChange, count }: {
  label: string; checked: boolean; onChange: () => void; count?: number;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className={`w-4 h-4 border rounded-sm flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-white bg-white/10' : 'border-white/20 group-hover:border-white'}`}>
        {checked && <span className="w-2 h-2 rounded-[2px] bg-white" />}
      </span>
      <span className={`flex-1 text-[13px] transition-colors ${checked ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>{label}</span>
      {count !== undefined && <span className="text-[10px] text-white/30 tabular-nums">{count}</span>}
    </label>
  );
}

function MultiCheckList({ options, selected, onToggle, counts }: {
  options: string[]; selected: string[]; onToggle: (val: string) => void; counts?: Record<string, number>;
}) {
  return (
    <div className="space-y-0.5">
      {options.map(opt => (
        <CheckItem key={opt} label={opt} checked={selected.includes(opt)} onChange={() => onToggle(opt)} count={counts?.[opt]} />
      ))}
    </div>
  );
}

// ── URL parametreleri ─────────────────────────────────────────────────────────

function parseSearchParams(search: string) {
  const params = new URLSearchParams(search);
  const sort = (params.get('sort') || 'recommended') as ProductFilters['sort'];
  const minPrice = parseInt(params.get('minPrice') || '0', 10);
  const maxPrice = parseInt(params.get('maxPrice') || '10000', 10);
  const isNew = params.get('isNew') === '1';
  const discounted = params.get('discounted') === '1';
  return { sort, minPrice, maxPrice, isNew, discounted };
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function Category() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '';
  const search = useSearch();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: filterAttributes = [] } = useFilterAttributes();
  const category = categories.find(c => c.slug === slug);
  const childCategories = categories.filter(c => c.parentId && c.parentId === category?.id);
  const ancestorCategories = getAncestors(categories, category?.id);

  const parsed = useMemo(() => parseSearchParams(search), [search]);

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>(parsed.sort);
  const [priceRange, setPriceRange] = useState<[number, number]>([parsed.minPrice, parsed.maxPrice]);
  const [showOnlyNew, setShowOnlyNew] = useState(parsed.isNew);
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(parsed.discounted);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string[]>>({});

  const updateUrl = useCallback(
    (overrides?: { sort?: ProductFilters['sort']; minPrice?: number; maxPrice?: number; isNew?: boolean; discounted?: boolean }) => {
      const p = new URLSearchParams();
      const s = overrides?.sort ?? sortBy;
      const minP = overrides?.minPrice ?? priceRange[0];
      const maxP = overrides?.maxPrice ?? priceRange[1];
      const n = overrides?.isNew ?? showOnlyNew;
      const d = overrides?.discounted ?? showOnlyDiscounted;
      if (s && s !== 'recommended') p.set('sort', s);
      if (minP > 0) p.set('minPrice', String(minP));
      if (maxP < 10000) p.set('maxPrice', String(maxP));
      if (n) p.set('isNew', '1');
      if (d) p.set('discounted', '1');
      const qs = p.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    },
    [sortBy, priceRange, showOnlyNew, showOnlyDiscounted],
  );

  const handleSortChange = useCallback((v: string) => {
    const val = v as ProductFilters['sort'];
    setSortBy(val);
    updateUrl({ sort: val });
  }, [updateUrl]);

  const handlePriceChange = useCallback((v: number[]) => {
    const range = v as [number, number];
    setPriceRange(range);
    updateUrl({ minPrice: range[0], maxPrice: range[1] });
  }, [updateUrl]);

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
    setSortBy('recommended');
    setPriceRange([0, 10000]);
    setSelectedBrands([]);
    setSelectedSpecFilters({});
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const reparsed = parseSearchParams(window.location.search);
    setSortBy(reparsed.sort);
    setPriceRange([reparsed.minPrice, reparsed.maxPrice]);
    setShowOnlyNew(reparsed.isNew);
    setShowOnlyDiscounted(reparsed.discounted);
    setSelectedBrands([]);
    setSelectedSpecFilters({});
  }, [slug]);

  const filters: ProductFilters = {
    categoryId: category?.id,
    sort: sortBy,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
  };

  const { data: products = [], isLoading: productsLoading } = useProducts(filters);
  const isLoading = categoriesLoading || (!!category && productsLoading);

  // Marka seçenekleri
  const brandOptions = useMemo(() => {
    const vals = new Set<string>();
    products.forEach(p => { if (p.brand) vals.add(p.brand); });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [products]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => { if (p.brand) counts[p.brand] = (counts[p.brand] ?? 0) + 1; });
    return counts;
  }, [products]);

  // Dinamik spec filtre seçenekleri
  const specFilterOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const attr of filterAttributes) {
      const vals = new Set<string>();
      products.forEach(p => {
        getSpecValues(p, attr.key).forEach(v => vals.add(v));
      });
      result[attr.key] = Array.from(vals).sort((a, b) => a.localeCompare(b, 'tr'));
    }
    return result;
  }, [products, filterAttributes]);

  const toggleSpec = (key: string, val: string) => {
    setSelectedSpecFilters(prev => {
      const current = prev[key] ?? [];
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...prev, [key]: next };
    });
  };

  const toggleBrand = (val: string) => {
    setSelectedBrands(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const specFilterCount = Object.values(selectedSpecFilters).reduce((s, arr) => s + arr.length, 0);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (showOnlyNew) result = result.filter(p => p.isNew);
    if (showOnlyDiscounted) result = result.filter(p => !!p.discountBadge);
    if (selectedBrands.length > 0) result = result.filter(p => p.brand && selectedBrands.includes(p.brand));
    for (const attr of filterAttributes) {
      const sel = selectedSpecFilters[attr.key] ?? [];
      if (sel.length > 0) {
        result = result.filter(p => getSpecValues(p, attr.key).some(v => sel.includes(v)));
      }
    }
    return sortBy === 'recommended' ? sortRecommended(result) : sortBy === 'discounted' ? sortDiscountedFirst(result) : result;
  }, [sortBy, products, showOnlyNew, showOnlyDiscounted, selectedBrands, selectedSpecFilters, filterAttributes]);
  const { visible: visibleProducts, hasMore: hasMoreProducts, sentinelRef: productsSentinelRef } = useInfiniteList(filteredProducts, 12);
  const showSkeleton = useMinimumSkeleton(isLoading);

  const categoryContentHtml = useMemo(
    () => (category?.contentHtml ? sanitizeAdminHtml(category.contentHtml) : ''),
    [category?.contentHtml],
  );

  const priceActive = priceRange[0] > 0 || priceRange[1] < 10000;
  const hasActiveFilters = showOnlyNew || showOnlyDiscounted || priceActive || selectedBrands.length > 0 || specFilterCount > 0;
  const activeFilterCount =
    (showOnlyNew ? 1 : 0) +
    (showOnlyDiscounted ? 1 : 0) +
    (priceActive ? 1 : 0) +
    selectedBrands.length +
    specFilterCount;

  // Aktif chip listesi — filtre paneli üzerinde görünür
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    ...(showOnlyNew ? [{ key: 'new', label: 'Yeni', onRemove: () => { setShowOnlyNew(false); updateUrl({ isNew: false }); } }] : []),
    ...(showOnlyDiscounted ? [{ key: 'disc', label: 'İndirimli', onRemove: () => { setShowOnlyDiscounted(false); updateUrl({ discounted: false }); } }] : []),
    ...(priceActive ? [{ key: 'price', label: `${priceRange[0].toLocaleString('tr-TR')}–${priceRange[1].toLocaleString('tr-TR')} ₺`, onRemove: () => { setPriceRange([0, 10000]); updateUrl({ minPrice: 0, maxPrice: 10000 }); } }] : []),
    ...selectedBrands.map(b => ({ key: `br-${b}`, label: b, onRemove: () => toggleBrand(b) })),
    ...filterAttributes.flatMap(attr =>
      (selectedSpecFilters[attr.key] ?? []).map(v => ({ key: `sp-${attr.key}-${v}`, label: v, onRemove: () => toggleSpec(attr.key, v) }))
    ),
  ];

  // Filtre panelinin sütun sayısı — gelişmiş filtreler varsa genişler
  const advancedCount = filterAttributes.filter(a => (specFilterOptions[a.key]?.length ?? 0) >= 2).length;
  const panelCols = advancedCount >= 2 ? 'sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2';

  if (!category && !isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header />
        <main className="pt-8 pb-12 px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            <h1 className="font-display text-5xl mb-4 text-white">Kategori Bulunamadı</h1>
            <Link href="/"><span className="text-sm text-white/50 hover:text-white transition-colors underline underline-offset-4">Ana Sayfaya Dön</span></Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title={category?.seoTitle?.trim() || category?.name || 'Kategori'}
        description={category?.seoDescription?.trim() || `${category?.name || 'Ürünler'} - Sepetzen kamp, outdoor ve bıçak koleksiyonu`}
        url={`/kategori/${slug}`}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          ...ancestorCategories.map(a => ({ name: a.name, url: `/kategori/${a.slug}` })),
          { name: category?.name || 'Kategori', url: `/kategori/${slug}` },
        ]}
      />
      <Header />
      <div className="overflow-x-hidden">

      {/* ─── SAYFA BAŞLIĞI (Mağaza ile aynı) ─── */}
      <div className="bg-[#0F0F0F] border-b border-white/8 pt-4 pb-3 px-6">
        <div className="max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/50 mb-2" data-testid="breadcrumb">
            <Link href="/"><span className="hover:text-white transition-colors cursor-pointer">Ana Sayfa</span></Link>
            <ChevronRight className="w-3 h-3" />
            {ancestorCategories.map((a, i) => (
              <span key={a.id} className="contents">
                <Link href={`/kategori/${a.slug}`}>
                  <span className="hover:text-white transition-colors cursor-pointer" data-testid={i === ancestorCategories.length - 1 ? 'link-parent-category' : `link-ancestor-category-${a.id}`}>{a.name}</span>
                </Link>
                <ChevronRight className="w-3 h-3" />
              </span>
            ))}
            <span className="text-white font-semibold">{category?.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="font-black text-[22px] lg:text-[28px] text-white tracking-tight leading-none" data-testid="text-category-title">
              {category?.name}
            </h1>
            {!isLoading && (
              <span className="text-[12px] text-white/50 font-mono tabular-nums">({filteredProducts.length} ürün)</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── FILTRE PANELİ (sağdan açılır) ─── */}
      <FilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        hasActive={hasActiveFilters}
        onClear={clearFilters}
        resultCount={filteredProducts.length}
        groups={[
          {
            id: 'sort',
            label: 'Sıralama',
            content: (
              <div className="space-y-0.5">
                {sortOptions.map(o => (
                  <CheckItem key={o.value} label={o.label} checked={sortBy === o.value} onChange={() => handleSortChange(o.value)} />
                ))}
              </div>
            ),
          },
          {
            id: 'status',
            label: 'Durum',
            badge: (showOnlyNew ? 1 : 0) + (showOnlyDiscounted ? 1 : 0),
            content: (
              <div className="space-y-0.5">
                <CheckItem label="Yeni Gelenler" checked={showOnlyNew} onChange={handleToggleNew} />
                <CheckItem label="İndirimli" checked={showOnlyDiscounted} onChange={handleToggleDiscounted} />
              </div>
            ),
          },
          {
            id: 'price',
            label: 'Fiyat',
            badge: priceActive ? 1 : 0,
            content: <PriceRangeFilter value={priceRange} onChange={(range: [number, number]) => handlePriceChange(range)} />,
          },
          ...(brandOptions.length >= 2
            ? [{
                id: 'brand',
                label: 'Marka',
                badge: selectedBrands.length,
                content: <MultiCheckList options={brandOptions} selected={selectedBrands} onToggle={toggleBrand} counts={brandCounts} />,
              }]
            : []),
          ...filterAttributes
            .filter(attr => (specFilterOptions[attr.key] ?? []).length >= 2)
            .map(attr => ({
              id: `spec-${attr.key}`,
              label: attr.label,
              badge: (selectedSpecFilters[attr.key] ?? []).length,
              content: (
                <MultiCheckList
                  options={specFilterOptions[attr.key] ?? []}
                  selected={selectedSpecFilters[attr.key] ?? []}
                  onToggle={(val) => toggleSpec(attr.key, val)}
                />
              ),
            })),
        ]}
      />

      <div className="theme-light-zone">
      {/* ─── ARAÇ ÇUBUĞU (Mağaza ile aynı) ─── */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-5 lg:pt-6">
        <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-white/12 text-[11px] tracking-[0.14em] uppercase font-semibold text-white hover:border-white hover:text-white transition-colors rounded-sm"
              data-testid="button-open-filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtrele
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-0.5 border border-white/12 rounded-sm p-0.5">
              <button
                onClick={() => setGridCols(3)}
                className={`p-1.5 rounded-[2px] transition-colors ${gridCols === 3 ? 'bg-white text-black' : 'text-white/45 hover:text-white'}`}
                aria-label="3 sütun"
                data-testid="button-grid-3"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGridCols(4)}
                className={`p-1.5 rounded-[2px] transition-colors ${gridCols === 4 ? 'bg-white text-black' : 'text-white/45 hover:text-white'}`}
                aria-label="4 sütun"
                data-testid="button-grid-4"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] border-white/12 text-white bg-white/5 rounded-sm h-9 text-[12px] tracking-wide focus:ring-white/35" data-testid="select-sort">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent className="rounded-sm border-white/12 bg-[#141414]">
              {sortOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-[12px] text-white focus:bg-white/10 focus:text-white cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {activeChips.map(chip => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 bg-white/8 text-white/70 text-[11px] font-medium px-2.5 py-1 rounded-full hover:bg-white/12 transition-colors"
              >
                {chip.label}<X className="w-3 h-3" />
              </button>
            ))}
            {activeChips.length > 1 && (
              <button onClick={clearFilters} className="text-[11px] text-white/40 hover:text-white transition-colors underline underline-offset-2" data-testid="button-clear-filters">
                Tümünü Temizle
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── ALT KATEGORİLER ─── */}
      {childCategories.length > 0 && (
        <section className="pt-8 px-5 lg:px-8" data-testid="section-subcategories">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium mb-4">Alt Kategoriler</h2>
            <SubcategoryStrip items={childCategories} />
          </div>
        </section>
      )}

      {/* ─── ÜRÜN IZGARASI ─── */}
      <main className="pt-2 pb-10 lg:pb-14 px-4 lg:px-6">
        <div className="max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {showSkeleton ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                className={`grid grid-cols-2 gap-4 lg:gap-6 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
              >
                {Array.from({ length: gridCols === 4 ? 8 : 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </motion.div>
            ) : filteredProducts.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                <p className="font-display text-3xl text-white mb-2">Ürün Bulunamadı</p>
                <p className="text-sm text-white/50 mb-8">
                  {hasActiveFilters ? 'Filtreleri değiştirerek tekrar deneyin.' : 'Bu kategoride henüz ürün bulunmuyor.'}
                </p>
                {hasActiveFilters ? (
                  <button onClick={clearFilters} className="text-[11px] tracking-[0.15em] uppercase border border-white/25 text-white px-6 py-3 hover:bg-white hover:text-black transition-colors">
                    Filtreleri Temizle
                  </button>
                ) : (
                  <Link href="/"><span className="text-[11px] tracking-[0.15em] uppercase border border-white/25 text-white px-6 py-3 hover:bg-white hover:text-black transition-colors">Alışverişe Devam Et</span></Link>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${slug}`}
                className={`grid grid-cols-2 gap-4 lg:gap-6 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {visibleProducts.map((product) => (
                  <motion.div key={product.id} variants={cardVariants}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {hasMoreProducts && (
            <div ref={productsSentinelRef} className="mt-8" data-testid="products-load-more">
              <ProductGridSkeleton
                count={gridCols === 4 ? 4 : 3}
                className={`grid grid-cols-2 gap-4 lg:gap-6 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─── KATEGORİ SEO İÇERİĞİ ─── */}
      {categoryContentHtml && (
        <section className="py-12 px-5 lg:px-8 border-t border-white/8" data-testid="section-category-content">
          <div className="max-w-[840px] mx-auto">
            <div className="product-rich-copy" dangerouslySetInnerHTML={{ __html: categoryContentHtml }} />
          </div>
        </section>
      )}

      {/* ─── DİĞER KATEGORİLER ─── */}
      {categories.length > 1 && (
        <section className="py-12 px-5 lg:px-8 border-t border-white/8">
          <div className="max-w-[1400px] mx-auto">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium mb-6">Diğer Kategoriler</h3>
            <SubcategoryStrip items={categories.filter(c => c.slug !== slug && !c.parentId)} testIdPrefix="button-other-category" />
          </div>
        </section>
      )}

      </div>

      <Footer />
      </div>
    </div>
  );
}

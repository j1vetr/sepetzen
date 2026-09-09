import { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useParams, useSearch } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, useFilterAttributes, type ProductFilters } from '@/hooks/useProducts';
import { sanitizeAdminHtml } from '@/lib/sanitizeHtml';
import { PriceRangeFilter } from '@/components/PriceRangeFilter';
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

const COLLAPSE_THRESHOLD = 5;

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
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, COLLAPSE_THRESHOLD);
  const hidden = options.length - COLLAPSE_THRESHOLD;
  return (
    <div className="space-y-0.5">
      {visible.map(opt => (
        <CheckItem key={opt} label={opt} checked={selected.includes(opt)} onChange={() => onToggle(opt)} count={counts?.[opt]} />
      ))}
      {options.length > COLLAPSE_THRESHOLD && (
        <button onClick={() => setShowAll(v => !v)} className="flex items-center gap-1.5 py-1.5 text-[12px] text-white/40 hover:text-white transition-colors">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} strokeWidth={2} />
          {showAll ? 'Daha Az Göster' : `Daha Fazla Göster (${hidden})`}
        </button>
      )}
    </div>
  );
}

// ── URL parametreleri ─────────────────────────────────────────────────────────

function parseSearchParams(search: string) {
  const params = new URLSearchParams(search);
  const sort = (params.get('sort') || 'newest') as ProductFilters['sort'];
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
  const parentCategory = category?.parentId ? categories.find(c => c.id === category.parentId) : undefined;

  const parsed = useMemo(() => parseSearchParams(search), [search]);

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>(parsed.sort);
  const [priceRange, setPriceRange] = useState<[number, number]>([parsed.minPrice, parsed.maxPrice]);
  const [showOnlyNew, setShowOnlyNew] = useState(parsed.isNew);
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(parsed.discounted);
  const [filterOpen, setFilterOpen] = useState(false);
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
      if (s && s !== 'newest') p.set('sort', s);
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
    setSortBy('newest');
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
        const val = p.specs?.[attr.key as keyof NonNullable<typeof p.specs>];
        if (val) vals.add(val);
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
        result = result.filter(p => {
          const val = p.specs?.[attr.key as keyof NonNullable<typeof p.specs>];
          return val && sel.includes(val);
        });
      }
    }
    return result;
  }, [products, showOnlyNew, showOnlyDiscounted, selectedBrands, selectedSpecFilters, filterAttributes]);

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
          ...(parentCategory ? [{ name: parentCategory.name, url: `/kategori/${parentCategory.slug}` }] : []),
          { name: category?.name || 'Kategori', url: `/kategori/${slug}` },
        ]}
      />
      <Header />
      <div className="overflow-x-hidden">

      {/* ─── CATEGORY HERO ─── */}
      <section className="relative overflow-hidden bg-black" style={{ height: '18vh', minHeight: 140, maxHeight: 200 }}>
        <motion.div initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
          {category?.image && (
            <img src={category.image} alt={category.name || 'Kategori'} className="w-full h-full object-cover opacity-45"
              loading="eager" fetchPriority="high" decoding="async" data-testid="img-category-hero" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-4 lg:pb-5 w-full">
            <motion.nav initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="flex items-center gap-2 text-[10px] text-white/45 tracking-wider uppercase mb-1.5" data-testid="breadcrumb">
              <Link href="/"><span className="hover:text-white transition-colors">Ana Sayfa</span></Link>
              <ChevronRight className="w-3 h-3" />
              {parentCategory && (
                <>
                  <Link href={`/kategori/${parentCategory.slug}`}>
                    <span className="hover:text-white transition-colors" data-testid="link-parent-category">{parentCategory.name}</span>
                  </Link>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
              <span className="text-white/75">{category?.name}</span>
            </motion.nav>
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-[1.1]" data-testid="text-category-title">
                {category?.name?.toUpperCase()}
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-white/45 text-[10px] tracking-[0.2em] uppercase">
                {filteredProducts.length} ürün
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <div className="border-b border-white/8 sticky top-16 lg:top-0 bg-[#0F0F0F] z-30">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide min-w-0">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-medium text-white shrink-0 hover:text-white/60 transition-colors"
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

              {activeChips.map(chip => (
                <button key={chip.key} onClick={chip.onRemove}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-white/25 text-white px-2.5 py-1 shrink-0 hover:bg-white hover:text-black transition-colors">
                  {chip.label}<X className="w-2.5 h-2.5" />
                </button>
              ))}

              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="text-[10px] tracking-[0.1em] uppercase text-white/40 hover:text-white transition-colors shrink-0 underline underline-offset-2"
                  data-testid="button-clear-filters">
                  Temizle
                </button>
              )}
            </div>

            <div className="shrink-0">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="h-8 border-0 bg-transparent text-[11px] tracking-[0.12em] uppercase font-medium text-white/55 hover:text-white focus:ring-0 focus:ring-offset-0 gap-1 pr-0 shadow-none" data-testid="select-sort">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/12 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                  {sortOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs text-white focus:bg-white/10 focus:text-white cursor-pointer">
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
            className="category-filter-panel overflow-hidden border-b border-white/8 bg-[#0F0F0F]"
            data-testid="category-filter-panel"
          >
            <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain touch-pan-y max-w-[1400px] mx-auto px-5 lg:px-8 py-8 pb-[calc(var(--mobile-nav-total,58px)+2rem)] lg:max-h-none lg:overflow-visible lg:pb-8">
              <div className={`grid grid-cols-1 ${panelCols} gap-x-10 gap-y-8`}>

                {/* Fiyat Aralığı */}
                <FilterGroup title="Fiyat Aralığı">
                  <PriceRangeFilter value={priceRange} onChange={(range: [number, number]) => handlePriceChange(range)} />
                </FilterGroup>

                {/* Durum */}
                <FilterGroup title="Durum">
                  <div className="space-y-0.5">
                    <CheckItem label="Yeni Gelenler" checked={showOnlyNew} onChange={handleToggleNew} />
                    <CheckItem label="İndirimli" checked={showOnlyDiscounted} onChange={handleToggleDiscounted} />
                  </div>
                </FilterGroup>

                {/* Marka */}
                {brandOptions.length >= 2 && (
                  <FilterGroup title="Marka" defaultOpen={selectedBrands.length > 0}>
                    <MultiCheckList options={brandOptions} selected={selectedBrands} onToggle={toggleBrand} counts={brandCounts} />
                  </FilterGroup>
                )}

                {/* Dinamik spec filtreleri */}
                {filterAttributes.map(attr => {
                  const options = specFilterOptions[attr.key] ?? [];
                  const selected = selectedSpecFilters[attr.key] ?? [];
                  if (options.length < 2) return null;
                  return (
                    <FilterGroup key={attr.key} title={attr.label} defaultOpen={selected.length > 0}>
                      <MultiCheckList options={options} selected={selected} onToggle={(val) => toggleSpec(attr.key, val)} />
                    </FilterGroup>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ALT KATEGORİLER ─── */}
      {childCategories.length > 0 && (
        <section className="pt-8 px-5 lg:px-8" data-testid="section-subcategories">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium mb-4">Alt Kategoriler</h2>
            <div className="flex flex-wrap gap-2">
              {childCategories.map(child => (
                <Link key={child.id} href={`/kategori/${child.slug}`}>
                  <span className="inline-block border border-white/20 text-white text-[11px] tracking-[0.12em] uppercase px-4 py-2.5 cursor-pointer transition-colors hover:border-white hover:bg-white hover:text-black" data-testid={`link-subcategory-${child.slug}`}>
                    {child.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── ÜRÜN IZGARASI ─── */}
      <main className="py-10 lg:py-14 px-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-[#151515]" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3.5 bg-white/10 w-4/5" />
                    <div className="h-3.5 bg-white/10 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
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
            <div className="flex flex-wrap gap-1.5">
              {categories.filter(c => c.slug !== slug && !c.parentId).map(cat => (
                <Link key={cat.id} href={`/kategori/${cat.slug}`}>
                  <motion.span
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.45)' }}
                    transition={{ duration: 0.18 }}
                    className="inline-block border border-white/12 bg-white/5 backdrop-blur-sm rounded-md text-white/70 text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 cursor-pointer"
                    data-testid={`button-other-category-${cat.slug}`}>
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
    </div>
  );
}

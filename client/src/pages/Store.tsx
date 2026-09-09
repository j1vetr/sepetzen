import { useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useSearch } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, LayoutGrid, Grid3X3, ArrowUpRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, useFilterAttributes, type ProductFilters } from '@/hooks/useProducts';
import { PriceRangeFilter } from '@/components/PriceRangeFilter';
import { useFreeShippingThreshold } from '@/hooks/useShippingSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Artan' },
  { value: 'price_desc', label: 'Fiyat: Azalan' },
  { value: 'popular', label: 'En Popüler' },
];

const COLLAPSE_THRESHOLD = 5;

// ── Yardımcı bileşenler ──────────────────────────────────────────────────────

function FilterSection({
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
    <div className="border-b border-white/8 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-4 group"
      >
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/70 group-hover:text-white transition-colors">
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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

function CheckItem({
  label,
  checked,
  onChange,
  count,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  testId?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 px-2 py-2 cursor-pointer group hover:bg-white/5 rounded-sm">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} data-testid={testId} />
      <span
        className={`w-4 h-4 border rounded-sm flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'border-white bg-white/10' : 'border-white/20 group-hover:border-white'
        }`}
      >
        {checked && <span className="w-2 h-2 rounded-[2px] bg-white" />}
      </span>
      <span className={`flex-1 text-[13px] transition-colors ${checked ? 'text-white' : 'text-white/65 group-hover:text-white'}`}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-white/30 tabular-nums">{count}</span>
      )}
    </label>
  );
}

function MultiCheckList({
  options,
  selected,
  onToggle,
  counts,
  testIdPrefix,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  counts?: Record<string, number>;
  testIdPrefix?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, COLLAPSE_THRESHOLD);
  const hidden = options.length - COLLAPSE_THRESHOLD;
  return (
    <div className="space-y-0.5">
      {visible.map(opt => (
        <CheckItem
          key={opt}
          label={opt}
          checked={selected.includes(opt)}
          onChange={() => onToggle(opt)}
          count={counts?.[opt]}
          testId={testIdPrefix ? `${testIdPrefix}-${opt}` : undefined}
        />
      ))}
      {options.length > COLLAPSE_THRESHOLD && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1.5 w-full px-2 py-2 text-[12px] text-white/50 hover:text-white transition-colors rounded-sm"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
          {showAll ? 'Daha Az Göster' : `Daha Fazla Göster (${hidden})`}
        </button>
      )}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────

export default function Store() {
  const { data: categories = [] } = useCategories();
  const { data: filterAttributes = [] } = useFilterAttributes();
  const search = useSearch();
  const brandParam = new URLSearchParams(search).get('brand') ?? undefined;

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  // Dinamik filtre değerleri: { [key]: string[] }
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string[]>>({});

  const freeShippingThreshold = useFreeShippingThreshold();

  const filters: ProductFilters = {
    categoryId: selectedCategory,
    sort: sortBy,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
  };

  const { data: fetchedProducts = [], isLoading } = useProducts(filters);

  // Marka seçenekleri
  const brandOptions = useMemo(() => {
    const vals = new Set<string>();
    fetchedProducts.forEach(p => { if (p.brand) vals.add(p.brand); });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [fetchedProducts]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    fetchedProducts.forEach(p => { if (p.brand) counts[p.brand] = (counts[p.brand] ?? 0) + 1; });
    return counts;
  }, [fetchedProducts]);

  // Dinamik spec filtre seçenekleri — her attribute için ürünlerden türetilir
  const specFilterOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const attr of filterAttributes) {
      const vals = new Set<string>();
      fetchedProducts.forEach(p => {
        const val = p.specs?.[attr.key as keyof NonNullable<typeof p.specs>];
        if (val) vals.add(val);
      });
      result[attr.key] = Array.from(vals).sort((a, b) => a.localeCompare(b, 'tr'));
    }
    return result;
  }, [fetchedProducts, filterAttributes]);

  const toggleSpec = (key: string, val: string) => {
    setSelectedSpecFilters(prev => {
      const current = prev[key] ?? [];
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...prev, [key]: next };
    });
  };

  const filteredProducts = useMemo(() => {
    let result = fetchedProducts;
    if (brandParam) {
      result = result.filter(p => (p.brand || 'Sepetzen').toLowerCase() === brandParam.toLowerCase());
    }
    if (selectedBrands.length > 0) {
      result = result.filter(p => p.brand && selectedBrands.includes(p.brand));
    }
    for (const attr of filterAttributes) {
      const sel = selectedSpecFilters[attr.key] ?? [];
      if (sel.length > 0) {
        result = result.filter(p => {
          const val = p.specs?.[attr.key as keyof NonNullable<typeof p.specs>];
          return val && sel.includes(val);
        });
      }
    }
    if (statusFilters.includes('free-shipping')) {
      result = result.filter(p => (parseFloat(p.basePrice || '0') || 0) >= freeShippingThreshold);
    }
    if (statusFilters.includes('new')) result = result.filter(p => p.isNew);
    if (statusFilters.includes('discounted')) result = result.filter(p => !!p.discountBadge);
    return result;
  }, [fetchedProducts, brandParam, statusFilters, freeShippingThreshold, selectedBrands, selectedSpecFilters, filterAttributes]);

  const toggleStatusFilter = (value: string) => {
    setStatusFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const toggleBrand = (val: string) => {
    setSelectedBrands(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const specFilterCount = Object.values(selectedSpecFilters).reduce((s, arr) => s + arr.length, 0);

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSortBy('newest');
    setPriceRange([0, 10000]);
    setStatusFilters([]);
    setSelectedBrands([]);
    setSelectedSpecFilters({});
  };

  const hasActiveFilters =
    priceRange[0] > 0 ||
    priceRange[1] < 10000 ||
    !!selectedCategory ||
    statusFilters.length > 0 ||
    selectedBrands.length > 0 ||
    specFilterCount > 0;

  const activeFilterCount =
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    statusFilters.length +
    selectedBrands.length +
    specFilterCount;

  const VISIBLE_CATEGORY_COUNT = 5;
  const orderedCategories = useMemo(() => {
    const byOrder = (a: (typeof categories)[number], b: (typeof categories)[number]) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    const tops = categories.filter(c => !c.parentId).sort(byOrder);
    const topIds = tops.map(t => t.id);
    const result: ((typeof categories)[number] & { isChild?: boolean })[] = [];
    for (const top of tops) {
      result.push(top);
      categories.filter(c => c.parentId === top.id).sort(byOrder).forEach(child => result.push({ ...child, isChild: true }));
    }
    categories.filter(c => c.parentId && topIds.indexOf(c.parentId) === -1).sort(byOrder).forEach(c => result.push(c));
    return result;
  }, [categories]);

  const visibleCategories = showAllCategories ? orderedCategories : orderedCategories.slice(0, VISIBLE_CATEGORY_COUNT);
  const hiddenCategoryCount = orderedCategories.length - VISIBLE_CATEGORY_COUNT;

  // Aktif chip listesi
  const activeChips: { key: string; label: string; onRemove: () => void; isLink?: boolean }[] = [
    ...(brandParam ? [{ key: 'brand-param', label: `Marka: ${brandParam}`, onRemove: () => {}, isLink: true }] : []),
    ...(selectedCategory
      ? [{ key: 'cat', label: categories.find(c => c.id === selectedCategory)?.name ?? '', onRemove: () => setSelectedCategory(undefined) }]
      : []),
    ...(priceRange[0] > 0 || priceRange[1] < 10000
      ? [{ key: 'price', label: `${priceRange[0].toLocaleString('tr-TR')}–${priceRange[1].toLocaleString('tr-TR')} ₺`, onRemove: () => setPriceRange([0, 10000]) }]
      : []),
    ...statusFilters.map(s => ({
      key: `status-${s}`,
      label: s === 'free-shipping' ? 'Ücretsiz Kargo' : s === 'new' ? 'Yeni' : 'İndirimli',
      onRemove: () => toggleStatusFilter(s),
    })),
    ...selectedBrands.map(b => ({
      key: `brand-${b}`,
      label: b,
      onRemove: () => toggleBrand(b),
    })),
    ...filterAttributes.flatMap(attr =>
      (selectedSpecFilters[attr.key] ?? []).map(v => ({
        key: `spec-${attr.key}-${v}`,
        label: v,
        onRemove: () => toggleSpec(attr.key, v),
      }))
    ),
  ];

  const sidebarContent = (
    <div>
      {/* Kategori */}
      <FilterSection title="Kategori">
        <div className="space-y-0.5">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`group flex items-center justify-between w-full px-2.5 py-2 text-[13px] transition-all rounded-sm ${
              !selectedCategory ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            data-testid="filter-category-all"
          >
            <span>Tüm Ürünler</span>
            {!selectedCategory && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
          {visibleCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`group flex items-center justify-between w-full px-2.5 py-2 text-[13px] transition-all rounded-sm ${
                selectedCategory === cat.id ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`filter-category-${cat.slug}`}
            >
              <span className={cat.isChild ? 'pl-4' : ''}>{cat.isChild ? `└ ${cat.name}` : cat.name}</span>
              {selectedCategory === cat.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
          ))}
          {hiddenCategoryCount > 0 && (
            <button
              onClick={() => setShowAllCategories(v => !v)}
              className="flex items-center gap-1.5 w-full px-2.5 py-2 text-[12px] text-white/50 hover:text-white transition-colors rounded-sm"
              data-testid="button-toggle-categories"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllCategories ? 'rotate-180' : ''}`} strokeWidth={2} />
              <span>{showAllCategories ? 'Daha Az Göster' : `Daha Fazla Göster (${hiddenCategoryCount})`}</span>
            </button>
          )}
        </div>
      </FilterSection>

      {/* Fiyat Aralığı */}
      <FilterSection title="Fiyat Aralığı">
        <PriceRangeFilter value={priceRange} onChange={setPriceRange} className="px-1" />
      </FilterSection>

      {/* Marka */}
      {brandOptions.length >= 2 && (
        <FilterSection title="Marka" defaultOpen={selectedBrands.length > 0}>
          <MultiCheckList
            options={brandOptions}
            selected={selectedBrands}
            onToggle={toggleBrand}
            counts={brandCounts}
            testIdPrefix="filter-brand"
          />
        </FilterSection>
      )}

      {/* Dinamik spec filtreleri — admin panelinden yapılandırılır */}
      {filterAttributes.map(attr => {
        const options = specFilterOptions[attr.key] ?? [];
        const selected = selectedSpecFilters[attr.key] ?? [];
        if (options.length < 2) return null;
        return (
          <FilterSection key={attr.key} title={attr.label} defaultOpen={selected.length > 0}>
            <MultiCheckList
              options={options}
              selected={selected}
              onToggle={(val) => toggleSpec(attr.key, val)}
              testIdPrefix={`filter-spec-${attr.key}`}
            />
          </FilterSection>
        );
      })}

      {/* Durum */}
      <FilterSection title="Durum">
        <div className="space-y-0.5">
          {[
            { label: 'Ücretsiz Kargo', value: 'free-shipping' },
            { label: 'Yeni Ürünler', value: 'new' },
            { label: 'İndirimli', value: 'discounted' },
          ].map(opt => (
            <CheckItem
              key={opt.value}
              label={opt.label}
              checked={statusFilters.includes(opt.value)}
              onChange={() => toggleStatusFilter(opt.value)}
              testId={`filter-status-${opt.value}`}
            />
          ))}
        </div>
      </FilterSection>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/25 text-white text-[11px] tracking-[0.14em] uppercase font-semibold hover:bg-white hover:text-black transition-colors rounded-sm mt-2"
          data-testid="button-clear-filters"
        >
          <X className="w-3.5 h-3.5" />
          Filtreleri Temizle
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title="Mağaza"
        description="Sepetzen kamp, outdoor, bıçak ve bağ & bahçe ürünlerinin tamamı. Av bıçakları, kamp çakıları ve daha fazlasını keşfedin."
        url="/magaza"
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Mağaza', url: '/magaza' },
        ]}
      />
      <Header />
      <div className="overflow-x-hidden">

      {/* Compact page header */}
      <div className="bg-[#0F0F0F] border-b border-white/8 pt-4 pb-3 px-6">
        <div className="max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/50 mb-2" data-testid="breadcrumb">
            <Link href="/"><span className="hover:text-[#141414] transition-colors cursor-pointer">Ana Sayfa</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-semibold">Mağaza</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="font-black text-[22px] lg:text-[28px] text-white tracking-tight leading-none" data-testid="text-store-title">
              {brandParam ? `Marka: ${brandParam}` : 'Tüm Ürünler'}
            </h1>
            {!isLoading && (
              <span className="text-[12px] text-white/50 font-mono tabular-nums">({filteredProducts.length} ürün)</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 lg:py-6">
        <div className="flex gap-6 lg:gap-8">

          {/* Sol Sidebar — masaüstü */}
          <aside className="hidden lg:block w-[220px] xl:w-[240px] shrink-0">
            <div className="sticky top-24 bg-[#141414] border border-white/8 rounded-sm p-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-bold tracking-[0.20em] uppercase text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  Filtrele
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[10px] text-white/50 hover:text-white hover:underline font-medium transition-colors">
                    Temizle
                  </button>
                )}
              </div>
              {sidebarContent}
            </div>
          </aside>

          {/* Sağ: araç çubuğu + ızgara */}
          <div className="flex-1 min-w-0">
            {/* Araç çubuğu */}
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                {/* Mobil filtre */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-white/12 text-[11px] tracking-[0.14em] uppercase font-semibold text-white hover:border-white hover:text-white transition-colors rounded-sm"
                      data-testid="button-mobile-filter"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Filtrele
                      {activeFilterCount > 0 && (
                        <span className="w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex h-full w-[300px] flex-col overflow-hidden bg-[#141414] border-r border-white/12 p-5">
                    <SheetHeader>
                      <SheetTitle className="text-[13px] font-bold tracking-[0.18em] uppercase text-left text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                        Filtrele
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-[calc(var(--mobile-nav-total,58px)+1rem)]">
                      {sidebarContent}
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Izgara sütun */}
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

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as ProductFilters['sort'])}>
                <SelectTrigger className="w-[180px] border-white/12 text-white bg-white/5 rounded-sm h-9 text-[12px] tracking-wide focus:ring-white/35" data-testid="select-sort">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="rounded-sm border-white/12 bg-[#141414]">
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-[12px] text-white focus:bg-white/10 focus:text-white cursor-pointer">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aktif filtre chip'leri */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {activeChips.map(chip =>
                  chip.isLink ? (
                    <Link key={chip.key} href="/magaza">
                      <span className="inline-flex items-center gap-1.5 bg-white/8 text-white/70 text-[11px] font-medium px-2.5 py-1 rounded-full cursor-pointer hover:bg-white/12">
                        {chip.label}<X className="w-3 h-3" />
                      </span>
                    </Link>
                  ) : (
                    <button
                      key={chip.key}
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1.5 bg-white/8 text-white/70 text-[11px] font-medium px-2.5 py-1 rounded-full hover:bg-white/12 transition-colors"
                    >
                      {chip.label}<X className="w-3 h-3" />
                    </button>
                  )
                )}
                {activeChips.length > 1 && (
                  <button onClick={clearFilters} className="text-[11px] text-white/40 hover:text-white transition-colors underline underline-offset-2" data-testid="button-clear-filters">
                    Tümünü Temizle
                  </button>
                )}
              </div>
            )}

            {/* Ürünler */}
            {isLoading ? (
              <div className={`grid gap-4 grid-cols-2 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-[#151515] rounded-sm" />
                    <div className="mt-3 h-3 bg-white/10 rounded w-3/4" />
                    <div className="mt-2 h-3 bg-white/10 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 border border-white/8 bg-[#141414] rounded-sm">
                <p className="text-white/50 text-[14px] mb-5">Bu kriterlere uygun ürün bulunamadı.</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-white/90 transition-colors rounded-sm"
                  data-testid="button-clear-empty"
                >
                  Filtreleri Temizle<ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`grid gap-x-4 gap-y-8 grid-cols-2 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
              >
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      </div>
    </div>
  );
}

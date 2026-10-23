import { useEffect, useMemo, useState } from 'react';
import { getSpecValues } from '@/lib/specFilter';
import { sortRecommended, sortDiscountedFirst } from '@/lib/productSort';
import { flattenCategoryTree, getAncestors } from '@/lib/categoryTree';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useSearch } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, LayoutGrid, Grid3X3, ArrowUpRight, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, useFilterAttributes, type ProductFilters } from '@/hooks/useProducts';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import { PriceRangeFilter } from '@/components/PriceRangeFilter';
import { FilterDrawer, type FilterDrawerGroup } from '@/components/FilterDrawer';
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
  { value: 'recommended', label: 'Önerilen' },
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Artan' },
  { value: 'price_desc', label: 'Fiyat: Azalan' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'discounted', label: 'İndirimdekiler' },
];


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

const COLLAPSED_LIMIT = 8;

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
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Seçilenler üstte, sonra ürün sayısı çok olandan aza (sayı yoksa alfabetik)
  const sorted = useMemo(() => {
    return [...options].sort((a, b) => {
      const sa = selected.includes(a) ? 0 : 1;
      const sb = selected.includes(b) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (counts) {
        const diff = (counts[b] ?? 0) - (counts[a] ?? 0);
        if (diff !== 0) return diff;
      }
      return a.localeCompare(b, 'tr');
    });
  }, [options, selected, counts]);

  const q = query.trim().toLocaleLowerCase('tr');
  const matches = q ? sorted.filter(o => o.toLocaleLowerCase('tr').includes(q)) : sorted;
  const searchable = options.length > COLLAPSED_LIMIT;
  const shown = expanded || q ? matches : matches.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = matches.length - shown.length;

  return (
    <div>
      {searchable && (
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ara..."
            className="w-full h-9 pl-8 pr-2 bg-white/5 border border-white/12 focus:border-white/40 rounded-sm text-[12px] text-white placeholder:text-white/35 outline-none transition-colors"
            data-testid={testIdPrefix ? `${testIdPrefix}-search` : undefined}
          />
        </div>
      )}
      <div className={`space-y-0.5 ${expanded ? 'max-h-[320px] overflow-y-auto overscroll-contain no-scrollbar' : ''}`}>
        {shown.map(opt => (
          <CheckItem
            key={opt}
            label={opt}
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            count={counts?.[opt]}
            testId={testIdPrefix ? `${testIdPrefix}-${opt}` : undefined}
          />
        ))}
        {shown.length === 0 && <p className="px-2 py-2 text-[12px] text-white/40">Sonuç bulunamadı</p>}
      </div>
      {!q && matches.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-2 px-2 text-[12px] font-semibold text-white/70 hover:text-white underline underline-offset-4 transition-colors"
          data-testid={testIdPrefix ? `${testIdPrefix}-toggle-more` : undefined}
        >
          {expanded ? 'Daha az göster' : `Tümünü göster (+${hiddenCount})`}
        </button>
      )}
    </div>
  );
}

const PRICE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: '0 - 500 ₺', range: [0, 500] },
  { label: '500 - 1.000 ₺', range: [500, 1000] },
  { label: '1.000 - 2.500 ₺', range: [1000, 2500] },
  { label: '2.500 ₺ ve üzeri', range: [2500, 10000] },
];

// ── Ana bileşen ──────────────────────────────────────────────────────────────

export default function Store() {
  const { data: categories = [] } = useCategories();
  const { data: filterAttributes = [] } = useFilterAttributes();
  const search = useSearch();
  const brandParam = new URLSearchParams(search).get('brand') ?? undefined;

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>('recommended');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [statusFilters, setStatusFilters] = useState<string[]>(() => {
    const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return [...(q.get('isNew') === '1' ? ['new'] : []), ...(q.get('discounted') === '1' ? ['discounted'] : [])];
  });
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
        getSpecValues(p, attr.key).forEach(v => vals.add(v));
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
        result = result.filter(p => getSpecValues(p, attr.key).some(v => sel.includes(v)));
      }
    }
    if (statusFilters.includes('free-shipping')) {
      result = result.filter(p => (parseFloat(p.basePrice || '0') || 0) >= freeShippingThreshold);
    }
    if (statusFilters.includes('new')) result = result.filter(p => p.isNew);
    if (statusFilters.includes('discounted')) result = result.filter(p => !!p.discountBadge);
    return sortBy === 'recommended' ? sortRecommended(result) : sortBy === 'discounted' ? sortDiscountedFirst(result) : result;
  }, [sortBy, fetchedProducts, brandParam, statusFilters, freeShippingThreshold, selectedBrands, selectedSpecFilters, filterAttributes]);
  const { visible: visibleProducts, hasMore: hasMoreProducts, sentinelRef: productsSentinelRef } = useInfiniteList(filteredProducts, 24);

  const toggleStatusFilter = (value: string) => {
    setStatusFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const toggleBrand = (val: string) => {
    setSelectedBrands(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const specFilterCount = Object.values(selectedSpecFilters).reduce((s, arr) => s + arr.length, 0);

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSortBy('recommended');
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

  const orderedCategories = useMemo(() => flattenCategoryTree(categories), [categories]);

  // Akordeon: alt kategorisi olan satırlar tıklanınca açılır, varsayılan kapalıdır.
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  // Seçili kategorinin üstleri açık olsun (sayfa ilk açıldığında da görünür kalır)
  useEffect(() => {
    if (!selectedCategory) return;
    const ancestors = getAncestors(categories, selectedCategory).map(a => a.id);
    if (ancestors.length === 0) return;
    setExpandedCats(prev => (ancestors.every(id => prev.has(id)) ? prev : new Set(Array.from(prev).concat(ancestors))));
  }, [selectedCategory, categories]);
  const visibleTreeCategories = useMemo(() => {
    const parentOf = new Map(categories.map(c => [c.id, c.parentId]));
    return orderedCategories.filter(cat => {
      let pid = cat.parentId;
      const seen = new Set<string>();
      while (pid && parentOf.has(pid) && !seen.has(pid)) {
        if (!expandedCats.has(pid)) return false;
        seen.add(pid);
        pid = parentOf.get(pid);
      }
      return true;
    });
  }, [orderedCategories, categories, expandedCats]);


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

  // Alt kategorisi 5'ten fazla olan bir grup, açılınca kendi içinde kayar.
  const renderCategoryNode = (cat: (typeof orderedCategories)[number]): React.ReactNode => {
    const kids = orderedCategories.filter(c => c.parentId === cat.id);
    const hasKids = kids.length > 0;
    const isOpen = expandedCats.has(cat.id);
    return (
      <div key={cat.id}>
              <div key={cat.id} className="flex items-stretch" style={{ paddingLeft: cat.depth * 14 }}>
            <button
              onClick={() => setSelectedCategory(cat.id)}
              className={`group flex items-center justify-between flex-1 min-w-0 px-2.5 py-2 text-[13px] text-left transition-all rounded-sm ${
                selectedCategory === cat.id ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`filter-category-${cat.slug}`}
            >
              <span className="truncate">{cat.name}</span>
              {selectedCategory === cat.id && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
            </button>
            {hasKids && (
              <button
                type="button"
                onClick={() => toggleExpanded(cat.id)}
                aria-label={isOpen ? 'Alt kategorileri gizle' : 'Alt kategorileri göster'}
                aria-expanded={isOpen}
                className="w-8 flex items-center justify-center text-white/45 hover:text-white rounded-sm hover:bg-white/5"
                data-testid={`toggle-category-${cat.slug}`}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        {hasKids && isOpen && (
          <div className={kids.length > 5 ? 'max-h-[184px] overflow-y-auto overscroll-contain pr-1' : ''} data-testid={`category-children-${cat.slug}`}>
            {kids.map(k => renderCategoryNode(k))}
          </div>
        )}
      </div>
    );
  };

  const drawerGroups: FilterDrawerGroup[] = [
    {
      id: 'sort',
      label: 'Sıralama',
      content: (
        <div className="space-y-0.5">
          {sortOptions.map(o => (
            <CheckItem
              key={o.value}
              label={o.label}
              checked={sortBy === o.value}
              onChange={() => setSortBy(o.value as ProductFilters['sort'])}
              testId={`drawer-sort-${o.value}`}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'category',
      label: 'Kategori',
      badge: selectedCategory ? 1 : 0,
      content: (
        <div>
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
          {orderedCategories.filter(c => !c.parentId || !categories.some(x => x.id === c.parentId)).map(cat => renderCategoryNode(cat))}
        </div>
      </div>
      ),
    },
    {
      id: 'status',
      label: 'Durum',
      badge: statusFilters.length,
      content: (
        <div className="space-y-0.5">
          {[
            { label: 'Ücretsiz Kargo', value: 'free-shipping' },
            { label: 'İndirimli', value: 'discounted' },
            { label: 'Yeni', value: 'new' },
          ].map(opt => (
            <CheckItem
              key={opt.value}
              label={opt.label}
              checked={statusFilters.includes(opt.value)}
              onChange={() => toggleStatusFilter(opt.value)}
              testId={`quick-status-${opt.value}`}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'price',
      label: 'Fiyat',
      badge: priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0,
      content: (
        <div>
        <PriceRangeFilter value={priceRange} onChange={setPriceRange} className="px-1" />
        <div className="mt-4 space-y-0.5">
          {PRICE_PRESETS.map(p => {
            const on = priceRange[0] === p.range[0] && priceRange[1] === p.range[1];
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setPriceRange(on ? [0, 10000] : p.range)}
                className={`w-full text-left px-2.5 py-1.5 text-[12.5px] rounded-sm transition-colors ${on ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                data-testid={`price-preset-${p.range[0]}-${p.range[1]}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      ),
    },
    ...(brandOptions.length >= 2
      ? [{
          id: 'brand',
          label: 'Marka',
          badge: selectedBrands.length,
          content: (
            <MultiCheckList
              options={brandOptions}
              selected={selectedBrands}
              onToggle={toggleBrand}
              counts={brandCounts}
              testIdPrefix="filter-brand"
            />
          ),
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
            testIdPrefix={`filter-spec-${attr.key}`}
          />
        ),
      })),
  ];

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

      <div className="theme-light-zone">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 lg:py-6">
        <div className="flex gap-6 lg:gap-8">

          {/* Sağ: araç çubuğu + ızgara */}
          <div className="flex-1 min-w-0">
            {/* Araç çubuğu */}
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                {/* Filtre paneli */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-white/12 text-[11px] tracking-[0.14em] uppercase font-semibold text-white hover:border-white hover:text-white transition-colors rounded-sm"
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
                <FilterDrawer
                  open={filterOpen}
                  onOpenChange={setFilterOpen}
                  groups={drawerGroups}
                  hasActive={hasActiveFilters}
                  onClear={clearFilters}
                  resultCount={filteredProducts.length}
                />

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
                {visibleProducts.map((product, index) => (
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
            {hasMoreProducts && (
              <div ref={productsSentinelRef} className="flex justify-center py-10" data-testid="products-load-more">
                <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <Footer />
      </div>
    </div>
  );
}

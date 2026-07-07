import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, LayoutGrid, Grid3X3, ArrowUpRight, ChevronDown } from 'lucide-react';
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

const GREEN = '#2D5A27';
const GREEN_LIGHT = '#4a9a42';

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-black/8 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-4 group"
      >
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-black/70 group-hover:text-black transition-colors">
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-black/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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

export default function Store() {
  const { data: categories = [] } = useCategories();

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  const filters: ProductFilters = {
    categoryId: selectedCategory,
    sort: sortBy,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
  };

  const { data: filteredProducts = [], isLoading } = useProducts(filters);

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSortBy('newest');
    setPriceRange([0, 10000]);
  };

  const hasActiveFilters = priceRange[0] > 0 || priceRange[1] < 10000 || !!selectedCategory;

  const SidebarContent = () => (
    <div>
      <FilterSection title="Kategori">
        <div className="space-y-0.5">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`group flex items-center justify-between w-full px-2.5 py-2 text-[13px] transition-all rounded-sm ${
              !selectedCategory
                ? 'bg-[#2D5A27]/10 text-[#2D5A27] font-semibold'
                : 'text-black/60 hover:text-black hover:bg-black/[0.04]'
            }`}
            data-testid="filter-category-all"
          >
            <span>Tüm Ürünler</span>
            {!selectedCategory && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27]" />
            )}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`group flex items-center justify-between w-full px-2.5 py-2 text-[13px] transition-all rounded-sm ${
                selectedCategory === cat.id
                  ? 'bg-[#2D5A27]/10 text-[#2D5A27] font-semibold'
                  : 'text-black/60 hover:text-black hover:bg-black/[0.04]'
              }`}
              data-testid={`filter-category-${cat.slug}`}
            >
              <span>{cat.name}</span>
              {selectedCategory === cat.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27]" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Fiyat Aralığı">
        <div className="px-1">
          <Slider
            value={priceRange}
            min={0}
            max={10000}
            step={100}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mb-4"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 border border-black/12 rounded-sm px-2.5 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-black/35 leading-none mb-0.5">Min</p>
              <p className="text-[12px] font-semibold text-black tabular-nums">
                {priceRange[0].toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <span className="text-black/20 text-sm">-</span>
            <div className="flex-1 border border-black/12 rounded-sm px-2.5 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-black/35 leading-none mb-0.5">Maks</p>
              <p className="text-[12px] font-semibold text-black tabular-nums">
                {priceRange[1].toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Durum" defaultOpen={false}>
        <div className="space-y-0.5">
          {[
            { label: 'Ücretsiz Kargo', value: 'free-shipping' },
            { label: 'Yeni Ürünler', value: 'new' },
            { label: 'İndirimli', value: 'discounted' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 px-2 py-2 cursor-pointer group hover:bg-black/[0.03] rounded-sm">
              <span className="w-4 h-4 border border-black/20 rounded-sm flex items-center justify-center shrink-0 group-hover:border-[#2D5A27] transition-colors">
                <span className="w-2 h-2 rounded-sm bg-transparent" />
              </span>
              <span className="text-[13px] text-black/65 group-hover:text-black transition-colors">{opt.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#2D5A27] text-[#2D5A27] text-[11px] tracking-[0.14em] uppercase font-semibold hover:bg-[#2D5A27] hover:text-white transition-colors rounded-sm mt-2"
          data-testid="button-clear-filters"
        >
          <X className="w-3.5 h-3.5" />
          Filtreleri Temizle
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title="Mağaza"
        description="Sepetzen kamp, outdoor, bıçak ve bağ & bahçe ürünlerinin tamamı. Av bıçakları, kamp çakıları ve daha fazlasını keşfedin."
        url="/magaza"
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Mağaza', url: '/magaza' }
        ]}
      />
      <Header />

      {/* Compact page header */}
      <div className="bg-white border-b border-black/8 pt-20 lg:pt-4 pb-3 px-6">
        <div className="max-w-[1400px] mx-auto">
          <nav
            className="flex items-center gap-1.5 text-[11px] tracking-wide text-black/45 mb-2"
            data-testid="breadcrumb"
          >
            <Link href="/"><span className="hover:text-[#2D5A27] transition-colors cursor-pointer">Ana Sayfa</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black font-semibold">Mağaza</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1
              className="font-black text-[22px] lg:text-[28px] text-black tracking-tight leading-none"
              data-testid="text-store-title"
            >
              Tüm Ürünler
            </h1>
            {!isLoading && (
              <span className="text-[12px] text-black/40 font-mono tabular-nums">
                ({filteredProducts.length} ürün)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 lg:py-6">
        <div className="flex gap-6 lg:gap-8">

          {/* ── Left Sidebar — desktop ── */}
          <aside className="hidden lg:block w-[220px] xl:w-[240px] shrink-0">
            <div className="sticky top-24 bg-white border border-black/8 rounded-sm p-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-bold tracking-[0.20em] uppercase text-black flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D5A27]" strokeWidth={2} />
                  Filtrele
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] text-[#2D5A27] hover:underline font-medium"
                  >
                    Temizle
                  </button>
                )}
              </div>
              <SidebarContent />
            </div>
          </aside>

          {/* ── Right: toolbar + grid ── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-black/8">
              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-black/12 text-[11px] tracking-[0.14em] uppercase font-semibold text-black hover:border-[#2D5A27] hover:text-[#2D5A27] transition-colors rounded-sm"
                      data-testid="button-mobile-filter"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Filtrele
                      {hasActiveFilters && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27]" />
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] bg-white border-r border-black/10 p-5">
                    <SheetHeader>
                      <SheetTitle className="text-[13px] font-bold tracking-[0.18em] uppercase text-left text-black flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D5A27]" strokeWidth={2} />
                        Filtrele
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <SidebarContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Grid cols toggle */}
                <div className="hidden sm:flex items-center gap-0.5 border border-black/12 rounded-sm p-0.5">
                  <button
                    onClick={() => setGridCols(3)}
                    className={`p-1.5 rounded-[2px] transition-colors ${gridCols === 3 ? 'bg-[#2D5A27] text-white' : 'text-black/45 hover:text-black'}`}
                    aria-label="3 sütun"
                    data-testid="button-grid-3"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setGridCols(4)}
                    className={`p-1.5 rounded-[2px] transition-colors ${gridCols === 4 ? 'bg-[#2D5A27] text-white' : 'text-black/45 hover:text-black'}`}
                    aria-label="4 sütun"
                    data-testid="button-grid-4"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as ProductFilters['sort'])}>
                <SelectTrigger
                  className="w-[180px] border-black/12 text-black bg-white rounded-sm h-9 text-[12px] tracking-wide focus:ring-[#2D5A27]"
                  data-testid="select-sort"
                >
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="rounded-sm border-black/12">
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-[12px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 bg-[#2D5A27]/10 text-[#2D5A27] text-[11px] font-medium px-2.5 py-1 rounded-full">
                    {categories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(undefined)} className="hover:opacity-60">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                  <span className="inline-flex items-center gap-1.5 bg-[#2D5A27]/10 text-[#2D5A27] text-[11px] font-medium px-2.5 py-1 rounded-full">
                    {priceRange[0].toLocaleString('tr-TR')}-{priceRange[1].toLocaleString('tr-TR')} ₺
                    <button onClick={() => setPriceRange([0, 10000])} className="hover:opacity-60">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Products */}
            {isLoading ? (
              <div className={`grid gap-4 grid-cols-2 ${gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-stone-100 rounded-sm" />
                    <div className="mt-3 h-3 bg-stone-100 rounded w-3/4" />
                    <div className="mt-2 h-3 bg-stone-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 border border-black/8 bg-stone-50 rounded-sm"
              >
                <p className="text-black/45 text-[14px] mb-5">Bu kriterlere uygun ürün bulunamadı.</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-[#4a9a42] transition-colors rounded-sm"
                  data-testid="button-clear-empty"
                >
                  Filtreleri Temizle
                  <ArrowUpRight className="w-3.5 h-3.5" />
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
  );
}

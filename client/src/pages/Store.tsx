import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { ChevronRight, X, SlidersHorizontal, Grid3X3, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'popular', label: 'En Popüler' },
];

export default function Store() {
  const { data: categories = [] } = useCategories();

  const [sortBy, setSortBy] = useState<ProductFilters['sort']>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);

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

  const FilterContent = () => (
    <div className="space-y-10">
      <div>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01</span>
          <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Kategori</h4>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`group block w-full text-left px-3 py-2.5 text-[13px] tracking-wide transition-all border-l-2 ${
              !selectedCategory
                ? 'border-polen-orange text-black font-semibold bg-polen-cream'
                : 'border-transparent text-black/55 hover:text-black hover:border-black/20'
            }`}
            data-testid="filter-category-all"
          >
            Tüm Ürünler
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`group block w-full text-left px-3 py-2.5 text-[13px] tracking-wide transition-all border-l-2 ${
                selectedCategory === cat.id
                  ? 'border-polen-orange text-black font-semibold bg-polen-cream'
                  : 'border-transparent text-black/55 hover:text-black hover:border-black/20'
              }`}
              data-testid={`filter-category-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">02</span>
          <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Fiyat Aralığı</h4>
        </div>
        <Slider
          value={priceRange}
          min={0}
          max={10000}
          step={100}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          className="mb-4"
        />
        <div className="flex justify-between text-xs text-black/45 font-mono tabular-nums">
          <span>₺{priceRange[0].toLocaleString('tr-TR')}</span>
          <span>₺{priceRange[1].toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-3 border border-black/12 text-black text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-black hover:text-white transition-colors rounded-none"
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

      {/* Editorial hero */}
      <section className="relative bg-polen-cream border-b border-black/8 pt-20 lg:pt-10 pb-12 lg:pb-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.nav
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-black/45 mb-8"
            data-testid="breadcrumb"
          >
            <Link href="/">
              <span className="hover:text-polen-orange transition-colors cursor-pointer">Ana Sayfa</span>
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black font-semibold">Mağaza</span>
          </motion.nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-baseline gap-4 mb-4"
              >
                <span className="text-[11px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Koleksiyon</span>
                <span className="h-px w-10 bg-polen-orange/40" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-[0.01em] text-black leading-[0.95]"
                data-testid="text-store-title"
              >
                MAĞAZA
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-black/55 mt-5 text-[15px] max-w-xl leading-relaxed"
              >
                Av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri.
                Dalaman'dan Türkiye geneline hızlı teslimat.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-baseline gap-2"
            >
              <span className="font-display text-4xl text-polen-orange tabular-nums">
                {filteredProducts.length.toString().padStart(2, '0')}
              </span>
              <span className="text-[11px] tracking-[0.22em] uppercase text-black/55">Ürün</span>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-black/10"
          >
            <div className="flex items-center gap-3">
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <button
                    className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 border border-black/12 text-[11px] tracking-[0.18em] uppercase font-semibold text-black hover:bg-black hover:text-white transition-colors"
                    data-testid="button-mobile-filter"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filtrele
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-polen-orange" />
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] bg-white border-r border-black/10 p-6">
                  <SheetHeader>
                    <SheetTitle className="font-display text-lg tracking-[0.18em] uppercase text-left text-black">Filtrele</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden sm:flex items-center gap-1 border border-black/12 p-1">
                <button
                  onClick={() => setGridCols(2)}
                  className={`p-2 transition-colors ${gridCols === 2 ? 'bg-black text-white' : 'text-black/55 hover:text-black'}`}
                  aria-label="2 sütun"
                  data-testid="button-grid-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-2 transition-colors ${gridCols === 3 ? 'bg-black text-white' : 'text-black/55 hover:text-black'}`}
                  aria-label="3 sütun"
                  data-testid="button-grid-3"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as ProductFilters['sort'])}>
              <SelectTrigger className="w-[220px] border-black/12 text-black bg-white rounded-none h-10 text-[12px] tracking-wide" data-testid="select-sort">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black/12">
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-[13px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <div className="flex gap-12">
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-32">
                <div className="flex items-baseline gap-3 mb-8 pb-5 border-b border-black/10">
                  <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">-</span>
                  <h3 className="font-display text-base tracking-[0.18em] uppercase text-black">Filtrele</h3>
                </div>
                <FilterContent />
              </div>
            </aside>

            <div className="flex-1">
              {isLoading ? (
                <div className={`grid gap-6 ${
                  gridCols === 2 ? 'grid-cols-2' :
                  gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-2 lg:grid-cols-4'
                }`}>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] bg-stone-100" />
                      <div className="mt-4 h-3 bg-stone-100 w-3/4" />
                      <div className="mt-2 h-3 bg-stone-100 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 border border-black/8 bg-stone-50"
                >
                  <p className="text-black/55 text-[15px] mb-6">
                    Bu kriterlere uygun ürün bulunamadı.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-polen-orange transition-colors"
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
                  transition={{ delay: 0.2 }}
                  className={`grid gap-x-4 gap-y-10 sm:gap-x-6 ${
                    gridCols === 2 ? 'grid-cols-2' :
                    gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                    'grid-cols-2 lg:grid-cols-4'
                  }`}
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

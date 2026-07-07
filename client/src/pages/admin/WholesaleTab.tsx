import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Percent, ImageIcon, Loader2, Search, ChevronDown, ChevronUp, Tag, Layers } from 'lucide-react';
import type { Product, Category, ProductVariant } from './_shared/types';
import {
  PageHeader,
  Card,
  LoadingState,
  PrimaryButton,
  SelectInput,
} from './_ui/AdminUI';

interface WholesaleTabProps {
  products: Product[];
  categories: Category[];
  allVariants: ProductVariant[];
  productsLoading?: boolean;
}

const PRESET_RATES = [10, 15, 20, 25, 30, 40, 50];

function formatPrice(value: string | number): string {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type DiscountSource = 'product' | 'category' | 'general' | 'none';

interface EffectiveDiscount {
  rate: number;
  source: DiscountSource;
}

export default function WholesaleTab({
  products,
  categories,
  allVariants,
  productsLoading,
}: WholesaleTabProps) {
  const [generalRate, setGeneralRate] = useState<number>(0);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});
  const [productRates, setProductRates] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showCategoryRates, setShowCategoryRates] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  }, [queryClient]);

  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const variants = allVariants.filter((v) => v.productId === p.id);
      if (variants.length === 0) return true;
      const totalStock = variants.reduce((s, v) => s + (v.stock || 0), 0);
      return totalStock > 0;
    });
  }, [products, allVariants]);

  const filteredProducts = useMemo(() => {
    let list = activeProducts;
    if (categoryFilter !== 'all') {
      list = list.filter(
        (p) =>
          p.categoryId === categoryFilter ||
          (p.categoryIds || []).includes(categoryFilter),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeProducts, categoryFilter, search]);

  const getProductCategoryIds = useCallback((product: Product): string[] => {
    const ids: string[] = [];
    if (product.categoryId) ids.push(product.categoryId);
    if (product.categoryIds) {
      for (const cid of product.categoryIds) {
        if (!ids.includes(cid)) ids.push(cid);
      }
    }
    return ids;
  }, []);

  const getEffectiveDiscount = useCallback((product: Product): EffectiveDiscount => {
    const pRate = productRates[product.id];
    if (pRate !== undefined && pRate > 0) {
      return { rate: pRate, source: 'product' };
    }

    const catIds = getProductCategoryIds(product);
    for (const cid of catIds) {
      const cRate = categoryRates[cid];
      if (cRate !== undefined && cRate > 0) {
        return { rate: cRate, source: 'category' };
      }
    }

    if (generalRate > 0) {
      return { rate: generalRate, source: 'general' };
    }

    return { rate: 0, source: 'none' };
  }, [productRates, categoryRates, generalRate, getProductCategoryIds]);

  const hasAnyDiscount = useMemo(() => {
    return generalRate > 0 ||
      Object.values(categoryRates).some(r => r > 0) ||
      Object.values(productRates).some(r => r > 0);
  }, [generalRate, categoryRates, productRates]);

  const usedCategories = useMemo(() => {
    const catIdSet = new Set<string>();
    for (const p of activeProducts) {
      if (p.categoryId) catIdSet.add(p.categoryId);
      if (p.categoryIds) p.categoryIds.forEach(id => catIdSet.add(id));
    }
    return categories.filter(c => catIdSet.has(c.id));
  }, [activeProducts, categories]);

  const handleCategoryRate = (catId: string, value: number) => {
    setCategoryRates(prev => {
      const next = { ...prev };
      if (value <= 0) {
        delete next[catId];
      } else {
        next[catId] = Math.min(99, value);
      }
      return next;
    });
  };

  const handleProductRate = (productId: string, value: number) => {
    setProductRates(prev => {
      const next = { ...prev };
      if (value <= 0 || Number.isNaN(value)) {
        delete next[productId];
      } else {
        next[productId] = Math.min(99, value);
      }
      return next;
    });
  };

  const applyPresetToAll = (rate: number) => {
    setGeneralRate(rate);
  };

  const applyPresetToCategories = (rate: number) => {
    const newRates: Record<string, number> = {};
    for (const c of usedCategories) {
      newRates[c.id] = rate;
    }
    setCategoryRates(newRates);
  };

  const handleDownloadPdf = async () => {
    if (filteredProducts.length === 0) return;
    setDownloading(true);
    try {
      const productIds = filteredProducts.map((p) => p.id);

      const explicitProductDiscounts: Record<string, number> = {};
      for (const [pid, r] of Object.entries(productRates)) {
        if (r > 0) explicitProductDiscounts[pid] = r;
      }

      const res = await fetch('/api/admin/wholesale/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          discountRate: generalRate,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
          productIds,
          categoryDiscounts: categoryRates,
          productDiscounts: explicitProductDiscounts,
        }),
      });
      if (!res.ok) throw new Error('PDF indirilemedi');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Toptan-Fiyat-Listesi-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF indirme hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setDownloading(false);
    }
  };

  if (productsLoading) {
    return <LoadingState message="Ürünler yükleniyor..." />;
  }

  const categoryName =
    categoryFilter !== 'all'
      ? categories.find((c) => c.id === categoryFilter)?.name || ''
      : 'Tüm Kategoriler';

  const sourceLabel: Record<DiscountSource, string> = {
    product: 'Özel',
    category: 'Kategori',
    general: 'Genel',
    none: '',
  };

  const sourceColor: Record<DiscountSource, string> = {
    product: 'bg-violet-50 text-violet-700',
    category: 'bg-blue-50 text-blue-700',
    general: 'bg-amber-50 text-amber-700',
    none: '',
  };

  const activeCatRateCount = Object.values(categoryRates).filter(r => r > 0).length;
  const activeProductRateCount = Object.values(productRates).filter(r => r > 0).length;

  return (
    <div data-testid="tab-wholesale" className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Toptan Satış"
        description={`${filteredProducts.length} ürün listeleniyor`}
        actions={
          <PrimaryButton
            onClick={handleDownloadPdf}
            disabled={downloading || filteredProducts.length === 0}
            data-testid="button-download-wholesale-pdf"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloading ? 'Hazırlanıyor...' : 'PDF İndir'}
          </PrimaryButton>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-2">
              <Percent className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Genel İndirim Oranı (%)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={99}
                value={generalRate || ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setGeneralRate(Number.isNaN(v) ? 0 : Math.min(99, Math.max(0, v)));
                }}
                placeholder="0"
                className="w-20 h-9 px-3 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                data-testid="input-discount-rate"
              />
              {PRESET_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => applyPresetToAll(rate)}
                  className={`h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                    generalRate === rate
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  data-testid={`button-preset-${rate}`}
                >
                  %{rate}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={() => setShowCategoryRates(!showCategoryRates)}
              className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              data-testid="button-toggle-category-rates"
            >
              <Layers className="w-3.5 h-3.5" />
              Kategori Bazlı İndirimler
              {activeCatRateCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                  {activeCatRateCount}
                </span>
              )}
              {showCategoryRates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCategoryRates && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[11px] text-neutral-500 self-center mr-1">Tümüne uygula:</span>
                  {[10, 15, 20, 25, 30].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => applyPresetToCategories(rate)}
                      className="h-7 px-2.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      data-testid={`button-category-preset-${rate}`}
                    >
                      %{rate}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCategoryRates({})}
                    className="h-7 px-2.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                    data-testid="button-clear-category-rates"
                  >
                    Temizle
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {usedCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white"
                    >
                      <span className="flex-1 text-[12px] text-neutral-700 truncate">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-neutral-400">%</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={categoryRates[cat.id] || ''}
                          onChange={(e) => handleCategoryRate(cat.id, parseInt(e.target.value) || 0)}
                          placeholder="-"
                          className="w-14 h-7 px-2 border border-neutral-200 rounded text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                          data-testid={`input-category-rate-${cat.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Ürün adı veya SKU ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  data-testid="input-wholesale-search"
                />
              </div>
              <SelectInput
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                data-testid="select-wholesale-category"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>
        </div>
      </Card>

      {hasAnyDiscount && (
        <Card className="p-3 sm:p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-[13px] text-amber-800 flex-wrap">
            <Percent className="w-4 h-4 shrink-0" />
            <span>
              {generalRate > 0 && <><strong>Genel: %{generalRate}</strong></>}
              {activeCatRateCount > 0 && (
                <>{generalRate > 0 ? ' · ' : ''}<strong>{activeCatRateCount} kategori</strong> özel indirimli</>
              )}
              {activeProductRateCount > 0 && (
                <>{(generalRate > 0 || activeCatRateCount > 0) ? ' · ' : ''}<strong>{activeProductRateCount} ürün</strong> özel indirimli</>
              )}
              {categoryFilter !== 'all' && (
                <> · <strong>{categoryName}</strong> kategorisi</>
              )}
              {' · '}
              {filteredProducts.length} ürün
            </span>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Ürün</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden sm:table-cell">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Liste Fiyatı</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-500 w-20">
                  <Tag className="w-3 h-3 inline mr-1 -mt-0.5" />
                  Özel %
                </th>
                {hasAnyDiscount && (
                  <>
                    <th className="text-right px-4 py-3 font-medium text-neutral-500">İndirimli</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-500">Kaynak</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, idx) => {
                const base = parseFloat(product.basePrice);
                const { rate: effectiveRate, source } = getEffectiveDiscount(product);
                const discounted = effectiveRate > 0 ? base * (1 - effectiveRate / 100) : base;
                const catNames = (product.categoryIds?.length
                  ? product.categoryIds
                  : product.categoryId
                  ? [product.categoryId]
                  : []
                )
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <tr
                    key={product.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                    data-testid={`row-wholesale-product-${product.id}`}
                  >
                    <td className="px-4 py-3 text-neutral-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-md border border-neutral-200 bg-neutral-50 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-neutral-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate max-w-[200px] sm:max-w-[300px]">
                            {product.name}
                          </p>
                          {product.sku && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 hidden sm:table-cell">
                      {catNames || '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={
                          effectiveRate > 0
                            ? 'line-through text-neutral-400'
                            : 'font-medium text-neutral-900'
                        }
                      >
                        {formatPrice(base)} ₺
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={productRates[product.id] || ''}
                        onChange={(e) => handleProductRate(product.id, parseInt(e.target.value) || 0)}
                        placeholder="-"
                        className="w-14 h-7 px-2 border border-neutral-200 rounded text-[12px] text-center focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-transparent mx-auto"
                        data-testid={`input-product-rate-${product.id}`}
                      />
                    </td>
                    {hasAnyDiscount && (
                      <>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-emerald-700">
                          {effectiveRate > 0 ? `${formatPrice(discounted)} ₺` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {source !== 'none' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceColor[source]}`}>
                              %{effectiveRate} {sourceLabel[source]}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={hasAnyDiscount ? 7 : 5}
                    className="px-4 py-12 text-center text-neutral-400"
                  >
                    Gösterilecek ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

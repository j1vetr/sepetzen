import { useMemo, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Product, Category, BulkPriceAction } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  GhostButton,
  SectionHeading,
  TextInput,
  SelectInput,
  SearchInput,
  InlineAlert,
  StatusBadge,
} from '../_ui/AdminUI';

export default function BulkPriceModal({
  categories,
  products,
  onClose,
  onSuccess,
  preselectedProductIds,
}: {
  categories: Category[];
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedProductIds?: string[];
}) {
  const hasPreselection = (preselectedProductIds?.length ?? 0) > 0;
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>(
    hasPreselection ? 'select' : 'all',
  );
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<
    'newest' | 'oldest' | 'name_asc' | 'price_asc' | 'price_desc'
  >('newest');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    hasPreselection ? [...preselectedProductIds!] : [],
  );
  const [priceAction, setPriceAction] = useState<BulkPriceAction>('percent_decrease');
  const [priceValue, setPriceValue] = useState('');
  const [autoBadge, setAutoBadge] = useState(true);
  const [customBadgeText, setCustomBadgeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const numericValue = parseFloat(priceValue) || 0;
  const isPercent = priceAction.includes('percent');
  const isDecrease = priceAction.includes('decrease');

  const autoBadgeTextComputed = useMemo(() => {
    if (priceAction === 'percent_decrease' && numericValue > 0) {
      return `%${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}`;
    }
    return '';
  }, [priceAction, numericValue]);

  const badgeTextToSend = customBadgeText.trim() || autoBadgeTextComputed;
  const canAutoBadge = priceAction === 'percent_decrease';

  const listProducts = useMemo(() => {
    let list = [...products];
    if (filterCategory) list = list.filter((p) => p.categoryId === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name, 'tr');
        case 'price_asc':
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case 'price_desc':
          return parseFloat(b.basePrice) - parseFloat(a.basePrice);
        default:
          return 0;
      }
    });
    return list;
  }, [products, filterCategory, searchQuery, sortOrder]);

  const affectedProducts = useMemo(() => {
    if (filterMode === 'select') return products.filter((p) => selectedProductIds.includes(p.id));
    if (filterMode === 'category')
      return filterCategory ? products.filter((p) => p.categoryId === filterCategory) : [];
    return products;
  }, [filterMode, filterCategory, selectedProductIds, products]);

  const calcNewPrice = (currentPriceStr: string): number => {
    const current = parseFloat(currentPriceStr);
    if (Number.isNaN(current)) return 0;
    let newPrice: number;
    switch (priceAction) {
      case 'set':
        newPrice = numericValue;
        break;
      case 'increase':
        newPrice = current + numericValue;
        break;
      case 'decrease':
        newPrice = Math.max(0, current - numericValue);
        break;
      case 'percent_increase':
        newPrice = current * (1 + numericValue / 100);
        break;
      case 'percent_decrease':
        newPrice = current * (1 - numericValue / 100);
        break;
      default:
        newPrice = current;
    }
    return Math.round(newPrice * 100) / 100;
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const visibleIds = listProducts.map((p) => p.id);
    setSelectedProductIds((prev) => {
      const existing = new Set(prev);
      visibleIds.forEach((id) => existing.add(id));
      return Array.from(existing);
    });
  };

  const clearVisible = () => {
    const visibleIds = new Set(listProducts.map((p) => p.id));
    setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const previewSamples = useMemo(() => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return [];
    return affectedProducts.slice(0, 5).map((p) => ({
      name: p.name,
      before: parseFloat(p.basePrice),
      after: calcNewPrice(p.basePrice),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affectedProducts, priceAction, priceValue]);

  const handleSubmit = async () => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const body: {
        action: BulkPriceAction;
        value: number;
        categoryId?: string;
        productIds?: string[];
        autoBadge?: boolean;
        badgeText?: string;
      } = { action: priceAction, value: numericValue };
      if (filterMode === 'select') body.productIds = selectedProductIds;
      else if (filterMode === 'category' && filterCategory) body.categoryId = filterCategory;
      if (canAutoBadge && autoBadge && badgeTextToSend) {
        body.autoBadge = true;
        body.badgeText = badgeTextToSend;
      }

      const res = await fetch('/api/admin/products/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        const badgeInfo =
          canAutoBadge && autoBadge && badgeTextToSend
            ? ` · "${badgeTextToSend}" etiketi eklendi`
            : '';
        setResult({ success: true, message: `${data.updated} ürün güncellendi${badgeInfo}` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    !isLoading &&
    !!priceValue &&
    numericValue > 0 &&
    affectedProducts.length > 0 &&
    (filterMode !== 'category' || !!filterCategory) &&
    (filterMode !== 'select' || selectedProductIds.length > 0);

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Toplu Fiyat Düzenleme"
      description="Ürünleri seçin, fiyat işlemini uygulayın."
      size="lg"
      testId="modal-bulk-price"
      footer={
        <>
          <p className="mr-auto text-[12px] text-neutral-500 tabular-nums">
            {affectedProducts.length > 0 ? `${affectedProducts.length} ürün etkilenecek` : '-'}
          </p>
          <GhostButton onClick={onClose}>İptal</GhostButton>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="button-apply-bulk-price"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uygulanıyor…
              </>
            ) : (
              `${affectedProducts.length || ''} Ürüne Uygula`.trim()
            )}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <SectionHeading number={1} title="Kapsam" />
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['all', 'Tüm Ürünler', `${products.length} ürün`],
                ['category', 'Kategoriye Göre', 'Kategori seç'],
                ['select', 'Tek Tek Seç', 'Manuel seçim'],
              ] as [typeof filterMode, string, string][]
            ).map(([mode, label, sub]) => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode);
                  setSelectedProductIds([]);
                  setFilterCategory('');
                  setSearchQuery('');
                }}
                className={`p-2.5 rounded-md border text-left transition-colors ${
                  filterMode === mode
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
                data-testid={`button-filter-mode-${mode}`}
              >
                <p className="text-[12px] font-semibold">{label}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </section>

        {filterMode === 'category' && (
          <section>
            <SectionHeading title="Kategori" />
            <SelectInput
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full"
              data-testid="select-bulk-price-category"
            >
              <option value="">- Kategori Seçin -</option>
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({count} ürün)
                  </option>
                );
              })}
            </SelectInput>
          </section>
        )}

        {filterMode === 'select' && (
          <section>
            <div className="flex items-center justify-between mb-2 gap-2">
              <SectionHeading title="Ürün Seçin" />
              <div className="flex items-center gap-2 text-[11px]">
                {selectedProductIds.length > 0 && (
                  <span className="text-neutral-700 tabular-nums">
                    {selectedProductIds.length} seçili
                  </span>
                )}
                <button
                  onClick={selectAllVisible}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  Tümünü Seç
                </button>
                <span className="text-neutral-300">·</span>
                <button
                  onClick={clearVisible}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün ara…"
                className="sm:col-span-1"
                data-testid="input-product-search"
              />
              <SelectInput
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full"
                data-testid="select-filter-category"
              >
                <option value="">Tüm kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="w-full"
                data-testid="select-sort-order"
              >
                <option value="newest">↓ En Yeni</option>
                <option value="oldest">↑ En Eski</option>
                <option value="name_asc">A → Z</option>
                <option value="price_asc">Fiyat ↑</option>
                <option value="price_desc">Fiyat ↓</option>
              </SelectInput>
            </div>

            <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
              <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {listProducts.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-neutral-500">
                    Ürün bulunamadı
                  </div>
                ) : (
                  listProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    const catName = categories.find((c) => c.id === p.categoryId)?.name || '';
                    const price = parseFloat(p.basePrice);
                    const addedDate = p.createdAt ? new Date(p.createdAt) : null;
                    const isRecentlyAdded =
                      addedDate && Date.now() - addedDate.getTime() < 7 * 24 * 60 * 60 * 1000;
                    const dateLabel = addedDate
                      ? addedDate.toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '';
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                          checked ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                        }`}
                        data-testid={`label-product-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-neutral-900 shrink-0"
                          data-testid={`checkbox-product-${p.id}`}
                        />
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-9 h-12 object-cover bg-neutral-100 rounded shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-12 bg-neutral-100 rounded shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12px] text-neutral-900 truncate font-medium">
                              {p.name}
                            </p>
                            {isRecentlyAdded && <StatusBadge tone="emerald">Yeni</StatusBadge>}
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {catName}
                            {dateLabel ? ` · ${dateLabel}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-semibold text-neutral-900 tabular-nums">
                            {price.toLocaleString('tr-TR')} ₺
                          </p>
                          {p.discountBadge && (
                            <span className="inline-flex items-center px-1.5 h-4 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] mt-0.5">
                              {p.discountBadge}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        <section>
          <SectionHeading number={2} title="Fiyat İşlemi" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SelectInput
              value={priceAction}
              onChange={(e) => {
                setPriceAction(e.target.value as BulkPriceAction);
                setPriceValue('');
              }}
              className="w-full"
              data-testid="select-price-action"
            >
              <option value="percent_decrease">% İndirim uygula</option>
              <option value="percent_increase">% Zam uygula</option>
              <option value="set">Sabit fiyat belirle</option>
              <option value="increase">TL artır</option>
              <option value="decrease">TL azalt</option>
            </SelectInput>
            <div className="relative">
              <TextInput
                type="number"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={isPercent ? '20' : priceAction === 'set' ? '999' : '50'}
                min="0"
                max={isPercent ? '100' : undefined}
                step={isPercent ? '1' : '0.01'}
                className="pr-8"
                data-testid="input-price-value"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[12px] pointer-events-none">
                {isPercent ? '%' : '₺'}
              </span>
            </div>
          </div>
        </section>

        {canAutoBadge && (
          <section>
            <div className="rounded-md border border-neutral-200 bg-white">
              <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBadge}
                  onChange={(e) => {
                    setAutoBadge(e.target.checked);
                    setCustomBadgeText('');
                  }}
                  className="w-3.5 h-3.5 accent-neutral-900 shrink-0"
                  data-testid="checkbox-auto-badge"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-neutral-900 font-medium">
                    Otomatik indirim etiketi ekle
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Uygulanan indirim oranı etiket olarak basılır.
                  </p>
                </div>
                {autoBadge && badgeTextToSend && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                    {badgeTextToSend}
                  </span>
                )}
              </label>
              {autoBadge && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 shrink-0">Etiket metni:</span>
                  <TextInput
                    type="text"
                    value={customBadgeText}
                    onChange={(e) => setCustomBadgeText(e.target.value)}
                    placeholder={autoBadgeTextComputed || '%20'}
                    className="flex-1 h-8"
                    data-testid="input-badge-custom-text"
                  />
                  {customBadgeText && (
                    <button
                      onClick={() => setCustomBadgeText('')}
                      className="text-[11px] text-neutral-500 hover:text-neutral-900 shrink-0"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {previewSamples.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionHeading title="Önizleme" />
              <span className="text-[11px] text-neutral-500 tabular-nums">
                {affectedProducts.length} ürün
              </span>
            </div>
            <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
              <div className="divide-y divide-neutral-100">
                {previewSamples.map((s, i) => {
                  const diffPct = s.before > 0 ? ((s.after - s.before) / s.before) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <p className="text-[12px] text-neutral-700 truncate flex-1 mr-3">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] text-neutral-400 line-through tabular-nums">
                          {s.before.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-[10px] text-neutral-300">→</span>
                        <span className="text-[12px] font-semibold text-neutral-900 tabular-nums">
                          {s.after.toLocaleString('tr-TR')} ₺
                        </span>
                        {s.before > 0 && s.before !== s.after && (
                          <StatusBadge tone={isDecrease ? 'emerald' : 'blue'}>
                            {isDecrease ? '−' : '+'}
                            {Math.abs(diffPct).toFixed(1)}%
                          </StatusBadge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {affectedProducts.length > 5 && (
                  <div className="px-3 py-2 text-center">
                    <span className="text-[11px] text-neutral-500">
                      +{affectedProducts.length - 5} ürün daha
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {isPercent && priceValue && numericValue > 0 && (
          <InlineAlert tone="warning">
            <span className="inline-flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-[1px] shrink-0" />
              <span>
                %{numericValue} {isDecrease ? 'indirim' : 'zam'} sonrası geri almak için{' '}
                {isDecrease
                  ? `%${((numericValue / (100 - numericValue)) * 100).toFixed(2)} zam`
                  : `%${((numericValue / (100 + numericValue)) * 100).toFixed(2)} indirim`}{' '}
                gerekir.
              </span>
            </span>
          </InlineAlert>
        )}

        {result && (
          <InlineAlert tone={result.success ? 'success' : 'error'}>{result.message}</InlineAlert>
        )}
      </div>
    </AdminModal>
  );
}

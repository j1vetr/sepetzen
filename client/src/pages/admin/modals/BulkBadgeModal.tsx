import { useMemo, useState } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import type { Category, Product } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  SectionHeading,
  TextInput,
  SelectInput,
  SearchInput,
  InlineAlert,
} from '../_ui/AdminUI';

const PRESETS = ['%10', '%15', '%20', '%25', '%30', '%40', '%50', 'KAMPANYA', 'SON FIRSAT', 'YENİ SEZON'];

export default function BulkBadgeModal({
  products,
  categories,
  onClose,
  onSuccess,
  preselectedProductIds,
}: {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedProductIds?: string[];
}) {
  const hasPreselection = (preselectedProductIds?.length ?? 0) > 0;
  const [badgeText, setBadgeText] = useState('%20');
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>(
    hasPreselection ? 'select' : 'all',
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    hasPreselection ? [...preselectedProductIds!] : [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredCategoryProducts = useMemo(() => {
    if (filterMode !== 'category' || !selectedCategoryId) return [];
    return products.filter(
      (p) => p.categoryId === selectedCategoryId || p.categoryIds?.includes(selectedCategoryId),
    );
  }, [products, filterMode, selectedCategoryId]);

  const targetIds = useMemo(() => {
    if (filterMode === 'select') return selectedProductIds;
    if (filterMode === 'category') return filteredCategoryProducts.map((p) => p.id);
    return products.map((p) => p.id);
  }, [filterMode, selectedProductIds, filteredCategoryProducts, products]);

  const listProducts = useMemo(() => {
    if (filterMode !== 'select') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, filterMode, searchQuery]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const send = async (badge: string) => {
    if (targetIds.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds: targetIds, badge }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({
          success: true,
          message: badge
            ? `${data.updated} ürüne etiket eklendi`
            : `${data.updated} üründen etiket kaldırıldı`,
        });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={
        <>
          <Tag className="w-4 h-4 text-neutral-500" />
          Toplu Etiket
        </>
      }
      description="Seçtiğiniz ürünlere kampanya etiketi ekleyin veya kaldırın."
      size="md"
      testId="modal-bulk-badge"
      footer={
        <>
          <p className="mr-auto text-[12px] text-neutral-500 tabular-nums">
            {targetIds.length > 0 ? `${targetIds.length} ürün etkilenecek` : '-'}
          </p>
          <SecondaryButton
            onClick={() => send('')}
            disabled={isLoading || targetIds.length === 0}
            data-testid="button-remove-badge"
          >
            Etiketleri Kaldır
          </SecondaryButton>
          <GhostButton onClick={onClose}>İptal</GhostButton>
          <PrimaryButton
            onClick={() => send(badgeText)}
            disabled={isLoading || targetIds.length === 0 || !badgeText}
            data-testid="button-apply-badge"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
            Etiketi Uygula
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <SectionHeading number={1} title="Etiket Metni" description="Önizleme aşağıda görünür." />
          <TextInput
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="%20"
            data-testid="input-badge-text"
          />
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setBadgeText(preset)}
                className={`px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors border ${
                  badgeText === preset
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
                data-testid={`button-preset-${preset}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title="Önizleme" />
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-5 flex items-center justify-center">
            <div className="relative w-28 h-36 bg-white border border-neutral-200 rounded-md overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-[11px]">
                Ürün
              </div>
              {badgeText && (
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {badgeText}
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading number={2} title="Uygulama Kapsamı" />
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['all', 'Tüm Ürünler', `${products.length} ürün`],
              ['category', 'Kategoriye Göre', 'Kategori seç'],
              ['select', 'Tek Tek Seç', 'Manuel seçim'],
            ] as const).map(([key, label, sub]) => (
              <button
                key={key}
                onClick={() => setFilterMode(key)}
                className={`p-2.5 rounded-md border text-left transition-colors ${
                  filterMode === key
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
                data-testid={`button-filter-${key}`}
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
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full"
              data-testid="select-badge-category"
            >
              <option value="">- Kategori Seçin -</option>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.categoryId === cat.id || p.categoryIds?.includes(cat.id),
                ).length;
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
              <p className="text-[11px] text-neutral-500 tabular-nums">
                {selectedProductIds.length} seçili
              </p>
            </div>
            <SearchInput
              placeholder="Ürün ara…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100">
                {listProducts.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-neutral-500">
                    Ürün bulunamadı
                  </div>
                ) : (
                  listProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                          checked ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                        }`}
                        data-testid={`label-badge-product-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-neutral-900 shrink-0"
                        />
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt=""
                            className="w-8 h-8 rounded object-cover bg-neutral-100 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-neutral-100 shrink-0" />
                        )}
                        <span className="flex-1 text-[12px] text-neutral-900 truncate">
                          {p.name}
                        </span>
                        {p.discountBadge && (
                          <span className="inline-flex items-center px-1.5 h-5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium leading-none shrink-0">
                            {p.discountBadge}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {result && (
          <InlineAlert tone={result.success ? 'success' : 'error'}>
            {result.message}
          </InlineAlert>
        )}
      </div>
    </AdminModal>
  );
}

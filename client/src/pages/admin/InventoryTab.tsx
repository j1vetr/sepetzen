import type { ProductVariant } from './_shared/types';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Warehouse, Package, History, CircleAlert } from 'lucide-react';

type StockView = 'all' | 'available' | 'critical' | 'out';

type StockAdjustment = {
  id: string;
  variantId: string;
  previousStock: number;
  newStock: number;
  adjustmentType: string;
  reason?: string | null;
  createdAt: string;
};

const ADJUSTMENT_LABELS: Record<string, string> = {
  manual: 'Manuel güncelleme',
  sale: 'Satış',
  return: 'İade teslim alındı',
  restock: 'Stok girişi',
  correction: 'Düzeltme',
};

// Ürün küçük önizlemesi: ilk medya video ise varsa ilk fotoğraf tercih
// edilir; hiç fotoğraf yoksa videonun ilk karesi gösterilir.
const INV_VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;
function renderInventoryThumb(images: string[] | undefined | null) {
  const src = images?.find((u) => !INV_VIDEO_RE.test(u)) || images?.[0];
  if (!src) return null;
  return INV_VIDEO_RE.test(src)
    ? <video src={src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
    : <img src={src} alt="" className="w-full h-full object-cover" />;
}

export default function InventoryPanel() {
  const queryClient = useQueryClient();
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [selectedVariants, setSelectedVariants] = useState<{ id: string; stock: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [stockView, setStockView] = useState<StockView>('all');
  const [historyVariantId, setHistoryVariantId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery<StockAdjustment[]>({
    queryKey: ['admin-inventory-adjustments', historyVariantId],
    queryFn: async () => {
      const params = historyVariantId ? `?variantId=${encodeURIComponent(historyVariantId)}` : '';
      const res = await fetch(`/api/admin/inventory/adjustments${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stock adjustments');
      return res.json();
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { variantId: string; stock: number; reason?: string }[]) => {
      const res = await fetch('/api/admin/inventory/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to update stock');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-adjustments'] });
      setSelectedVariants([]);
    },
  });

  const handleStockChange = (variantId: string, newStock: number) => {
    setSelectedVariants(prev => {
      const existing = prev.find(v => v.id === variantId);
      if (existing) {
        return prev.map(v => v.id === variantId ? { ...v, stock: newStock } : v);
      }
      return [...prev, { id: variantId, stock: newStock }];
    });
  };

  const applyBulkUpdate = () => {
    if (selectedVariants.length === 0) return;
    bulkUpdateMutation.mutate(selectedVariants.map(v => ({
      variantId: v.id,
      stock: v.stock,
      reason: 'Admin panel toplu güncelleme',
    })));
  };

  const totalStock = useMemo(
    () => allVariants.reduce((sum: number, variant: ProductVariant) => sum + Math.max(0, variant.stock || 0), 0),
    [allVariants],
  );
  const outOfStockCount = useMemo(
    () => allVariants.filter((variant: ProductVariant) => (variant.stock || 0) === 0).length,
    [allVariants],
  );
  const criticalVariants = useMemo(
    () => allVariants.filter((variant: ProductVariant) => {
      const stock = variant.stock || 0;
      return stock > 0 && stock <= lowStockThreshold;
    }),
    [allVariants, lowStockThreshold],
  );
  const visibleVariants = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return allVariants.filter((variant: ProductVariant) => {
      const matchesSearch =
        !term ||
        variant.product?.name?.toLocaleLowerCase('tr-TR').includes(term) ||
        variant.size?.toLocaleLowerCase('tr-TR').includes(term) ||
        variant.color?.toLocaleLowerCase('tr-TR').includes(term);
      if (!matchesSearch) return false;
      const stock = variant.stock || 0;
      if (stockView === 'out') return stock === 0;
      if (stockView === 'critical') return stock > 0 && stock <= lowStockThreshold;
      if (stockView === 'available') return stock > lowStockThreshold;
      return true;
    });
  }, [allVariants, lowStockThreshold, searchQuery, stockView]);
  const historyVariant = allVariants.find((variant: ProductVariant) => variant.id === historyVariantId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-neutral-500">Toplam Varyant</p>
              <p className="text-2xl font-bold text-neutral-900">{allVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-sm text-neutral-500">Kritik stok</p>
              <p className="text-2xl font-bold text-amber-600">{criticalVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-neutral-400" />
            <div>
              <p className="text-sm text-neutral-500">Toplam Stok</p>
              <p className="text-2xl font-bold text-neutral-900">
                {totalStock}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CircleAlert className="w-7 h-7 text-red-500" />
            <div>
              <p className="text-sm text-neutral-500">Tükenen</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {criticalVariants.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Kritik Stok Uyarısı</h3>
              <p className="text-sm text-neutral-500 mt-1">
                {criticalVariants.length} varyantın stoğu 1 ile {lowStockThreshold} adet arasında.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {criticalVariants.slice(0, 5).map((v: ProductVariant) => (
                  <span key={v.id} className="px-3 py-1 bg-neutral-50 rounded-lg text-sm text-neutral-900">
                    {v.product?.name} · {v.size} ({v.stock} adet)
                  </span>
                ))}
                {criticalVariants.length > 5 && (
                  <span className="px-3 py-1 bg-neutral-200 rounded-lg text-sm text-neutral-500">
                    +{criticalVariants.length - 5} daha
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-neutral-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">Stok Yönetimi</h3>
              <p className="mt-0.5 text-[12px] text-neutral-500">Eldeki stok, riskteki varyantlar ve son hareketler aynı çalışma alanında.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/inventory/fix-variants', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(data.message);
                    queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                  } else {
                    alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
                  }
                } catch (error) {
                  alert('Varyant kontrolü başarısız');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
              data-testid="button-fix-variants"
            >
              <Search className="w-4 h-4" />
              Eksik Varyantları Kontrol Et
            </button>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-200"
              data-testid="button-refresh-inventory"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <div className="relative flex-1 min-w-[180px] md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-full md:w-64"
                data-testid="input-inventory-search"
              />
            </div>
            {selectedVariants.length > 0 && (
              <button
                onClick={applyBulkUpdate}
                disabled={bulkUpdateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {bulkUpdateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {selectedVariants.length} Değişikliği Kaydet
              </button>
            )}
          </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Görünüm</span>
              {([
                ['all', 'Tümü', allVariants.length],
                ['available', 'Eldeki stok', allVariants.filter((v: ProductVariant) => (v.stock || 0) > lowStockThreshold).length],
                ['critical', 'Kritik', allVariants.filter((v: ProductVariant) => (v.stock || 0) > 0 && (v.stock || 0) <= lowStockThreshold).length],
                ['out', 'Tükenen', outOfStockCount],
              ] as Array<[StockView, string, number]>).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStockView(value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium ${
                    stockView === value
                      ? value === 'out' ? 'border-red-600 bg-red-600 text-white' : 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                  data-testid={`inventory-view-${value}`}
                >
                  {label} <span className={stockView === value ? 'text-white/75' : 'text-neutral-400'}>{count}</span>
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-[12px] text-neutral-600">
                Kritik eşik
                <select
                  value={lowStockThreshold}
                  onChange={(event) => {
                    setLowStockThreshold(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-[12px] text-neutral-900"
                  data-testid="select-low-stock-threshold"
                >
                  {[1, 3, 5, 10, 15].map((threshold) => <option key={threshold} value={threshold}>{threshold} adet</option>)}
                </select>
              </label>
            </div>
        </div>

        {variantsLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        ) : (() => {
          const filteredVariants = visibleVariants;
          const totalPages = Math.ceil(filteredVariants.length / itemsPerPage);
          const paginatedVariants = filteredVariants.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return filteredVariants.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Ürün</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Beden</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Renk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Fiyat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Stok</th>
                       <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {paginatedVariants.map((v: ProductVariant) => {
                      const pendingChange = selectedVariants.find(sv => sv.id === v.id);
                      const currentStock = pendingChange?.stock ?? v.stock;
                      return (
                        <tr key={v.id} className={pendingChange ? 'bg-blue-500/5' : ''}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-50">
                                {renderInventoryThumb(v.product?.images)}
                              </div>
                              <span className="text-sm text-neutral-900">{v.product?.name || 'Bilinmeyen'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">{v.size || '-'}</td>
                          <td className="px-6 py-4 text-sm text-neutral-500">{v.color || '-'}</td>
                          <td className="px-6 py-4 text-sm text-neutral-900">{v.product?.basePrice || v.price} TL</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={currentStock}
                              onChange={(e) => handleStockChange(v.id, parseInt(e.target.value) || 0)}
                              className={`w-20 px-2 py-1 rounded-lg text-sm ${
                                currentStock <= lowStockThreshold
                                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                  : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                              } border`}
                            />
                          </td>
                           <td className="px-6 py-4 text-right">
                             <button
                               type="button"
                               onClick={() => setHistoryVariantId(v.id)}
                               className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                               data-testid={`button-stock-history-${v.id}`}
                             >
                               <History className="h-3.5 w-3.5" />
                               Geçmiş
                             </button>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-neutral-200">
                {paginatedVariants.map((v: ProductVariant) => {
                  const pendingChange = selectedVariants.find(sv => sv.id === v.id);
                  const currentStock = pendingChange?.stock ?? v.stock;
                  return (
                    <div
                      key={v.id}
                      className={`p-4 ${pendingChange ? 'bg-blue-500/5' : ''}`}
                      data-testid={`card-inventory-variant-${v.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                          {renderInventoryThumb(v.product?.images)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {v.product?.name || 'Bilinmeyen'}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {v.size || '-'}
                            {v.color ? ` · ${v.color}` : ''}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {v.product?.basePrice || v.price} TL
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <label className="text-xs font-medium text-neutral-500">Stok</label>
                        <input
                          type="number"
                          value={currentStock}
                          onChange={(e) => handleStockChange(v.id, parseInt(e.target.value) || 0)}
                          className={`w-24 h-9 px-3 rounded-lg text-sm ${
                            currentStock <= lowStockThreshold
                              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                              : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                          } border`}
                          data-testid={`card-input-stock-${v.id}`}
                        />
                         <button
                           type="button"
                           onClick={() => setHistoryVariantId(v.id)}
                           className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-[11px] font-medium text-neutral-600"
                           data-testid={`button-stock-history-mobile-${v.id}`}
                         >
                           <History className="h-3.5 w-3.5" />
                           Geçmiş
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
                  <p className="text-sm text-neutral-500">
                    {filteredVariants.length} sonuçtan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredVariants.length)} arası gösteriliyor
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 text-sm rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-white text-black'
                                : 'bg-neutral-50 text-neutral-900 hover:bg-neutral-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-neutral-500">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ürün varyantı yok'}
            </div>
          );
        })()}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="mr-auto">
            <h3 className="text-[14px] font-semibold text-neutral-900">Stok Hareketleri</h3>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              {historyVariant
                ? `${historyVariant.product?.name || 'Varyant'} · ${historyVariant.size || '-'} için geçmiş`
                : 'Son 100 stok hareketi'}
            </p>
          </div>
          {historyVariantId && (
            <button type="button" onClick={() => setHistoryVariantId(null)} className="text-[12px] font-medium text-neutral-500 hover:text-neutral-900">
              Tüm hareketler
            </button>
          )}
        </div>
        {adjustmentsLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>
        ) : adjustments.length === 0 ? (
          <p className="p-6 text-[12px] text-neutral-500">Bu seçim için stok hareketi bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {adjustments.slice(0, 12).map((adjustment) => {
              const variant = allVariants.find((item: ProductVariant) => item.id === adjustment.variantId);
              const difference = adjustment.newStock - adjustment.previousStock;
              return (
                <div key={adjustment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[12px]">
                  <div className="min-w-[170px] flex-1">
                    <p className="font-medium text-neutral-800">{variant?.product?.name || 'Varyant'}</p>
                    <p className="text-[11px] text-neutral-500">{variant?.size || '-'} {variant?.color ? `· ${variant.color}` : ''}</p>
                  </div>
                  <span className="text-neutral-600">{ADJUSTMENT_LABELS[adjustment.adjustmentType] || adjustment.adjustmentType}</span>
                  <span className={`font-semibold tabular-nums ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-emerald-600' : 'text-neutral-600'}`}>
                    {adjustment.previousStock} → {adjustment.newStock} ({difference > 0 ? '+' : ''}{difference})
                  </span>
                  <span className="text-[11px] text-neutral-500">{adjustment.reason || 'Sebep belirtilmedi'}</span>
                  <span className="ml-auto text-[11px] text-neutral-400">{new Date(adjustment.createdAt).toLocaleString('tr-TR')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


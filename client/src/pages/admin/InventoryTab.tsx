import type { ProductVariant } from './_shared/types';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, AlertTriangle, RefreshCw, Edit, Check, X, ChevronLeft, ChevronRight, Warehouse, Package } from 'lucide-react';

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
  const itemsPerPage = 20;

  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

  const { data: lowStockVariants = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ['admin-low-stock', lowStockThreshold],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/low-stock?threshold=${lowStockThreshold}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch low stock');
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
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-neutral-500">Toplam Varyant</p>
              <p className="text-2xl font-bold text-neutral-900">{allVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-sm text-neutral-500">Düşük Stok</p>
              <p className="text-2xl font-bold text-yellow-400">{lowStockVariants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-neutral-400" />
            <div>
              <p className="text-sm text-neutral-500">Toplam Stok</p>
              <p className="text-2xl font-bold text-neutral-900">
                {allVariants.reduce((sum: number, v: ProductVariant) => sum + (v.stock || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {lowStockVariants.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">Düşük Stok Uyarısı</h3>
              <p className="text-sm text-neutral-500 mt-1">
                {lowStockVariants.length} varyantın stoğu {lowStockThreshold} adetten az.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lowStockVariants.slice(0, 5).map((v: ProductVariant) => (
                  <span key={v.id} className="px-3 py-1 bg-neutral-50 rounded-lg text-sm text-neutral-900">
                    {v.product?.name} - {v.size} ({v.stock} adet)
                  </span>
                ))}
                {lowStockVariants.length > 5 && (
                  <span className="px-3 py-1 bg-neutral-200 rounded-lg text-sm text-neutral-500">
                    +{lowStockVariants.length - 5} daha
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-200 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3 md:mb-0">Stok Yönetimi</h3>
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

        {variantsLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        ) : (() => {
          const filteredVariants = allVariants.filter((v: ProductVariant) =>
            v.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.color?.toLowerCase().includes(searchQuery.toLowerCase())
          );
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
    </div>
  );
}


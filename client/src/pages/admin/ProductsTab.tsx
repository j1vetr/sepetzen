import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Tag,
  Edit3,
  Sparkles,
  Plus,
  Copy,
  Trash2,
  Package,
  MoreHorizontal,
  X,
  SlidersHorizontal,
  Eye,
  ImageIcon,
  ExternalLink,
} from 'lucide-react';
import type { Product, Category, ProductVariant, ProductDraft } from './_shared/types';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  InlineAlert,
  SearchInput,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
  StatusBadge,
} from './_ui/AdminUI';

interface SyncExtraVariant {
  variantId: string;
  productName: string;
  size: string | null;
  color: string | null;
  stock: number;
  sku: string | null;
}

interface SyncResult {
  scannedCount: number;
  createdCount: number;
  createdVariants: { productName: string; size: string; color: string | null; sku: string | null }[];
  extraVariants: SyncExtraVariant[];
  message: string;
}

type TrendyolStatusEntry = {
  pushStatus: string | null;
  linkId: string;
  externalId: string;
  syncDirection: string | null;
};

interface ProductsTabProps {
  products: Product[];
  categories: Category[];
  allVariants: ProductVariant[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowBulkBadgeModal: (b: boolean) => void;
  setShowBulkPriceModal: (b: boolean) => void;
  setBulkPreselectedIds?: (ids: string[]) => void;
  deleteProductMutation: { mutate: (id: string) => void };
  productsLoading?: boolean;
  productsError?: unknown;
  /** Ürün satırındaki Trendyol aksiyonu tıklandığında çağrılır (Trendyol Merkezi'ne yönlendirir) */
  onTrendyolAction?: (productId: string) => void;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'out' | 'trendyol_linked' | 'trendyol_unlinked' | 'trendyol_rejected';
type SortKey = 'newest' | 'oldest' | 'name_asc' | 'price_asc' | 'price_desc';

function formatPrice(value: string | number): string {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(n)) return '-';
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}

function getStockSummary(productId: string, variants: ProductVariant[]) {
  const my = variants.filter((v) => v.productId === productId);
  const total = my.reduce((s, v) => s + (v.stock || 0), 0);
  return { total, count: my.length };
}

/**
 * Trendyol bağlantı rozeti mantığı:
 *   - Pull yönlü link → neutral "Trendyol'da" (çekme yönetimli, gönderim durumu yok)
 *   - Push yönlü link + pushStatus null → rozet yok (henüz gönderim başlatılmamış)
 *   - Push yönlü link + pushStatus → duruma göre renk
 */
function trendyolBadge(
  tyStatus: TrendyolStatusEntry | null | undefined,
): { tone: Parameters<typeof StatusBadge>[0]['tone']; label: string } | null {
  if (!tyStatus) return null;
  if (tyStatus.syncDirection === 'pull') {
    return { tone: 'neutral', label: "Trendyol'da" };
  }
  // Push yönlü
  switch (tyStatus.pushStatus) {
    case 'approved': return { tone: 'emerald', label: "Trendyol'da" };
    case 'sent':     return { tone: 'blue',    label: 'Onay bekliyor' };
    case 'rejected': return { tone: 'red',     label: 'Reddedildi' };
    case 'error':    return { tone: 'red',     label: 'Hata' };
    default:         return null; // pushStatus null → push link var ama henüz gönderilmedi
  }
}

function ProductStatusChips({
  product,
  stockTotal,
  hasVariants,
  tyStatus,
}: {
  product: Product;
  stockTotal: number;
  hasVariants: boolean;
  tyStatus?: TrendyolStatusEntry | null;
}) {
  const chips: Array<{ key: string; tone: Parameters<typeof StatusBadge>[0]['tone']; label: string }> = [];
  if (!product.isActive) {
    chips.push({ key: 'inactive', tone: 'neutral', label: 'Pasif' });
  } else if (hasVariants && stockTotal === 0) {
    chips.push({ key: 'out', tone: 'amber', label: 'Stokta yok' });
  } else {
    chips.push({ key: 'active', tone: 'emerald', label: 'Aktif' });
  }
  if (product.isFeatured) chips.push({ key: 'featured', tone: 'indigo', label: 'Öne çıkan' });
  if (product.isNew) chips.push({ key: 'new', tone: 'blue', label: 'Yeni' });
  if (product.discountBadge) chips.push({ key: 'badge', tone: 'red', label: product.discountBadge });

  const tyBadge = trendyolBadge(tyStatus);
  if (tyBadge) chips.push({ key: 'trendyol', tone: tyBadge.tone, label: tyBadge.label });

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <StatusBadge key={c.key} tone={c.tone}>
          {c.label}
        </StatusBadge>
      ))}
    </div>
  );
}

function CategoryChips({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const ids = product.categoryIds && product.categoryIds.length > 0
    ? product.categoryIds
    : product.categoryId
    ? [product.categoryId]
    : [];
  const names = ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return <span className="text-[12px] text-neutral-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {names.slice(0, 2).map((n) => (
        <span
          key={n}
          className="inline-flex items-center px-1.5 h-5 rounded bg-neutral-100 text-neutral-700 text-[11px] leading-none"
        >
          {n}
        </span>
      ))}
      {names.length > 2 && (
        <span className="inline-flex items-center px-1.5 h-5 rounded bg-neutral-100 text-neutral-500 text-[11px] leading-none">
          +{names.length - 2}
        </span>
      )}
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  const src = product.images?.[0];
  if (src) {
    return (
      <img
        src={src}
        alt={product.name}
        className="w-10 h-10 object-cover rounded-md border border-neutral-200 bg-neutral-50 shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0">
      <ImageIcon className="w-4 h-4 text-neutral-300" />
    </div>
  );
}

function RowActions({
  product,
  onEdit,
  onCopy,
  onDelete,
  onView,
  onTrendyol,
  tyStatus,
}: {
  product: Product;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onView: () => void;
  onTrendyol?: () => void;
  tyStatus?: TrendyolStatusEntry | null;
}) {
  const [open, setOpen] = useState(false);

  /** Duruma göre akıllı Trendyol buton etiketi */
  const tyLabel = (() => {
    if (!tyStatus) return "Trendyol'a Gönder";
    // Pull yönlü link: ürün Trendyol tarafından yönetiliyor
    if (tyStatus.syncDirection === 'pull') return "Trendyol'da Yönet";
    // Push yönlü link: gönderim durumuna göre
    if (tyStatus.pushStatus === 'rejected' || tyStatus.pushStatus === 'error') return 'Yeniden Gönder';
    return "Trendyol'da Yönet";
  })();

  return (
    <div className="flex items-center justify-end gap-0.5">
      <div className="hidden md:flex items-center gap-0.5">
        {onTrendyol && (
          <IconButton
            title={tyLabel}
            onClick={onTrendyol}
            data-testid={`button-trendyol-${product.id}`}
          >
            <ExternalLink className="w-4 h-4" />
          </IconButton>
        )}
        <IconButton title="Düzenle" onClick={onEdit} data-testid={`button-edit-product-${product.id}`}>
          <Edit3 className="w-4 h-4" />
        </IconButton>
        <IconButton title="Kopyala" onClick={onCopy} data-testid={`button-copy-product-${product.id}`}>
          <Copy className="w-4 h-4" />
        </IconButton>
        <IconButton title="Görüntüle" onClick={onView}>
          <Eye className="w-4 h-4" />
        </IconButton>
        <IconButton
          tone="danger"
          title="Sil"
          onClick={onDelete}
          data-testid={`button-delete-product-${product.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      </div>
      <div className="md:hidden relative">
        <IconButton title="İşlemler" onClick={() => setOpen((v) => !v)}>
          <MoreHorizontal className="w-4 h-4" />
        </IconButton>
        {open && (
          <>
            <button
              type="button"
              aria-hidden
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-9 z-20 w-48 bg-white border border-neutral-200 rounded-md shadow-lg py-1">
              {onTrendyol && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onTrendyol();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50"
                  data-testid={`button-trendyol-mobile-${product.id}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {tyLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50"
                data-testid={`button-edit-product-mobile-${product.id}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCopy();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50"
                data-testid={`button-copy-product-mobile-${product.id}`}
              >
                <Copy className="w-3.5 h-3.5" />
                Kopyala
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onView();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Görüntüle
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                data-testid={`button-delete-product-mobile-${product.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sil
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsTab({
  products,
  categories,
  allVariants,
  searchQuery,
  setSearchQuery,
  setShowBulkBadgeModal,
  setShowBulkPriceModal,
  setBulkPreselectedIds,
  deleteProductMutation,
  productsLoading,
  productsError,
  onTrendyolAction,
}: ProductsTabProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Trendyol bağlantı durumu haritası — ürün başına rozet ve aksiyon için
  const { data: trendyolStatusMap } = useQuery<Record<string, TrendyolStatusEntry>>({
    queryKey: ['/api/admin/products/trendyol-status'],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [perPage, setPerPage] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set());
  const [isDeletingExtras, setIsDeletingExtras] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const inName = p.name.toLowerCase().includes(q);
        const inSku = (p.sku || '').toLowerCase().includes(q);
        if (!inName && !inSku) return false;
      }
      if (categoryFilter !== 'all') {
        const inCat = p.categoryId === categoryFilter || (p.categoryIds || []).includes(categoryFilter);
        if (!inCat) return false;
      }
      if (statusFilter !== 'all') {
        const stock = getStockSummary(p.id, allVariants);
        if (statusFilter === 'active' && (!p.isActive || (stock.count > 0 && stock.total === 0))) return false;
        if (statusFilter === 'inactive' && p.isActive) return false;
        if (statusFilter === 'out' && !(stock.count > 0 && stock.total === 0)) return false;
        if (statusFilter === 'trendyol_linked') {
          const ty = trendyolStatusMap?.[p.id];
          if (!ty) return false;
          // Push-linked with no pushStatus means not yet sent — exclude
          if (ty.syncDirection !== 'pull' && !ty.pushStatus) return false;
          // Rejected/error are not "linked" in the positive sense
          if (ty.pushStatus === 'rejected' || ty.pushStatus === 'error') return false;
        }
        if (statusFilter === 'trendyol_unlinked') {
          const ty = trendyolStatusMap?.[p.id];
          // Keep only: no link at all, OR push link that hasn't been sent yet
          if (ty && !(ty.syncDirection !== 'pull' && !ty.pushStatus)) return false;
        }
        if (statusFilter === 'trendyol_rejected') {
          const ty = trendyolStatusMap?.[p.id];
          if (!ty) return false;
          if (ty.pushStatus !== 'rejected' && ty.pushStatus !== 'error') return false;
        }
      }
      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter, allVariants, trendyolStatusMap]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      switch (sortKey) {
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
  }, [filteredProducts, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = sortedProducts.slice((safePage - 1) * perPage, safePage * perPage);

  const filtersActive =
    !!searchQuery.trim() || categoryFilter !== 'all' || statusFilter !== 'all';

  const allOnPageSelected =
    pagedProducts.length > 0 && pagedProducts.every((p) => selectedIds.has(p.id));
  const someOnPageSelected =
    pagedProducts.some((p) => selectedIds.has(p.id)) && !allOnPageSelected;

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pagedProducts.forEach((p) => next.delete(p.id));
      } else {
        pagedProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleSyncVariants = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/inventory/fix-variants', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(data);
        // Varsayılan olarak yalnızca stoksuz adaylar seçili gelir; stoklu
        // varyantların silinmesi adminin bilinçli seçimini gerektirir.
        setSelectedExtraIds(new Set(
          (data.extraVariants as SyncExtraVariant[])
            .filter(v => v.stock === 0)
            .map(v => v.variantId)
        ));
        queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      } else {
        alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch {
      alert('Kontrol başarısız, lütfen tekrar deneyin');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExtraSelected = (variantId: string) => {
    setSelectedExtraIds(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const handleDeleteExtras = async () => {
    if (!syncResult || selectedExtraIds.size === 0) return;
    const selected = syncResult.extraVariants.filter(v => selectedExtraIds.has(v.variantId));
    const stockedCount = selected.filter(v => v.stock > 0).length;
    const confirmText = stockedCount > 0
      ? `DİKKAT: Seçilenlerin ${stockedCount} tanesinde stok var. Stoklu varyant silinirse o stok kaybolur ve ürün vitrinden kaybolabilir.\n\n${selected.length} varyantı silmek istediğinize emin misiniz?`
      : `${selected.length} stoksuz fazla varyant silinecek. Onaylıyor musunuz?`;
    if (!window.confirm(confirmText)) return;

    setIsDeletingExtras(true);
    try {
      const res = await fetch('/api/admin/inventory/delete-extra-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantIds: Array.from(selectedExtraIds),
          // Stoklu silme niyeti yalnızca stoklu uyarısı onaylandığında iletilir.
          allowStocked: stockedCount > 0,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        // Yalnızca sunucunun GERÇEKTEN sildiği varyantlar listeden düşer.
        // Atlananlar (artık fazla olmayanlar) listede kalır, mesajda açıklanır.
        const deletedIdSet = new Set<string>((data.deletedIds as string[]) || []);
        setSyncResult(prev => prev ? {
          ...prev,
          message: data.message,
          extraVariants: prev.extraVariants.filter(v => !deletedIdSet.has(v.variantId)),
        } : prev);
        setSelectedExtraIds(prev => {
          const next = new Set(prev);
          deletedIdSet.forEach(id => next.delete(id));
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      } else {
        alert('Hata: ' + (data.error || 'Silme başarısız'));
      }
    } catch {
      alert('Silme başarısız, lütfen tekrar deneyin');
    } finally {
      setIsDeletingExtras(false);
    }
  };

  const handleDuplicate = (product: Product) => {
    // Kopya taslağı tam sayfa editörde hazırlanır
    navigate(`/toov-admin/products/new?duplicate=${product.id}`);
  };

  return (
    <div data-testid="tab-products" className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Ürünler"
        description={`Toplam ${products.length.toLocaleString('tr-TR')} ürün`}
        actions={
          <>
            <GhostButton
              onClick={() => {
                setBulkPreselectedIds?.([]);
                setShowBulkPriceModal(true);
              }}
              data-testid="button-header-bulk-price"
              title="Tüm/kategori bazlı toplu fiyat"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Toplu fiyat</span>
            </GhostButton>
            <GhostButton
              onClick={() => {
                setBulkPreselectedIds?.([]);
                setShowBulkBadgeModal(true);
              }}
              data-testid="button-header-bulk-badge"
              title="Tüm/kategori bazlı toplu etiket"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Toplu etiket</span>
            </GhostButton>
            <SecondaryButton
              onClick={handleSyncVariants}
              disabled={isSyncing}
              data-testid="button-sync-all-variants"
              title="Tanımlı beden ve renklere göre eksik varyantları oluşturur. Hiçbir varyantı silmez."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Eksik Varyantları Kontrol Et</span>
              <span className="sm:hidden">Varyant Kontrol</span>
            </SecondaryButton>
            <PrimaryButton
              onClick={() => navigate('/toov-admin/products/new')}
              data-testid="button-add-product"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Ürün
            </PrimaryButton>
          </>
        }
      />

      <Card className="p-3 sm:p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px]">
            <SearchInput
              placeholder="Ürün adı veya SKU ara…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              data-testid="input-search-products"
            />
          </div>
          <SelectInput
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            data-testid="select-products-category"
          >
            <option value="all">Tüm kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            data-testid="select-products-status"
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="out">Stokta yok</option>
            <option value="trendyol_linked">Trendyol'da</option>
            <option value="trendyol_unlinked">Trendyol'a gönderilmemiş</option>
            <option value="trendyol_rejected">Trendyol'da reddedildi</option>
          </SelectInput>
          <SelectInput
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            data-testid="select-products-sort"
          >
            <option value="newest">↓ En yeni</option>
            <option value="oldest">↑ En eski</option>
            <option value="name_asc">A → Z</option>
            <option value="price_asc">Fiyat ↑</option>
            <option value="price_desc">Fiyat ↓</option>
          </SelectInput>
          <SelectInput
            value={String(perPage)}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            data-testid="select-products-per-page"
            aria-label="Sayfa başına"
          >
            <option value="10">10/s</option>
            <option value="25">25/s</option>
            <option value="50">50/s</option>
            <option value="100">100/s</option>
          </SelectInput>
          {!selectionMode ? (
            <GhostButton
              onClick={() => setSelectionMode(true)}
              data-testid="button-enter-selection"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Toplu işlem
            </GhostButton>
          ) : (
            <GhostButton onClick={clearSelection} data-testid="button-exit-selection">
              <X className="w-3.5 h-3.5" />
              Vazgeç
            </GhostButton>
          )}
        </div>
      </Card>

      {selectionMode && (
        <div
          className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 bg-white/95 backdrop-blur border-b border-neutral-200"
          data-testid="bulk-action-bar"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-neutral-700 mr-1">
              <span className="font-semibold tabular-nums">{selectedIds.size}</span>{' '}
              seçili
            </span>
            <SecondaryButton
              onClick={() => {
                setBulkPreselectedIds?.(Array.from(selectedIds));
                setShowBulkPriceModal(true);
              }}
              disabled={selectedIds.size === 0}
              data-testid="button-bulk-price"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Toplu fiyat
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setBulkPreselectedIds?.(Array.from(selectedIds));
                setShowBulkBadgeModal(true);
              }}
              disabled={selectedIds.size === 0}
              data-testid="button-bulk-badge"
            >
              <Tag className="w-3.5 h-3.5" />
              Toplu etiket
            </SecondaryButton>
            <div className="ml-auto">
              <GhostButton onClick={clearSelection}>
                Seçimi temizle
              </GhostButton>
            </div>
          </div>
        </div>
      )}

      {productsError ? (
        <InlineAlert tone="error">
          <span className="font-medium">Ürünler yüklenemedi.</span> Bağlantınızı kontrol edip
          sayfayı yenileyin.
        </InlineAlert>
      ) : productsLoading && products.length === 0 ? (
        <Card>
          <LoadingState label="Ürünler yükleniyor…" />
        </Card>
      ) : pagedProducts.length === 0 ? (
        <Card className="py-2">
          {filtersActive ? (
            <EmptyState
              icon={Search}
              title="Sonuç bulunamadı"
              description="Filtrelerinizi gevşetip tekrar deneyebilirsiniz."
              action={
                <SecondaryButton
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setPage(1);
                  }}
                >
                  Filtreleri sıfırla
                </SecondaryButton>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title="Henüz ürün yok"
              description="İlk ürünü ekleyerek mağazanızı kurmaya başlayın."
              action={
                <PrimaryButton
                  onClick={() => navigate('/toov-admin/products/new')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Ürün
                </PrimaryButton>
              }
            />
          )}
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/60">
                    {selectionMode && (
                      <th className="pl-4 pr-2 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someOnPageSelected;
                          }}
                          onChange={togglePageSelection}
                          className="w-3.5 h-3.5 accent-neutral-900"
                          data-testid="checkbox-select-all"
                          aria-label="Sayfayı seç"
                        />
                      </th>
                    )}
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      Ürün
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      Kategori
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      Fiyat
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      Stok
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      Durum
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((product) => {
                    const stock = getStockSummary(product.id, allVariants);
                    const isSelected = selectedIds.has(product.id);
                    const tyStatus = trendyolStatusMap?.[product.id] ?? null;
                    return (
                      <tr
                        key={product.id}
                        className={`border-t border-neutral-100 transition-colors ${
                          isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                        }`}
                        data-testid={`row-product-${product.id}`}
                      >
                        {selectionMode && (
                          <td className="pl-4 pr-2 py-3 align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(product.id)}
                              className="w-3.5 h-3.5 accent-neutral-900"
                              data-testid={`checkbox-product-${product.id}`}
                              aria-label={`${product.name} seç`}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductThumb product={product} />
                            <div className="min-w-0">
                              <p
                                className="text-[13px] font-medium text-neutral-900 truncate"
                                data-testid={`text-product-name-${product.id}`}
                              >
                                {product.name}
                              </p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                {product.sku ? (
                                  <span className="font-mono">{product.sku}</span>
                                ) : (
                                  <span className="text-neutral-400">SKU yok</span>
                                )}
                                <span className="mx-1.5 text-neutral-300">·</span>
                                <span>{product.slug}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <CategoryChips product={product} categories={categories} />
                        </td>
                        <td
                          className="px-4 py-3 align-middle text-right text-[13px] font-medium text-neutral-900 tabular-nums whitespace-nowrap"
                          data-testid={`text-product-price-${product.id}`}
                        >
                          {formatPrice(product.basePrice)}
                        </td>
                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                          {stock.count === 0 ? (
                            <span className="text-[12px] text-neutral-400">-</span>
                          ) : (
                            <div>
                              <p className="text-[13px] text-neutral-900 tabular-nums">
                                {stock.total.toLocaleString('tr-TR')}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {stock.count} varyant
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <ProductStatusChips
                            product={product}
                            stockTotal={stock.total}
                            hasVariants={stock.count > 0}
                            tyStatus={tyStatus}
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <RowActions
                            product={product}
                            tyStatus={tyStatus}
                            onEdit={() => navigate(`/toov-admin/products/${product.id}`)}
                            onCopy={() => handleDuplicate(product)}
                            onDelete={() => {
                              if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            onView={() => {
                              window.open(`/urun/${product.slug}`, '_blank', 'noopener,noreferrer');
                            }}
                            onTrendyol={onTrendyolAction ? () => onTrendyolAction(product.id) : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-2">
            {pagedProducts.map((product) => {
              const stock = getStockSummary(product.id, allVariants);
              const isSelected = selectedIds.has(product.id);
              const tyStatus = trendyolStatusMap?.[product.id] ?? null;
              return (
                <Card
                  key={product.id}
                  className={`p-3 ${isSelected ? 'ring-1 ring-neutral-900/10' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(product.id)}
                        className="mt-1 w-4 h-4 accent-neutral-900"
                        data-testid={`card-checkbox-product-${product.id}`}
                        aria-label={`${product.name} seç`}
                      />
                    )}
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-neutral-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {product.sku ? (
                              <span className="font-mono">{product.sku}</span>
                            ) : (
                              <span className="text-neutral-400">SKU yok</span>
                            )}
                          </p>
                        </div>
                        <RowActions
                          product={product}
                          tyStatus={tyStatus}
                          onEdit={() => navigate(`/toov-admin/products/${product.id}`)}
                          onCopy={() => handleDuplicate(product)}
                          onDelete={() => {
                            if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                              deleteProductMutation.mutate(product.id);
                            }
                          }}
                          onView={() => {
                            window.open(`/urun/${product.slug}`, '_blank', 'noopener,noreferrer');
                          }}
                          onTrendyol={onTrendyolAction ? () => onTrendyolAction(product.id) : undefined}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-neutral-900 tabular-nums">
                          {formatPrice(product.basePrice)}
                        </span>
                        {stock.count > 0 && (
                          <span className="text-[11px] text-neutral-500 tabular-nums">
                            {stock.total} stok · {stock.count} varyant
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <ProductStatusChips
                          product={product}
                          stockTotal={stock.total}
                          hasVariants={stock.count > 0}
                          tyStatus={tyStatus}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[12px] text-neutral-500">
              <span className="tabular-nums">
                {(safePage - 1) * perPage + 1}–
                {Math.min(safePage * perPage, sortedProducts.length)}
              </span>{' '}
              / <span className="tabular-nums">{sortedProducts.length}</span> ürün
              gösteriliyor
            </p>
            <div className="flex items-center gap-1">
              <SecondaryButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                data-testid="button-page-prev"
              >
                Önceki
              </SecondaryButton>
              <span className="px-2 text-[12px] text-neutral-700 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <SecondaryButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                data-testid="button-page-next"
              >
                Sonraki
              </SecondaryButton>
            </div>
          </div>
        </>
      )}

      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isDeletingExtras && setSyncResult(null)}
          />
          <div
            className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-2xl max-h-[85vh] flex flex-col"
            data-testid="dialog-sync-result"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-neutral-100">
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-900">Varyant Kontrol Sonucu</h3>
                <p className="text-[12.5px] text-neutral-500 mt-0.5" data-testid="text-sync-message">{syncResult.message}</p>
              </div>
              <IconButton
                onClick={() => setSyncResult(null)}
                disabled={isDeletingExtras}
                aria-label="Kapat"
                data-testid="button-close-sync-dialog"
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-[11px] text-neutral-500">Taranan ürün</p>
                  <p className="text-[18px] font-semibold text-neutral-900 tabular-nums" data-testid="text-scanned-count">{syncResult.scannedCount}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-[11px] text-neutral-500">Oluşturulan eksik varyant</p>
                  <p className="text-[18px] font-semibold text-neutral-900 tabular-nums" data-testid="text-created-count">{syncResult.createdCount}</p>
                </div>
              </div>

              {syncResult.createdVariants.length > 0 && (
                <div>
                  <p className="text-[12.5px] font-semibold text-neutral-800 mb-2">Oluşturulanlar (stok 0 ile başlar)</p>
                  <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-44 overflow-y-auto">
                    {syncResult.createdVariants.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                        <span className="text-neutral-800 truncate">{v.productName}</span>
                        <span className="text-neutral-500 shrink-0">{v.size}{v.color ? ` / ${v.color}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResult.extraVariants.length > 0 ? (
                <div>
                  <p className="text-[12.5px] font-semibold text-neutral-800 mb-1">
                    Fazla varyant adayları ({syncResult.extraVariants.length})
                  </p>
                  <p className="text-[12px] text-neutral-500 mb-2">
                    Bu varyantların bedenleri ürün tanımından çıkarılmış. Hiçbiri silinmedi.
                    Silmek istediklerinizi işaretleyip aşağıdaki butonla onaylayın.
                    Stoklu olanlar varsayılan olarak işaretli değildir, silinirse stokları kaybolur.
                  </p>
                  <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-56 overflow-y-auto">
                    {syncResult.extraVariants.map((v) => (
                      <label
                        key={v.variantId}
                        className="flex items-center gap-3 px-3 py-2 text-[12.5px] cursor-pointer hover:bg-neutral-50"
                        data-testid={`row-extra-variant-${v.variantId}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExtraIds.has(v.variantId)}
                          onChange={() => toggleExtraSelected(v.variantId)}
                          className="w-4 h-4 rounded shrink-0"
                          data-testid={`checkbox-extra-${v.variantId}`}
                        />
                        <span className="text-neutral-800 truncate flex-1">{v.productName}</span>
                        <span className="text-neutral-500 shrink-0">{v.size || '-'}{v.color ? ` / ${v.color}` : ''}</span>
                        {v.stock > 0 ? (
                          <span className="shrink-0 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            Stok: {v.stock}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] text-neutral-400">Stok yok</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-neutral-500">Fazla varyant adayı yok, her şey tanımlarla uyumlu.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100">
              <SecondaryButton
                onClick={() => setSyncResult(null)}
                disabled={isDeletingExtras}
                data-testid="button-sync-dialog-done"
              >
                Kapat
              </SecondaryButton>
              {syncResult.extraVariants.length > 0 && (
                <PrimaryButton
                  onClick={handleDeleteExtras}
                  disabled={isDeletingExtras || selectedExtraIds.size === 0}
                  data-testid="button-delete-extra-variants"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeletingExtras ? 'Siliniyor...' : `Seçilenleri Sil (${selectedExtraIds.size})`}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Package,
  Clock,
  MessageSquare,
  Tag,
  AlertCircle,
  ImageIcon,
} from 'lucide-react';

interface TableDef {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  /** Onaylamak için yazılması gereken tam metin */
  confirmText: string;
}

export default function DatabasePanel() {
  const queryClient = useQueryClient();
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Per-table inline confirm states
  const [confirmInputs, setConfirmInputs] = useState<Record<string, string>>({});

  // Products modal
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productsCode, setProductsCode] = useState('');
  const PRODUCTS_CODE = 'TUM_URUNLERI_SIL';

  // All-sales modal
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllCode, setClearAllCode] = useState('');

  const { data: dbStats, isLoading, refetch } = useQuery<{
    orders: number;
    cartItems: number;
    pendingPayments: number;
    reviews: number;
    couponUsage: number;
    products: number;
  }>({ queryKey: ['/api/admin/database/stats'] });

  const tables: TableDef[] = [
    {
      id: 'orders',
      name: 'Siparişler',
      description: 'Tüm siparişler ve sipariş kalemleri',
      count: dbStats?.orders || 0,
      icon: ShoppingCart,
      confirmText: 'SİPARİŞLERİ SİL',
    },
    {
      id: 'cart_items',
      name: 'Sepet Öğeleri',
      description: 'Tüm kullanıcıların sepetlerindeki ürünler',
      count: dbStats?.cartItems || 0,
      icon: Package,
      confirmText: 'SEPETİ TEMİZLE',
    },
    {
      id: 'pending_payments',
      name: 'Bekleyen Ödemeler',
      description: 'iyzico ödeme kayıtları',
      count: dbStats?.pendingPayments || 0,
      icon: Clock,
      confirmText: 'ÖDEMELERİ SİL',
    },
    {
      id: 'reviews',
      name: 'Yorumlar',
      description: 'Ürün değerlendirmeleri',
      count: dbStats?.reviews || 0,
      icon: MessageSquare,
      confirmText: 'YORUMLARI SİL',
    },
    {
      id: 'coupon_usage',
      name: 'Kupon Kullanımları',
      description: 'Kupon kullanım geçmişi ve sayaçları',
      count: dbStats?.couponUsage || 0,
      icon: Tag,
      confirmText: 'KUPONU SİFIRLA',
    },
  ];

  const setConfirm = (tableId: string, value: string) =>
    setConfirmInputs((prev) => ({ ...prev, [tableId]: value }));

  const handleClearTable = async (table: TableDef) => {
    const input = confirmInputs[table.id] ?? '';
    if (input !== table.confirmText) {
      setMessage({
        type: 'error',
        text: `Onay metni hatalı. "${table.confirmText}" yazmalısınız.`,
      });
      return;
    }
    setClearingTable(table.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/database/clear/${table.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: 'SIFIRLA' }), // server hâlâ SIFIRLA bekliyor
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata oluştu');
      setMessage({ type: 'success', text: `${data.deletedCount} kayıt silindi.` });
      setConfirm(table.id, '');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız',
      });
    } finally {
      setClearingTable(null);
    }
  };

  const handleClearProducts = async () => {
    if (productsCode !== PRODUCTS_CODE) {
      setMessage({ type: 'error', text: `Onay kodu hatalı. '${PRODUCTS_CODE}' yazmalısınız.` });
      return;
    }
    setClearingTable('products');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/database/clear/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: productsCode }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata oluştu');
      setMessage({ type: 'success', text: `${data.deletedCount} ürün ve fotoğrafları silindi.` });
      setProductsCode('');
      setShowProductsModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız',
      });
    } finally {
      setClearingTable(null);
    }
  };

  const handleClearAllSales = async () => {
    if (clearAllCode !== 'TUM_SATISLARI_SIL') {
      setMessage({ type: 'error', text: "Onay kodu hatalı. 'TUM_SATISLARI_SIL' yazmalısınız." });
      return;
    }
    setClearingTable('all');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/database/clear-all-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: clearAllCode }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata oluştu');
      setMessage({ type: 'success', text: 'Tüm satış verileri silindi.' });
      setClearAllCode('');
      setShowClearAllModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız',
      });
    } finally {
      setClearingTable(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-neutral-900">Veritabanı Yönetimi</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Sipariş, sepet ve ciro verilerini sıfırlayın. Kullanıcılar, ürünler ve stoklar korunur.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center justify-center gap-2 min-h-9 px-4 py-2 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors sm:shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Global message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-neutral-500/10 border border-neutral-500/30 text-neutral-700'
              : 'bg-red-500/10 border border-red-500/30 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Bu işlemler <strong>geri alınamaz</strong>. Silmek istediğiniz tablonun onay metnini
          tam olarak yazın, ardından "Sıfırla" tuşuna basın.
        </p>
      </div>

      {/* Per-table rows */}
      <div className="grid gap-4">
        {tables.map((table) => {
          const input = confirmInputs[table.id] ?? '';
          const isReady = input === table.confirmText;
          return (
            <div
              key={table.id}
              data-testid={`card-table-${table.id}`}
              className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6 space-y-4"
            >
              {/* Row: icon + info + count + button */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-neutral-50 rounded-lg flex items-center justify-center shrink-0">
                    <table.icon className="w-6 h-6 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-neutral-900">{table.name}</h4>
                    <p className="text-sm text-neutral-500">{table.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="text-2xl font-bold text-neutral-900">
                      {table.count.toLocaleString('tr-TR')}
                    </span>
                    <p className="text-xs text-neutral-500">kayıt</p>
                  </div>
                  <button
                    onClick={() => handleClearTable(table)}
                    disabled={clearingTable !== null || !isReady || table.count === 0}
                    className="flex items-center justify-center gap-2 min-h-9 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid={`button-clear-${table.id}`}
                  >
                    {clearingTable === table.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Sıfırla
                  </button>
                </div>
              </div>

              {/* Inline confirm input */}
              {table.count > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Onaylamak için{' '}
                      <span className="font-mono font-semibold text-neutral-600">
                        {table.confirmText}
                      </span>{' '}
                      yazın
                    </label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setConfirm(table.id, e.target.value.toUpperCase())}
                      placeholder={table.confirmText}
                      className={`w-full px-3 py-1.5 bg-neutral-50 border rounded-md text-neutral-900 font-mono text-sm placeholder:text-neutral-300 transition-colors ${
                        isReady
                          ? 'border-red-400 bg-red-50'
                          : 'border-neutral-200'
                      }`}
                      data-testid={`input-confirm-${table.id}`}
                    />
                  </div>
                  {isReady && (
                    <div className="shrink-0 flex items-center gap-1.5 text-red-600 text-xs font-medium pt-5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Hazır
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Products danger zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6" data-testid="card-products-clear">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6 text-red-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Tüm Ürünler ve Fotoğrafları
              </h3>
              <p className="text-sm text-neutral-600 mt-0.5">
                Ürünler, varyantlar, yorumlar ve sunucudaki fotoğraflar kalıcı olarak silinir.
                Sipariş geçmişi korunur.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end sm:shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-2xl font-bold text-neutral-900" data-testid="text-products-count">
                {(dbStats?.products || 0).toLocaleString('tr-TR')}
              </span>
              <p className="text-xs text-neutral-500">ürün</p>
            </div>
            <button
              onClick={() => setShowProductsModal(true)}
              disabled={clearingTable !== null || (dbStats?.products || 0) === 0}
              className="min-h-9 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-clear-products"
            >
              Tüm Ürünleri Sil…
            </button>
          </div>
        </div>
      </div>

      {/* All-sales danger zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Tüm Satış Verilerini Sil
            </h3>
            <p className="text-sm text-neutral-600 mt-0.5">
              Siparişler, sepetler, bekleyen ödemeler ve kupon kullanımları tek seferde silinir.
            </p>
          </div>
          <button
            onClick={() => setShowClearAllModal(true)}
            disabled={clearingTable !== null}
            className="min-h-9 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:shrink-0 disabled:opacity-50"
          >
            Tümünü Sil…
          </button>
        </div>
      </div>

      {/* Products modal */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md"
            data-testid="modal-clear-products"
          >
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Tüm Ürünleri ve Fotoğrafları Sil
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600">Bu işlem aşağıdakileri kalıcı olarak silecek:</p>
              <ul className="text-sm text-neutral-600 list-disc list-inside space-y-1">
                <li>
                  <strong className="text-neutral-900">
                    {(dbStats?.products || 0).toLocaleString('tr-TR')}
                  </strong>{' '}
                  ürün
                </li>
                <li>Tüm ürün varyantları (renk/ölçü)</li>
                <li>Tüm ürün yorumları ve favoriler</li>
                <li>Aktif sepetlerdeki ürün satırları</li>
                <li className="text-red-600 font-medium">
                  Sunucudaki tüm ürün fotoğrafları (geri alınamaz)
                </li>
              </ul>
              <p className="text-xs text-neutral-500 italic">
                Sipariş geçmişi korunur - sipariş kalemleri ürün adıyla birlikte saklanmaya
                devam eder, sadece ürün referansı boşaltılır.
              </p>
              <div className="pt-2">
                <label className="block text-sm text-neutral-600 mb-2">
                  Onaylamak için{' '}
                  <span className="text-red-600 font-mono font-semibold">{PRODUCTS_CODE}</span>{' '}
                  yazın:
                </label>
                <input
                  type="text"
                  value={productsCode}
                  onChange={(e) => setProductsCode(e.target.value.toUpperCase())}
                  placeholder={PRODUCTS_CODE}
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 font-mono"
                  data-testid="input-products-confirm"
                />
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProductsModal(false);
                  setProductsCode('');
                }}
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm"
                data-testid="button-cancel-clear-products"
              >
                İptal
              </button>
              <button
                onClick={handleClearProducts}
                disabled={clearingTable !== null || productsCode !== PRODUCTS_CODE}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                data-testid="button-confirm-clear-products"
              >
                {clearingTable === 'products' && <Loader2 className="w-4 h-4 animate-spin" />}
                Hepsini Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All-sales modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Tüm Satış Verilerini Sil
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600">
                Bu işlem aşağıdaki verileri kalıcı olarak silecek:
              </p>
              <ul className="text-sm text-neutral-600 list-disc list-inside space-y-1">
                <li>Tüm siparişler ve sipariş kalemleri</li>
                <li>Tüm sepet öğeleri</li>
                <li>Tüm bekleyen ödemeler</li>
                <li>Tüm kupon kullanım kayıtları</li>
              </ul>
              <div className="pt-2">
                <label className="block text-sm text-neutral-600 mb-2">
                  Onaylamak için{' '}
                  <span className="text-red-600 font-mono font-semibold">TUM_SATISLARI_SIL</span>{' '}
                  yazın:
                </label>
                <input
                  type="text"
                  value={clearAllCode}
                  onChange={(e) => setClearAllCode(e.target.value.toUpperCase())}
                  placeholder="TUM_SATISLARI_SIL"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 font-mono"
                />
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowClearAllModal(false);
                  setClearAllCode('');
                }}
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleClearAllSales}
                disabled={clearingTable !== null || clearAllCode !== 'TUM_SATISLARI_SIL'}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {clearingTable === 'all' && <Loader2 className="w-4 h-4 animate-spin" />}
                Tümünü Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

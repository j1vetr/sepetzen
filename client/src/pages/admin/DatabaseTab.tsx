import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Trash2, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, RotateCcw, Server, ShoppingCart, Package, Clock, MessageSquare, Tag, AlertCircle, ImageIcon } from 'lucide-react';

export default function DatabasePanel() {
  const queryClient = useQueryClient();
  const [confirmCode, setConfirmCode] = useState('');
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllCode, setClearAllCode] = useState('');

  const { data: dbStats, isLoading, refetch } = useQuery<{
    orders: number;
    cartItems: number;
    pendingPayments: number;
    reviews: number;
    couponUsage: number;
    products: number;
  }>({
    queryKey: ['/api/admin/database/stats'],
  });

  // Ürünler için ekstra güvenli onay kodu (yanlışlıkla katalog silinmesin)
  const PRODUCTS_CODE = 'TUM_URUNLERI_SIL';
  const [productsCode, setProductsCode] = useState('');
  const [showProductsModal, setShowProductsModal] = useState(false);

  const tables = [
    { id: 'orders', name: 'Siparişler', description: 'Tüm siparişler ve sipariş kalemleri', count: dbStats?.orders || 0, icon: ShoppingCart },
    { id: 'cart_items', name: 'Sepet Öğeleri', description: 'Tüm kullanıcıların sepetlerindeki ürünler', count: dbStats?.cartItems || 0, icon: Package },
    { id: 'pending_payments', name: 'Bekleyen Ödemeler', description: 'iyzico ödeme kayıtları', count: dbStats?.pendingPayments || 0, icon: Clock },
    { id: 'reviews', name: 'Yorumlar', description: 'Ürün değerlendirmeleri', count: dbStats?.reviews || 0, icon: MessageSquare },
    { id: 'coupon_usage', name: 'Kupon Kullanımları', description: 'Kupon kullanım geçmişi ve sayaçları', count: dbStats?.couponUsage || 0, icon: Tag },
  ];

  const handleClearTable = async (tableId: string) => {
    if (confirmCode !== 'SIFIRLA') {
      setMessage({ type: 'error', text: "Onay kodu hatalı. 'SIFIRLA' yazmalısınız." });
      return;
    }

    setClearingTable(tableId);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/database/clear/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hata oluştu');
      }

      setMessage({ type: 'success', text: `${data.deletedCount} kayıt silindi.` });
      setConfirmCode('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error) {
      setMessage({ type: 'error', text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız' });
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
      setMessage({ type: 'error', text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız' });
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

      if (!res.ok) {
        throw new Error(data.error || 'Hata oluştu');
      }

      setMessage({ type: 'success', text: 'Tüm satış verileri silindi.' });
      setClearAllCode('');
      setShowClearAllModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    } catch (error) {
      setMessage({ type: 'error', text: (error instanceof Error ? error.message : String(error)) || 'Silme işlemi başarısız' });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Veritabanı Yönetimi</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Sipariş, sepet ve ciro verilerini sıfırlayın. Kullanıcılar, ürünler ve stoklar korunur.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-neutral-900" />
          Dikkat
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          Bu işlemler geri alınamaz. Silinen veriler kalıcı olarak kaybolur. İşlem yapmadan önce onay kodu girmeniz gerekir.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-neutral-500 mb-1">Onay Kodu</label>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              placeholder="SIFIRLA yazın"
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-500"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-50 rounded-lg flex items-center justify-center">
                <table.icon className="w-6 h-6 text-neutral-500" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-900">{table.name}</h4>
                <p className="text-sm text-neutral-500">{table.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-2xl font-bold text-neutral-900">{table.count.toLocaleString('tr-TR')}</span>
                <p className="text-xs text-neutral-500">kayıt</p>
              </div>
              <button
                onClick={() => handleClearTable(table.id)}
                disabled={clearingTable !== null || table.count === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        ))}
      </div>

      {/* Tüm Ürünler ve Fotoğrafları */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6" data-testid="card-products-clear">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Tüm Ürünler ve Fotoğrafları
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Tüm ürünler, varyantları, yorumları ve sunucudaki ürün fotoğrafları silinir. Sipariş geçmişi korunur (ürün referansı boş bırakılır).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold text-neutral-900" data-testid="text-products-count">
                {(dbStats?.products || 0).toLocaleString('tr-TR')}
              </span>
              <p className="text-xs text-neutral-500">ürün</p>
            </div>
            <button
              onClick={() => setShowProductsModal(true)}
              disabled={clearingTable !== null || (dbStats?.products || 0) === 0}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-clear-products"
            >
              Tüm Ürünleri Sil
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tüm Satış Verilerini Sil
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              Siparişler, sepetler, bekleyen ödemeler ve kupon kullanımları tek seferde silinir.
            </p>
          </div>
          <button
            onClick={() => setShowClearAllModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Tümünü Sil
          </button>
        </div>
      </div>

      {/* Clear Products Modal */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md" data-testid="modal-clear-products">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                Tüm Ürünleri ve Fotoğrafları Sil
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-500">
                Bu işlem aşağıdakileri kalıcı olarak silecek:
              </p>
              <ul className="text-sm text-neutral-500 list-disc list-inside space-y-1">
                <li><strong className="text-neutral-900">{(dbStats?.products || 0).toLocaleString('tr-TR')}</strong> ürün</li>
                <li>Tüm ürün varyantları (renk/ölçü)</li>
                <li>Tüm ürün yorumları ve favoriler</li>
                <li>Aktif sepetlerdeki ürün satırları</li>
                <li><strong className="text-red-400">Sunucudaki tüm ürün fotoğrafları (geri alınamaz)</strong></li>
              </ul>
              <p className="text-xs text-neutral-500 italic">
                Sipariş geçmişi korunur - sipariş kalemleri ürün adıyla birlikte saklanmaya devam eder, sadece ürün referansı boşaltılır.
              </p>
              <div className="pt-4">
                <label className="block text-sm text-neutral-500 mb-2">
                  Onaylamak için <span className="text-red-400 font-mono">{PRODUCTS_CODE}</span> yazın:
                </label>
                <input
                  type="text"
                  value={productsCode}
                  onChange={(e) => setProductsCode(e.target.value.toUpperCase())}
                  placeholder={PRODUCTS_CODE}
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-500 font-mono"
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
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                data-testid="button-cancel-clear-products"
              >
                İptal
              </button>
              <button
                onClick={handleClearProducts}
                disabled={clearingTable !== null || productsCode !== PRODUCTS_CODE}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-confirm-clear-products"
              >
                {clearingTable === 'products' && <Loader2 className="w-4 h-4 animate-spin" />}
                Hepsini Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                Tüm Satış Verilerini Sil
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-500">
                Bu işlem aşağıdaki verileri kalıcı olarak silecek:
              </p>
              <ul className="text-sm text-neutral-500 list-disc list-inside space-y-1">
                <li>Tüm siparişler ve sipariş kalemleri</li>
                <li>Tüm sepet öğeleri</li>
                <li>Tüm bekleyen ödemeler</li>
                <li>Tüm kupon kullanım kayıtları</li>
              </ul>
              <div className="pt-4">
                <label className="block text-sm text-neutral-500 mb-2">
                  Onaylamak için <span className="text-red-400 font-mono">TUM_SATISLARI_SIL</span> yazın:
                </label>
                <input
                  type="text"
                  value={clearAllCode}
                  onChange={(e) => setClearAllCode(e.target.value.toUpperCase())}
                  placeholder="TUM_SATISLARI_SIL"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-500 font-mono"
                />
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowClearAllModal(false);
                  setClearAllCode('');
                }}
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleClearAllSales}
                disabled={clearingTable !== null || clearAllCode !== 'TUM_SATISLARI_SIL'}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


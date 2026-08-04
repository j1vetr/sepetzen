import { useState, useEffect } from 'react';
import type { User } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

export default function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
    products: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [user.id]);

  return (
    <AdminModal open onClose={onClose} title="Kullanıcı Detayı" size="md" testId="modal-user-detail">
      <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-900 text-2xl font-bold">
              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold text-neutral-900">{user.firstName} {user.lastName}</p>
              <p className="text-neutral-500">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-500">Telefon</p>
              <p className="text-neutral-900">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Kayıt Tarihi</p>
              <p className="text-neutral-900">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Order Stats */}
          {isLoading ? (
            <div className="text-center py-4 text-neutral-500">Yükleniyor...</div>
          ) : stats && (
            <div className="pt-4 border-t border-neutral-200 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{stats.totalOrders}</p>
                  <p className="text-xs text-neutral-500">Toplam Sipariş</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-neutral-400">{stats.totalSpent.toFixed(2)}₺</p>
                  <p className="text-xs text-neutral-500">Toplam Harcama</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-neutral-900">
                    {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('tr-TR') : '-'}
                  </p>
                  <p className="text-xs text-neutral-500">Son Sipariş</p>
                </div>
              </div>

              {stats.products.length > 0 && (
                <div>
                  <p className="text-sm text-neutral-500 mb-2">Satın Alınan Ürünler</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {stats.products.map((product, index) => (
                      <span key={index} className="px-2 py-1 bg-neutral-50 text-neutral-700 text-xs rounded-full">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </AdminModal>
  );
}

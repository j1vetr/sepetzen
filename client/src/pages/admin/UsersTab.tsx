import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users as UsersIcon, Pencil, Trash2, MapPin, ChevronDown } from 'lucide-react';
import type { User } from './_shared/types';
import { Card, SearchInput, IconButton, EmptyState } from './_ui/AdminUI';

interface UsersTabProps {
  users: User[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setViewingUser: (u: User | null) => void;
  deleteUserMutation: { mutate: (id: string) => void };
}

interface CustomerOrderMetric {
  userId: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export default function UsersTab({ users, searchQuery, setSearchQuery, setViewingUser, deleteUserMutation }: UsersTabProps) {
  const [cityFilter, setCityFilter] = useState('');

  const { data: customerMetrics = [], isLoading: metricsLoading, isError: metricsError } = useQuery<CustomerOrderMetric[]>({
    queryKey: ['admin', 'users', 'order-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users/order-metrics', { credentials: 'include' });
      if (!response.ok) throw new Error('Müşteri değerleri yüklenemedi');
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('Müşteri değerleri geçersiz');
      return data as CustomerOrderMetric[];
    },
  });

  const customerValue = useMemo(
    () => new Map(customerMetrics.map((metric) => [metric.userId, metric])),
    [customerMetrics],
  );

  // Benzersiz şehirleri al
  const uniqueCities = useMemo(() => {
    const cities = users.map(u => u.city).filter(Boolean) as string[];
    return Array.from(new Set(cities)).sort((a, b) => a.localeCompare('tr'));
  }, [users]);

  // Filtrele
  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q)
      );
    }
    if (cityFilter) {
      result = result.filter(u => u.city === cityFilter);
    }
    return result;
  }, [users, searchQuery, cityFilter]);

  const valueFor = (user: User) =>
    customerValue.get(user.id) ?? { totalOrders: 0, totalSpent: 0, lastOrderDate: null };

  const confirmDelete = (id: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const locationLabel = (user: User) => {
    const parts = [user.city, user.district].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : null;
  };

  return (
    <div>
      {/* Filtre çubuğu */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          placeholder="Ad, e-posta veya telefon ara"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
          data-testid="input-search-users"
        />

        {/* Şehir filtresi */}
        <div className="relative">
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            data-testid="select-city-filter"
            className="h-9 pl-3 pr-8 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-700 appearance-none cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          >
            <option value="">Tüm Şehirler</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
        </div>

        {(searchQuery || cityFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setCityFilter(''); }}
            className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
            data-testid="button-clear-user-filters"
          >
            Filtreleri temizle
          </button>
        )}

        <span className="ml-auto text-[12px] text-neutral-400">
          {filteredUsers.length} kullanıcı
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title="Kullanıcı bulunamadı"
            description="Arama veya filtre kriterinize uyan kullanıcı yok."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Masaüstü tablo */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Kullanıcı</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">E-posta</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Telefon</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Şehir</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Müşteri Değeri</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Kayıt</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-500">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredUsers.map((user) => {
                  const value = valueFor(user);
                  const loc = locationLabel(user);
                  return (
                    <tr key={user.id} className="hover:bg-neutral-50/30" data-testid={`row-user-${user.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-900 font-bold shrink-0 text-sm">
                            {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-neutral-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-neutral-500 text-sm">{user.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {loc ? (
                          <span className="flex items-center gap-1 text-neutral-600">
                            <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                            {loc}
                          </span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium tabular-nums text-neutral-900">
                          {value.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-500">
                          {metricsLoading ? 'Yükleniyor' : metricsError ? 'Yüklenemedi' : value.totalOrders ? `${value.totalOrders} sipariş · Son: ${new Date(value.lastOrderDate!).toLocaleDateString('tr-TR')}` : 'Henüz sipariş yok'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            onClick={() => setViewingUser(user)}
                            title="Müşteri detayı ve geçmişi"
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            tone="danger"
                            onClick={() => confirmDelete(user.id)}
                            title="Sil"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="md:hidden divide-y divide-neutral-200">
            {filteredUsers.map((user) => {
              const value = valueFor(user);
              const loc = locationLabel(user);
              return (
                <div key={user.id} className="p-4" data-testid={`card-user-${user.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-900 font-bold shrink-0">
                      {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-neutral-500 text-[12px]">Telefon</p>
                      <p className="text-neutral-900">{user.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[12px]">Şehir</p>
                      <p className="text-neutral-900 flex items-center gap-1">
                        {loc ? <><MapPin className="w-3 h-3 text-neutral-400 shrink-0" />{loc}</> : '-'}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-md bg-neutral-50 px-3 py-2">
                      <p className="text-neutral-500 text-[12px]">Müşteri değeri</p>
                      <p className="font-medium tabular-nums text-neutral-900">
                        {value.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                        <span className="ml-1.5 text-[12px] font-normal text-neutral-500">
                          {metricsLoading ? 'Yükleniyor' : metricsError ? 'Yüklenemedi' : value.totalOrders ? `${value.totalOrders} sipariş` : 'Henüz sipariş yok'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[12px]">Kayıt Tarihi</p>
                      <p className="text-neutral-900">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingUser(user)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 flex-1 text-[13px] font-medium bg-white text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                      data-testid={`card-button-edit-user-${user.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Detay ve geçmiş
                    </button>
                    <button
                      onClick={() => confirmDelete(user.id)}
                      className="inline-flex items-center justify-center h-9 w-9 text-neutral-500 border border-neutral-200 rounded-md hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      data-testid={`card-button-delete-user-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

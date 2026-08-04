import { Users as UsersIcon, Eye, Trash2 } from 'lucide-react';
import type { User } from './_shared/types';
import { Card, SearchInput, IconButton, EmptyState } from './_ui/AdminUI';

interface UsersTabProps {
  users: User[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setViewingUser: (u: User | null) => void;
  deleteUserMutation: { mutate: (id: string) => void };
}

export default function UsersTab({ users, searchQuery, setSearchQuery, setViewingUser, deleteUserMutation }: UsersTabProps) {
  const confirmDelete = (id: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      deleteUserMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SearchInput
          placeholder="Kullanıcı ara"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
          data-testid="input-search-users"
        />
      </div>

      {users.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title="Kullanıcı bulunamadı"
            description="Arama kriterinize uyan kullanıcı yok."
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
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-500">Kayıt Tarihi</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-500">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/30" data-testid={`row-user-${user.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-900 font-bold shrink-0">
                          {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-neutral-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">{user.email}</td>
                    <td className="px-6 py-4 text-neutral-500">{user.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          onClick={() => setViewingUser(user)}
                          title="Görüntüle"
                          data-testid={`button-view-user-${user.id}`}
                        >
                          <Eye className="w-4 h-4" />
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="md:hidden divide-y divide-neutral-200">
            {users.map((user) => (
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
                    <p className="text-neutral-500 text-[12px]">Kayıt Tarihi</p>
                    <p className="text-neutral-900">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingUser(user)}
                    className="inline-flex items-center justify-center gap-1.5 h-9 flex-1 text-[13px] font-medium bg-white text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    data-testid={`card-button-view-user-${user.id}`}
                  >
                    <Eye className="w-4 h-4" />
                    Görüntüle
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
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

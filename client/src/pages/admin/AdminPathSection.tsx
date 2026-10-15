import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { adminBase } from '@/lib/adminPath';
import { DEFAULT_ADMIN_PATH, normalizeAdminPath, ADMIN_PATH_ERROR } from '@shared/adminPath';

export default function AdminPathSection() {
  const current = adminBase().replace(/^\//, '');
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cleaned = value.trim() === '' ? DEFAULT_ADMIN_PATH : normalizeAdminPath(value);
  const unchanged = cleaned === current;

  const save = async () => {
    if (!cleaned) {
      setError(ADMIN_PATH_ERROR);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_panel_path: cleaned }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Kayıt başarısız.');
        return;
      }
      window.location.href = `/${cleaned}?tab=settings`;
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-admin-path">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-neutral-50 rounded-lg">
          <KeyRound className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Yönetim Paneli Adresi</h3>
          <p className="text-sm text-neutral-500">Panele giriş adresini istediğiniz gibi değiştirin</p>
        </div>
      </div>

      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Panel yolu</label>
      <div className="flex items-stretch max-w-xl">
        <span className="px-3 flex items-center bg-neutral-100 border border-r-0 border-neutral-200 rounded-l-lg text-sm text-neutral-500">
          {window.location.host}/
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder={DEFAULT_ADMIN_PATH}
          className="flex-1 min-w-0 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-r-lg text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
          data-testid="input-admin-path"
        />
      </div>
      <p className="text-xs text-neutral-500 mt-2">
        Varsayılan: {DEFAULT_ADMIN_PATH}. Küçük harf, rakam ve tire kullanılabilir. Boş bırakıp kaydederseniz varsayılana döner.
      </p>
      {error && <p className="text-xs text-red-600 mt-2" data-testid="text-admin-path-error">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || (!!cleaned && unchanged)}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors"
          data-testid="button-save-admin-path"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Adresi Değiştir
        </button>
        <span className="text-xs text-neutral-500">Kaydedince yeni adrese yönlendirilirsiniz. Eski adres çalışmaz.</span>
      </div>
    </div>
  );
}

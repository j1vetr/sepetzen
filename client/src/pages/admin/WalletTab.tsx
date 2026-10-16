import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AdminTx {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: string;
  balanceAfter: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
}

interface WalletAdminData {
  transactions: AdminTx[];
  totals: { totalBalance: number; pendingBankCount: number; pendingBankAmount: number };
  settings: { enabled: boolean; minTopup: number; maxTopup: number };
}

interface FoundUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  walletBalance: string;
}

const tl = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

const TYPE_LABELS: Record<string, string> = {
  topup_card: 'Kart yüklemesi',
  topup_bank: 'Havale yüklemesi',
  order_payment: 'Sipariş ödemesi',
  order_refund: 'Sipariş iadesi',
  admin_adjust: 'Admin düzeltmesi',
};

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Bekliyor', cls: 'bg-amber-50 text-amber-700' },
  completed: { text: 'Tamamlandı', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { text: 'Reddedildi', cls: 'bg-red-50 text-red-700' },
  failed: { text: 'Başarısız', cls: 'bg-red-50 text-red-700' },
};

const FILTERS = [
  { id: 'pending_bank', label: 'Bekleyen havaleler' },
  { id: 'all', label: 'Tüm hareketler' },
];

export default function WalletTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending_bank');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<FoundUser | null>(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [settingsForm, setSettingsForm] = useState<{ enabled: boolean; min: string; max: string } | null>(null);

  const url = filter === 'pending_bank' ? '/api/admin/wallet?status=pending&type=topup_bank' : '/api/admin/wallet';
  const { data, isLoading } = useQuery<WalletAdminData>({ queryKey: [url] });
  const { data: found = [] } = useQuery<FoundUser[]>({
    queryKey: [`/api/admin/wallet/users?q=${encodeURIComponent(q)}`],
    enabled: q.trim().length >= 2 && !picked,
  });

  const invalidate = () => queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/admin/wallet') });
  const onError = (err: Error) => toast({ title: 'İşlem başarısız', description: err.message, variant: 'destructive' });

  const approve = useMutation({
    mutationFn: async (id: string) => { await apiRequest('POST', `/api/admin/wallet/transactions/${id}/approve`); },
    onSuccess: () => { invalidate(); toast({ title: 'Yükleme onaylandı, bakiye eklendi' }); },
    onError,
  });
  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => { await apiRequest('POST', `/api/admin/wallet/transactions/${id}/reject`, { reason }); },
    onSuccess: () => { invalidate(); toast({ title: 'Talep reddedildi' }); },
    onError,
  });
  const adjust = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/admin/wallet/adjust', {
        userId: picked?.id,
        amount: Number(adjAmount.replace(',', '.')),
        note: adjNote,
      });
    },
    onSuccess: () => {
      invalidate();
      setPicked(null); setQ(''); setAdjAmount(''); setAdjNote('');
      toast({ title: 'Bakiye güncellendi' });
    },
    onError,
  });
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!settingsForm) return;
      await apiRequest('PUT', '/api/admin/wallet/settings', {
        enabled: settingsForm.enabled,
        minTopup: Number(settingsForm.min.replace(',', '.')),
        maxTopup: Number(settingsForm.max.replace(',', '.')),
      });
    },
    onSuccess: () => { invalidate(); setSettingsForm(null); toast({ title: 'Ayarlar kaydedildi' }); },
    onError,
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>;
  }

  const sf = settingsForm ?? { enabled: data.settings.enabled, min: String(data.settings.minTopup), max: String(data.settings.maxTopup) };
  const input = 'h-10 px-3 border border-neutral-300 rounded-lg text-sm bg-white w-full';

  return (
    <div className="space-y-6" data-testid="admin-wallet-tab">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <p className="text-xs text-neutral-500">Müşterilerdeki toplam bakiye</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1" data-testid="text-wallet-total">{tl(data.totals.totalBalance)}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <p className="text-xs text-neutral-500">Onay bekleyen havale</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{data.totals.pendingBankCount}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <p className="text-xs text-neutral-500">Bekleyen havale tutarı</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{tl(data.totals.pendingBankAmount)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm border ${filter === f.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-300'}`}
            data-testid={`filter-wallet-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Tür</th>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3 text-right">Tutar</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.transactions.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">Kayıt yok.</td></tr>
            )}
            {data.transactions.map((t) => {
              const badge = STATUS_BADGE[t.status] || STATUS_BADGE.completed;
              const isPendingBank = t.type === 'topup_bank' && t.status === 'pending';
              return (
                <tr key={t.id} data-testid={`row-wallet-tx-${t.id}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{new Date(t.createdAt).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3">
                    <div className="text-neutral-900">{t.userName || t.userEmail}</div>
                    {t.userName && <div className="text-xs text-neutral-500">{t.userEmail}</div>}
                  </td>
                  <td className="px-4 py-3">{TYPE_LABELS[t.type] || t.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.type === 'topup_bank' ? t.reference : t.note || '-'}</td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${parseFloat(t.amount) < 0 ? 'text-red-600' : 'text-neutral-900'}`}>{tl(parseFloat(t.amount))}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs ${badge.cls}`}>{badge.text}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {isPendingBank && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { if (confirm(`${tl(parseFloat(t.amount))} tutarındaki yüklemeyi onaylıyor musunuz? Bakiye müşteriye eklenecek.`)) approve.mutate(t.id); }}
                          disabled={approve.isPending}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs"
                          data-testid={`button-wallet-approve-${t.id}`}
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => { const reason = prompt('Red sebebi (isteğe bağlı)') ; if (reason !== null) reject.mutate({ id: t.id, reason }); }}
                          disabled={reject.isPending}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs"
                          data-testid={`button-wallet-reject-${t.id}`}
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Manuel bakiye düzeltme</h3>
          <p className="text-xs text-neutral-500">Pozitif tutar ekler, negatif tutar (örn. -50) düşer.</p>
          {picked ? (
            <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2 text-sm">
              <span>{picked.email} (bakiye: {tl(parseFloat(picked.walletBalance))})</span>
              <button className="text-xs text-neutral-500 underline" onClick={() => setPicked(null)}>Değiştir</button>
            </div>
          ) : (
            <div className="relative">
              <input className={input} placeholder="Müşteri e-postası veya adı" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-wallet-user-search" />
              {found.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                  {found.map((u) => (
                    <li key={u.id}>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setPicked(u)}>
                        {u.email} <span className="text-neutral-400">({tl(parseFloat(u.walletBalance))})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <input className={input} placeholder="Tutar (₺)" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value.replace(/[^0-9.,-]/g, ''))} data-testid="input-wallet-adjust-amount" />
          <input className={input} placeholder="Açıklama (zorunlu)" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} data-testid="input-wallet-adjust-note" />
          <button
            onClick={() => adjust.mutate()}
            disabled={adjust.isPending || !picked || !adjAmount || !adjNote.trim()}
            className="h-10 px-5 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50"
            data-testid="button-wallet-adjust"
          >
            Uygula
          </button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Bakiye ayarları</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sf.enabled} onChange={(e) => setSettingsForm({ ...sf, enabled: e.target.checked })} data-testid="checkbox-wallet-enabled" />
            Bakiye yükleme ve bakiye ile ödeme açık
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">En düşük yükleme (₺)</label>
              <input className={input} value={sf.min} onChange={(e) => setSettingsForm({ ...sf, min: e.target.value })} data-testid="input-wallet-min" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">En yüksek yükleme (₺)</label>
              <input className={input} value={sf.max} onChange={(e) => setSettingsForm({ ...sf, max: e.target.value })} data-testid="input-wallet-max" />
            </div>
          </div>
          <button
            onClick={() => saveSettings.mutate()}
            disabled={saveSettings.isPending || !settingsForm}
            className="h-10 px-5 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50"
            data-testid="button-wallet-save-settings"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

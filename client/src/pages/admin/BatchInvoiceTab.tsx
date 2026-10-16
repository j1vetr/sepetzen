import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Settings { enabled: boolean; time: string; includeToday: boolean }
interface PendingGroup {
  key: string; customerEmail: string; customerName: string; businessDate: string;
  due: boolean; orderCount: number; total: number; orderNumbers: string[];
}
interface Batch {
  id: string; customerEmail: string; customerName: string; businessDate: string; status: string;
  trigger: string; orderCount: number; total: string; invoiceNumber: string | null; ettn: string | null;
  errorMessage: string | null; createdAt: string; sentAt: string | null;
}
interface RunSummary { trigger: string; startedAt: string; finishedAt: string; groups: number; sent: number; failed: number; retried: number }
interface Data { settings: Settings; pending: PendingGroup[]; batches: Batch[]; lastRun: RunSummary | null; running: boolean }

const tl = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const BADGE: Record<string, { text: string; cls: string }> = {
  processing: { text: 'İşleniyor', cls: 'bg-blue-50 text-blue-700' },
  sent: { text: 'Gönderildi', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { text: 'Hata', cls: 'bg-red-50 text-red-700' },
  cancelled: { text: 'İptal', cls: 'bg-neutral-100 text-neutral-500' },
};
const KEY = ['/api/admin/batch-invoice'];

export default function BatchInvoiceTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Data>({ queryKey: KEY, refetchInterval: 15000 });
  const [form, setForm] = useState<Settings | null>(null);
  const [email, setEmail] = useState('');
  const [runToday, setRunToday] = useState(false);

  useEffect(() => { if (data && !form) setForm(data.settings); }, [data, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const onError = (e: Error) => toast({ title: 'İşlem başarısız', description: e.message, variant: 'destructive' });

  const save = useMutation({
    mutationFn: async () => { await apiRequest('PUT', '/api/admin/batch-invoice/settings', form); },
    onSuccess: () => { refresh(); toast({ title: 'Ayarlar kaydedildi' }); },
    onError,
  });
  const run = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/batch-invoice/run', { includeToday: runToday, email: email.trim() || undefined });
      return (await res.json()) as RunSummary;
    },
    onSuccess: (s) => {
      refresh();
      toast({ title: 'Çalışma tamamlandı', description: `${s.groups} grup, ${s.sent} gönderildi, ${s.failed} hata` });
    },
    onError,
  });
  const retry = useMutation({
    mutationFn: async (id: string) => { await apiRequest('POST', `/api/admin/batch-invoice/batches/${id}/retry`); },
    onSuccess: () => { refresh(); toast({ title: 'Yeniden denendi' }); },
    onError,
  });

  if (isLoading || !data || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>;
  }

  const input = 'h-10 px-3 border border-neutral-300 rounded-lg text-sm bg-white';
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);
  const dueCount = data.pending.filter((g) => g.due || runToday).length;

  return (
    <div className="space-y-6" data-testid="admin-batch-invoice-tab">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Gün sonu toplu fatura</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Açıkken siparişler için anında fatura kesilmez. Ayarlı saatte, aynı müşterinin (e-posta ve fatura bilgisi aynıysa) aynı güne ait siparişleri tek faturada birleştirilir. Saat Türkiye saatidir.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} data-testid="checkbox-batch-enabled" />
          Toplu fatura modu açık
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Çalışma saati</label>
            <input type="time" className={input} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} data-testid="input-batch-time" />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={form.includeToday} onChange={(e) => setForm({ ...form, includeToday: e.target.checked })} data-testid="checkbox-batch-include-today" />
            Zamanlanmış çalışmada bugünün siparişlerini de dahil et
          </label>
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="h-10 px-5 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50"
            data-testid="button-batch-save"
          >
            Kaydet
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Varsayılan olarak yalnızca günü bitmiş siparişler faturalanır. Örneğin saat 00:30 ise önceki günün siparişleri kesilir. Sunucu o saatte kapalıysa açıldığında aynı gün içinde çalışır.
          {data.lastRun && ` Son çalışma: ${new Date(data.lastRun.finishedAt).toLocaleString('tr-TR')} (${data.lastRun.sent} gönderildi, ${data.lastRun.failed} hata).`}
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">Şimdi çalıştır</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Müşteri e-postası (boşsa tümü)</label>
            <input className={`${input} w-64`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="musteri@ornek.com" data-testid="input-batch-email" />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={runToday} onChange={(e) => setRunToday(e.target.checked)} data-testid="checkbox-batch-run-today" />
            Bugünün siparişlerini de dahil et
          </label>
          <button
            onClick={() => {
              if (confirm('Toplu fatura çalışması başlatılsın mı? Fatura sağlayıcısında gerçek faturalar kesilecek.')) run.mutate();
            }}
            disabled={run.isPending || data.running}
            className="h-10 px-5 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50 flex items-center gap-2"
            data-testid="button-batch-run"
          >
            {(run.isPending || data.running) && <Loader2 className="w-4 h-4 animate-spin" />}
            Şimdi çalıştır
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Bekleyen siparişler</h3>
          <span className="text-xs text-neutral-500">{dueCount} grup bir sonraki çalışmada faturalanır</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500 border-b border-neutral-200">
            <tr><th className="px-4 py-3">Gün</th><th className="px-4 py-3">Müşteri</th><th className="px-4 py-3">Siparişler</th><th className="px-4 py-3 text-right">Tutar</th><th className="px-4 py-3">Durum</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.pending.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Bekleyen sipariş yok.</td></tr>}
            {data.pending.map((g) => (
              <tr key={g.key} data-testid={`row-batch-pending-${g.customerEmail}`}>
                <td className="px-4 py-3 whitespace-nowrap">{g.businessDate}</td>
                <td className="px-4 py-3"><div>{g.customerName}</div><div className="text-xs text-neutral-500">{g.customerEmail}</div></td>
                <td className="px-4 py-3 text-xs font-mono">{g.orderCount} sipariş: {g.orderNumbers.join(', ')}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{tl(g.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs ${g.due ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {g.due ? 'Sırada' : 'Gün sürüyor'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-neutral-200"><h3 className="text-sm font-semibold text-neutral-900">Kesilen toplu faturalar</h3></div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500 border-b border-neutral-200">
            <tr><th className="px-4 py-3">Oluşturma</th><th className="px-4 py-3">Müşteri</th><th className="px-4 py-3">Gün</th><th className="px-4 py-3">Sipariş</th><th className="px-4 py-3 text-right">Tutar</th><th className="px-4 py-3">Fatura No</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.batches.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">Henüz toplu fatura yok.</td></tr>}
            {data.batches.map((b) => {
              const badge = BADGE[b.status] || BADGE.processing;
              return (
                <tr key={b.id} data-testid={`row-batch-${b.id}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{new Date(b.createdAt).toLocaleString('tr-TR')}<div className="text-[11px] text-neutral-400">{b.trigger === 'cron' ? 'Zamanlanmış' : 'Elle'}</div></td>
                  <td className="px-4 py-3"><div>{b.customerName}</div><div className="text-xs text-neutral-500">{b.customerEmail}</div></td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.businessDate}</td>
                  <td className="px-4 py-3">{b.orderCount}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{tl(parseFloat(b.total))}</td>
                  <td className="px-4 py-3 text-xs font-mono">{b.invoiceNumber || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs ${badge.cls}`}>{badge.text}</span>
                    {b.status === 'failed' && b.errorMessage && <div className="text-[11px] text-red-600 mt-1 max-w-[220px]">{b.errorMessage}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'failed' && (
                      <button onClick={() => retry.mutate(b.id)} disabled={retry.isPending} className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs" data-testid={`button-batch-retry-${b.id}`}>
                        Tekrar dene
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

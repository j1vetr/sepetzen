import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface Member {
  productId: string;
  name: string;
  slug: string;
  isPrimary: boolean;
  colorName: string | null;
  hex: string | null;
  photoCount: number;
  variantCount: number;
  price: string | null;
  stock: number | null;
  warnings: string[];
}
interface Group {
  groupKey: string;
  primaryProductId: string;
  members: Member[];
  warnings: string[];
  canMerge: boolean;
}
interface HistoryItem {
  batchId: string;
  primary: { name: string; slug: string } | null;
  createdAt: string;
  undoneAt: string | null;
  items: { colorName: string; sourceName: string; sourceSlug: string }[];
}

const QUERY_KEY = ['admin', 'color-merge'];

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İşlem yapılamadı');
  return data as T;
}

const fmtPrice = (p: string | null) => (p == null ? '-' : `${Number(p).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`);

function GroupCard({ group: initial }: { group: Group }) {
  const queryClient = useQueryClient();
  const [group, setGroup] = useState<Group>(initial);
  const [message, setMessage] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: (primaryProductId: string) =>
      post<Group>('/api/admin/color-merge/preview', { groupKey: group.groupKey, primaryProductId }),
    onSuccess: (g) => setGroup(g),
    onError: (e: Error) => setMessage(e.message),
  });
  const applyMutation = useMutation({
    mutationFn: () =>
      post<{ primarySlug: string; variantsCreated: number }>('/api/admin/color-merge/apply', {
        groupKey: group.groupKey,
        primaryProductId: group.primaryProductId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const totalStock = group.members.reduce((s, m) => s + (m.stock ?? 0), 0);

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-white" data-testid={`color-merge-group-${group.groupKey.slice(0, 8)}`}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <label className="text-[12px] text-neutral-600">Ana ürün</label>
        <select
          value={group.primaryProductId}
          onChange={(e) => previewMutation.mutate(e.target.value)}
          className="h-8 rounded border border-neutral-300 px-2 text-[12px] max-w-[320px]"
        >
          {group.members.map((m) => (
            <option key={m.productId} value={m.productId}>{m.name}{m.colorName ? ` (${m.colorName})` : ''}</option>
          ))}
        </select>
        {previewMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-200">
              <th className="py-1.5 pr-3 font-medium">Ürün</th>
              <th className="py-1.5 pr-3 font-medium">Renk</th>
              <th className="py-1.5 pr-3 font-medium">Fiyat</th>
              <th className="py-1.5 pr-3 font-medium">Stok</th>
              <th className="py-1.5 pr-3 font-medium">Görsel</th>
              <th className="py-1.5 font-medium">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {group.members.map((m) => (
              <tr key={m.productId} className="border-b border-neutral-100 align-top">
                <td className="py-1.5 pr-3">{m.name}</td>
                <td className="py-1.5 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    {m.hex && <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: m.hex }} />}
                    {m.colorName ?? '-'}
                  </span>
                </td>
                <td className="py-1.5 pr-3 tabular-nums">{fmtPrice(m.price)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{m.stock ?? '-'}</td>
                <td className="py-1.5 pr-3 tabular-nums">{m.photoCount}</td>
                <td className="py-1.5 text-neutral-600">
                  {m.isPrimary ? 'Ana ürün, bu renk varyantı olur' : 'Varyant olarak eklenir, ürün satıştan kalkar ve yönlendirilir'}
                  {m.warnings.map((w) => (
                    <div key={w} className="text-red-600">{w}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-neutral-500">
        Birleştirmeden önce toplam stok {totalStock}. Sonra ana üründeki renk varyantlarının toplamı da {totalStock} olur. Eski ürünlerdeki stok yeni varyanta taşınır, geri alınca eski yerine döner.
      </p>

      {group.warnings.map((w) => (
        <p key={w} className="mt-1 text-[12px] text-red-600">{w}</p>
      ))}
      {!group.canMerge && (
        <p className="mt-1 text-[12px] text-amber-700">Bu grupta uyarı var, otomatik birleştirilemez. Ürünleri elle düzenleyin.</p>
      )}
      {message && <p className="mt-1 text-[12px] text-red-600">{message}</p>}

      <div className="mt-3">
        <button
          type="button"
          disabled={!group.canMerge || applyMutation.isPending}
          onClick={() => {
            const main = group.members.find((m) => m.isPrimary);
            if (window.confirm(`"${main?.name}" ürününde ${group.members.length} renk varyantı oluşturulacak. Diğer ürünler satıştan kaldırılacak. Devam edilsin mi?`)) {
              setMessage(null);
              applyMutation.mutate();
            }
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-neutral-900 text-white text-[12px] font-medium disabled:opacity-40"
          data-testid="button-apply-color-merge"
        >
          {applyMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Bu grubu birleştir
        </button>
      </div>
    </div>
  );
}

export default function ColorLinkMergePanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<{ groups: Group[]; history: HistoryItem[] }>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/color-merge', { credentials: 'include' });
      if (!res.ok) throw new Error('Gruplar yüklenemedi');
      return res.json();
    },
  });
  const undoMutation = useMutation({
    mutationFn: (batchId: string) => post(`/api/admin/color-merge/${batchId}/undo`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (e: Error) => alert(e.message),
  });

  if (isLoading) return <p className="text-[12px] text-neutral-500">Yükleniyor…</p>;
  if (error || !data) return <p className="text-[12px] text-red-600">Gruplar yüklenemedi.</p>;

  return (
    <div className="space-y-4" data-testid="panel-color-merge">
      <p className="text-[12px] text-neutral-600">
        Renkleri ayrı ürün olarak girilmiş ve renk bağlantılarıyla birbirine bağlanmış ürünleri tek ürünün renk varyantlarına çevirir. Hiçbir ürün, sipariş veya sepet silinmez. Eski ürün adresleri ana ürüne yönlendirilir ve her işlem geri alınabilir.
      </p>

      {data.groups.length === 0 ? (
        <p className="text-[12px] text-neutral-500">Birleştirilecek renk linkli ürün grubu yok.</p>
      ) : (
        data.groups.map((g) => <GroupCard key={g.groupKey} group={g} />)
      )}

      {data.history.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-neutral-900 mb-2">Yapılan birleştirmeler</h3>
          <div className="space-y-2">
            {data.history.map((h) => (
              <div key={h.batchId} className="border border-neutral-200 rounded-lg p-3 bg-white flex items-start gap-3" data-testid={`color-merge-history-${h.batchId.slice(0, 8)}`}>
                <div className="flex-1 text-[12px]">
                  <p className="font-medium text-neutral-900">{h.primary?.name ?? 'Ürün'}</p>
                  <p className="text-neutral-500">
                    {h.items.map((i) => i.colorName).join(', ')} · {new Date(h.createdAt).toLocaleString('tr-TR')}
                    {h.undoneAt ? ' · geri alındı' : ''}
                  </p>
                </div>
                {!h.undoneAt && (
                  <button
                    type="button"
                    disabled={undoMutation.isPending}
                    onClick={() => { if (window.confirm('Birleştirme geri alınsın mı?')) undoMutation.mutate(h.batchId); }}
                    className="h-7 px-2.5 rounded-lg border border-neutral-300 text-[11px] font-medium text-neutral-700 hover:border-neutral-500"
                    data-testid="button-undo-color-merge"
                  >
                    Geri al
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

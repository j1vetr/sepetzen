import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Undo2 } from 'lucide-react';
import { InlineAlert } from '../_ui/AdminUI';

interface HistoryRow {
  id: number;
  kind: 'price' | 'badge';
  summary: string;
  product_count: number;
  created_at: string;
  reverted_at: string | null;
}

/** Son toplu fiyat/etiket işlemleri ve tek tıkla geri alma */
export default function BulkHistoryPanel({ onUndone }: { onUndone: () => void }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { data = [] } = useQuery<HistoryRow[]>({ queryKey: ['/api/admin/products/bulk-history'] });

  const undo = async (row: HistoryRow) => {
    const ok = window.confirm(
      `"${row.summary}" işlemi geri alınacak. ${row.product_count} ürünün fiyat ve etiketi bu işlemden önceki haline döner. Bu işlemden sonra elle yaptığınız değişiklikler de kaybolur. Devam edilsin mi?`,
    );
    if (!ok) return;
    setBusyId(row.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/bulk-history/${row.id}/undo`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: body.error || 'Geri alınamadı' });
      } else {
        setMsg({ ok: true, text: `${body.restored} ürün eski haline döndü` });
        await queryClient.invalidateQueries({ queryKey: ['/api/admin/products/bulk-history'] });
        onUndone();
      }
    } catch {
      setMsg({ ok: false, text: 'Bağlantı hatası' });
    } finally {
      setBusyId(null);
    }
  };

  if (data.length === 0 && !msg) return null;

  return (
    <section data-testid="section-bulk-history">
      <p className="text-[12px] font-semibold text-neutral-900 mb-1.5">Son toplu işlemler</p>
      <div className="border border-neutral-200 rounded-md divide-y divide-neutral-100">
        {data.slice(0, 5).map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-neutral-900 truncate">
                {row.kind === 'price' ? 'Fiyat' : 'Etiket'}: {row.summary}
              </p>
              <p className="text-[11px] text-neutral-500">
                {new Date(row.created_at).toLocaleString('tr-TR')} · {row.product_count} ürün
                {row.reverted_at ? ' · geri alındı' : ''}
              </p>
            </div>
            {!row.reverted_at && (
              <button
                type="button"
                onClick={() => undo(row)}
                disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-neutral-200 text-[12px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                data-testid={`button-undo-bulk-${row.id}`}
              >
                {busyId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                Geri al
              </button>
            )}
          </div>
        ))}
      </div>
      {msg && <div className="mt-2"><InlineAlert tone={msg.ok ? 'success' : 'error'}>{msg.text}</InlineAlert></div>}
    </section>
  );
}

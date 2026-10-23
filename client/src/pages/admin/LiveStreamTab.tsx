import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Package, Radio, Search, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { LiveStream } from '@shared/liveStream';

type PickerProduct = { id: string; name: string; images?: string[] | null; basePrice?: string | null; stock?: number | null };

const KEY = ['/api/admin/live-stream'];
const firstImage = (p?: PickerProduct) => {
  const imgs = p?.images;
  if (!Array.isArray(imgs)) return null;
  return imgs.find(u => !/\.(mp4|webm|mov)(\?.*)?$/i.test(u)) ?? imgs[0] ?? null;
};

export default function LiveStreamTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LiveStream | null>(null);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');

  const { data } = useQuery<LiveStream>({ queryKey: KEY });
  const { data: products = [] } = useQuery<PickerProduct[]>({
    queryKey: ['admin', 'live-stream', 'product-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1000', { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    staleTime: 60_000,
  });

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const save = useMutation({
    mutationFn: async (payload: LiveStream) => {
      const res = await apiRequest('PUT', '/api/admin/live-stream', payload);
      return (await res.json()) as LiveStream;
    },
    onSuccess: (saved) => {
      setForm(saved);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['/api/live-stream'] });
      toast({ title: saved.isActive ? 'Canlı yayın açık' : 'Kaydedildi' });
    },
    onError: (e: Error) => toast({ title: 'Kaydedilemedi', description: e.message, variant: 'destructive' }),
  });

  if (!form) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>;

  const patch = (p: Partial<LiveStream>) => { setForm({ ...form, ...p }); setDirty(true); };
  const toggleLive = () => save.mutate({ ...form, isActive: !form.isActive });

  const q = search.toLocaleLowerCase('tr').trim();
  const results = q
    ? products.filter(p => !form.productIds.includes(p.id) && p.name.toLocaleLowerCase('tr').includes(q)).slice(0, 8)
    : [];

  const liveIdList = form.liveProductIds ?? form.productIds;
  const liveSet = new Set(liveIdList);
  const liveCount = form.productIds.filter(id => liveSet.has(id)).length;
  const draftCount = form.productIds.length - liveCount;
  // Yeni eklenen ürün taslak olarak başlar, sitede görünmez
  const add = (id: string) => patch({ productIds: [...form.productIds, id], liveProductIds: liveIdList });
  const remove = (id: string) => patch({
    productIds: form.productIds.filter(x => x !== id),
    liveProductIds: liveIdList.filter(x => x !== id),
  });
  // Yayına alma / taslağa çekme anında kaydedilir
  const setLive = (ids: string[]) => save.mutate({ ...form, liveProductIds: ids });
  const toggleProduct = (id: string) => setLive(liveSet.has(id) ? liveIdList.filter(x => x !== id) : [...liveIdList, id]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.productIds.length) return;
    const next = [...form.productIds];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ productIds: next });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Yayın durumu */}
      <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${form.isActive ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-full flex items-center justify-center ${form.isActive ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            <Radio className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-neutral-900">{form.isActive ? 'Canlı yayın açık' : 'Canlı yayın kapalı'}</p>
            <p className="text-xs text-neutral-500">
              {form.isActive ? 'Sitede başlıkta kırmızı CANLI YAYIN düğmesi görünüyor.' : 'Açtığınızda sitede başlıkta CANLI YAYIN düğmesi çıkar.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleLive}
          disabled={save.isPending}
          className={`h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${form.isActive ? 'bg-neutral-900 hover:bg-neutral-700' : 'bg-red-600 hover:bg-red-500'}`}
          data-testid="button-live-toggle"
        >
          {save.isPending ? '...' : form.isActive ? 'Yayını bitir' : 'Yayını başlat'}
        </button>
      </div>

      {/* Bilgiler */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Yayın başlığı</label>
          <input value={form.title} onChange={e => patch({ title: e.target.value })} maxLength={120}
            className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm" data-testid="input-live-title" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Kısa açıklama (isteğe bağlı)</label>
          <input value={form.description} onChange={e => patch({ description: e.target.value })} maxLength={300}
            className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm" data-testid="input-live-description" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Yayın bağlantısı (Instagram, YouTube, TikTok vb.)</label>
          <input value={form.streamUrl} onChange={e => patch({ streamUrl: e.target.value })} placeholder="https://..."
            className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm" data-testid="input-live-url" />
          <p className="text-[11px] text-neutral-400 mt-1">Doldurursanız canlı sayfasında "Yayını izle" düğmesi çıkar.</p>
        </div>
      </div>

      {/* Ürün seçimi */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-neutral-900">Ürünler <span className="text-neutral-400 font-normal">({form.productIds.length})</span></h3>
            {form.productIds.length > 0 && (
              <p className="text-xs text-neutral-500 mt-0.5" data-testid="text-live-counts">
                <span className="text-green-700 font-medium">{liveCount} yayında</span> · {draftCount} taslakta
              </p>
            )}
          </div>
          {form.productIds.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={() => setLive([...form.productIds])} disabled={save.isPending || draftCount === 0}
                className="font-medium text-green-700 hover:text-green-900 disabled:opacity-40" data-testid="button-live-all-on">Hepsini yayına al</button>
              <button type="button" onClick={() => setLive([])} disabled={save.isPending || liveCount === 0}
                className="font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-40" data-testid="button-live-all-off">Hepsini taslağa al</button>
              <button type="button" onClick={() => patch({ productIds: [], liveProductIds: [] })} className="text-neutral-500 hover:text-red-600">Listeyi temizle</button>
            </div>
          )}
        </div>

        <div className="relative mb-3">
          <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 bg-white">
            <Search className="w-4 h-4 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün adı yazıp ekleyin..."
              className="flex-1 py-2.5 text-sm outline-none bg-transparent" data-testid="input-live-product-search" />
            {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-neutral-400" /></button>}
          </div>
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {results.map(p => {
                const img = firstImage(p);
                return (
                  <button key={p.id} onClick={() => { add(p.id); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 text-left" data-testid={`live-add-${p.id}`}>
                    {img ? <img src={img} alt="" className="w-9 h-9 rounded object-cover bg-neutral-100" /> : <span className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center"><Package className="w-4 h-4 text-neutral-400" /></span>}
                    <span className="flex-1 text-sm text-neutral-800 truncate">{p.name}</span>
                    <span className="text-xs text-neutral-400 shrink-0">Ekle</span>
                  </button>
                );
              })}
            </div>
          )}
          {q && results.length === 0 && <p className="text-xs text-neutral-400 mt-1.5">Eşleşen ürün yok veya zaten eklendi.</p>}
        </div>

        {form.productIds.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8 border border-dashed border-neutral-200 rounded-lg">Henüz ürün eklenmedi. Ürünleri yukarıdan arayıp ekleyin, eklenenler taslak olarak bekler ve siz yayına alana kadar sitede görünmez.</p>
        ) : (
          <div className="space-y-1.5">
            {form.productIds.map((id, i) => {
              const p = byId.get(id);
              const img = firstImage(p);
              const isLive = liveSet.has(id);
              return (
                <div key={id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${isLive ? 'border-green-200 bg-green-50/40' : 'border-neutral-200'}`} data-testid={`live-row-${id}`}>
                  <span className="w-5 text-xs text-neutral-400 tabular-nums">{i + 1}</span>
                  {img ? <img src={img} alt="" className="w-9 h-9 rounded object-cover bg-neutral-100" /> : <span className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center"><Package className="w-4 h-4 text-neutral-400" /></span>}
                  <span className={`flex-1 text-sm truncate ${isLive ? 'text-neutral-900' : 'text-neutral-500'}`}>{p?.name ?? 'Silinmiş ürün'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLive}
                    onClick={() => toggleProduct(id)}
                    disabled={save.isPending}
                    className="flex items-center gap-2 text-[11px] font-semibold disabled:opacity-60"
                    data-testid={`switch-live-${id}`}
                  >
                    <span className={isLive ? 'text-green-700' : 'text-neutral-400'}>{isLive ? 'Yayında' : 'Taslak'}</span>
                    <span className={`relative w-9 h-5 rounded-full transition-colors ${isLive ? 'bg-green-600' : 'bg-neutral-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isLive ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-neutral-400 hover:text-neutral-800 disabled:opacity-30" aria-label="Yukarı"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === form.productIds.length - 1} className="p-1.5 text-neutral-400 hover:text-neutral-800 disabled:opacity-30" aria-label="Aşağı"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => remove(id)} className="p-1.5 text-neutral-400 hover:text-red-500" aria-label="Kaldır"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => save.mutate(form)}
          disabled={!dirty || save.isPending}
          className="h-10 px-6 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-40"
          data-testid="button-live-save"
        >
          {save.isPending ? 'Kaydediliyor...' : dirty ? 'Kaydet' : 'Kaydedildi'}
        </button>
        <a href="/canli" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
          Canlı sayfayı gör <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

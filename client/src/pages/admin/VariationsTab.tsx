import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  PageHeader,
  Card,
  LoadingState,
  InlineAlert,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  StatusBadge,
  TextInput,
} from './_ui/AdminUI';
import {
  useVariantOptions,
  createVariantOption,
  VARIANT_OPTIONS_KEY,
  type VariantOptionItem,
} from './_shared/useVariantOptions';

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
  return data;
}

function Section({ type, title, items }: { type: 'color' | 'size'; title: string; items: VariantOptionItem[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#888888');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHex, setEditHex] = useState('#888888');
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: VARIANT_OPTIONS_KEY });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'İşlem başarısız', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    run(async () => {
      if (!name.trim()) return;
      const r = await createVariantOption({ type, name, hex: type === 'color' ? hex : null });
      if ((r as any).existed) toast({ title: 'Bu değer zaten kütüphanede var' });
      setName('');
    });

  const move = (idx: number, dir: -1 | 1) =>
    run(async () => {
      const ids = items.map((i) => i.id);
      const j = idx + dir;
      if (j < 0 || j >= ids.length) return;
      [ids[idx], ids[j]] = [ids[j], ids[idx]];
      await api('PUT', '/api/admin/variant-options/reorder', { type, ids });
    });

  const startEdit = (o: VariantOptionItem) => {
    setEditId(o.id);
    setEditName(o.name);
    setEditHex(o.hex || '#888888');
  };

  const saveEdit = (o: VariantOptionItem) =>
    run(async () => {
      const nameChanged = editName.trim() !== o.name;
      const hexChanged = type === 'color' && editHex.toLowerCase() !== (o.hex || '#888888').toLowerCase();
      if (!nameChanged && !hexChanged) {
        setEditId(null);
        return;
      }
      let propagate = false;
      if (o.productCount > 0) {
        const impact = await api('GET', `/api/admin/variant-options/${o.id}/impact`);
        propagate = window.confirm(
          `Bu değer ${impact.productCount} üründe (${impact.variantCount} varyant) kullanılıyor. Değişiklik bu ürünlere de uygulansın mı?\n\nTamam: ürünlerde de güncelle. İptal: yalnızca kütüphanede güncelle.\nGeçmiş siparişler değişmez.`,
        );
      }
      await api('PATCH', `/api/admin/variant-options/${o.id}`, {
        ...(nameChanged ? { name: editName } : {}),
        ...(type === 'color' ? { hex: editHex } : {}),
        propagate,
      });
      setEditId(null);
    });

  const toggle = (o: VariantOptionItem) =>
    run(async () => {
      await api('PATCH', `/api/admin/variant-options/${o.id}`, { isActive: !o.isActive });
    });

  const remove = (o: VariantOptionItem) =>
    run(async () => {
      if (!window.confirm(`"${o.name}" silinsin mi?`)) return;
      await api('DELETE', `/api/admin/variant-options/${o.id}`);
    });

  return (
    <Card className="p-4">
      <h3 className="text-[14px] font-semibold text-neutral-900 mb-3">{title}</h3>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'color' ? 'Renk adı' : 'Beden veya seçenek adı'}
          className="max-w-[220px]"
          onKeyDown={(e) => e.key === 'Enter' && add()}
          data-testid={`input-new-${type}`}
        />
        {type === 'color' && (
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="w-9 h-9 rounded-lg border border-neutral-200 p-0.5"
            aria-label="Renk kodu"
          />
        )}
        <PrimaryButton type="button" onClick={add} disabled={busy || !name.trim()} data-testid={`button-add-${type}`}>
          <Plus className="w-3.5 h-3.5" /> Ekle
        </PrimaryButton>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-neutral-500">Henüz değer yok.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {items.map((o, idx) => (
            <div key={o.id} className="flex items-center gap-2 py-2" data-testid={`row-option-${o.id}`}>
              {type === 'color' && (
                <span
                  className="w-5 h-5 rounded-full border border-neutral-300 shrink-0"
                  style={{ background: editId === o.id ? editHex : o.hex || '#ffffff' }}
                />
              )}
              {editId === o.id ? (
                <>
                  <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-[200px]" />
                  {type === 'color' && (
                    <input
                      type="color"
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="w-8 h-8 rounded border border-neutral-200 p-0.5"
                      aria-label="Renk kodu"
                    />
                  )}
                  <IconButton type="button" onClick={() => saveEdit(o)} aria-label="Kaydet"><Check className="w-3.5 h-3.5" /></IconButton>
                  <IconButton type="button" onClick={() => setEditId(null)} aria-label="Vazgeç"><X className="w-3.5 h-3.5" /></IconButton>
                </>
              ) : (
                <>
                  <span className={`text-[13px] font-medium ${o.isActive ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>{o.name}</span>
                  <span className="text-[11px] text-neutral-500">{o.productCount} üründe</span>
                  {!o.isActive && <StatusBadge tone="neutral">Pasif</StatusBadge>}
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton type="button" onClick={() => move(idx, -1)} disabled={busy || idx === 0} aria-label="Yukarı"><ArrowUp className="w-3.5 h-3.5" /></IconButton>
                    <IconButton type="button" onClick={() => move(idx, 1)} disabled={busy || idx === items.length - 1} aria-label="Aşağı"><ArrowDown className="w-3.5 h-3.5" /></IconButton>
                    <IconButton type="button" onClick={() => startEdit(o)} aria-label="Düzenle"><Pencil className="w-3.5 h-3.5" /></IconButton>
                    <SecondaryButton type="button" onClick={() => toggle(o)} disabled={busy}>
                      {o.isActive ? 'Pasife al' : 'Aktif et'}
                    </SecondaryButton>
                    <IconButton
                      type="button"
                      onClick={() => remove(o)}
                      disabled={busy || o.productCount > 0}
                      aria-label="Sil"
                      title={o.productCount > 0 ? 'Kullanımdaki değer silinemez, pasife alın' : 'Sil'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function VariationsTab() {
  const { data, isLoading, error } = useVariantOptions();
  if (isLoading) return <LoadingState />;
  if (error || !data) return <InlineAlert tone="error">Varyasyonlar yüklenemedi.</InlineAlert>;
  return (
    <div>
      <PageHeader
        title="Varyasyonlar"
        description="Renk ve beden değerlerini burada bir kez tanımlayın, ürün düzenlemede çip olarak seçin."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section type="color" title="Renkler" items={data.filter((o) => o.type === 'color')} />
        <Section type="size" title="Bedenler ve seçenekler" items={data.filter((o) => o.type === 'size')} />
      </div>
    </div>
  );
}

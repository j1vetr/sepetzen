import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { foldVariantKey, compareSizeNames } from '@shared/variantKey';
import { VariantColorImages } from './VariantColorImages';
import {
  useVariantOptions,
  createVariantOption,
  VARIANT_OPTIONS_KEY,
  type VariantOptionItem,
} from './useVariantOptions';
import { SecondaryButton, IconButton, TextInput, InlineAlert } from '../_ui/AdminUI';

/** Varyant düzenleme satırı: fiyat boş bırakılırsa ürün fiyatı kullanılır. */
export interface VariantRow {
  /** Yalnızca arayüz anahtarı, sunucuya gönderilmez */
  k: string;
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
  isActive: boolean;
  colorHex: string;
  images: string[];
}

let keyCounter = 0;
export const newRowKey = () => `vr_${Date.now()}_${keyCounter++}`;

interface Props {
  rows: VariantRow[];
  setRows: (updater: (prev: VariantRow[]) => VariantRow[]) => void;
  basePrice: string;
  productSku: string;
  productImages: string[];
  isEdit: boolean;
  loaded: boolean;
  hasLegacyLinks: boolean;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function GroupBulk({ onApply }: { onApply: (price: string, stock: string) => void }) {
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  return (
    <div className="flex items-center gap-1.5">
      <TextInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Fiyat" className="!w-20 !h-8" />
      <TextInput type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stok" className="!w-20 !h-8" />
      <SecondaryButton
        type="button"
        onClick={() => {
          if (!price.trim() && !stock.trim()) return;
          onApply(price.trim(), stock.trim());
          setPrice('');
          setStock('');
        }}
      >
        Uygula
      </SecondaryButton>
    </div>
  );
}

export default function ProductVariantsPanel({ rows, setRows, basePrice, productSku, productImages, isEdit, loaded, hasLegacyLinks }: Props) {
  const qc = useQueryClient();
  const { data: options = [] } = useVariantOptions();
  const [pendingColors, setPendingColors] = useState<Set<string>>(new Set());
  const [pendingSizes, setPendingSizes] = useState<Set<string>>(new Set());
  const [quickName, setQuickName] = useState('');
  const [quickType, setQuickType] = useState<'color' | 'size'>('color');
  const [msg, setMsg] = useState<string | null>(null);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const colorOpts = options.filter((o) => o.type === 'color');
  const sizeOpts = options.filter((o) => o.type === 'size');
  const libColor = useMemo(() => new Map(colorOpts.map((o) => [o.key, o])), [options]);
  const libSize = useMemo(() => new Map(sizeOpts.map((o) => [o.key, o])), [options]);

  const presentColors = new Set(rows.map((r) => foldVariantKey(r.color)).filter(Boolean));
  const presentSizes = new Set(rows.map((r) => foldVariantKey(r.size)).filter(Boolean));

  const sizeCompare = (a: string, b: string) => {
    const oa = libSize.get(foldVariantKey(a));
    const ob = libSize.get(foldVariantKey(b));
    if (oa && ob) return oa.sortOrder - ob.sortOrder;
    if (oa) return -1;
    if (ob) return 1;
    return compareSizeNames(a, b);
  };

  const groups = useMemo(() => {
    const map = new Map<string, VariantRow[]>();
    rows.forEach((r) => {
      const key = foldVariantKey(r.color);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    const list = Array.from(map.entries()).map(([key, rs]) => ({
      key,
      name: rs[0].color.trim(),
      rows: [...rs].sort((a, b) => sizeCompare(a.size, b.size)),
    }));
    list.sort((a, b) => {
      if (!a.key) return 1;
      if (!b.key) return -1;
      const oa = libColor.get(a.key);
      const ob = libColor.get(b.key);
      if (oa && ob) return oa.sortOrder - ob.sortOrder;
      if (oa) return -1;
      if (ob) return 1;
      return a.name.localeCompare(b.name, 'tr');
    });
    return list;
  }, [rows, libColor, libSize]);

  const patchRow = (k: string, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((r) => (r.k === k ? { ...r, ...patch } : r)));
  const patchGroup = (key: string, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((r) => (foldVariantKey(r.color) === key ? { ...r, ...patch } : r)));
  const removeRow = (k: string) => setRows((prev) => prev.filter((r) => r.k !== k));

  const toggle = (type: 'color' | 'size', key: string) => {
    const present = type === 'color' ? presentColors : presentSizes;
    if (present.has(key)) return;
    const setter = type === 'color' ? setPendingColors : setPendingSizes;
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const quickAdd = async () => {
    if (!quickName.trim()) return;
    try {
      const opt = await createVariantOption({ type: quickType, name: quickName });
      await qc.invalidateQueries({ queryKey: VARIANT_OPTIONS_KEY });
      (quickType === 'color' ? setPendingColors : setPendingSizes)((prev) => new Set(prev).add(opt.key));
      setQuickName('');
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Değer eklenemedi');
    }
  };

  const addToLibrary = async (type: 'color' | 'size', name: string, hex?: string) => {
    try {
      await createVariantOption({ type, name, hex: hex && HEX_RE.test(hex) ? hex : null });
      await qc.invalidateQueries({ queryKey: VARIANT_OPTIONS_KEY });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Değer eklenemedi');
    }
  };

  const generate = () => {
    const selColors: VariantOptionItem[] = colorOpts.filter((o) => presentColors.has(o.key) || pendingColors.has(o.key));
    const selSizes: VariantOptionItem[] = sizeOpts.filter((o) => presentSizes.has(o.key) || pendingSizes.has(o.key));
    const colorList: (VariantOptionItem | null)[] = selColors.length ? selColors : [null];
    const sizeList: (VariantOptionItem | null)[] = selSizes.length ? selSizes : [null];
    const combos: { c: VariantOptionItem | null; s: VariantOptionItem | null }[] = [];
    colorList.forEach((c) =>
      sizeList.forEach((s) => {
        if (!c && !s) return;
        const exists = rows.some(
          (r) => foldVariantKey(r.color) === (c?.key ?? '') && foldVariantKey(r.size) === (s?.key ?? ''),
        );
        if (!exists) combos.push({ c, s });
      }),
    );
    if (combos.length === 0) {
      setMsg('Eksik kombinasyon yok.');
      return;
    }
    setRows((prev) => {
      let next = [...prev];
      const buildPatch = (c: VariantOptionItem | null, s: VariantOptionItem | null) => {
        const peer = c ? next.find((r) => foldVariantKey(r.color) === c.key) : undefined;
        return {
          size: s?.name ?? '',
          color: c?.name ?? '',
          colorHex: peer?.colorHex || c?.hex || '',
          images: peer ? peer.images : [],
        };
      };
      const defaultIdx = next.findIndex((r) => !r.color.trim() && !r.size.trim());
      let rest = combos;
      if (defaultIdx !== -1) {
        // Tek varsayılan varyant ilk kombinasyona dönüşür (stok ve SKU korunur)
        next[defaultIdx] = { ...next[defaultIdx], ...buildPatch(combos[0].c, combos[0].s) };
        rest = combos.slice(1);
      }
      rest.forEach(({ c, s }) => {
        next = [...next, { k: newRowKey(), sku: '', price: '', stock: '0', isActive: true, ...buildPatch(c, s) }];
      });
      return next;
    });
    setPendingColors(new Set());
    setPendingSizes(new Set());
    setMsg(`${combos.length} kombinasyon işlendi. Mevcut varyantlar değişmedi.`);
  };

  const suggestSkus = () => {
    const base = productSku.trim();
    if (!base) {
      setMsg('SKU önermek için önce ürün SKU alanını doldurun.');
      return;
    }
    setRows((prev) => {
      const used = new Set(prev.map((r) => r.sku.trim().toLowerCase()).filter(Boolean));
      return prev.map((r) => {
        if (r.sku.trim()) return r;
        const code = foldVariantKey(r.color).replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase();
        const size = foldVariantKey(r.size).replace(/[^a-z0-9]/g, '').toUpperCase();
        const stem = [base, code, size].filter(Boolean).join('-');
        let sku = stem;
        let n = 2;
        while (used.has(sku.toLowerCase())) sku = `${stem}-${n++}`;
        used.add(sku.toLowerCase());
        return { ...r, sku };
      });
    });
    setMsg('Boş SKU alanları dolduruldu. Kaydetmeden önce kontrol edin.');
  };

  const applyBulk = (key: string | null, price: string, stock: string) =>
    setRows((prev) =>
      prev.map((r) => {
        if (key !== null && foldVariantKey(r.color) !== key) return r;
        return {
          ...r,
          ...(price ? { price } : {}),
          ...(stock !== '' ? { stock: String(Math.max(0, parseInt(stock, 10) || 0)) } : {}),
        };
      }),
    );

  const addEmptyRow = () =>
    setRows((prev) => [...prev, { k: newRowKey(), size: '', color: '', sku: '', price: '', stock: '0', isActive: true, colorHex: '', images: [] }]);

  const chip = (type: 'color' | 'size', o: VariantOptionItem) => {
    const present = (type === 'color' ? presentColors : presentSizes).has(o.key);
    const pending = (type === 'color' ? pendingColors : pendingSizes).has(o.key);
    const on = present || pending;
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => toggle(type, o.key)}
        title={present ? 'Bu değer varyantlarda kullanılıyor. Kaldırmak için ilgili varyantı pasife alın.' : undefined}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] transition-colors ${
          on ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
        } ${present ? 'cursor-default' : ''}`}
        aria-pressed={on}
        data-testid={`chip-${type}-${o.key}`}
      >
        {type === 'color' && o.hex && <span className="w-3 h-3 rounded-full border border-white/60" style={{ background: o.hex }} />}
        {o.name}
      </button>
    );
  };

  return (
    <div className="space-y-4" data-testid="panel-variants">
      {hasLegacyLinks && (
        <InlineAlert tone="warning">
          Bu üründe eski renk bağlantıları var. Bunları varyanta çevirmek için Ürünler sayfasındaki "Renk linklerini varyanta çevir" aracını kullanın.
        </InlineAlert>
      )}
      {msg && <InlineAlert tone="neutral">{msg}</InlineAlert>}

      <div className="space-y-3 rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium mb-1.5">Renkler</p>
          <div className="flex flex-wrap gap-1.5">
            {colorOpts.filter((o) => o.isActive || presentColors.has(o.key)).map((o) => chip('color', o))}
            {colorOpts.length === 0 && <span className="text-[12px] text-neutral-400">Kütüphanede renk yok.</span>}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium mb-1.5">Bedenler ve seçenekler</p>
          <div className="flex flex-wrap gap-1.5">
            {sizeOpts.filter((o) => o.isActive || presentSizes.has(o.key)).map((o) => chip('size', o))}
            {sizeOpts.length === 0 && <span className="text-[12px] text-neutral-400">Kütüphanede beden yok.</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={quickType}
            onChange={(e) => setQuickType(e.target.value as 'color' | 'size')}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-[12px]"
            aria-label="Değer türü"
          >
            <option value="color">Renk</option>
            <option value="size">Beden</option>
          </select>
          <TextInput
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void quickAdd(); } }}
            placeholder="Kütüphanede olmayan değeri ekle"
            className="max-w-[240px]"
            data-testid="input-quick-option"
          />
          <SecondaryButton type="button" onClick={quickAdd} disabled={!quickName.trim()}>Hızlı ekle</SecondaryButton>
          <SecondaryButton type="button" onClick={generate} disabled={isEdit && !loaded} data-testid="button-generate-variants">
            Varyantları oluştur
          </SecondaryButton>
        </div>
        <p className="text-[11px] text-neutral-500">
          Seçilen renk ve bedenlerin eksik kombinasyonları eklenir. Var olan varyantlar silinmez ve değişmez.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px] text-neutral-500 py-1">
          {isEdit
            ? loaded ? 'Bu üründe varyant yok.' : 'Varyantlar yükleniyor…'
            : 'Henüz varyant yok. Basit ürünler için gerekmez. Renk ve beden seçip "Varyantları oluştur" deyin.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 p-2">
            <span className="text-[11px] text-neutral-500">Tüm varyantlar</span>
            <TextInput value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="Fiyat" className="!w-24 !h-8" />
            <TextInput type="number" min="0" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="Stok" className="!w-24 !h-8" />
            <SecondaryButton
              type="button"
              onClick={() => { applyBulk(null, bulkPrice.trim(), bulkStock.trim()); setBulkPrice(''); setBulkStock(''); }}
              data-testid="button-bulk-apply"
            >
              Uygula
            </SecondaryButton>
            <SecondaryButton type="button" onClick={suggestSkus} className="ml-auto" data-testid="button-suggest-sku">SKU öner</SecondaryButton>
          </div>

          {groups.map((g) => {
            const lib = g.key ? libColor.get(g.key) : undefined;
            const allActive = g.rows.every((r) => r.isActive);
            const usedKeys = new Set(groups.map((x) => x.key));
            return (
              <div key={g.key || 'none'} className="rounded-xl border border-neutral-200 p-3" data-testid={`group-${g.key || 'none'}`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {g.key ? (
                    <>
                      <input
                        type="color"
                        value={HEX_RE.test(g.rows[0].colorHex) ? g.rows[0].colorHex : '#cccccc'}
                        onChange={(e) => patchGroup(g.key, { colorHex: e.target.value })}
                        className="w-8 h-8 rounded border border-neutral-300 p-0 cursor-pointer bg-white"
                        aria-label={`${g.name} renk örneği`}
                      />
                      <span className="text-[13px] font-semibold text-neutral-900">{g.name}</span>
                      {!lib && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 h-6">
                          <AlertTriangle className="w-3 h-3" /> Kütüphanede yok
                          <button type="button" className="underline" onClick={() => addToLibrary('color', g.name, g.rows[0].colorHex)} data-testid={`button-lib-add-${g.key}`}>Ekle</button>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] font-semibold text-neutral-700">Renksiz varyantlar</span>
                  )}
                  <select
                    value=""
                    onChange={(e) => {
                      const o = libColor.get(e.target.value);
                      if (o) patchGroup(g.key, { color: o.name, colorHex: g.rows[0].colorHex || o.hex || '' });
                    }}
                    className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[11px]"
                    aria-label="Rengi ata veya değiştir"
                  >
                    <option value="">{g.key ? 'Rengi değiştir' : 'Renk ata'}</option>
                    {colorOpts.filter((o) => o.isActive && !usedKeys.has(o.key)).map((o) => (
                      <option key={o.id} value={o.key}>{o.name}</option>
                    ))}
                  </select>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <GroupBulk onApply={(p, s) => applyBulk(g.key, p, s)} />
                    <SecondaryButton type="button" onClick={() => patchGroup(g.key, { isActive: !allActive })}>
                      {allActive ? 'Grubu pasife al' : 'Grubu aktif et'}
                    </SecondaryButton>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {g.rows.map((row) => {
                    const sKey = foldVariantKey(row.size);
                    const unknownSize = !!sKey && !libSize.has(sKey);
                    return (
                      <div key={row.k} className="grid grid-cols-2 sm:grid-cols-[1.1fr_1.3fr_90px_80px_60px_32px] gap-2 items-center rounded-lg bg-neutral-50/70 border border-neutral-100 p-1.5" data-testid={`row-variant-${row.k}`}>
                        <div className="flex items-center gap-1">
                          <TextInput
                            list="variant-size-options"
                            value={row.size}
                            onChange={(e) => patchRow(row.k, { size: e.target.value })}
                            placeholder="Beden"
                          />
                          {unknownSize && (
                            <button type="button" title="Kütüphanede yok, eklemek için tıklayın" onClick={() => addToLibrary('size', row.size)} className="text-amber-600 shrink-0" data-testid={`button-lib-add-size-${row.k}`}>
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <TextInput value={row.sku} onChange={(e) => patchRow(row.k, { sku: e.target.value })} placeholder="SKU (ops.)" />
                        <TextInput value={row.price} onChange={(e) => patchRow(row.k, { price: e.target.value })} placeholder={basePrice || 'Ürün fiyatı'} />
                        <TextInput type="number" min="0" value={row.stock} onChange={(e) => patchRow(row.k, { stock: e.target.value })} placeholder="0" />
                        <label className="flex items-center justify-center gap-1 text-[11px] text-neutral-600 cursor-pointer">
                          <input type="checkbox" checked={row.isActive} onChange={(e) => patchRow(row.k, { isActive: e.target.checked })} className="w-4 h-4 rounded" />
                          <span className="sm:hidden">Aktif</span>
                        </label>
                        <IconButton type="button" onClick={() => removeRow(row.k)} disabled={isEdit && rows.length === 1} aria-label="Varyantı sil">
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>

                {g.key && (
                  <VariantColorImages
                    rows={rows}
                    productImages={productImages}
                    onChange={(key, patch) => patchGroup(key, patch)}
                    onlyKey={g.key}
                  />
                )}
              </div>
            );
          })}
          <datalist id="variant-size-options">
            {sizeOpts.map((o) => <option key={o.id} value={o.name} />)}
          </datalist>
          {isEdit && rows.length === 1 && (
            <p className="text-[11px] text-neutral-500">Üründe en az bir varyant kalmalı. Basit ürünlerde beden ve renk alanlarını boş bırakın.</p>
          )}
        </>
      )}
      <div>
        <SecondaryButton type="button" onClick={addEmptyRow} disabled={isEdit && !loaded} data-testid="button-add-variant">+ Boş satır ekle</SecondaryButton>
      </div>
    </div>
  );
}

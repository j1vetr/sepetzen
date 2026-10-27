import { useRef, useState } from 'react';
import { foldVariantKey } from '@shared/variantKey';
import { ChevronLeft, ChevronRight, Loader2, Trash2, Upload } from 'lucide-react';

export interface ColorGroupRow {
  color: string;
  colorHex: string;
  images: string[];
}

export const colorKeyOf = (color: string) => foldVariantKey(color);

interface Props {
  rows: ColorGroupRow[];
  productImages: string[];
  onChange: (colorKey: string, patch: { colorHex?: string; images?: string[] }) => void;
  /** Verilirse yalnızca bu renk grubu, başlıksız ve kenarlıksız gösterilir */
  onlyKey?: string;
}

const isVideo = (u: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(u) || /youtu\.?be/i.test(u);

/**
 * Renk bazında örnek rengi ve görsel yönetimi. Aynı renkteki tüm bedenler
 * aynı görselleri paylaşır; müşteri o rengi seçince galeri bu listeye geçer.
 */
export function VariantColorImages({ rows, productImages, onChange, onlyKey }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingKeyRef = useRef<string | null>(null);

  const groups: { key: string; name: string; hex: string; images: string[] }[] = [];
  rows.forEach((r) => {
    const key = colorKeyOf(r.color);
    if (!key) return;
    const existing = groups.find((g) => g.key === key);
    if (!existing) {
      groups.push({ key, name: r.color.trim(), hex: r.colorHex, images: r.images });
    } else {
      if (!existing.hex && r.colorHex) existing.hex = r.colorHex;
      if (existing.images.length === 0 && r.images.length > 0) existing.images = r.images;
    }
  });

  if (onlyKey) {
    const keep = groups.filter((g) => g.key === onlyKey);
    groups.length = 0;
    groups.push(...keep);
  }
  if (groups.length === 0) return null;
  const photos = productImages.filter((u) => !isVideo(u));

  const upload = async (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploadingKey(key);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await fetch('/api/admin/upload/products', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error('upload-failed');
      const data = await res.json();
      const group = groups.find((g) => g.key === key);
      const urls: string[] = (data.urls || []).filter((u: string) => !isVideo(u));
      onChange(key, { images: Array.from(new Set([...(group?.images ?? []), ...urls])).slice(0, 20) });
    } catch {
      setError('Renk görseli yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setUploadingKey(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const move = (g: { key: string; images: string[] }, from: number, to: number) => {
    if (to < 0 || to >= g.images.length) return;
    const next = [...g.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(g.key, { images: next });
  };

  return (
    <div className={onlyKey ? 'mt-2' : 'mt-4 border-t border-neutral-200 pt-3'} data-testid="section-variant-color-images">
      {!onlyKey && (
        <>
          <p className="text-[12px] font-semibold text-neutral-800">Renk görselleri</p>
          <p className="text-[11px] text-neutral-500 mb-3">
            Müşteri bir renk seçince galeri o rengin görsellerine geçer. Görsel eklemezseniz ürünün genel görselleri gösterilir.
          </p>
        </>
      )}
      {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const key = pendingKeyRef.current;
          if (key) void upload(key, e.target.files);
        }}
      />
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3" data-testid={`color-group-${g.key}`}>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(g.hex) ? g.hex : '#cccccc'}
                onChange={(e) => onChange(g.key, { colorHex: e.target.value })}
                className="w-8 h-8 rounded border border-neutral-300 p-0 cursor-pointer bg-white"
                aria-label={`${g.name} renk örneği`}
                data-testid={`input-color-hex-${g.key}`}
              />
              <input
                type="text"
                value={g.hex}
                onChange={(e) => onChange(g.key, { colorHex: e.target.value })}
                placeholder="#RRGGBB"
                maxLength={7}
                className="h-8 w-24 rounded border border-neutral-300 px-2 text-[12px] font-mono"
              />
              <span className="text-[12px] font-medium text-neutral-800">{g.name}</span>
              <span className="text-[11px] text-neutral-400">{g.images.length} görsel</span>
              <button
                type="button"
                onClick={() => { pendingKeyRef.current = g.key; fileRef.current?.click(); }}
                disabled={uploadingKey === g.key}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 border border-dashed border-neutral-300 hover:border-neutral-500 px-2.5 h-7 rounded-lg"
                data-testid={`button-upload-color-images-${g.key}`}
              >
                {uploadingKey === g.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Yükle
              </button>
            </div>
            {g.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {g.images.map((img, i) => (
                  <div key={img} className="relative w-16 h-16 rounded-md overflow-hidden border border-neutral-200 bg-white group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => move(g, i, i - 1)} className="text-white p-0.5" aria-label="Sola taşı"><ChevronLeft className="w-3 h-3" /></button>
                      <button type="button" onClick={() => onChange(g.key, { images: g.images.filter((u) => u !== img) })} className="text-white p-0.5" aria-label="Kaldır"><Trash2 className="w-3 h-3" /></button>
                      <button type="button" onClick={() => move(g, i, i + 1)} className="text-white p-0.5" aria-label="Sağa taşı"><ChevronRight className="w-3 h-3" /></button>
                    </div>
                    {i === 0 && <span className="absolute top-0 left-0 bg-black/70 text-white text-[9px] px-1">Ana</span>}
                  </div>
                ))}
              </div>
            )}
            {photos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Ürün görsellerinden seç</p>
                <div className="flex flex-wrap gap-1.5">
                  {photos.map((img) => {
                    const on = g.images.includes(img);
                    return (
                      <button
                        key={img}
                        type="button"
                        onClick={() => onChange(g.key, { images: on ? g.images.filter((u) => u !== img) : [...g.images, img] })}
                        className={`w-10 h-10 rounded overflow-hidden border-2 ${on ? 'border-neutral-900' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        aria-pressed={on}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

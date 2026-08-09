import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save, Upload,
  Image as ImageIcon, Truck, ShieldCheck, Star, Eye, EyeOff,
} from 'lucide-react';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  SECTION_LABELS,
  resolveHomepageContent,
  type HomepageContent,
  type HeroSlide,
  type VideoCard,
  type TrustItem,
} from '@shared/homepage';

const TRUST_ICON_OPTIONS = [
  { value: 'truck', label: 'Kargo', Icon: Truck },
  { value: 'shield', label: 'Güvenlik', Icon: ShieldCheck },
  { value: 'star', label: 'Yıldız', Icon: Star },
] as const;

const inputCls =
  'w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none';
const labelCls = 'block text-xs font-medium text-neutral-500 mb-1';

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export default function HomepageTab() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery<HomepageContent>({
    queryKey: ['admin', 'homepage-content'],
    queryFn: async () => {
      const res = await fetch('/api/homepage-content', { credentials: 'include' });
      if (!res.ok) throw new Error('İçerik yüklenemedi');
      return resolveHomepageContent(await res.json());
    },
  });

  useEffect(() => {
    if (data && !content) setContent(data);
  }, [data, content]);

  const saveMutation = useMutation({
    mutationFn: async (payload: HomepageContent) => {
      const res = await fetch('/api/admin/homepage-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Kaydedilemedi');
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'homepage-content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/homepage-content'] });
    },
    onError: (err: Error) => alert(`❌ ${err.message}`),
  });

  const update = (patch: Partial<HomepageContent>) => {
    setContent(c => (c ? { ...c, ...patch } : c));
    setDirty(true);
  };

  const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const uploadHeroImage = async (file: File, slideIndex: number) => {
    if (!content) return;
    setUploadingIndex(slideIndex);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await fetch('/api/admin/upload/hero', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Yükleme başarısız');
      }
      const { urls } = await res.json();
      if (urls?.[0]) {
        const slides = [...content.heroSlides];
        slides[slideIndex] = { ...slides[slideIndex], image: urls[0] };
        update({ heroSlides: slides });
      }
    } catch (e: any) {
      alert(`❌ ${e.message}`);
    } finally {
      setUploadingIndex(null);
    }
  };

  if (isLoading || !content) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  const setSlide = (i: number, patch: Partial<HeroSlide>) => {
    const slides = [...content.heroSlides];
    slides[i] = { ...slides[i], ...patch };
    update({ heroSlides: slides });
  };
  const setVideo = (i: number, patch: Partial<VideoCard>) => {
    const cards = [...content.videoCards];
    cards[i] = { ...cards[i], ...patch };
    update({ videoCards: cards });
  };
  const setTrust = (i: number, patch: Partial<TrustItem>) => {
    const items = [...content.trustItems];
    items[i] = { ...items[i], ...patch };
    update({ trustItems: items });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">Ana Sayfa</h2>
          <p className="text-neutral-500 text-sm mt-1">
            Hero slaytları, video bölümü, güven şeridi ve bölüm sırasını düzenleyin
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate(content)}
          disabled={!dirty || saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-700 disabled:opacity-40 transition-colors"
          data-testid="button-save-homepage"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {dirty ? 'Kaydet' : 'Kaydedildi'}
        </button>
      </div>

      {/* ── Hero Slides ── */}
      <SectionCard title="Hero Slaytları" desc="Ana sayfanın en üstündeki büyük slayt gösterisi">
        <div className="space-y-4">
          {content.heroSlides.map((slide, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4" data-testid={`hero-slide-${i}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => update({ heroSlides: move(content.heroSlides, i, -1) })} disabled={i === 0} className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30" data-testid={`button-slide-up-${i}`}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => update({ heroSlides: move(content.heroSlides, i, 1) })} disabled={i === content.heroSlides.length - 1} className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30" data-testid={`button-slide-down-${i}`}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Image preview + upload */}
                <div className="shrink-0 w-28">
                  <div className="relative w-28 h-20 bg-neutral-100 rounded overflow-hidden border border-neutral-200">
                    {slide.image ? (
                      <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-300 absolute inset-0 m-auto" />
                    )}
                  </div>
                  <label className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 cursor-pointer border border-neutral-200 rounded py-1">
                    {uploadingIndex === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Görsel
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHeroImage(f, i); e.target.value = ''; }} data-testid={`input-slide-image-${i}`} />
                  </label>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Üst Etiket</label>
                    <input className={inputCls} value={slide.eyebrow} onChange={e => setSlide(i, { eyebrow: e.target.value })} data-testid={`input-slide-eyebrow-${i}`} />
                  </div>
                  <div>
                    <label className={labelCls}>Başlık</label>
                    <input className={inputCls} value={slide.title} onChange={e => setSlide(i, { title: e.target.value })} data-testid={`input-slide-title-${i}`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Alt Metin</label>
                    <input className={inputCls} value={slide.desc} onChange={e => setSlide(i, { desc: e.target.value })} data-testid={`input-slide-desc-${i}`} />
                  </div>
                  <div>
                    <label className={labelCls}>Link (örn. /kategori/bicaklar)</label>
                    <input className={inputCls} value={slide.href} onChange={e => setSlide(i, { href: e.target.value })} data-testid={`input-slide-href-${i}`} />
                  </div>
                  <div>
                    <label className={labelCls}>Buton Yazısı</label>
                    <input className={inputCls} value={slide.cta} onChange={e => setSlide(i, { cta: e.target.value })} data-testid={`input-slide-cta-${i}`} />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => setSlide(i, { isActive: !slide.isActive })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${slide.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                    data-testid={`button-slide-active-${i}`}
                  >
                    {slide.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {slide.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                  <button
                    onClick={() => { if (confirm('Bu slayt silinsin mi?')) update({ heroSlides: content.heroSlides.filter((_, x) => x !== i) }); }}
                    className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500"
                    data-testid={`button-slide-delete-${i}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => update({ heroSlides: [...content.heroSlides, { image: '', eyebrow: '', title: 'Yeni Slayt', desc: '', href: '/magaza', cta: 'Koleksiyonu Gör', bg: '#0F0F0F', isActive: true }] })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            data-testid="button-add-slide"
          >
            <Plus className="w-4 h-4" /> Slayt Ekle
          </button>
        </div>
      </SectionCard>

      {/* ── Video Section ── */}
      <SectionCard title="Video Bölümü" desc="Video bölümü başlığı ve video kartları">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Üst Etiket</label>
            <input className={inputCls} value={content.videoSection.eyebrow} onChange={e => update({ videoSection: { ...content.videoSection, eyebrow: e.target.value } })} data-testid="input-video-eyebrow" />
          </div>
          <div>
            <label className={labelCls}>Başlık</label>
            <input className={inputCls} value={content.videoSection.title} onChange={e => update({ videoSection: { ...content.videoSection, title: e.target.value } })} data-testid="input-video-title" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Açıklama</label>
            <input className={inputCls} value={content.videoSection.desc} onChange={e => update({ videoSection: { ...content.videoSection, desc: e.target.value } })} data-testid="input-video-desc" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {content.videoCards.map((v, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid={`video-card-row-${i}`}>
              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">Video Kartı {i + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVideo(i, { isActive: !v.isActive })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${v.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                    data-testid={`button-video-active-${i}`}
                  >
                    {v.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                  <button onClick={() => { if (confirm('Bu video kartı silinsin mi?')) update({ videoCards: content.videoCards.filter((_, x) => x !== i) }); }} className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500" data-testid={`button-video-delete-${i}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Video URL (örn. /videos/dosya.mp4)</label>
                <input className={inputCls} value={v.src} onChange={e => setVideo(i, { src: e.target.value })} data-testid={`input-video-src-${i}`} />
              </div>
              <div>
                <label className={labelCls}>Başlık</label>
                <input className={inputCls} value={v.title} onChange={e => setVideo(i, { title: e.target.value })} data-testid={`input-video-card-title-${i}`} />
              </div>
              <div>
                <label className={labelCls}>Açıklama</label>
                <input className={inputCls} value={v.desc} onChange={e => setVideo(i, { desc: e.target.value })} data-testid={`input-video-card-desc-${i}`} />
              </div>
            </div>
          ))}
          <button
            onClick={() => update({ videoCards: [...content.videoCards, { src: '', title: '', desc: '', isActive: true }] })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            data-testid="button-add-video"
          >
            <Plus className="w-4 h-4" /> Video Kartı Ekle
          </button>
        </div>
      </SectionCard>

      {/* ── Trust Strip ── */}
      <SectionCard title="Güven Şeridi" desc="Sayfa altındaki güven mesajları (kargo, ödeme, kalite)">
        <div className="space-y-3">
          {content.trustItems.map((t, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 sm:items-end" data-testid={`trust-item-${i}`}>
              <div className="w-full sm:w-32">
                <label className={labelCls}>İkon</label>
                <select className={inputCls} value={t.icon} onChange={e => setTrust(i, { icon: e.target.value as TrustItem['icon'] })} data-testid={`select-trust-icon-${i}`}>
                  {TRUST_ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Başlık</label>
                <input className={inputCls} value={t.title} onChange={e => setTrust(i, { title: e.target.value })} data-testid={`input-trust-title-${i}`} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Açıklama</label>
                <input className={inputCls} value={t.desc} onChange={e => setTrust(i, { desc: e.target.value })} data-testid={`input-trust-desc-${i}`} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTrust(i, { isActive: !t.isActive })}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                  data-testid={`button-trust-active-${i}`}
                >
                  {t.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button onClick={() => { if (confirm('Bu madde silinsin mi?')) update({ trustItems: content.trustItems.filter((_, x) => x !== i) }); }} className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500" data-testid={`button-trust-delete-${i}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => update({ trustItems: [...content.trustItems, { icon: 'star', title: '', desc: '', isActive: true }] })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            data-testid="button-add-trust"
          >
            <Plus className="w-4 h-4" /> Madde Ekle
          </button>
        </div>
      </SectionCard>

      {/* ── Section Order ── */}
      <SectionCard title="Bölüm Sırası" desc="Ana sayfa bölümlerinin sırasını ve görünürlüğünü ayarlayın (hero her zaman en üsttedir)">
        <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden">
          {content.sectionOrder.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3" data-testid={`section-order-${s.id}`}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => update({ sectionOrder: move(content.sectionOrder, i, -1) })} disabled={i === 0} className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30" data-testid={`button-section-up-${s.id}`}>
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => update({ sectionOrder: move(content.sectionOrder, i, 1) })} disabled={i === content.sectionOrder.length - 1} className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30" data-testid={`button-section-down-${s.id}`}>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <span className="flex-1 text-sm font-medium text-neutral-900">
                {SECTION_LABELS[s.id] ?? s.id}
              </span>
              <button
                onClick={() => {
                  const next = [...content.sectionOrder];
                  next[i] = { ...next[i], isActive: !next[i].isActive };
                  update({ sectionOrder: next });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                data-testid={`button-section-active-${s.id}`}
              >
                {s.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {s.isActive ? 'Görünür' : 'Gizli'}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={() => saveMutation.mutate(content)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium shadow-lg hover:bg-neutral-700 disabled:opacity-50"
            data-testid="button-save-homepage-sticky"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Değişiklikleri Kaydet
          </button>
        </div>
      )}
    </div>
  );
}

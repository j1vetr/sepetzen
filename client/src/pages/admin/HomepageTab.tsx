import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save, Upload,
  Image as ImageIcon, Truck, ShieldCheck, Star, Eye, EyeOff, Video, AlertTriangle,
  Search, X, FolderOpen, Package,
} from 'lucide-react';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  SECTION_LABELS,
  resolveHomepageContent,
  type HomepageContent,
  type HeroSlide,
  type VideoCard,
  type TrustItem,
  type PartnerItem,
  type ShowcaseItem,
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
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
  const videoFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showcaseSearch, setShowcaseSearch] = useState('');
  const [showcaseDropdown, setShowcaseDropdown] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const [heroDropdown, setHeroDropdown] = useState(false);
  const [uploadingPartnerLogo, setUploadingPartnerLogo] = useState<number | null>(null);

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ['admin', 'products', 'showcase-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=500', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: allCategories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

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

  const handleVideoUpload = async (index: number, file: File) => {
    setUploadingVideo(index);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await fetch('/api/admin/upload/videos', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error || 'Yükleme başarısız');
      setVideo(index, { src: data.urls[0] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Video yüklenemedi');
    } finally {
      setUploadingVideo(null);
    }
  };
  const setTrust = (i: number, patch: Partial<TrustItem>) => {
    const items = [...content.trustItems];
    items[i] = { ...items[i], ...patch };
    update({ trustItems: items });
  };
  const setPartner = (i: number, patch: Partial<PartnerItem>) => {
    const items = [...content.partnerStrip.items];
    items[i] = { ...items[i], ...patch };
    update({ partnerStrip: { ...content.partnerStrip, items } });
  };
  const uploadPartnerLogo = async (index: number, file: File) => {
    setUploadingPartnerLogo(index);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await fetch('/api/admin/upload/branding', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error || 'Yükleme başarısız');
      setPartner(index, { logoUrl: data.urls[0] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Logo yüklenemedi');
    } finally {
      setUploadingPartnerLogo(null);
    }
  };
  const visibleSectionIds = new Set(content.sectionOrder.filter((section) => section.isActive).map((section) => section.id));
  const homepageQualityIssues = [
    ...content.heroSlides.flatMap((slide, index) =>
      slide.isActive && (!slide.image || !slide.title.trim() || !slide.href.trim() || !slide.cta.trim())
        ? [`Aktif hero slaytı ${index + 1}`]
        : [],
    ),
    ...(visibleSectionIds.has('videos')
      ? content.videoCards.flatMap((card, index) =>
        card.isActive && (!card.src || !card.title.trim()) ? [`Aktif video kartı ${index + 1}`] : [],
      )
      : []),
    ...(visibleSectionIds.has('trust')
      ? content.trustItems.flatMap((item, index) =>
        item.isActive && (!item.title.trim() || !item.desc.trim()) ? [`Aktif güven mesajı ${index + 1}`] : [],
      )
      : []),
  ];

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

      {homepageQualityIssues.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" data-testid="homepage-quality-check">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Görünür içerik kontrolü</strong>
            <p className="mt-0.5 text-xs">
              {homepageQualityIssues.join(', ')} eksik bilgi içeriyor. Kaydetmeden önce görsel, başlık ve yönlendirme alanlarını tamamlayın.
            </p>
          </div>
        </div>
      )}

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
                <label className={labelCls}>Video</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="hidden"
                  ref={el => { videoFileRefs.current[i] = el; }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(i, f); e.target.value = ''; }}
                />
                {v.src ? (
                  <div className="space-y-2">
                    <video src={v.src} className="w-full max-h-40 rounded-lg border border-neutral-200 bg-black object-contain" muted playsInline />
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => videoFileRefs.current[i]?.click()} disabled={uploadingVideo === i}
                        className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1 transition-colors disabled:opacity-50">
                        {uploadingVideo === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {uploadingVideo === i ? 'Yükleniyor…' : 'Değiştir'}
                      </button>
                      <button type="button" onClick={() => setVideo(i, { src: '' })} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">Kaldır</button>
                      <span className="text-[10px] text-neutral-400 truncate flex-1 font-mono">{v.src}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => videoFileRefs.current[i]?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-colors cursor-pointer"
                    data-testid={`video-upload-zone-${i}`}
                  >
                    {uploadingVideo === i
                      ? <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                      : <Video className="w-6 h-6 text-neutral-400" />}
                    <span className="text-sm text-neutral-500 font-medium">
                      {uploadingVideo === i ? 'Yükleniyor…' : 'Video yükle'}
                    </span>
                    <span className="text-xs text-neutral-400">MP4, WebM, MOV, max 200 MB</span>
                    <span className="text-xs text-neutral-300">veya URL yaz:</span>
                    <input
                      className={`${inputCls} text-center text-xs`}
                      value={v.src}
                      onChange={e => setVideo(i, { src: e.target.value })}
                      placeholder="/videos/dosya.mp4"
                      onClick={e => e.stopPropagation()}
                      data-testid={`input-video-src-${i}`}
                    />
                  </div>
                )}
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

      {/* ── Partners Strip ── */}
      <SectionCard title="Marka ve Bayilikler Şeridi" desc="Ana sayfada kayan marka / bayi logoları şeridi">
        {/* Başlık + aktif toggle */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className={labelCls}>Bölüm Başlığı</label>
            <input
              className={inputCls}
              value={content.partnerStrip.title}
              onChange={e => update({ partnerStrip: { ...content.partnerStrip, title: e.target.value } })}
              placeholder="Markalar ve Bayilikler"
            />
          </div>
          <button
            onClick={() => update({ partnerStrip: { ...content.partnerStrip, isActive: !content.partnerStrip.isActive } })}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${content.partnerStrip.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
          >
            {content.partnerStrip.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {content.partnerStrip.isActive ? 'Aktif' : 'Pasif'}
          </button>
        </div>

        {/* Marka listesi */}
        <div className="space-y-3">
          {content.partnerStrip.items.map((item, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              {/* Logo */}
              <div className="shrink-0">
                <label className={labelCls}>Logo</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-16 h-10 border border-neutral-200 rounded bg-neutral-50 flex items-center justify-center overflow-hidden">
                    {item.logoUrl
                      ? <img src={item.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                      : <ImageIcon className="w-4 h-4 text-neutral-300" />
                    }
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPartnerLogo(i, f); e.target.value = ''; }}
                  />
                  <span className="text-xs text-neutral-500 hover:text-neutral-800">
                    {uploadingPartnerLogo === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yükle'}
                  </span>
                </label>
              </div>

              {/* İsim */}
              <div className="flex-1">
                <label className={labelCls}>Marka Adı</label>
                <input
                  className={inputCls}
                  value={item.name}
                  onChange={e => setPartner(i, { name: e.target.value })}
                  placeholder="Marka Adı"
                />
              </div>

              {/* Link */}
              <div className="flex-1">
                <label className={labelCls}>Bağlantı (opsiyonel)</label>
                <input
                  className={inputCls}
                  value={item.href}
                  onChange={e => setPartner(i, { href: e.target.value })}
                  placeholder="/marka/ornek veya https://..."
                />
              </div>

              {/* Aktif + sil */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPartner(i, { isActive: !item.isActive })}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                >
                  {item.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Bu marka silinsin mi?')) {
                      const items = content.partnerStrip.items.filter((_, x) => x !== i);
                      update({ partnerStrip: { ...content.partnerStrip, items } });
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => update({ partnerStrip: { ...content.partnerStrip, items: [...content.partnerStrip.items, { logoUrl: '', name: '', href: '', isActive: true }] } })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Marka Ekle
          </button>
        </div>
      </SectionCard>

      {/* ── Hero Ürün Şeridi ── */}
      {(() => {
        const hm = content.heroMarquee ?? { isActive: false, items: [] };
        const setHero = (patch: Partial<typeof hm>) =>
          update({ heroMarquee: { ...hm, ...patch } });
        const addItem = (type: 'product' | 'category', id: string) => {
          if (hm.items.some(i => i.type === type && i.id === id)) return;
          setHero({ items: [...hm.items, { type, id, isActive: true }] });
          setHeroSearch('');
          setHeroDropdown(false);
        };
        const removeItem = (idx: number) =>
          setHero({ items: hm.items.filter((_, i) => i !== idx) });

        const q = heroSearch.toLowerCase().trim();
        const catResults = q ? allCategories.filter((c: any) => c.name.toLowerCase().includes(q)).slice(0, 5) : [];
        const prodResults = q ? allProducts.filter((p: any) => p.name.toLowerCase().includes(q)).slice(0, 5) : [];
        const hasResults = catResults.length > 0 || prodResults.length > 0;

        const catName = (id: string) => allCategories.find((c: any) => c.id === id)?.name ?? id;
        const prodName = (id: string) => allProducts.find((p: any) => p.id === id)?.name ?? id;
        const catImage = (id: string) => allCategories.find((c: any) => c.id === id)?.image ?? null;
        const prodImage = (id: string) => { const imgs = allProducts.find((p: any) => p.id === id)?.images; return Array.isArray(imgs) ? imgs[0] ?? null : null; };

        return (
          <SectionCard
            title="Hero Ürün Şeridi"
            desc="Hero slaydının altında akan ürün şeridinde hangi kategori veya ürünlerin görüneceğini seçin. Boş bırakılırsa tüm ürünler rastgele gösterilir."
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Özel seçim aktif</span>
              <button
                onClick={() => setHero({ isActive: !hm.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hm.isActive ? 'bg-neutral-900' : 'bg-neutral-200'}`}
                data-testid="toggle-hero-marquee-active"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {!hm.isActive && (
              <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg p-3">
                Kapalıyken şerit, tüm ürünleri otomatik olarak gösterir. Açıkken aşağıdan seçtiğiniz kategori veya ürünler gösterilir.
              </p>
            )}

            <div className="relative">
              <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 bg-white">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Kategori veya ürün adı yaz..."
                  value={heroSearch}
                  onChange={e => { setHeroSearch(e.target.value); setHeroDropdown(true); }}
                  onFocus={() => setHeroDropdown(true)}
                  className="flex-1 py-2 text-sm bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
                  data-testid="input-hero-marquee-search"
                />
                {heroSearch && (
                  <button onClick={() => { setHeroSearch(''); setHeroDropdown(false); }}>
                    <X className="w-4 h-4 text-neutral-400 hover:text-neutral-700" />
                  </button>
                )}
              </div>
              {heroDropdown && hasResults && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {catResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-100">Kategoriler</div>
                      {catResults.map((c: any) => (
                        <button key={c.id} onClick={() => addItem('category', c.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                          {c.image ? <img src={c.image} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" /> : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0"><FolderOpen className="w-4 h-4 text-neutral-400" /></div>}
                          <span className="text-sm text-neutral-800 truncate">{c.name}</span>
                          <span className="ml-auto text-[10px] text-neutral-400 shrink-0">Kategori</span>
                        </button>
                      ))}
                    </>
                  )}
                  {prodResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-100">Ürünler</div>
                      {prodResults.map((p: any) => {
                        const img = Array.isArray(p.images) ? p.images[0] : null;
                        return (
                          <button key={p.id} onClick={() => addItem('product', p.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                            {img ? <img src={img} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" /> : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-neutral-400" /></div>}
                            <span className="text-sm text-neutral-800 truncate">{p.name}</span>
                            <span className="ml-auto text-[10px] text-neutral-400 shrink-0">Ürün</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {hm.items.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {hm.items.map((item, idx) => {
                  const thumb = item.type === 'category' ? catImage(item.id) : prodImage(item.id);
                  const label = item.type === 'category' ? catName(item.id) : prodName(item.id);
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg px-3 py-2">
                      {thumb ? <img src={thumb} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" /> : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0">{item.type === 'category' ? <FolderOpen className="w-4 h-4 text-neutral-400" /> : <Package className="w-4 h-4 text-neutral-400" />}</div>}
                      <span className="flex-1 text-sm text-neutral-800 truncate">{label}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0 mr-1">{item.type === 'category' ? 'Kategori' : 'Ürün'}</span>
                      <button
                        onClick={() => { const next = [...hm.items]; next[idx] = { ...next[idx], isActive: !next[idx].isActive }; setHero({ items: next }); }}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                      >
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                      <button onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-4 border border-dashed border-neutral-200 rounded-lg">
                Henüz eklenmedi. Yukarıdan arama yaparak kategori veya ürün ekleyin.
              </p>
            )}
          </SectionCard>
        );
      })()}

      {/* ── Showcase Marquee ── */}
      {(() => {
        const sm = content.showcaseMarquee;
        const setShowcase = (patch: Partial<typeof sm>) =>
          update({ showcaseMarquee: { ...sm, ...patch } });
        const addItem = (type: 'product' | 'category', id: string, name: string) => {
          if (sm.items.some(i => i.type === type && i.id === id)) return;
          setShowcase({ items: [...sm.items, { type, id, isActive: true }] });
          setShowcaseSearch('');
          setShowcaseDropdown(false);
        };
        const removeItem = (idx: number) =>
          setShowcase({ items: sm.items.filter((_, i) => i !== idx) });

        // Search results: up to 5 categories + 5 products
        const q = showcaseSearch.toLowerCase().trim();
        const catResults = q
          ? allCategories.filter((c: any) => c.name.toLowerCase().includes(q)).slice(0, 5)
          : [];
        const prodResults = q
          ? allProducts.filter((p: any) => p.name.toLowerCase().includes(q)).slice(0, 5)
          : [];
        const hasResults = catResults.length > 0 || prodResults.length > 0;

        // Name lookup helpers for display
        const catName = (id: string) => allCategories.find((c: any) => c.id === id)?.name ?? id;
        const prodName = (id: string) => allProducts.find((p: any) => p.id === id)?.name ?? id;
        const catImage = (id: string) => allCategories.find((c: any) => c.id === id)?.image ?? null;
        const prodImage = (id: string) => {
          const imgs = allProducts.find((p: any) => p.id === id)?.images;
          return Array.isArray(imgs) ? imgs[0] ?? null : null;
        };

        return (
          <SectionCard
            title="Vitrin Şeridi"
            desc="Ana sayfada yalnızca ürün fotoğraflarının aktığı kayan bir vitrin. Fiyat veya metin gösterilmez — tıklayınca ürüne gidilir."
          >
            {/* Toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Şerit aktif</span>
              <button
                onClick={() => setShowcase({ isActive: !sm.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sm.isActive ? 'bg-neutral-900' : 'bg-neutral-200'}`}
                data-testid="toggle-showcase-active"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${sm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Search and add */}
            <div className="relative">
              <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 bg-white">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Ürün veya kategori adı yaz..."
                  value={showcaseSearch}
                  onChange={e => { setShowcaseSearch(e.target.value); setShowcaseDropdown(true); }}
                  onFocus={() => setShowcaseDropdown(true)}
                  className="flex-1 py-2 text-sm bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
                  data-testid="input-showcase-search"
                />
                {showcaseSearch && (
                  <button onClick={() => { setShowcaseSearch(''); setShowcaseDropdown(false); }}>
                    <X className="w-4 h-4 text-neutral-400 hover:text-neutral-700" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showcaseDropdown && hasResults && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {catResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-100">
                        Kategoriler
                      </div>
                      {catResults.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => addItem('category', c.id, c.name)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                        >
                          {c.image
                            ? <img src={c.image} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" />
                            : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0"><FolderOpen className="w-4 h-4 text-neutral-400" /></div>
                          }
                          <span className="text-sm text-neutral-800 truncate">{c.name}</span>
                          <span className="ml-auto text-[10px] text-neutral-400 shrink-0">Kategori</span>
                        </button>
                      ))}
                    </>
                  )}
                  {prodResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-100">
                        Ürünler
                      </div>
                      {prodResults.map((p: any) => {
                        const img = Array.isArray(p.images) ? p.images[0] : null;
                        return (
                          <button
                            key={p.id}
                            onClick={() => addItem('product', p.id, p.name)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                          >
                            {img
                              ? <img src={img} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" />
                              : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-neutral-400" /></div>
                            }
                            <span className="text-sm text-neutral-800 truncate">{p.name}</span>
                            <span className="ml-auto text-[10px] text-neutral-400 shrink-0">Ürün</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Items list */}
            {sm.items.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {sm.items.map((item, idx) => {
                  const thumb = item.type === 'category' ? catImage(item.id) : prodImage(item.id);
                  const label = item.type === 'category' ? catName(item.id) : prodName(item.id);
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg px-3 py-2">
                      {thumb
                        ? <img src={thumb} className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-100" alt="" />
                        : <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0">
                            {item.type === 'category' ? <FolderOpen className="w-4 h-4 text-neutral-400" /> : <Package className="w-4 h-4 text-neutral-400" />}
                          </div>
                      }
                      <span className="flex-1 text-sm text-neutral-800 truncate">{label}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0 mr-1">
                        {item.type === 'category' ? 'Kategori' : 'Ürün'}
                      </span>
                      <button
                        onClick={() => {
                          const next = [...sm.items];
                          next[idx] = { ...next[idx], isActive: !next[idx].isActive };
                          setShowcase({ items: next });
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                      >
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                      <button onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded text-neutral-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {sm.items.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4 border border-dashed border-neutral-200 rounded-lg">
                Henüz ürün veya kategori eklenmedi. Yukarıdan arama yaparak ekleyebilirsiniz.
              </p>
            )}
          </SectionCard>
        );
      })()}

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

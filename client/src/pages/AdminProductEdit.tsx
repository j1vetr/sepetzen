import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearch } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Loader2,
  Package,
  Trash2,
  RefreshCw,
  Wand2,
  GripVertical,
  ExternalLink,
  Save,
  ImageIcon,
  Layers,
  FileText,
  Settings2,
  Star,
  Sparkles,
} from 'lucide-react';
import type { Product, ProductDraft, Category } from './admin/_shared/types';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
  TextInput,
  TextArea,
  FormField,
  InlineAlert,
  StatusBadge,
  LoadingState,
} from './admin/_ui/AdminUI';

/** Video URL tespiti - yüklenen medya grid'inde img/video seçimi için */
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(url);
}

// Sekme editörlerinin yerleşik şablonları. Hem editör görünümünde hem de
// "Varsayılan olarak kaydet" akışında aynı kaynak kullanılır; böylece
// ekranda görünen içerik ile kaydedilen içerik asla ayrışmaz.
const BUILTIN_TAB_DELIVERY = [
  {
    title: 'Kargo & Teslimat',
    rows: [
      { key: 'Kargo Süresi', value: '1–3 iş günü' },
      { key: 'Ücretsiz Kargo', value: 'Belirli tutarın üzeri siparişlerde' },
      { key: 'Kargo Firması', value: 'MNG Kargo / Yurtiçi Kargo' },
      { key: 'Aynı Gün Kargo', value: "Hafta içi 14:00'a kadar verilen siparişler" },
    ],
  },
  {
    title: 'İade & İptal',
    rows: [
      { key: 'İade Süresi', value: '14 gün içinde' },
      { key: 'İade Şartı', value: 'Açılmamış, kullanılmamış, orijinal ambalajında' },
      { key: 'İade Yöntemi', value: 'Banka havalesi veya kart iadesi' },
      { key: 'İptal', value: 'Kargoya verilmemiş siparişler iptal edilebilir' },
    ],
  },
];

const BUILTIN_TAB_FAQ = [
  { q: 'Ürünün garantisi var mı?', a: 'Evet, tüm ürünlerimiz 2 yıl üretici garantisi kapsamındadır.' },
  { q: 'Kargo ücreti ne kadar?', a: 'Belirli tutarın üzeri siparişlerde kargo tamamen ücretsizdir. Altındaki siparişlerde kargo ücreti sepette hesaplanır.' },
  { q: 'Havale/EFT ile ödeme yapabilir miyim?', a: 'Evet. Havale/EFT ile ödeme seçeneğinde sipariş toplamından %3 indirim uygulanır.' },
  { q: 'Ürünü iade edebilir miyim?', a: 'Teslim tarihinden itibaren 14 gün içinde, kullanılmamış ve orijinal ambalajında iade edilebilir.' },
  { q: 'Fatura kesilecek mi?', a: 'Evet, tüm siparişlerinize e-fatura kesilmektedir.' },
];

const BUILTIN_INSTALLMENT_NOTE =
  'Taksit seçenekleri kredi kartıyla ödemelerde geçerlidir. Bankanıza göre taksit sayısı ve tutarlar değişiklik gösterebilir; güncel tutarlar ödeme adımında görüntülenir. Havale/EFT ile ödemelerde %3 indirim uygulanır.';

// Türkçe-uyumlu büyük harf dönüşümü: i → İ, ı → I, vs.
function toTurkishUpper(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

function generateSlug(name: string) {
  const turkishMap: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
  };
  return name
    .split('')
    .map((char) => turkishMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Varyant düzenleme satırı: fiyat boş bırakılırsa ürün fiyatı kullanılır.
interface VariantRow {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
  isActive: boolean;
}

/** "Ürün Detay Sekmeleri" bölüm ikonu.
 *  SectionCard `icon` prop'u BİLEŞEN bekler; hazır JSX (<svg />) geçilirse
 *  React "Element type is invalid" hatasıyla tüm sayfa beyaz kalır. */
function TabLinesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  );
}

/** Sayfa bölümü kartı: başlık + ikon + içerik */
function SectionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  testId,
}: {
  icon: any;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="bg-white border border-neutral-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-px">
            <Icon className="w-3.5 h-3.5 text-neutral-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-neutral-900 leading-tight">{title}</h2>
            {description && (
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 cursor-pointer group">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {hint && <p className="text-[11px] text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-neutral-900' : 'bg-neutral-300 group-hover:bg-neutral-400'
        }`}
        aria-pressed={checked}
        data-testid={testId}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

export default function AdminProductEdit() {
  const params = useParams<{ id?: string }>();
  const search = useSearch();
  const productId = params.id || null;
  const duplicateId = !productId ? new URLSearchParams(search).get('duplicate') : null;
  // key: rota kimliği değişince (A→B, düzenle→yeni, kopya A→kopya B) tüm form
  // state'i sıfırdan kurulur - bayat form verisinin yanlış ürüne kaydedilmesini önler
  const editorKey = productId || (duplicateId ? `dup-${duplicateId}` : 'new');
  return <ProductEditor key={editorKey} productId={productId} duplicateId={duplicateId} />;
}

function ProductEditor({
  productId,
  duplicateId,
}: {
  productId: string | null;
  duplicateId: string | null;
}) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Oturum kontrolü - girişsiz erişimde login'e yönlendir
  const { data: adminUser, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/admin/me');
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (userError) setLocation('/toov-admin/login');
  }, [userError, setLocation]);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products');
      if (!r.ok) throw new Error('Products request failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const r = await fetch('/api/categories');
      if (!r.ok) throw new Error('Categories request failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  const { data: brandsData = [] } = useQuery<{ id: string; name: string; slug: string; isActive: boolean }[]>({
    queryKey: ['/api/admin/brands'],
    queryFn: async () => {
      const r = await fetch('/api/admin/brands');
      if (!r.ok) throw new Error('Brands request failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  // Sekme varsayılanları — site genelinde kaydedilmiş şablon
  const { data: tabDefaults } = useQuery<{
    tabDelivery: Array<{title: string; rows: Array<{key: string; value: string}>}> | null;
    tabFaq: Array<{q: string; a: string}> | null;
    tabInstallmentNote: string;
  }>({
    queryKey: ['admin', 'product-tab-defaults'],
    queryFn: async () => {
      const r = await fetch('/api/admin/product-tab-defaults');
      if (!r.ok) throw new Error('Tab defaults request failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  // Varsayılan olarak kaydetme — anlık UI geri bildirimi
  const [savingDefault, setSavingDefault] = useState<'delivery' | 'faq' | 'installment' | null>(null);
  const [savedDefaultFlash, setSavedDefaultFlash] = useState<'delivery' | 'faq' | 'installment' | null>(null);
  const saveTabDefault = async (tab: 'delivery' | 'faq' | 'installment') => {
    setSavingDefault(tab);
    try {
      const key =
        tab === 'delivery' ? 'default_tab_delivery' :
        tab === 'faq' ? 'default_tab_faq' :
        'default_tab_installment_note';
      // Ekranda O AN görünen içerik kaydedilir: ürüne özel değer yoksa kayıtlı
      // varsayılan, o da yoksa yerleşik şablon. Boş liste asla kaydedilmez;
      // aksi hâlde "varsayılan kaydet" sonrası tüm sorular kayboluyordu.
      const value =
        tab === 'delivery' ? (formData.tabDelivery ?? tabDefaults?.tabDelivery ?? BUILTIN_TAB_DELIVERY) :
        tab === 'faq' ? (formData.tabFaq ?? tabDefaults?.tabFaq ?? BUILTIN_TAB_FAQ) :
        (formData.tabInstallmentNote || tabDefaults?.tabInstallmentNote || BUILTIN_INSTALLMENT_NOTE);
      const res = await fetch('/api/admin/product-tab-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Varsayılan kaydedilemedi');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-tab-defaults'] });
      setSavedDefaultFlash(tab);
      setTimeout(() => setSavedDefaultFlash(null), 2000);
    } finally {
      setSavingDefault(null);
    }
  };

  // Düzenlenen ürün ya da kopya taslağı
  const product: Product | ProductDraft | null = useMemo(() => {
    if (productId) return products.find((p) => p.id === productId) || null;
    if (duplicateId) {
      const source = products.find((p) => p.id === duplicateId);
      if (!source) return null;
      return {
        ...source,
        id: undefined,
        name: `${source.name} (Kopya)`,
        slug: '',
        sku: source.sku ? `${source.sku}-KOPYA` : undefined,
      } as ProductDraft;
    }
    return null;
  }, [productId, duplicateId, products]);

  const productNotFound =
    !!adminUser && !productsLoading && !!productId && !product;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sku: '',
    basePrice: '',
    categoryId: '',
    categoryIds: [] as string[],
    images: [] as string[],
    availableColors: [] as { name: string; hex: string | null }[],
    isActive: true,
    isFeatured: false,
    isNew: false,
    initialStock: '',
    brand: '',
    specs: {} as Record<string, string>,
    tabDelivery: null as Array<{title: string; rows: Array<{key: string; value: string}>}> | null,
    tabFaq: null as Array<{q: string; a: string}> | null,
    tabInstallmentNote: '',
    // Kişiselleştirme (isim yazdırma) ayarları
    persEnabled: false,
    persFee: '',
    persLabel: '',
    persMaxChars: '',
  });
  const [hydrated, setHydrated] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState('');
  const [activeTabEditor, setActiveTabEditor] = useState<'installment' | 'delivery' | 'faq'>('delivery');

  // Marka combobox durumu
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Ürün listeden yüklenince formu bir kez doldur
  useEffect(() => {
    if (hydrated) return;
    if (productId || duplicateId) {
      if (!product) return;
    }
    setFormData({
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      sku: product?.sku || '',
      basePrice: product?.basePrice || '',
      categoryId: product?.categoryId || '',
      categoryIds:
        product?.categoryIds || (product?.categoryId ? [product.categoryId] : []),
      images: product?.images || [],
      availableColors: product?.availableColors || [],
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      isNew: product?.isNew ?? false,
      initialStock: '',
      brand: product?.brand || '',
      specs: (product?.specs || {}) as Record<string, string>,
      tabDelivery: (product as any)?.tabDelivery ?? null,
      tabFaq: (product as any)?.tabFaq ?? null,
      tabInstallmentNote: (product as any)?.tabInstallmentNote || '',
      persEnabled: !!(product as any)?.personalization?.enabled,
      persFee: (product as any)?.personalization?.fee || '',
      persLabel: (product as any)?.personalization?.label || '',
      persMaxChars: (product as any)?.personalization?.maxChars
        ? String((product as any).personalization.maxChars)
        : '',
    });
    setColorInput(
      product?.availableColors?.[0]?.name
        ? toTurkishUpper(product.availableColors[0].name)
        : '',
    );
    setHydrated(true);
  }, [hydrated, product, productId, duplicateId]);

  // Varyantlar
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(!productId);
  const [variantLoadError, setVariantLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setVariantRows([]);
      setVariantsLoaded(true);
      setVariantLoadError(null);
      return;
    }
    let cancelled = false;
    setVariantsLoaded(false);
    setVariantLoadError(null);
    fetch(`/api/products/${productId}/variants`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('load-failed');
        const data = await res.json();
        if (cancelled) return;
        setVariantRows(
          (data as any[]).map((v) => ({
            id: v.id,
            size: v.size || '',
            color: v.color || '',
            sku: v.sku || '',
            price: v.price != null ? String(v.price) : '',
            stock: v.stock != null ? String(v.stock) : '0',
            isActive: v.isActive !== false,
          })),
        );
        setVariantsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Yüklenemezse varyantlar payload'a eklenmez → sunucu mevcut
        // varyantlara dokunmaz (yanlışlıkla silinmesin).
        setVariantLoadError('Varyantlar yüklenemedi. Kaydederseniz mevcut varyantlar değiştirilmeden korunur.');
        setVariantsLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const addVariantRow = () => {
    setVariantRows((prev) => [
      ...prev,
      { size: '', color: '', sku: '', price: '', stock: '0', isActive: true },
    ]);
  };
  const updateVariantRow = (index: number, patch: Partial<VariantRow>) => {
    setVariantRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const removeVariantRow = (index: number) => {
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Product>) => {
      const method = payload.id ? 'PATCH' : 'POST';
      const url = payload.id ? `/api/admin/products/${payload.id}` : '/api/admin/products';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ürün kaydedilemedi');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setLocation('/toov-admin?tab=products');
    },
  });

  const regenerateSlug = () => {
    setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragStartIndex(index);
  };
  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };
  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragStartIndex === null || dragStartIndex === dropIndex) {
      setDragStartIndex(null);
      setDragOverIndex(null);
      return;
    }
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [dragged] = newImages.splice(dragStartIndex, 1);
      newImages.splice(dropIndex, 0, dragged);
      return { ...prev, images: newImages };
    });
    setDragStartIndex(null);
    setDragOverIndex(null);
  };
  const handleImageDragEnd = () => {
    setDragStartIndex(null);
    setDragOverIndex(null);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const promoteImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected);
      return { ...prev, images: newImages };
    });
  };

  const handleGenerateDescription = async () => {
    if (!productId) {
      setGenerateError('Önce ürünü kaydedin, ardından AI açıklama üretin.');
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/generate-description`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || 'Açıklama üretilemedi.');
        return;
      }
      setFormData((prev) => ({ ...prev, description: data.html }));
    } catch {
      setGenerateError('Sunucuya bağlanılamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setUploadError(null);

    let uploadedUrls: string[] = [];

    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const formDataUpload = new FormData();
        pendingFiles.forEach((file) => formDataUpload.append('images', file));

        const response = await fetch('/api/admin/upload/products', {
          method: 'POST',
          body: formDataUpload,
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls = data.urls;
          setPendingFiles([]);
        } else {
          setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const trimmedColor = colorInput.trim();
    const normalizedColors = trimmedColor
      ? [{ name: toTurkishUpper(trimmedColor), hex: null }]
      : [];

    // Varyantlar yalnızca başarıyla yüklendiyse (veya yeni üründe satır
    // eklendiyse) payload'a girer; aksi halde sunucu varyantlara dokunmaz.
    const includeVariants = productId ? variantsLoaded : variantRows.length > 0;

    // Form alanlarından personalization jsonb nesnesi kurulur
    // (kapalıysa null gönderilir; pers* alanları payload'a girmez).
    const { persEnabled, persFee, persLabel, persMaxChars, ...restFormData } = formData;
    const personalization = persEnabled
      ? {
          enabled: true,
          ...(persFee.trim() ? { fee: persFee.trim().replace(',', '.') } : {}),
          ...(persLabel.trim() ? { label: persLabel.trim() } : {}),
          ...(parseInt(persMaxChars, 10) > 0 ? { maxChars: parseInt(persMaxChars, 10) } : {}),
        }
      : null;

    saveMutation.mutate({
      ...product,
      ...restFormData,
      personalization,
      slug: formData.slug || generateSlug(formData.name),
      images: [...formData.images, ...uploadedUrls],
      availableColors: normalizedColors,
      ...(includeVariants
        ? {
            variants: variantRows.map((r) => ({
              id: r.id,
              size: r.size.trim() || null,
              color: r.color.trim() || null,
              sku: r.sku.trim() || null,
              price: r.price.trim() || null,
              stock: parseInt(r.stock, 10) || 0,
              isActive: r.isActive,
            })),
          }
        : {}),
    } as Partial<Product>);
  };

  const isValid =
    !!formData.name.trim() && !!formData.basePrice.trim() && formData.categoryIds.length > 0;
  const isSaving = saveMutation.isPending;
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : null;
  const totalImageCount = formData.images.length + pendingFiles.length;

  const previewImages = useMemo(
    () => [
      ...formData.images.map((url) => ({ url, isPending: false })),
      ...pendingPreviewUrls.map((url) => ({ url, isPending: true })),
    ],
    [formData.images, pendingPreviewUrls],
  );
  const mainPreview = previewImages.find((i) => !isVideoUrl(i.url)) || previewImages[0];

  const goBack = () => setLocation('/toov-admin?tab=products');

  if (userLoading || (!!adminUser && productsLoading && (productId || duplicateId))) {
    return (
      <div className="admin-font min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingState label="Ürün yükleniyor…" />
      </div>
    );
  }

  if (productNotFound) {
    return (
      <div className="admin-font min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4 px-4">
        <Package className="w-10 h-10 text-neutral-300" />
        <p className="text-[14px] text-neutral-600">Ürün bulunamadı veya silinmiş olabilir.</p>
        <SecondaryButton onClick={goBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Ürün Listesine Dön
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="admin-font min-h-screen bg-neutral-50" data-testid="page-product-edit">
      {/* Yapışkan üst bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center shrink-0"
            aria-label="Geri"
            data-testid="button-back-to-products"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[15px] font-semibold text-neutral-900 truncate">
                {productId ? formData.name || 'Ürün Düzenle' : 'Yeni Ürün'}
              </h1>
              {productId ? (
                formData.isActive ? (
                  <StatusBadge tone="emerald">Aktif</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Pasif</StatusBadge>
                )
              ) : (
                <StatusBadge tone="blue">{duplicateId ? 'Kopya' : 'Taslak'}</StatusBadge>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 truncate">
              {formData.sku ? `SKU: ${formData.sku}` : productId ? 'Ürün düzenleme' : 'Tüm bilgileri doldurun ve kaydedin'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {productId && formData.slug && (
              <GhostButton
                onClick={() => window.open(`/urun/${formData.slug}`, '_blank', 'noopener,noreferrer')}
                data-testid="button-view-on-store"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mağazada Gör</span>
              </GhostButton>
            )}
            <PrimaryButton
              onClick={() => handleSubmit()}
              disabled={isSaving || isUploading || !isValid}
              data-testid="button-save-product"
            >
              {isSaving || isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isUploading ? 'Yükleniyor…' : isSaving ? 'Kaydediliyor…' : 'Kaydet'}
            </PrimaryButton>
          </div>
        </div>
        {!isValid && (
          <div className="bg-amber-50 border-t border-amber-100">
            <p className="max-w-[1200px] mx-auto px-4 sm:px-6 py-1.5 text-[11px] text-amber-700">
              Kaydetmek için ürün adı, fiyat ve en az bir kategori gerekli.
            </p>
          </div>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start"
      >
        {/* Sol sütun - ana içerik */}
        <div className="space-y-5 min-w-0">
          {saveError && <InlineAlert tone="error">{saveError}</InlineAlert>}

          <SectionCard
            icon={FileText}
            title="Temel Bilgiler"
            description="Mağazada görünen başlık, kod ve URL adresi"
            testId="card-basic-info"
          >
            <div className="space-y-3">
              <FormField label="Ürün Adı" required>
                <TextInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Örn: El Yapımı Avcı Bıçağı"
                  data-testid="input-product-name"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Stok Kodu (SKU)">
                  <TextInput
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Örn: HNK-001"
                    data-testid="input-product-sku"
                  />
                </FormField>
                <FormField label="Marka" hint="Listeden seçin veya serbest metin girin">
                  <div className="relative">
                    <input
                      type="text"
                      value={brandDropdownOpen ? brandSearch : formData.brand}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBrandSearch(v);
                        setFormData({ ...formData, brand: v });
                        setBrandDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setBrandSearch(formData.brand);
                        setBrandDropdownOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setBrandDropdownOpen(false), 150)}
                      placeholder="Örn: Sepetzen"
                      data-testid="input-product-brand"
                      className="w-full h-9 px-3 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-500"
                      autoComplete="off"
                    />
                    {brandDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {brandsData
                          .filter(
                            (b) =>
                              b.isActive &&
                              b.name.toLowerCase().includes((brandSearch || '').toLowerCase()),
                          )
                          .map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-[13px] text-neutral-800 hover:bg-neutral-50 transition-colors"
                              onMouseDown={() => {
                                setFormData({ ...formData, brand: b.name });
                                setBrandDropdownOpen(false);
                              }}
                            >
                              {b.name}
                            </button>
                          ))}
                        {brandsData.filter(
                          (b) =>
                            b.isActive &&
                            b.name.toLowerCase().includes((brandSearch || '').toLowerCase()),
                        ).length === 0 && (
                          <div className="px-3 py-2 text-[12px] text-neutral-500">
                            {brandSearch ? (
                              <span>"{brandSearch}" serbest metin olarak kaydedilecek. <a href="/toov-admin?tab=brands" target="_blank" className="text-neutral-700 underline">Markalar sekmesinden ekleyin.</a></span>
                            ) : (
                              'Marka yok — listeden seçin veya serbest metin girin.'
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormField>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-medium text-neutral-700">URL Slug</label>
                  <button
                    type="button"
                    onClick={regenerateSlug}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
                    data-testid="button-regenerate-slug"
                  >
                    <RefreshCw className="w-3 h-3" />
                    İsimden Oluştur
                  </button>
                </div>
                <TextInput
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  placeholder="urun-adi-slug"
                  data-testid="input-product-slug"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  /urun/<span className="text-neutral-700">{formData.slug || 'slug'}</span>
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={ImageIcon}
            title="Görseller ve Videolar"
            description="İlk görsel ana ürün fotoğrafıdır - sürükleyerek sıralayın"
            actions={
              totalImageCount > 0 ? (
                <span className="text-[11px] text-neutral-500 tabular-nums shrink-0 mt-1">
                  {totalImageCount} medya
                </span>
              ) : undefined
            }
            testId="card-images"
          >
            {uploadError && (
              <div className="mb-3">
                <InlineAlert tone="error">{uploadError}</InlineAlert>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
                data-testid="input-product-images"
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                <p className="text-[13px] text-neutral-700">
                  Sürükleyip bırakın veya{' '}
                  <span className="text-neutral-900 font-medium underline underline-offset-2">
                    seçin
                  </span>
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Resim: PNG, JPG, WEBP · Video: MP4, WebM, MOV · max 200MB
                </p>
              </label>
            </div>

            {totalImageCount > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {formData.images.map((image, index) => (
                  <div
                    key={`existing-${index}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDrop={(e) => handleImageDrop(e, index)}
                    onDragEnd={handleImageDragEnd}
                    className={`relative group aspect-square bg-neutral-50 rounded-lg overflow-hidden border transition-all select-none ${
                      index === 0 ? 'border-neutral-900' : 'border-neutral-200'
                    } ${dragStartIndex === index ? 'opacity-40 scale-95' : ''}${
                      dragOverIndex === index && dragStartIndex !== index
                        ? ' ring-2 ring-neutral-800 ring-offset-1'
                        : ''
                    }`}
                  >
                    <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <div className="w-5 h-5 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center shadow-sm">
                        <GripVertical className="w-3 h-3 text-neutral-500" />
                      </div>
                    </div>

                    {isVideoUrl(image) ? (
                      <video src={image} className="w-full h-full object-cover" muted loop preload="metadata" draggable={false} />
                    ) : (
                      <img
                        src={image}
                        alt={`Ürün ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => !dragStartIndex && promoteImage(index)}
                        title={index === 0 ? 'Ana fotoğraf' : 'Ana fotoğraf olarak ayarla'}
                        draggable={false}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-neutral-900 text-white text-[9px] font-medium uppercase tracking-wide leading-none">
                        {isVideoUrl(image) ? 'Video · Ana' : 'Ana'}
                      </span>
                    ) : isVideoUrl(image) ? (
                      <span className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-neutral-700 text-white text-[9px] font-medium uppercase tracking-wide leading-none">
                        Video
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => promoteImage(index)}
                        className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-white border border-neutral-200 text-neutral-700 text-[9px] font-medium leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-50"
                      >
                        Ana Yap
                      </button>
                    )}
                  </div>
                ))}

                {pendingFiles.map((file, index) => (
                  <div
                    key={`pending-${index}`}
                    className="relative group aspect-square bg-neutral-50 rounded-lg overflow-hidden border border-dashed border-neutral-300"
                  >
                    {file.type.startsWith('video/') ? (
                      <video src={pendingPreviewUrls[index] ?? ''} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <img src={pendingPreviewUrls[index] ?? ''} alt={`Yeni ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-neutral-600 text-white text-[9px] font-medium uppercase tracking-wide leading-none">
                      {file.type.startsWith('video/') ? 'Video' : 'Yeni'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            title="Açıklama"
            description="Ürün detay sayfasında gösterilir, HTML destekler"
            actions={
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGenerating || !productId}
                title={!productId ? 'Önce ürünü kaydedin' : 'AI ile açıklama üret'}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-neutral-300 text-neutral-800 hover:bg-neutral-100 shrink-0"
                data-testid="button-generate-description"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {isGenerating ? 'Üretiliyor…' : 'AI Açıklama'}
              </button>
            }
            testId="card-description"
          >
            {generateError && (
              <div className="mb-2">
                <InlineAlert tone="error">{generateError}</InlineAlert>
              </div>
            )}
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              placeholder="Ürün açıklaması (HTML destekler)…"
              className="font-mono text-[12px]"
              data-testid="input-product-description"
            />
            {formData.description && formData.description.includes('<') && (
              <div className="mt-2">
                <p className="text-[11px] text-neutral-500 mb-1">Önizleme:</p>
                <div
                  className="p-3 bg-neutral-50 border border-neutral-200 rounded-md text-[13px] text-neutral-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.description }}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Settings2}
            title="Teknik Özellikler"
            description="Doldurulan alanlar ürün sayfasındaki özellik tablosunda görünür"
            testId="card-specs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ['urunCinsi', 'Ürün Cinsi', 'Örn: Avcı Bıçağı'],
                ['tamUzunluk', 'Tam Uzunluk', 'Örn: 26 cm'],
                ['namluUzunlugu', 'Namlu Uzunluğu', 'Örn: 13 cm'],
                ['etKalinligi', 'Et Kalınlığı', 'Örn: 4 mm'],
                ['agirlik', 'Ağırlık', 'Örn: 220 g'],
                ['celikCinsi', 'Çelik Cinsi', 'Örn: 4116 Paslanmaz Çelik'],
                ['sapCinsi', 'Sap Cinsi', 'Örn: Ceviz Ağacı'],
              ] as [string, string, string][]).map(([key, label, placeholder]) => (
                <FormField key={key} label={label}>
                  <TextInput
                    type="text"
                    value={formData.specs[key] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specs: { ...formData.specs, [key]: e.target.value },
                      })
                    }
                    placeholder={placeholder}
                    data-testid={`input-product-spec-${key}`}
                  />
                </FormField>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={Layers}
            title="Varyantlar"
            description={
              productId
                ? 'Beden, renk, SKU, fiyat ve stok satır satır düzenlenir. Fiyat boşsa ürün fiyatı geçerlidir.'
                : 'Varyant eklemezseniz tek stok değerli basit ürün oluşturulur.'
            }
            actions={
              <SecondaryButton
                type="button"
                onClick={addVariantRow}
                disabled={!!productId && !variantsLoaded}
                data-testid="button-add-variant"
              >
                + Varyant Ekle
              </SecondaryButton>
            }
            testId="card-variants"
          >
            {variantLoadError && (
              <div className="mb-2">
                <InlineAlert tone="warning">{variantLoadError}</InlineAlert>
              </div>
            )}
            {variantRows.length === 0 ? (
              <p className="text-[12px] text-neutral-500 py-1">
                {productId
                  ? variantsLoaded
                    ? 'Bu üründe varyant yok.'
                    : 'Varyantlar yükleniyor…'
                  : 'Henüz varyant eklenmedi. Basit ürünler için gerekmez.'}
              </p>
            ) : (
              <div className="space-y-2" data-testid="list-variant-rows">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_90px_80px_60px_32px] gap-2 px-1 text-[10px] uppercase tracking-wide text-neutral-400 font-medium">
                  <span>Beden</span>
                  <span>Renk</span>
                  <span>SKU</span>
                  <span>Fiyat (₺)</span>
                  <span>Stok</span>
                  <span>Aktif</span>
                  <span />
                </div>
                {variantRows.map((row, i) => (
                  <div
                    key={row.id || `new-${i}`}
                    className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_90px_80px_60px_32px] gap-2 items-center rounded-lg border border-neutral-200 bg-neutral-50/50 p-2"
                    data-testid={`row-variant-${i}`}
                  >
                    <TextInput
                      value={row.size}
                      onChange={(e) => updateVariantRow(i, { size: e.target.value })}
                      placeholder="Beden"
                      data-testid={`input-variant-size-${i}`}
                    />
                    <TextInput
                      value={row.color}
                      onChange={(e) => updateVariantRow(i, { color: e.target.value })}
                      placeholder="Renk"
                      data-testid={`input-variant-color-${i}`}
                    />
                    <TextInput
                      value={row.sku}
                      onChange={(e) => updateVariantRow(i, { sku: e.target.value })}
                      placeholder="SKU (ops.)"
                      data-testid={`input-variant-sku-${i}`}
                    />
                    <TextInput
                      value={row.price}
                      onChange={(e) => updateVariantRow(i, { price: e.target.value })}
                      placeholder={formData.basePrice || 'Ürün fiyatı'}
                      data-testid={`input-variant-price-${i}`}
                    />
                    <TextInput
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => updateVariantRow(i, { stock: e.target.value })}
                      placeholder="0"
                      data-testid={`input-variant-stock-${i}`}
                    />
                    <label className="flex items-center justify-center gap-1 text-[11px] text-neutral-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => updateVariantRow(i, { isActive: e.target.checked })}
                        className="w-4 h-4 rounded"
                        data-testid={`checkbox-variant-active-${i}`}
                      />
                      <span className="sm:hidden">Aktif</span>
                    </label>
                    <IconButton
                      type="button"
                      onClick={() => removeVariantRow(i)}
                      disabled={!!productId && variantRows.length === 1}
                      aria-label="Varyantı sil"
                      data-testid={`button-remove-variant-${i}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                ))}
                {!!productId && variantRows.length === 1 && (
                  <p className="text-[11px] text-neutral-500">
                    Üründe en az bir varyant kalmalı. Basit ürünlerde beden/renk alanlarını boş bırakın.
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Ürün Detay Sekmeleri ── */}
          <SectionCard
            icon={TabLinesIcon}
            title="Ürün Detay Sekmeleri"
          >
            {/* Sekme seçici */}
            <div className="flex border-b border-neutral-200 mb-5 -mx-1">
              {([
                { id: 'installment', label: 'Taksit Seçenekleri' },
                { id: 'delivery', label: 'Teslimat ve İade' },
                { id: 'faq', label: 'Sık Sorulan Sorular' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTabEditor(t.id)}
                  className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTabEditor === t.id
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Taksit Seçenekleri */}
            {activeTabEditor === 'installment' && (
              <div className="space-y-3">
                <p className="text-[11.5px] text-neutral-500">
                  Taksit tablosu fiyat üzerinden otomatik hesaplanır. Aşağıdaki açıklama notu değiştirilebilir.
                </p>
                <label className="block text-[12px] font-medium text-neutral-600 mb-1">Taksit Açıklama Notu</label>
                <textarea
                  rows={3}
                  value={formData.tabInstallmentNote}
                  onChange={(e) => setFormData((p) => ({ ...p, tabInstallmentNote: e.target.value }))}
                  placeholder={tabDefaults?.tabInstallmentNote || BUILTIN_INSTALLMENT_NOTE}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-[13px] text-neutral-900 bg-neutral-50 focus:outline-none focus:border-neutral-400 resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-neutral-400">Boş bırakırsanız varsayılan metin gösterilir.</p>
                  <button
                    type="button"
                    onClick={() => saveTabDefault('installment')}
                    disabled={savingDefault === 'installment'}
                    className="text-[11.5px] text-neutral-400 hover:text-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    {savedDefaultFlash === 'installment' ? '✓ Varsayılan kaydedildi' : savingDefault === 'installment' ? 'Kaydediliyor…' : 'Varsayılan olarak kaydet'}
                  </button>
                </div>
              </div>
            )}

            {/* Teslimat ve İade */}
            {activeTabEditor === 'delivery' && (() => {
              // Öncelik: ürüne özel değer → kayıtlı varsayılan → yerleşik şablon
              const defaultSections = tabDefaults?.tabDelivery ?? BUILTIN_TAB_DELIVERY;
              const sections = formData.tabDelivery ?? defaultSections;
              const updateSections = (next: typeof sections) =>
                setFormData((p) => ({ ...p, tabDelivery: next }));

              return (
                <div className="space-y-6">
                  {sections.map((sec, si) => (
                    <div key={si} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                        <input
                          value={sec.title}
                          onChange={(e) => {
                            const next = sections.map((s, i) => i === si ? { ...s, title: e.target.value } : s);
                            updateSections(next);
                          }}
                          className="flex-1 text-[12px] font-semibold text-neutral-700 bg-transparent border-none outline-none"
                          placeholder="Bölüm başlığı"
                        />
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => updateSections(sections.filter((_, i) => i !== si))}
                            className="text-red-400 hover:text-red-600 text-[11px]"
                          >
                            Bölümü Sil
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {sec.rows.map((row, ri) => (
                          <div key={ri} className="flex items-center gap-2 px-4 py-2">
                            <input
                              value={row.key}
                              onChange={(e) => {
                                const next = sections.map((s, i) =>
                                  i !== si ? s : {
                                    ...s,
                                    rows: s.rows.map((r, j) => j === ri ? { ...r, key: e.target.value } : r),
                                  }
                                );
                                updateSections(next);
                              }}
                              className="w-36 text-[12px] text-neutral-500 bg-transparent border-none outline-none shrink-0"
                              placeholder="Etiket"
                            />
                            <input
                              value={row.value}
                              onChange={(e) => {
                                const next = sections.map((s, i) =>
                                  i !== si ? s : {
                                    ...s,
                                    rows: s.rows.map((r, j) => j === ri ? { ...r, value: e.target.value } : r),
                                  }
                                );
                                updateSections(next);
                              }}
                              className="flex-1 text-[13px] text-neutral-900 bg-transparent border-none outline-none"
                              placeholder="Değer"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = sections.map((s, i) =>
                                  i !== si ? s : { ...s, rows: s.rows.filter((_, j) => j !== ri) }
                                );
                                updateSections(next);
                              }}
                              className="text-neutral-300 hover:text-red-400 transition-colors px-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = sections.map((s, i) =>
                                i !== si ? s : { ...s, rows: [...s.rows, { key: '', value: '' }] }
                              );
                              updateSections(next);
                            }}
                            className="text-[11.5px] text-neutral-400 hover:text-neutral-700"
                          >
                            + Satır Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateSections([...sections, { title: 'Yeni Bölüm', rows: [{ key: '', value: '' }] }])}
                    className="text-[12px] text-neutral-400 hover:text-neutral-700 border border-dashed border-neutral-200 rounded-lg px-4 py-2.5 w-full"
                  >
                    + Bölüm Ekle
                  </button>
                  {/* Varsayılan olarak kaydet */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => saveTabDefault('delivery')}
                      disabled={savingDefault === 'delivery'}
                      className="text-[11.5px] text-neutral-400 hover:text-neutral-700 disabled:opacity-50 transition-colors"
                    >
                      {savedDefaultFlash === 'delivery' ? '✓ Varsayılan kaydedildi' : savingDefault === 'delivery' ? 'Kaydediliyor…' : 'Varsayılan olarak kaydet'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Sık Sorulan Sorular */}
            {activeTabEditor === 'faq' && (() => {
              const defaultItems = tabDefaults?.tabFaq ?? BUILTIN_TAB_FAQ;
              const items = formData.tabFaq ?? defaultItems;
              const updateItems = (next: typeof items) =>
                setFormData((p) => ({ ...p, tabFaq: next }));

              return (
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="flex items-start gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                        <span className="text-[11px] text-neutral-400 mt-1 shrink-0 font-mono">S:</span>
                        <input
                          value={item.q}
                          onChange={(e) => updateItems(items.map((it, j) => j === i ? { ...it, q: e.target.value } : it))}
                          className="flex-1 text-[13px] font-semibold text-neutral-800 bg-transparent border-none outline-none"
                          placeholder="Soru"
                        />
                        <button
                          type="button"
                          onClick={() => updateItems(items.filter((_, j) => j !== i))}
                          className="text-neutral-300 hover:text-red-400 transition-colors mt-0.5"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex items-start gap-2 px-4 py-3">
                        <span className="text-[11px] text-neutral-400 mt-0.5 shrink-0 font-mono">C:</span>
                        <textarea
                          rows={2}
                          value={item.a}
                          onChange={(e) => updateItems(items.map((it, j) => j === i ? { ...it, a: e.target.value } : it))}
                          className="flex-1 text-[13px] text-neutral-600 bg-transparent border-none outline-none resize-none"
                          placeholder="Cevap"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateItems([...items, { q: '', a: '' }])}
                    className="text-[12px] text-neutral-400 hover:text-neutral-700 border border-dashed border-neutral-200 rounded-lg px-4 py-2.5 w-full"
                  >
                    + Soru-Cevap Ekle
                  </button>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => saveTabDefault('faq')}
                      disabled={savingDefault === 'faq'}
                      className="text-[11.5px] text-neutral-400 hover:text-neutral-700 disabled:opacity-50 transition-colors"
                    >
                      {savedDefaultFlash === 'faq' ? '✓ Varsayılan kaydedildi' : savingDefault === 'faq' ? 'Kaydediliyor…' : 'Varsayılan olarak kaydet'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </SectionCard>
        </div>

        {/* Sağ sütun - özet ve ayarlar */}
        <div className="space-y-5 lg:sticky lg:top-[72px]">
          {/* Mini önizleme */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="aspect-[4/3] bg-neutral-100">
              {mainPreview?.url && !isVideoUrl(mainPreview.url) ? (
                <img src={mainPreview.url} alt="Önizleme" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <Package className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                {formData.sku || 'SKU'}
              </p>
              <h3 className="text-[14px] font-semibold text-neutral-900 leading-snug mt-0.5 line-clamp-2">
                {formData.name || 'Ürün Adı'}
              </h3>
              <p className="text-[16px] font-semibold text-neutral-900 mt-1 tabular-nums">
                {formData.basePrice
                  ? `${parseFloat(formData.basePrice).toLocaleString('tr-TR')} ₺`
                  : '0 ₺'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {formData.isActive ? (
                  <StatusBadge tone="emerald">Aktif</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Pasif</StatusBadge>
                )}
                {formData.isFeatured && <StatusBadge tone="indigo">Öne çıkan</StatusBadge>}
                {formData.isNew && <StatusBadge tone="blue">Yeni</StatusBadge>}
              </div>
            </div>
          </div>

          {/* Fiyat & stok */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-[13px] font-semibold text-neutral-900 mb-3">Fiyat ve Stok</h2>
            <div className="space-y-3">
              <FormField label="Fiyat (₺)" required>
                <TextInput
                  type="text"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  required
                  placeholder="Örn: 1490"
                  data-testid="input-product-price"
                />
              </FormField>
              {!productId && variantRows.length === 0 && (
                <FormField label="Başlangıç Stoğu" hint="Otomatik oluşturulan varyanta atanır.">
                  <TextInput
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    placeholder="Örn: 10"
                    min="0"
                    data-testid="input-product-stock"
                  />
                </FormField>
              )}
              {(productId || variantRows.length > 0) && (
                <p className="text-[11px] text-neutral-500">
                  Stok, Varyantlar bölümünden yönetilir.
                </p>
              )}
            </div>
          </div>

          {/* Kişiselleştirme (isim yazdırma) */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[13px] font-semibold text-neutral-900">Kişiselleştirme</h2>
              <button
                type="button"
                role="switch"
                aria-checked={formData.persEnabled}
                onClick={() => setFormData({ ...formData, persEnabled: !formData.persEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  formData.persEnabled ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
                data-testid="switch-personalization"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    formData.persEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mb-3">
              Müşteri ürüne yazdırılacak bir isim girebilir; ek ücret fiyata eklenir.
            </p>
            {formData.persEnabled && (
              <div className="space-y-3">
                <FormField label="Ek Ücret (₺)" hint="Boş bırakılırsa ücretsizdir.">
                  <TextInput
                    type="number"
                    value={formData.persFee}
                    onChange={(e) => setFormData({ ...formData, persFee: e.target.value })}
                    placeholder="Örn: 150"
                    min="0"
                    step="0.01"
                    data-testid="input-personalization-fee"
                  />
                </FormField>
                <FormField label="Alan Etiketi" hint='Boşsa "Yazdırılacak isim" gösterilir.'>
                  <TextInput
                    type="text"
                    value={formData.persLabel}
                    onChange={(e) => setFormData({ ...formData, persLabel: e.target.value })}
                    placeholder="Örn: Bıçağa yazdırılacak isim"
                    data-testid="input-personalization-label"
                  />
                </FormField>
                <FormField label="Maks. Karakter" hint="Boşsa 30 kullanılır.">
                  <TextInput
                    type="number"
                    value={formData.persMaxChars}
                    onChange={(e) => setFormData({ ...formData, persMaxChars: e.target.value })}
                    placeholder="30"
                    min="1"
                    data-testid="input-personalization-maxchars"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* Kategoriler */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-[13px] font-semibold text-neutral-900 mb-1">Kategoriler</h2>
            <p className="text-[11px] text-neutral-500 mb-3">
              {formData.categoryIds.length === 0
                ? 'En az bir kategori seçin.'
                : `${formData.categoryIds.length} kategori seçili`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const selected = formData.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      const newIds = selected
                        ? formData.categoryIds.filter((id) => id !== cat.id)
                        : [...formData.categoryIds, cat.id];
                      setFormData({
                        ...formData,
                        categoryIds: newIds,
                        categoryId: newIds[0] || '',
                      });
                    }}
                    className={`px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors border ${
                      selected
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Görünürlük */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="divide-y divide-neutral-100">
              <Toggle
                checked={formData.isActive}
                onChange={(v) => setFormData({ ...formData, isActive: v })}
                label="Aktif"
                hint="Pasif ürünler mağazada görünmez."
                testId="toggle-product-active"
              />
              <Toggle
                checked={formData.isFeatured}
                onChange={(v) => setFormData({ ...formData, isFeatured: v })}
                label="Öne Çıkan"
                hint="Anasayfada öne çıkanlara eklenir."
                testId="toggle-product-featured"
              />
              <Toggle
                checked={formData.isNew}
                onChange={(v) => setFormData({ ...formData, isNew: v })}
                label="Yeni Rozeti"
                hint='Ürün kartında "Yeni" rozeti gösterilir.'
                testId="toggle-product-new"
              />
            </div>
          </div>

          {/* Renk / taş tonu */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-[13px] font-semibold text-neutral-900 mb-3">Renk / Ton</h2>
            <TextInput
              value={colorInput}
              onChange={(e) => setColorInput(toTurkishUpper(e.target.value))}
              placeholder="Örn: SİYAH, CEVİZ"
              data-testid="input-product-color"
            />
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Opsiyonel. Boş bırakılırsa renksiz tek varyant oluşturulur.
            </p>
          </div>

          {/* Alt kaydet - mobilde üst bar görünmez olabildiği için */}
          <div className="lg:hidden flex gap-2">
            <GhostButton type="button" onClick={goBack} className="flex-1">
              İptal
            </GhostButton>
            <PrimaryButton
              type="submit"
              disabled={isSaving || isUploading || !isValid}
              className="flex-1"
            >
              {(isSaving || isUploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isUploading ? 'Yükleniyor…' : isSaving ? 'Kaydediliyor…' : 'Kaydet'}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}

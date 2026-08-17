import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Upload,
  Loader2,
  Package,
  Eye,
  Trash2,
  RefreshCw,
  Wand2,
  GripVertical,
} from 'lucide-react';
import type { Product, ProductDraft, Category } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
  SectionHeading,
  TextInput,
  TextArea,
  FormField,
  InlineAlert,
  StatusBadge,
} from '../_ui/AdminUI';

/** Video URL tespiti - yüklenen medya grid'inde img/video seçimi için */
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(url);
}

// Türkçe-uyumlu büyük harf dönüşümü: i → İ, ı → I, vs.
function toTurkishUpper(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

function generateSlug(name: string) {
  const turkishMap: Record<string, string> = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
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
export interface VariantRow {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
  isActive: boolean;
}

export default function ProductModal({
  product,
  categories,
  onClose,
  onSave,
  isSaving,
  saveError,
}: {
  product: Product | ProductDraft | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  isSaving: boolean;
  saveError?: string | null;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    sku: product?.sku || '',
    basePrice: product?.basePrice || '',
    categoryId: product?.categoryId || '',
    categoryIds:
      product?.categoryIds || (product?.categoryId ? [product.categoryId] : ([] as string[])),
    images: product?.images || ([] as string[]),
    availableColors: product?.availableColors || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    initialStock: '',
    brand: product?.brand || '',
    specs: (product?.specs || {}) as Record<string, string>,
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Sürükle-bırak sıralama state'i
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [colorInput, setColorInput] = useState<string>(
    formData.availableColors[0]?.name ? toTurkishUpper(formData.availableColors[0].name) : '',
  );
  const [previewImage, setPreviewImage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Varyant yönetimi: mevcut üründe varyantlar yüklenir ve form onları
  // açıkça yönetir; yeni üründe admin isterse varyant ekler, eklemezse
  // eski basit akış (başlangıç stoğu + otomatik tek varyant) korunur.
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(!product?.id);
  const [variantLoadError, setVariantLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.id) {
      setVariantRows([]);
      setVariantsLoaded(true);
      setVariantLoadError(null);
      return;
    }
    let cancelled = false;
    setVariantsLoaded(false);
    setVariantLoadError(null);
    fetch(`/api/products/${product.id}/variants`, { credentials: 'include' })
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
  }, [product?.id]);

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

  useEffect(() => {
    setFormData({
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      sku: product?.sku || '',
      basePrice: product?.basePrice || '',
      categoryId: product?.categoryId || '',
      categoryIds:
        product?.categoryIds || (product?.categoryId ? [product.categoryId] : ([] as string[])),
      images: product?.images || ([] as string[]),
      availableColors: product?.availableColors || [],
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      isNew: product?.isNew ?? false,
      initialStock: '',
      brand: product?.brand || '',
      specs: (product?.specs || {}) as Record<string, string>,
    });
    setPendingFiles([]);
    setUploadError(null);
    setPreviewImage(0);
    setColorInput(
      product?.availableColors?.[0]?.name
        ? toTurkishUpper(product.availableColors[0].name)
        : '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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
    // Resim VE video dosyaları kabul edilir
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    setPendingFiles((prev) => [...prev, ...files]);
  };

  // Sürükle-bırak sıralama handler'ları (mevcut yüklü görseller için)
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
    setPreviewImage(0);
  };

  const handleGenerateDescription = async () => {
    if (!product?.id) {
      setGenerateError('Önce ürünü kaydedin, ardından AI açıklama üretin.');
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/generate-description`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || 'Açıklama üretilemedi.');
        return;
      }
      setFormData((prev) => ({ ...prev, description: data.html }));
    } catch (err) {
      setGenerateError('Sunucuya bağlanılamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const includeVariants = product?.id ? variantsLoaded : variantRows.length > 0;

    onSave({
      ...product,
      ...formData,
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
  const totalImageCount = formData.images.length + pendingFiles.length;
  const previewImages = useMemo(() => {
    const list = [
      ...formData.images.map((url) => ({ url, isPending: false })),
      ...pendingPreviewUrls.map((url) => ({ url, isPending: true })),
    ];
    return list;
  }, [formData.images, pendingPreviewUrls]);

  return (
    <AdminModal
      open
      onClose={onClose}
      title={product?.id ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
      description={
        product?.id
          ? `${product.name || 'Ürün'}${product.sku ? ` · ${product.sku}` : ''}`
          : 'Tüm bilgileri doldurun ve kaydedin.'
      }
      size="xl"
      testId="modal-product"
      headerActions={
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={`hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition-colors border ${
            showPreview
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          }`}
          data-testid="button-toggle-preview"
        >
          <Eye className="w-3.5 h-3.5" />
          Önizleme
        </button>
      }
      footer={
        <>
          <p className="mr-auto text-[12px] text-neutral-500 hidden sm:block">
            {!isValid ? (
              <span className="text-amber-700">Ürün adı, fiyat ve en az bir kategori gerekli.</span>
            ) : pendingFiles.length > 0 ? (
              <span>
                {pendingFiles.length} resim kaydederken yüklenecek
              </span>
            ) : (
              <span>Tüm değişiklikler kaydedilecek</span>
            )}
          </p>
          <GhostButton type="button" onClick={onClose}>
            İptal
          </GhostButton>
          <PrimaryButton
            type="submit"
            form="product-form"
            disabled={isSaving || isUploading || !isValid}
            data-testid="button-save-product"
          >
            {(isSaving || isUploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isUploading ? 'Yükleniyor…' : isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </PrimaryButton>
        </>
      }
    >
      <div className={`flex ${showPreview ? 'flex-row gap-6' : 'flex-col'}`}>
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className={`space-y-6 ${showPreview ? 'flex-1 min-w-0' : 'w-full'}`}
        >
          {saveError && <InlineAlert tone="error">{saveError}</InlineAlert>}

          {/* Section 1 - Temel Bilgiler */}
          <section>
            <SectionHeading
              number={1}
              title="Temel Bilgiler"
              description="Mağazada görünen başlık, kod ve URL adresini ayarlayın."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Ürün Adı" required>
                <TextInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Örn: Anadolu El İşi Bardak Seti"
                  data-testid="input-product-name"
                />
              </FormField>
              <FormField label="Stok Kodu (SKU)">
                <TextInput
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Örn: HNK-001"
                  data-testid="input-product-sku"
                />
              </FormField>
              <FormField label="Marka">
                <TextInput
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Örn: Sepetzen"
                  data-testid="input-product-brand"
                />
              </FormField>
            </div>

            <div className="mt-3">
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
                polenstone.com/urun/<span className="text-neutral-700">{formData.slug || 'slug'}</span>
              </p>
            </div>

            <div className="mt-3">
              <FormField
                label="Kategoriler"
                required
                error={formData.categoryIds.length === 0 ? 'En az bir kategori seçin.' : undefined}
              >
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
              </FormField>
            </div>
          </section>

          {/* Section 2 - Açıklama */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeading number={2} title="Açıklama" />
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGenerating || !product?.id}
                title={!product?.id ? 'Önce ürünü kaydedin' : 'AI ile açıklama üret (Teknik Özellikler Etiket:Değer formatında)'}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-[#141414]/30 text-[#141414] hover:bg-[#141414]/[0.07]"
                data-testid="button-generate-description"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                {isGenerating ? 'Üretiliyor…' : 'AI Açıklama Üret'}
              </button>
            </div>

            {generateError && (
              <div className="mb-2">
                <InlineAlert tone="error">{generateError}</InlineAlert>
              </div>
            )}

            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
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

            {/* Teknik özellik tablosu (ürün detay sayfasında gösterilir) */}
            <div className="mt-5">
              <p className="text-[12px] font-semibold text-neutral-800 mb-1">Teknik Özellik Tablosu</p>
              <p className="text-[11px] text-neutral-500 mb-3">
                Doldurulan alanlar ürün detay sayfasındaki özellik tablosunda görünür. Boş bırakılan satırlar gösterilmez.
              </p>
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
            </div>
          </section>

          {/* Section 3 - Görseller */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeading
                number={3}
                title="Görseller"
                description="İlk görsel, ana ürün fotoğrafı olarak kullanılır."
              />
              {totalImageCount > 0 && (
                <span className="text-[11px] text-neutral-500 tabular-nums">
                  {totalImageCount} görsel
                </span>
              )}
            </div>

            {uploadError && (
              <div className="mb-3">
                <InlineAlert tone="error">{uploadError}</InlineAlert>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                dragOver
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
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
                <p className="text-[11px] text-neutral-500 mt-1">Resim: PNG, JPG, WEBP · Video: MP4, WebM, MOV · max 200MB</p>
              </label>
            </div>

            {totalImageCount > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {formData.images.map((image, index) => (
                  <div
                    key={`existing-${index}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDrop={(e) => handleImageDrop(e, index)}
                    onDragEnd={handleImageDragEnd}
                    className={`relative group aspect-square bg-neutral-50 rounded-md overflow-hidden border transition-all select-none ${
                      index === 0 ? 'border-neutral-900' : 'border-neutral-200'
                    } ${dragStartIndex === index ? 'opacity-40 scale-95' : ''}${
                      dragOverIndex === index && dragStartIndex !== index
                        ? ' ring-2 ring-neutral-800 ring-offset-1'
                        : ''
                    }`}
                  >
                    {/* Sürükleme tutamacı */}
                    <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <div className="w-5 h-5 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center shadow-sm">
                        <GripVertical className="w-3 h-3 text-neutral-500" />
                      </div>
                    </div>

                    {isVideoUrl(image) ? (
                      <video
                        src={image}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        preload="metadata"
                      />
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
                    className="relative group aspect-square bg-neutral-50 rounded-md overflow-hidden border border-neutral-300"
                  >
                    {file.type.startsWith('video/') ? (
                      <video
                        src={pendingPreviewUrls[index] ?? ''}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={pendingPreviewUrls[index] ?? ''}
                        alt={`Yeni ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
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
          </section>

          {/* Section 4 - Renk / Taş Tonu */}
          <section>
            <SectionHeading
              number={4}
              title="Taş Tonu / Renk"
              description="Ürünün taş tonunu belirtin (opsiyonel)."
            />
            <FormField label="Renk (otomatik büyük harf)">
              <TextInput
                value={colorInput}
                onChange={(e) => setColorInput(toTurkishUpper(e.target.value))}
                placeholder="Örn. BEYAZ MERMER, SİYAH ABSOLUTE, BEJ TRAVERTEN"
                data-testid="input-product-color"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Boş bırakılırsa renksiz tek varyant oluşturulur.
              </p>
            </FormField>
          </section>

          {/* Section 5 - Fiyat & Stok */}
          <section>
            <SectionHeading
              number={5}
              title="Fiyat & Stok"
              description={
                product?.id || variantRows.length > 0
                  ? 'Stok, aşağıdaki Varyantlar bölümünden yönetilir.'
                  : 'Yeni ürün için başlangıç stok miktarını girin.'
              }
            />
            <div className={`grid grid-cols-1 sm:${product?.id || variantRows.length > 0 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
              {!product?.id && variantRows.length === 0 && (
                <FormField
                  label="Başlangıç Stoğu"
                  hint="Bu değer otomatik oluşturulan varyanta atanır."
                >
                  <TextInput
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    placeholder="Tüm varyasyonlar için"
                    min="0"
                    data-testid="input-product-stock"
                  />
                </FormField>
              )}
            </div>
          </section>

          {/* Section 6 - Varyantlar */}
          <section>
            <SectionHeading
              number={6}
              title="Varyantlar"
              description={
                product?.id
                  ? 'Beden, renk, SKU, fiyat ve stok satır satır düzenlenir. Fiyat boş bırakılırsa ürün fiyatı kullanılır.'
                  : 'Varyant eklemezseniz tek stok değerli basit ürün oluşturulur.'
              }
            />
            {variantLoadError && (
              <InlineAlert tone="warning">{variantLoadError}</InlineAlert>
            )}
            {variantRows.length > 0 && (
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
                    className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_90px_80px_60px_32px] gap-2 items-center rounded-md border border-neutral-200 bg-white p-2"
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
                      disabled={!!product?.id && variantRows.length === 1}
                      aria-label="Varyantı sil"
                      data-testid={`button-remove-variant-${i}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                ))}
                {!!product?.id && variantRows.length === 1 && (
                  <p className="text-[11px] text-neutral-500">
                    Üründe en az bir varyant kalmalı. Basit ürünlerde beden/renk alanlarını boş bırakın.
                  </p>
                )}
              </div>
            )}
            <div className="mt-2">
              <SecondaryButton
                type="button"
                onClick={addVariantRow}
                disabled={!!product?.id && !variantsLoaded}
                data-testid="button-add-variant"
              >
                + Varyant Ekle
              </SecondaryButton>
            </div>
          </section>

          {/* Section 7 - Görünürlük */}
          <section>
            <SectionHeading
              number={7}
              title="Görünürlük"
              description="Ürünün mağazadaki yerini kontrol edin."
            />
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900">Aktif</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Pasif ürünler mağazada görünmez.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    formData.isActive ? 'bg-neutral-500' : 'bg-neutral-300'
                  }`}
                  aria-pressed={formData.isActive}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      formData.isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900">Öne Çıkan</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Anasayfada öne çıkanlar arasına eklenir.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900 shrink-0"
                />
              </label>
              <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900">Yeni</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Ürün kartında "Yeni" rozeti gösterilir.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900 shrink-0"
                />
              </label>
            </div>
          </section>
        </form>

        {showPreview && (
          <aside className="hidden md:block w-[360px] shrink-0 border-l border-neutral-200 -mr-6 pl-6 pr-0 -my-5 py-5 max-h-[calc(85vh-160px)] overflow-y-auto">
            <div className="sticky top-0 -mt-1 mb-3 bg-white pb-2 z-10">
              <h4 className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Müşteri Görünümü
              </h4>
            </div>

            <div className="space-y-4 pr-6">
              <div className="aspect-[4/5] bg-neutral-50 border border-neutral-200 rounded-md overflow-hidden">
                {previewImages[previewImage]?.url ? (
                  <img
                    src={previewImages[previewImage].url}
                    alt="Önizleme"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <Package className="w-12 h-12" />
                  </div>
                )}
              </div>
              {previewImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {previewImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImage(idx)}
                      className={`w-12 h-14 rounded-md overflow-hidden shrink-0 transition-all border ${
                        previewImage === idx
                          ? 'border-neutral-900'
                          : 'border-neutral-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">
                  {formData.sku || 'SKU'}
                </p>
                <h3 className="text-[16px] font-semibold text-neutral-900 leading-snug">
                  {formData.name || 'Ürün Adı'}
                </h3>
                <p className="text-[18px] font-semibold text-neutral-900 mt-1.5 tabular-nums">
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

              {colorInput.trim() && (
                <div>
                  <p className="text-[12px] text-neutral-500 mb-1.5">
                    Renk:{' '}
                    <span className="text-neutral-900 font-medium tracking-wide">
                      {toTurkishUpper(colorInput.trim())}
                    </span>
                  </p>
                </div>
              )}

              {formData.description && !formData.description.includes('<') && (
                <div>
                  <p className="text-[12px] text-neutral-500 mb-1">Açıklama</p>
                  <p className="text-[12px] text-neutral-700 leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              )}

              <button
                type="button"
                className="w-full h-10 bg-neutral-900 text-white rounded-md font-semibold text-[12px] uppercase tracking-wide opacity-70"
                disabled
              >
                SEPETE EKLE
              </button>

              <p className="text-[11px] text-neutral-500">
                Bu önizleme, müşterilerin ürün sayfasında göreceği görünümü yansıtır.
              </p>
            </div>
          </aside>
        )}
      </div>
    </AdminModal>
  );
}

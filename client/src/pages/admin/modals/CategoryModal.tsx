import { useEffect, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, Loader2, RefreshCw } from 'lucide-react';
import type { Category } from '../_shared/types';
import { sanitizeAdminHtml } from '@/lib/sanitizeHtml';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  SectionHeading,
  FormField,
  TextInput,
  InlineAlert,
} from '../_ui/AdminUI';

const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

function generateSlug(name: string): string {
  return name
    .split('')
    .map((c) => TURKISH_MAP[c] || c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSave: (category: Partial<Category>) => void;
  isSaving: boolean;
}

export default function CategoryModal({
  category,
  onClose,
  onSave,
  isSaving,
}: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    image: category?.image || '',
    displayOrder: category?.displayOrder ?? 0,
    seoTitle: category?.seoTitle || '',
    seoDescription: category?.seoDescription || '',
    contentHtml: category?.contentHtml || '',
  });
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [slugAuto, setSlugAuto] = useState<boolean>(!category);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    setFormData({
      name: category?.name || '',
      slug: category?.slug || '',
      image: category?.image || '',
      displayOrder: category?.displayOrder ?? 0,
      seoTitle: category?.seoTitle || '',
      seoDescription: category?.seoDescription || '',
      contentHtml: category?.contentHtml || '',
    });
    setShowContentPreview(false);
    setSlugAuto(!category);
    setPendingFile(null);
    setUploadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: slugAuto ? generateSlug(value) : prev.slug,
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugAuto(false);
    setFormData((prev) => ({ ...prev, slug: value }));
  };

  const regenerateSlug = () => {
    setSlugAuto(true);
    setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Dosya boyutu 10MB'dan küçük olmalı.");
      return;
    }
    setPendingFile(file);
    setUploadError(null);
    e.target.value = '';
  };

  const removeImage = () => {
    setPendingFile(null);
    setFormData((prev) => ({ ...prev, image: '' }));
  };

  const previewSrc = pendingPreviewUrl || formData.image || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let imageUrl = formData.image;

    if (pendingFile) {
      setIsUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('images', pendingFile);
        const response = await fetch('/api/admin/upload/categories', {
          method: 'POST',
          body: uploadFormData,
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Yükleme başarısız');
        const data = await response.json();
        imageUrl = data.urls[0];
      } catch {
        setUploadError('Görsel yüklenirken hata oluştu.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const finalSlug =
      formData.slug.trim() || generateSlug(formData.name) || category?.slug || '';

    onSave({
      ...(category ? { id: category.id } : {}),
      name: formData.name.trim(),
      slug: finalSlug,
      image: imageUrl,
      displayOrder: formData.displayOrder,
      seoTitle: formData.seoTitle.trim() || null,
      seoDescription: formData.seoDescription.trim() || null,
      contentHtml: formData.contentHtml.trim() || null,
    });
  };

  const isValid = !!formData.name.trim();
  const submitting = isSaving || isUploading;

  return (
    <AdminModal
      open
      onClose={onClose}
      title={category ? 'Kategori Düzenle' : 'Yeni Kategori'}
      description={
        category
          ? "Görüntü, isim, slug veya sıralamayı güncelleyin."
          : "Mağaza navigasyonuna eklenecek yeni bir kategori oluşturun."
      }
      size="md"
      testId="modal-category"
      footer={
        <>
          <GhostButton type="button" onClick={onClose} disabled={submitting}>
            İptal
          </GhostButton>
          <PrimaryButton
            type="submit"
            form="category-form"
            disabled={!isValid || submitting}
            data-testid="button-save-category"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Yükleniyor…
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              'Kaydet'
            )}
          </PrimaryButton>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-3">
          <SectionHeading
            number={1}
            title="Genel"
            description="Kategori adı ve URL slug'ını belirleyin."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Kategori Adı" required>
              <TextInput
                id="category-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Örn. Mermer"
                required
                data-testid="input-category-name"
              />
            </FormField>
            <FormField
              label="Slug"
             
              hint={
                slugAuto
                  ? 'Ad değiştikçe otomatik üretilir.'
                  : 'Manuel olarak düzenlendi.'
              }
            >
              <div className="flex items-stretch gap-1.5">
                <TextInput
                  id="category-slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="ornek-slug"
                  data-testid="input-category-slug"
                />
                <button
                  type="button"
                  onClick={regenerateSlug}
                  className="shrink-0 inline-flex items-center justify-center px-2 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  title="Adından yeniden üret"
                  aria-label="Slug'ı adından yeniden üret"
                  data-testid="button-regenerate-slug"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </FormField>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading
            number={2}
            title="Görsel"
            description="Storefront'ta gözükecek kategori görselini yükleyin."
          />

          {uploadError && <InlineAlert tone="error">{uploadError}</InlineAlert>}

          {previewSrc ? (
            <div
              className="relative group rounded-md overflow-hidden border border-neutral-200 bg-neutral-50"
              data-testid="preview-category-image"
            >
              <img
                src={previewSrc}
                alt="Kategori görseli"
                className="w-full h-44 sm:h-52 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/95 border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors"
                aria-label="Görseli kaldır"
                data-testid="button-remove-category-image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <label className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 h-7 rounded-md bg-white/95 border border-neutral-200 text-[11px] text-neutral-700 hover:bg-white cursor-pointer shadow-sm">
                <Upload className="w-3 h-3" />
                Değiştir
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-category-image"
                />
              </label>
            </div>
          ) : (
            <label
             
              className="flex flex-col items-center justify-center text-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50/40 hover:bg-neutral-50 hover:border-neutral-400 transition-colors p-6 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-500">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[12.5px] text-neutral-700">
                  Yüklemek için tıklayın veya sürükleyin
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  PNG, JPG, WEBP veya GIF - en fazla 10MB
                </p>
              </div>
              <input
                id="category-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-category-image"
              />
            </label>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            number={3}
            title="Sıralama"
            description="Düşük değerler navigasyonda önce görünür."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Görüntüleme Sırası">
              <TextInput
                id="category-order"
                type="number"
                value={String(formData.displayOrder)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                data-testid="input-category-order"
              />
            </FormField>
          </div>
          <p className="text-[11px] text-neutral-500">
            Liste ekranından sürükle-bırak ile de yeniden sıralayabilirsiniz.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading
            number={4}
            title="SEO & İçerik"
            description="Boş bırakılan alanlarda varsayılan şablon kullanılır."
          />
          <FormField
            label="SEO Başlığı"
            hint="Tarayıcı sekmesi ve arama sonuçlarında görünen başlık."
          >
            <TextInput
              id="category-seo-title"
              value={formData.seoTitle}
              onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
              placeholder={formData.name || 'Örn. El Yapımı Bıçaklar | Sepetzen'}
              data-testid="input-category-seo-title"
            />
          </FormField>
          <FormField
            label="SEO Açıklaması"
            hint="Arama sonuçlarında görünen kısa açıklama (150-160 karakter önerilir)."
          >
            <textarea
              id="category-seo-description"
              value={formData.seoDescription}
              onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
              rows={2}
              placeholder="Kategoriye özel meta açıklaması…"
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-y"
              data-testid="input-category-seo-description"
            />
          </FormField>
          <FormField
            label="HTML İçerik"
            hint="Kategori sayfasında ürünlerin altında gösterilir. Başlık, paragraf ve liste etiketleri desteklenir."
          >
            <textarea
              id="category-content-html"
              value={formData.contentHtml}
              onChange={(e) => setFormData({ ...formData, contentHtml: e.target.value })}
              rows={8}
              placeholder={'<h2>Kategori hakkında</h2>\n<p>Özgün SEO metniniz…</p>'}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-[12.5px] font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-y"
              data-testid="input-category-content-html"
            />
          </FormField>
          <div>
            <button
              type="button"
              onClick={() => setShowContentPreview((v) => !v)}
              className="text-[11.5px] text-neutral-600 hover:text-neutral-900 underline underline-offset-2 transition-colors"
              data-testid="button-toggle-content-preview"
            >
              {showContentPreview ? 'Önizlemeyi gizle' : 'Önizlemeyi göster'}
            </button>
            {showContentPreview && (
              <div
                className="mt-2 rounded-md border border-neutral-200 bg-[#0A0A0A] p-5 max-h-72 overflow-y-auto"
                data-testid="preview-category-content"
              >
                {formData.contentHtml.trim() ? (
                  <div
                    className="product-rich-copy"
                    dangerouslySetInnerHTML={{ __html: sanitizeAdminHtml(formData.contentHtml) }}
                  />
                ) : (
                  <p className="text-[12px] text-white/40">İçerik girildiğinde önizleme burada görünür.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="sm:hidden flex flex-col gap-2 pt-2">
          <PrimaryButton
            type="submit"
            disabled={!isValid || submitting}
            className="justify-center"
          >
            {isUploading
              ? 'Yükleniyor…'
              : isSaving
                ? 'Kaydediliyor…'
                : 'Kaydet'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="justify-center"
          >
            İptal
          </SecondaryButton>
        </div>
      </form>
    </AdminModal>
  );
}

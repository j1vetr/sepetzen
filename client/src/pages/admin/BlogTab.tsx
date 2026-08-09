import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Newspaper, Plus, Save, Trash2, Upload, XCircle } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

type Draft = Omit<BlogPost, 'id' | 'publishedAt' | 'createdAt'> & { id: string | null };

const EMPTY_DRAFT: Draft = {
  id: null,
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverImage: null,
  seoTitle: '',
  seoDescription: '',
  isPublished: false,
};

/** Başlıktan URL adresi türetir (Türkçe karakterler sadeleştirilir). */
function slugify(value: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return value
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

export default function BlogTab() {
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading, isError } = useQuery<BlogPost[]>({
    queryKey: ['/api/admin/blog'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog', { credentials: 'include' });
      if (!response.ok) throw new Error('Blog yazıları yüklenemedi');
      return response.json();
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Adres, kullanıcı elle değiştirene kadar başlıktan türetilir.
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    const post = posts.find((item) => item.id === selectedId);
    if (post) {
      setDraft({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        coverImage: post.coverImage,
        seoTitle: post.seoTitle ?? '',
        seoDescription: post.seoDescription ?? '',
        isPublished: post.isPublished,
      });
      setSlugTouched(true);
    }
  }, [posts, selectedId]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const startNewPost = () => {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setSlugTouched(false);
    setMessage(null);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const response = await fetch('/api/admin/upload/blog', { method: 'POST', body: formData, credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.urls?.[0]) throw new Error(payload.error || 'Kapak görseli yüklenemedi');
      update({ coverImage: payload.urls[0] });
      setMessage({ type: 'success', text: 'Kapak görseli yüklendi. Kaydettiğinizde yayına alınır.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Kapak görseli yüklenemedi' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const slug = draft.slug.trim() || slugify(draft.title);
    if (!draft.title.trim()) {
      setMessage({ type: 'error', text: 'Yazı başlığı boş bırakılamaz.' });
      return;
    }
    if (!slug) {
      setMessage({ type: 'error', text: 'Yazı adresi oluşturulamadı, lütfen elle yazın.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(draft.id ? `/api/admin/blog/${draft.id}` : '/api/admin/blog', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slug,
          title: draft.title.trim(),
          excerpt: draft.excerpt.trim(),
          content: draft.content,
          coverImage: draft.coverImage || null,
          seoTitle: draft.seoTitle?.trim() || null,
          seoDescription: draft.seoDescription?.trim() || null,
          isPublished: draft.isPublished,
        }),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.error || 'Yazı kaydedilemedi');
      setSelectedId(saved.id);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog'] });
      setMessage({
        type: 'success',
        text: saved.isPublished ? 'Yazı kaydedildi ve blogda yayınlandı.' : 'Yazı taslak olarak kaydedildi, vitrinde görünmez.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Yazı kaydedilemedi' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!window.confirm('Bu yazı kalıcı olarak silinecek. Devam edilsin mi?')) return;
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/blog/${draft.id}`, { method: 'DELETE', credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Yazı silinemedi');
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog'] });
      startNewPost();
      setMessage({ type: 'success', text: 'Yazı silindi.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Yazı silinemedi' });
    } finally {
      setDeleting(false);
    }
  };

  const previewSlug = useMemo(() => draft.slug || slugify(draft.title), [draft.slug, draft.title]);

  const inputCls = 'w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900';
  const labelCls = 'mb-2 block text-sm font-medium text-neutral-700';

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Blog yazıları yükleniyor…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Blog yazıları yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <aside className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-2 pt-1">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900">Yazılar</h3>
          </div>
          <button
            type="button"
            onClick={startNewPost}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            data-testid="button-new-blog-post"
          >
            <Plus className="h-3.5 w-3.5" /> Yeni
          </button>
        </div>
        {posts.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-500">Henüz yazı yok. “Yeni” ile ilk yazınızı oluşturun.</p>
        ) : (
          <div className="space-y-1">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => { setSelectedId(post.id); setMessage(null); }}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${post.id === selectedId ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}
                data-testid={`button-select-blog-${post.slug}`}
              >
                <span className="block truncate text-sm font-medium">{post.title}</span>
                <span className={`mt-0.5 block text-xs ${post.id === selectedId ? 'text-white/60' : 'text-neutral-400'}`}>
                  {post.isPublished ? 'Yayında' : 'Taslak'} · /blog/{post.slug}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{draft.id ? 'Yazıyı Düzenle' : 'Yeni Yazı'}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              HTML desteklenir. Script, iframe ve güvenli olmayan bağlantılar kaydedilmeden önce ayıklanır.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {draft.id && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                data-testid="button-delete-blog-post"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Sil
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
              data-testid="button-save-blog-post"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
            data-testid="text-blog-message"
          >
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Başlık</span>
              <input
                value={draft.title}
                onChange={(event) => {
                  const title = event.target.value;
                  update(slugTouched ? { title } : { title, slug: slugify(title) });
                }}
                className={inputCls}
                placeholder="Kamp bıçağı nasıl seçilir?"
                data-testid="input-blog-title"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Adres (slug)</span>
              <input
                value={draft.slug}
                onChange={(event) => { setSlugTouched(true); update({ slug: slugify(event.target.value) }); }}
                className={inputCls}
                placeholder="kamp-bicagi-nasil-secilir"
                data-testid="input-blog-slug"
              />
              <span className="mt-1 block text-xs text-neutral-400">Yayın adresi: /blog/{previewSlug || '…'}</span>
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Özet (liste sayfasında görünür)</span>
            <textarea
              value={draft.excerpt}
              onChange={(event) => update({ excerpt: event.target.value })}
              rows={3}
              className={inputCls}
              placeholder="Yazının kısa tanıtımı"
              data-testid="textarea-blog-excerpt"
            />
          </label>

          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="mb-2 text-sm font-medium text-neutral-700">Kapak Görseli</p>
            <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-md bg-neutral-950">
              {draft.coverImage ? (
                <img src={draft.coverImage} alt="Kapak önizleme" className="max-h-full max-w-full object-contain" data-testid="img-blog-cover-preview" />
              ) : (
                <span className="text-xs text-white/40">Görsel seçilmedi</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Yükleniyor…' : 'Görsel Yükle'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  data-testid="input-blog-cover"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadCover(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {draft.coverImage && (
                <button type="button" onClick={() => update({ coverImage: null })} className="text-xs font-semibold text-neutral-500 hover:text-red-600">
                  Kaldır
                </button>
              )}
            </div>
          </div>

          <label className="block">
            <span className={labelCls}>İçerik (HTML)</span>
            <textarea
              value={draft.content}
              onChange={(event) => update({ content: event.target.value })}
              rows={18}
              spellCheck
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-6 text-neutral-900"
              placeholder="<p>Yazı içeriği…</p>"
              data-testid="textarea-blog-content"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelCls}>SEO Başlığı (boşsa yazı başlığı kullanılır)</span>
              <input
                value={draft.seoTitle ?? ''}
                onChange={(event) => update({ seoTitle: event.target.value })}
                className={inputCls}
                data-testid="input-blog-seo-title"
              />
            </label>
            <label className="block">
              <span className={labelCls}>SEO Açıklaması (boşsa özet kullanılır)</span>
              <input
                value={draft.seoDescription ?? ''}
                onChange={(event) => update({ seoDescription: event.target.value })}
                className={inputCls}
                data-testid="input-blog-seo-description"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draft.isPublished}
              onChange={(event) => update({ isPublished: event.target.checked })}
              data-testid="checkbox-blog-published"
            />
            Yazıyı blogda yayınla (kapalıysa taslak olarak saklanır)
          </label>
        </div>
      </section>
    </div>
  );
}

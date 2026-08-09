import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FilePlus2, FileText, Loader2, Plus, Save, XCircle } from 'lucide-react';

interface ManagedPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}

type PageDraft = Omit<ManagedPage, 'id'> & { id?: string };

const emptyDraft = (): PageDraft => ({ slug: '', title: '', content: '', isPublished: true });

export default function PagesTab() {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading, isError } = useQuery<ManagedPage[]>({
    queryKey: ['/api/admin/pages'],
    queryFn: async () => {
      const response = await fetch('/api/admin/pages', { credentials: 'include' });
      if (!response.ok) throw new Error('Sayfalar yüklenemedi');
      return response.json();
    },
  });
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isNew = !draft?.id;

  useEffect(() => {
    if (!selectedId && pages[0] && !draft) setSelectedId(pages[0].id);
  }, [pages, selectedId, draft]);

  useEffect(() => {
    const page = pages.find((item) => item.id === selectedId);
    if (page) setDraft({ ...page });
  }, [pages, selectedId]);

  const startNew = () => {
    setSelectedId('');
    setDraft(emptyDraft());
    setMessage(null);
  };

  const selectPage = (page: ManagedPage) => {
    setSelectedId(page.id);
    setDraft({ ...page });
    setMessage(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        isNew ? '/api/admin/pages' : `/api/admin/pages/${draft.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            slug: draft.slug.trim(),
            title: draft.title,
            content: draft.content,
            isPublished: draft.isPublished,
          }),
        },
      );
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.error || 'Sayfa kaydedilemedi');
      setDraft(saved);
      setSelectedId(saved.id);
      setMessage({
        type: 'success',
        text: saved.isPublished
          ? 'Sayfa kaydedildi ve vitrinde yayınlandı.'
          : 'Sayfa kaydedildi. Yayına almak için “Sayfayı vitrinde yayınla” seçeneğini açın.',
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pages', saved.slug] });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Sayfa kaydedilemedi' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Sayfalar yükleniyor…</div>;
  if (isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Sayfalar yüklenemedi. Lütfen tekrar deneyin.</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-2 pt-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900">Sayfalar</h3>
          </div>
          <button type="button" onClick={startNew} className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800" data-testid="button-new-static-page">
            <Plus className="h-3.5 w-3.5" /> Yeni
          </button>
        </div>
        {pages.length ? (
          <div className="space-y-1">
            {pages.map((page) => (
              <button key={page.id} type="button" onClick={() => selectPage(page)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${page.id === selectedId ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                <span className="block text-sm font-medium">{page.title}</span>
                <span className={`mt-0.5 block text-xs ${page.id === selectedId ? 'text-white/60' : 'text-neutral-400'}`}>/sayfa/{page.slug}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 px-3 py-5 text-center">
            <FilePlus2 className="mx-auto h-5 w-5 text-neutral-400" />
            <p className="mt-2 text-sm font-medium text-neutral-700">Henüz sayfa yok</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">İlk yasal veya bilgilendirme sayfanızı oluşturun.</p>
          </div>
        )}
      </aside>

      {draft ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{isNew ? 'Yeni Sayfa Oluştur' : 'Sayfa Düzenleyici'}</h2>
              <p className="mt-1 text-sm text-neutral-500">HTML desteklenir. Script, iframe ve güvenli olmayan bağlantılar kaydedilmeden önce ayıklanır.</p>
            </div>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50" data-testid="button-save-static-page">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Kaydediliyor…' : isNew ? 'Sayfayı Oluştur' : 'Kaydet'}
            </button>
          </div>
          {message && <div className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{message.text}
          </div>}
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Sayfa Başlığı</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900" data-testid="input-static-page-title" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Web Adresi</span>
              <div className="flex overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                <span className="flex items-center border-r border-neutral-200 px-3 text-sm text-neutral-500">/sayfa/</span>
                <input value={draft.slug} disabled={!isNew} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} placeholder="ornek-sayfa" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-500" data-testid="input-static-page-slug" />
              </div>
              <p className="mt-1 text-xs text-neutral-500">{isNew ? 'Yalnızca küçük harf, rakam ve tire kullanın. Kaydedildikten sonra adres değiştirilemez.' : 'Bir sayfanın web adresi, mevcut bağlantıların çalışmaya devam etmesi için değiştirilemez.'}</p>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />
              Sayfayı vitrinde yayınla
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">İçerik (HTML)</span>
              <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} rows={22} spellCheck className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-6 text-neutral-900" data-testid="textarea-static-page-content" />
            </label>
          </div>
        </section>
      ) : (
        <section className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <FilePlus2 className="h-9 w-9 text-neutral-400" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-900">Düzenlemek için bir sayfa seçin</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">Soldaki listeden mevcut bir sayfayı seçebilir veya yeni bir sayfa oluşturabilirsiniz.</p>
          <button type="button" onClick={startNew} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
            <Plus className="h-4 w-4" /> Yeni Sayfa Oluştur
          </button>
        </section>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2, Save, XCircle } from 'lucide-react';

interface ManagedPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}

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
  const [draft, setDraft] = useState<ManagedPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedId && pages[0]) setSelectedId(pages[0].id);
  }, [pages, selectedId]);

  useEffect(() => {
    const page = pages.find((item) => item.id === selectedId);
    if (page) setDraft({ ...page });
  }, [pages, selectedId]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/pages/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: draft.title, content: draft.content, isPublished: draft.isPublished }),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.error || 'Sayfa kaydedilemedi');
      setDraft(saved);
      setMessage({ type: 'success', text: 'Sayfa kaydedildi ve vitrinde yayınlandı.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pages', draft.slug] });
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
        <div className="mb-3 flex items-center gap-2 px-2 pt-1">
          <FileText className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">Mevcut Sayfalar</h3>
        </div>
        <div className="space-y-1">
          {pages.map((page) => (
            <button key={page.id} type="button" onClick={() => { setSelectedId(page.id); setMessage(null); }}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${page.id === selectedId ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}>
              <span className="block text-sm font-medium">{page.title}</span>
              <span className={`mt-0.5 block text-xs ${page.id === selectedId ? 'text-white/60' : 'text-neutral-400'}`}>/sayfa/{page.slug}</span>
            </button>
          ))}
        </div>
      </aside>

      {draft && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Yasal Sayfa Düzenleyici</h2>
              <p className="mt-1 text-sm text-neutral-500">HTML desteklenir. Script, iframe ve güvenli olmayan bağlantılar kaydedilmeden önce ayıklanır.</p>
            </div>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50" data-testid="button-save-static-page">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Kaydediliyor…' : 'Kaydet ve Yayınla'}
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
      )}
    </div>
  );
}
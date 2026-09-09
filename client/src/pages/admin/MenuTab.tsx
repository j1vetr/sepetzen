import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, GripVertical, Loader2, X, Menu,
  Tag, Wand2, RefreshCw, Image as ImageIcon, Trash, AlertTriangle,
  ChevronDown, ChevronRight, Link2, FolderOpen, Check,
} from 'lucide-react';
import type { Category } from './_shared/types';

interface MenuManagementPanelProps {
  categories: Category[];
}

interface MenuItemData {
  id: string;
  title: string;
  description: string | null;
  bgImage: string | null;
  measurementGifUrl: string | null;
  type: 'category' | 'link' | 'submenu';
  categoryId: string | null;
  url: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  category?: { id: string; name: string; slug: string } | null;
}

type DragInfo = { id: string; parentId: string | null };

const TYPE_META = {
  category: { label: 'Kategori', icon: Tag, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  link:     { label: 'Link',     icon: Link2, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  submenu:  { label: 'Alt Menü', icon: FolderOpen, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const EMPTY_FORM = {
  title: '', description: '', bgImage: '', measurementGifUrl: '',
  type: 'category' as 'category' | 'link' | 'submenu',
  categoryId: '', url: '', parentId: '', isActive: true, openInNewTab: false,
};

export default function MenuManagementPanel({ categories }: MenuManagementPanelProps) {
  const queryClient = useQueryClient();

  /* ── modal state ── */
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bgUploading, setBgUploading] = useState(false);
  const [gifUploading, setGifUploading] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const gifFileRef = useRef<HTMLInputElement>(null);

  /* ── drag state ── */
  const dragging = useRef<DragInfo | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());

  /* ── queries ── */
  const { data: menuItems = [], isLoading } = useQuery<MenuItemData[]>({
    queryKey: ['admin', 'menu-items'],
    queryFn: async () => {
      const res = await fetch('/api/admin/menu-items', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    },
  });

  /* ── mutations ── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const siblings = menuItems.filter(i =>
        data.parentId ? i.parentId === data.parentId : !i.parentId
      );
      const res = await fetch('/api/admin/menu-items', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          url: data.url || null,
          parentId: data.parentId || null,
          displayOrder: siblings.length,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      return res.json();
    },
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      const res = await fetch(`/api/admin/menu-items/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          url: data.url || null,
          parentId: data.parentId || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      return res.json();
    },
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; displayOrder: number }[]) => {
      const res = await fetch('/api/admin/menu-items/reorder', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to reorder');
      return res.json();
    },
    onSuccess: invalidate,
  });

  const regenerateMutation = useMutation({
    mutationFn: async (wipeAll: boolean) => {
      const res = await fetch('/api/admin/menu-items/regenerate-from-categories', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipeAll }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Hata'); }
      return res.json();
    },
    onSuccess: (r) => {
      invalidate();
      const lines = r.groups.map((g: { title: string; count: number }) => `• ${g.title} (${g.count})`).join('\n');
      alert(`✅ Otomatik gruplandırma tamamlandı!\n\n${r.createdParents} ana grup, ${r.createdChildren} alt kategori.\n\n${lines}`);
    },
    onError: (e: Error) => alert(`❌ ${e.message}`),
  });

  /* ── upload helpers ── */
  const upload = async (file: File, onUrl: (u: string) => void, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const fd = new FormData(); fd.append('images', file);
      const res = await fetch('/api/admin/upload/branding', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error('Yükleme başarısız');
      const data = await res.json();
      const url = Array.isArray(data.urls) ? data.urls[0] : data.url;
      if (!url) throw new Error('URL alınamadı');
      onUrl(url);
    } catch (e) { alert('Görsel yüklenemedi: ' + (e instanceof Error ? e.message : '')); }
    finally { setLoading(false); }
  };

  /* ── modal helpers ── */
  const closeModal = () => { setShowModal(false); setEditingItem(null); setFormData(EMPTY_FORM); };

  const openEdit = (item: MenuItemData) => {
    setEditingItem(item);
    setFormData({
      title: item.title, description: item.description || '',
      bgImage: item.bgImage || '', measurementGifUrl: item.measurementGifUrl || '',
      type: item.type, categoryId: item.categoryId || '',
      url: item.url || '', parentId: item.parentId || '',
      isActive: item.isActive, openInNewTab: item.openInNewTab,
    });
    setShowModal(true);
  };

  const openAddChild = (parentId: string) => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM, parentId });
    setShowModal(true);
    setExpandedRoots(prev => new Set([...prev, parentId]));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) { alert('Menü başlığı zorunludur.'); return; }
    if (formData.type === 'category' && !formData.categoryId) { alert('Kategori seçin.'); return; }
    if (formData.type === 'link' && !formData.url.trim()) { alert('URL girin.'); return; }
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: formData });
    else createMutation.mutate(formData);
  };

  /* ── drag & drop ── */
  const onDragStart = useCallback((e: React.DragEvent, id: string, parentId: string | null) => {
    dragging.current = { id, parentId };
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 20, 20);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragging.current?.id !== id) setDragOverId(id);
  }, []);

  const onDragLeave = useCallback(() => setDragOverId(null), []);

  const onDrop = useCallback((e: React.DragEvent, targetId: string, targetParentId: string | null) => {
    e.preventDefault();
    setDragOverId(null);
    const src = dragging.current;
    if (!src || src.id === targetId) return;
    // only allow reorder within same level
    if (src.parentId !== targetParentId) return;

    const siblings = menuItems
      .filter(i => (targetParentId ? i.parentId === targetParentId : !i.parentId))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const fromIdx = siblings.findIndex(i => i.id === src.id);
    const toIdx   = siblings.findIndex(i => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    reorderMutation.mutate(reordered.map((item, idx) => ({ id: item.id, displayOrder: idx })));
    dragging.current = null;
  }, [menuItems, reorderMutation]);

  const onDragEnd = useCallback(() => { dragging.current = null; setDragOverId(null); }, []);

  /* ── derived data ── */
  const rootItems = menuItems
    .filter(i => !i.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const submenuParents = menuItems.filter(i => i.type === 'submenu' && !i.parentId);

  const qualityIssues = menuItems.filter(i => {
    if (!i.isActive) return false;
    if (!i.title.trim()) return true;
    if (i.type === 'category' && !i.categoryId) return true;
    if (i.type === 'link' && !i.url?.trim()) return true;
    if (i.parentId && !menuItems.some(p => p.id === i.parentId)) return true;
    return false;
  });

  const toggleExpand = (id: string) =>
    setExpandedRoots(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  /* ── item row renderers ── */
  const renderChild = (child: MenuItemData) => {
    const meta = TYPE_META[child.type];
    const isOver = dragOverId === child.id;
    return (
      <div
        key={child.id}
        draggable
        onDragStart={e => onDragStart(e, child.id, child.parentId)}
        onDragOver={e => onDragOver(e, child.id)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, child.id, child.parentId)}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-3 px-4 py-2.5 transition-colors group/row
          ${isOver ? 'bg-sky-50 border-t-2 border-sky-400' : 'hover:bg-neutral-50 border-t border-neutral-100'}`}
      >
        {/* drag handle */}
        <span className="cursor-grab active:cursor-grabbing text-neutral-300 group-hover/row:text-neutral-400 shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* info */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${meta.color}`}>
            <meta.icon className="w-2.5 h-2.5" />
            {meta.label}
          </span>
          <span className="text-[13px] text-neutral-800 font-medium truncate">{child.title}</span>
          {child.type === 'category' && child.category && (
            <span className="text-[11px] text-neutral-400 truncate hidden sm:inline">→ {child.category.name}</span>
          )}
          {child.type === 'link' && child.url && (
            <span className="text-[11px] text-neutral-400 truncate hidden sm:inline">→ {child.url}</span>
          )}
          {!child.isActive && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 rounded border border-neutral-200">Pasif</span>
          )}
        </div>

        {/* actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => openEdit(child)}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
            title="Düzenle"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => confirm('Bu alt öğeyi silmek istiyor musunuz?') && deleteMutation.mutate(child.id)}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500"
            title="Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderRoot = (item: MenuItemData, index: number) => {
    const meta = TYPE_META[item.type];
    const children = menuItems
      .filter(c => c.parentId === item.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const isExpanded = expandedRoots.has(item.id) || children.length > 0;
    const isOver = dragOverId === item.id;
    const hasChildren = children.length > 0 || item.type === 'submenu';

    return (
      <div
        key={item.id}
        className={`border-b border-neutral-200 last:border-b-0 transition-colors
          ${isOver ? 'bg-sky-50/60' : ''}`}
      >
        {/* root row */}
        <div
          draggable
          onDragStart={e => onDragStart(e, item.id, null)}
          onDragOver={e => onDragOver(e, item.id)}
          onDragLeave={onDragLeave}
          onDrop={e => onDrop(e, item.id, null)}
          onDragEnd={onDragEnd}
          className={`flex items-center gap-3 px-4 py-3.5 group/root
            ${isOver ? 'border-t-2 border-sky-400' : ''}`}
        >
          {/* drag handle */}
          <span className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 shrink-0">
            <GripVertical className="w-4 h-4" />
          </span>

          {/* expand toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(item.id)}
              className="text-neutral-400 hover:text-neutral-700 shrink-0"
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4 h-4 shrink-0" />
          )}

          {/* type badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${meta.color}`}>
            <meta.icon className="w-3 h-3" />
            {meta.label}
          </span>

          {/* title + connection */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-neutral-900 truncate">{item.title}</span>
              {item.type === 'category' && item.category && (
                <span className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                  → {item.category.name}
                </span>
              )}
              {item.type === 'link' && item.url && (
                <span className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded truncate max-w-[200px]">
                  → {item.url}
                </span>
              )}
              {item.type === 'submenu' && (
                <span className="text-[11px] text-neutral-400">
                  {children.length} alt öğe
                </span>
              )}
              {!item.isActive && (
                <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 rounded border border-neutral-200">Pasif</span>
              )}
            </div>
          </div>

          {/* order index */}
          <span className="text-[11px] text-neutral-300 font-mono shrink-0 hidden sm:block">#{index + 1}</span>

          {/* actions */}
          <div className="flex items-center gap-1 shrink-0">
            {item.type === 'submenu' && (
              <button
                onClick={() => openAddChild(item.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 border border-transparent hover:border-neutral-200 transition-colors"
                title="Alt öğe ekle"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Alt ekle</span>
              </button>
            )}
            <button
              onClick={() => openEdit(item)}
              className="p-2 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              title="Düzenle"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => confirm('Bu menü öğesini silmek istiyor musunuz?') && deleteMutation.mutate(item.id)}
              disabled={deleteMutation.isPending}
              className="p-2 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* children */}
        {hasChildren && isExpanded && (
          <div className="ml-10 border-l-2 border-neutral-200 mb-1">
            {children.map(renderChild)}
            {item.type === 'submenu' && (
              <button
                onClick={() => openAddChild(item.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-[12px] text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Alt öğe ekle
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">Menü Yönetimi</h2>
          <p className="text-neutral-500 text-sm mt-0.5">
            Sürükleyerek sıralayın — düzenlemek için satıra tıklayın
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (!confirm('Kategorileri otomatik olarak ana gruplara böler. Devam?')) return;
              regenerateMutation.mutate(false);
            }}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {regenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Otomatik Gruplandır
          </button>
          <button
            onClick={() => {
              if (!confirm('⚠️ TÜM menü öğeleri silinecek! Devam?')) return;
              if (!confirm('Son onay: Tüm kayıtlar silinip yeniden oluşturulacak.')) return;
              regenerateMutation.mutate(true);
            }}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {regenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sıfırla & Yeniden Oluştur
          </button>
          <button
            onClick={() => { setEditingItem(null); setFormData(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Öğe Ekle
          </button>
        </div>
      </div>

      {/* quality warning */}
      {qualityIssues.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>{qualityIssues.length} aktif menü öğesi</strong> hedefi veya başlığı eksik.</span>
        </div>
      )}

      {/* legend */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <GripVertical className="w-3.5 h-3.5" /> Sürükle ile sırala
        </span>
        {Object.entries(TYPE_META).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${v.color}`}>
            <v.icon className="w-2.5 h-2.5" /> {v.label}
          </span>
        ))}
      </div>

      {/* list */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {rootItems.length === 0 ? (
          <div className="text-center py-14">
            <Menu className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">Henüz menü öğesi yok</p>
            <button
              onClick={() => { setEditingItem(null); setFormData(EMPTY_FORM); setShowModal(true); }}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> İlk öğeyi ekle
            </button>
          </div>
        ) : (
          rootItems.map((item, index) => renderRoot(item, index))
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
              <h3 className="text-[16px] font-bold text-neutral-900">
                {editingItem ? 'Öğeyi Düzenle' : 'Yeni Menü Öğesi'}
              </h3>
              <button onClick={closeModal} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Başlık <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400"
                  placeholder="Menüde görünecek isim"
                  autoFocus
                />
              </div>

              {/* type selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tür</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['category', 'link', 'submenu'] as const).map(t => {
                    const m = TYPE_META[t];
                    const active = formData.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, type: t, categoryId: '', url: '' }))}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-medium border transition-all
                          ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}
                      >
                        <m.icon className="w-3.5 h-3.5" />
                        {m.label}
                        {active && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* category picker */}
              {formData.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Kategori <span className="text-red-500">*</span></label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    <option value="">— Kategori seçin —</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* link URL */}
              {formData.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">URL <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                    placeholder="/tum-urunler veya https://..."
                  />
                </div>
              )}

              {/* submenu extras */}
              {formData.type === 'submenu' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Alt Menü bir dropdown oluşturur. Kaydettikten sonra "Alt ekle" butonu ile alt öğe ekleyebilirsiniz.
                  </div>

                  {/* description */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Açıklama <span className="text-neutral-400 font-normal">(Opsiyonel)</span></label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                      placeholder="Mega menü sol panelde başlığın altında görünür"
                    />
                  </div>

                  {/* bg image */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Arka Plan Görseli <span className="text-neutral-400 font-normal">(Opsiyonel)</span></label>
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, u => setFormData(p => ({ ...p, bgImage: u })), setBgUploading); e.target.value = ''; }} />
                    {formData.bgImage ? (
                      <div className="relative group rounded-lg overflow-hidden border border-neutral-200">
                        <img src={formData.bgImage} alt="" className="w-full h-28 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => bgFileRef.current?.click()} className="px-2.5 py-1.5 bg-white text-black rounded text-xs font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Değiştir</button>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, bgImage: '' }))} className="px-2.5 py-1.5 bg-red-600 text-white rounded text-xs font-medium flex items-center gap-1"><Trash className="w-3 h-3" /> Kaldır</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => bgFileRef.current?.click()} disabled={bgUploading}
                        className="w-full h-20 border-2 border-dashed border-neutral-200 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-neutral-400 text-neutral-400 text-xs disabled:opacity-50">
                        {bgUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        {bgUploading ? 'Yükleniyor…' : 'Görsel seç veya sürükle'}
                      </button>
                    )}
                  </div>

                  {/* GIF */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ölçü GIF <span className="text-neutral-400 font-normal">(Opsiyonel)</span></label>
                    <input ref={gifFileRef} type="file" accept="image/gif" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (!f.type.includes('gif')) { alert('Lütfen .gif dosyası seçin'); return; }
                        upload(f, u => setFormData(p => ({ ...p, measurementGifUrl: u })), setGifUploading);
                        e.target.value = '';
                      }} />
                    {formData.measurementGifUrl ? (
                      <div className="relative group rounded-lg overflow-hidden border border-neutral-200">
                        <img src={formData.measurementGifUrl} alt="" className="w-full h-28 object-contain bg-neutral-100" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => gifFileRef.current?.click()} className="px-2.5 py-1.5 bg-white text-black rounded text-xs font-medium">Değiştir</button>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, measurementGifUrl: '' }))} className="px-2.5 py-1.5 bg-red-600 text-white rounded text-xs font-medium">Kaldır</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => gifFileRef.current?.click()} disabled={gifUploading}
                        className="w-full h-20 border-2 border-dashed border-neutral-200 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-neutral-400 text-neutral-400 text-xs disabled:opacity-50">
                        {gifUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xl">🎞</span>}
                        {gifUploading ? 'Yükleniyor…' : 'GIF seç (.gif)'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* parent picker (non-submenu) */}
              {formData.type !== 'submenu' && submenuParents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Üst Menü <span className="text-neutral-400 font-normal">(Opsiyonel)</span></label>
                  <select
                    value={formData.parentId}
                    onChange={e => setFormData(p => ({ ...p, parentId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    <option value="">Ana menüde göster</option>
                    {submenuParents.filter(p => p.id !== editingItem?.id).map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type !== 'submenu' && submenuParents.length === 0 && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] text-neutral-500">
                  Alt menü öğesi eklemek için önce "Alt Menü" türünde bir öğe oluşturun.
                </div>
              )}

              {/* toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive}
                    onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-neutral-900 rounded" />
                  <span className="text-sm text-neutral-700">Aktif</span>
                </label>
                {formData.type === 'link' && (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={formData.openInNewTab}
                      onChange={e => setFormData(p => ({ ...p, openInNewTab: e.target.checked }))}
                      className="w-4 h-4 accent-neutral-900 rounded" />
                    <span className="text-sm text-neutral-700">Yeni sekmede aç</span>
                  </label>
                )}
              </div>
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 sticky bottom-0 bg-white">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-neutral-200 hover:bg-neutral-50 font-medium">
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  createMutation.isPending || updateMutation.isPending ||
                  !formData.title.trim() ||
                  (formData.type === 'category' && !formData.categoryId) ||
                  (formData.type === 'link' && !formData.url.trim())
                }
                className="px-5 py-2 text-sm rounded-lg bg-neutral-900 text-white font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-black transition-colors"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

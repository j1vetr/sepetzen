import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Pencil, Trash2, Loader2, AlertCircle, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  StatusBadge,
  SearchInput,
  TextInput,
  FormField,
  InlineAlert,
} from './_ui/AdminUI';
import AdminModal from './_ui/AdminModal';
import type { Brand } from './_shared/types';

// ─── slug yardımcısı ─────────────────────────────────────────────────────────
function toSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── form tipi ────────────────────────────────────────────────────────────────
interface BrandDraft {
  name: string;
  slug: string;
  logoUrl: string;
  isActive: boolean;
}

const EMPTY_DRAFT: BrandDraft = { name: '', slug: '', logoUrl: '', isActive: true };

// ─── API yardımcıları ────────────────────────────────────────────────────────
async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch('/api/admin/brands');
  if (!res.ok) throw new Error('Markalar yüklenemedi');
  return res.json();
}

async function saveBrand(data: { id?: string; draft: BrandDraft }) {
  const { id, draft } = data;
  const payload = {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    logoUrl: draft.logoUrl.trim() || null,
    isActive: draft.isActive,
  };
  const res = await fetch(id ? `/api/admin/brands/${id}` : '/api/admin/brands', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Kayıt başarısız');
  }
  return res.json();
}

async function deleteBrand(id: string) {
  const res = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Silme başarısız');
  }
}

interface ReconcileResult {
  matchedCount: number;
  updatedCount: number;
  conflictingBrandNames: string[];
}

async function reconcileBrands(apply: boolean): Promise<ReconcileResult> {
  const res = await fetch('/api/admin/brands/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apply }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Marka eşleştirme başarısız');
  }
  return res.json();
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
export default function BrandsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcilePreview, setReconcilePreview] = useState<ReconcileResult | null>(null);

  const { data: brands = [], isLoading, isError } = useQuery<Brand[]>({
    queryKey: ['/api/admin/brands'],
    queryFn: fetchBrands,
  });

  const saveMutation = useMutation({
    mutationFn: saveBrand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      closeModal();
      toast({ title: editingId ? 'Marka güncellendi' : 'Marka eklendi' });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      setDeleteTarget(null);
      toast({ title: 'Marka silindi' });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const reconcileMutation = useMutation({
    mutationFn: reconcileBrands,
    onSuccess: (result, apply) => {
      if (!apply) {
        setReconcilePreview(result);
        return;
      }
      qc.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      setReconcileOpen(false);
      setReconcilePreview(null);
      toast({
        title: 'Marka eşleştirme tamamlandı',
        description: `${result.updatedCount} ürünün marka adı standartlaştırıldı.`,
      });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  // ─── filtrelenmiş liste ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q) || b.slug.includes(q));
  }, [brands, search]);

  // ─── modal yardımcıları ──────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setDraft({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl ?? '',
      isActive: brand.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  }

  function handleNameChange(name: string) {
    const auto = editingId ? draft.slug : toSlug(name);
    setDraft((d) => ({ ...d, name, slug: editingId ? d.slug : auto }));
  }

  function handleSubmit() {
    if (!draft.name.trim()) { setFormError('Marka adı zorunludur.'); return; }
    if (!draft.slug.trim()) { setFormError('Slug zorunludur.'); return; }
    setFormError(null);
    saveMutation.mutate({ id: editingId ?? undefined, draft });
  }

  function openReconcile() {
    setReconcileOpen(true);
    setReconcilePreview(null);
    reconcileMutation.mutate(false);
  }

  function closeReconcile() {
    if (reconcileMutation.isPending) return;
    setReconcileOpen(false);
    setReconcilePreview(null);
  }

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <PageHeader
        title="Markalar"
        description={`${brands.length} marka kayıtlı`}
        actions={
          <>
            <SecondaryButton onClick={openReconcile} disabled={reconcileMutation.isPending}>
              <RefreshCw className="w-3.5 h-3.5" />
              Mevcut ürünleri eşleştir
            </SecondaryButton>
            <PrimaryButton onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />
              Marka Ekle
            </PrimaryButton>
          </>
        }
      />

      {/* Arama */}
      <SearchInput
        placeholder="Marka ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {/* İçerik */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-neutral-500 text-[13px] py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-red-600 text-[13px] py-8 justify-center">
          <AlertCircle className="w-4 h-4" /> Yüklenirken hata oluştu
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={search ? 'Sonuç bulunamadı' : 'Henüz marka yok'}
          description={search ? 'Arama teriminizi değiştirin.' : 'İlk markayı eklemek için "Marka Ekle" düğmesini kullanın.'}
          action={!search ? <PrimaryButton onClick={openAdd}><Plus className="w-3.5 h-3.5" />Marka Ekle</PrimaryButton> : undefined}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Logo</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Ad / Slug</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Ürün Sayısı</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Durum</th>
                  <th className="px-4 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((brand, idx) => (
                  <tr key={brand.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-neutral-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-8 h-8 object-contain rounded border border-neutral-200 bg-white"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                          <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{brand.name}</div>
                      <div className="text-[11px] text-neutral-400">{brand.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 tabular-nums">{brand.productCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={brand.isActive ? 'emerald' : 'neutral'}>
                        {brand.isActive ? 'Aktif' : 'Pasif'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <IconButton onClick={() => openEdit(brand)} title="Düzenle">
                          <Pencil className="w-3.5 h-3.5" />
                        </IconButton>
                        <IconButton tone="danger" onClick={() => setDeleteTarget(brand)} title="Sil">
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ekle / Düzenle Modalı */}
      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Markayı Düzenle' : 'Yeni Marka'}
        size="sm"
        footer={
          <>
            <SecondaryButton onClick={closeModal}>İptal</SecondaryButton>
            <PrimaryButton onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? 'Güncelle' : 'Kaydet'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <InlineAlert tone="error">{formError}</InlineAlert>}

          <FormField label="Marka Adı" required>
            <TextInput
              value={draft.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: Sepetzen"
              autoFocus
            />
          </FormField>

          <FormField label="Slug" hint="URL'de kullanılır; otomatik türetilir, düzenlenebilir." required>
            <TextInput
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: toSlug(e.target.value) }))}
              placeholder="sepetzen"
            />
          </FormField>

          <FormField label="Logo URL" hint="Boş bırakılabilir. Harici bir resim adresi girin.">
            <TextInput
              value={draft.logoUrl}
              onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              id="brand-active"
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-neutral-300 accent-neutral-900"
            />
            <label htmlFor="brand-active" className="text-[13px] text-neutral-700 cursor-pointer">
              Aktif (ürün formunda listelensin)
            </label>
          </div>
        </div>
      </AdminModal>

      {/* Ürün markalarını eşleştirme */}
      <AdminModal
        open={reconcileOpen}
        onClose={closeReconcile}
        title="Mevcut ürünleri eşleştir"
        description="Ürünlerdeki marka yazımlarını kayıtlı marka adlarıyla standartlaştırın."
        size="sm"
        closeOnOutsideClick={!reconcileMutation.isPending}
        footer={
          <>
            <SecondaryButton onClick={closeReconcile} disabled={reconcileMutation.isPending}>
              İptal
            </SecondaryButton>
            <PrimaryButton
              onClick={() => reconcileMutation.mutate(true)}
              disabled={
                reconcileMutation.isPending ||
                reconcilePreview === null ||
                reconcilePreview.matchedCount === 0 ||
                reconcilePreview.conflictingBrandNames.length > 0
              }
            >
              {reconcileMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Eşleştirmeyi uygula
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-3">
          {reconcileMutation.isPending && reconcilePreview === null ? (
            <div className="flex items-center gap-2 text-[13px] text-neutral-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Eşleşecek ürünler kontrol ediliyor…
            </div>
          ) : reconcilePreview && reconcilePreview.conflictingBrandNames.length > 0 ? (
            <InlineAlert tone="error">
              Aynı marka adı büyük/küçük harf farkıyla birden fazla kez kayıtlı: {' '}
              <strong>{reconcilePreview.conflictingBrandNames.join(', ')}</strong>. Önce bu kayıtları düzenleyin.
            </InlineAlert>
          ) : reconcilePreview?.matchedCount === 0 ? (
            <InlineAlert tone="success">
              Standartlaştırılması gereken ürün bulunamadı.
            </InlineAlert>
          ) : reconcilePreview ? (
            <>
              <InlineAlert tone="warning">
                <strong>{reconcilePreview.matchedCount} ürün</strong> kayıtlı marka adlarıyla eşleştirilecek.
              </InlineAlert>
              <p className="text-[12px] text-neutral-500">
                Bu işlem, marka adı büyük/küçük harf farkı olan ürünleri düzeltir. Devam etmek için onaylayın.
              </p>
            </>
          ) : null}
        </div>
      </AdminModal>

      {/* Silme Onayı */}
      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Markayı Sil"
        size="sm"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>İptal</SecondaryButton>
            <PrimaryButton
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sil
            </PrimaryButton>
          </>
        }
      >
        <p className="text-[13px] text-neutral-700">
          <strong>{deleteTarget?.name}</strong> markasını silmek istediğinizden emin misiniz?
          {(deleteTarget?.productCount ?? 0) > 0 && (
            <span className="block mt-1 text-amber-700">
              Bu markaya bağlı {deleteTarget!.productCount} ürün var. Ürünler silinmez, yalnızca marka adı serbest metin olarak kalır.
            </span>
          )}
        </p>
      </AdminModal>
    </div>
  );
}

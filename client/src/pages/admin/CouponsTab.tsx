import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  Power,
  Calendar,
  Percent,
  TrendingUp,
  Users as UsersIcon,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
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
  SelectInput,
  TextInput,
  TextArea,
  FormField,
  SectionHeading,
  InlineAlert,
} from './_ui/AdminUI';
import AdminModal from './_ui/AdminModal';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  freeShipping: boolean;
  appliesToShipping: boolean;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  isInfluencerCode: boolean;
  influencerName: string | null;
  influencerInstagram: string | null;
  createdAt: string;
}

type CouponDraft = Partial<Coupon> & {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
};

const emptyDraft: CouponDraft = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: null,
  perUserLimit: 1,
  freeShipping: false,
  appliesToShipping: false,
  isActive: true,
  startsAt: null,
  expiresAt: null,
  isInfluencerCode: false,
  influencerName: '',
  influencerInstagram: '',
};

function formatDate(d: string | null) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function toInputDate(d: string | null | undefined) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function isExpired(c: Coupon): boolean {
  if (!c.expiresAt) return false;
  return new Date(c.expiresAt) < new Date();
}

function isExhausted(c: Coupon): boolean {
  return c.usageLimit !== null && c.usageCount >= c.usageLimit;
}

function couponState(c: Coupon): { tone: 'emerald' | 'amber' | 'red' | 'neutral'; label: string } {
  if (!c.isActive) return { tone: 'neutral', label: 'Pasif' };
  if (isExpired(c)) return { tone: 'red', label: 'Süresi Doldu' };
  if (isExhausted(c)) return { tone: 'amber', label: 'Kullanım Dolu' };
  return { tone: 'emerald', label: 'Aktif' };
}

export default function CouponsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [], isLoading, error } = useQuery<Coupon[]>({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (!res.ok) throw new Error('Kuponlar yüklenemedi');
      return res.json();
    },
  });

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.isActive && !isExpired(c) && !isExhausted(c)).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const influencer = coupons.filter((c) => c.isInfluencerCode).length;
    return { total, active, totalUses, influencer };
  }, [coupons]);

  const filtered = useMemo(() => {
    let result = coupons;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.influencerName || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => {
        if (statusFilter === 'active') return c.isActive && !isExpired(c) && !isExhausted(c);
        if (statusFilter === 'inactive') return !c.isActive;
        if (statusFilter === 'expired') return isExpired(c) || isExhausted(c);
        return true;
      });
    }
    return result;
  }, [coupons, search, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CouponDraft & { id?: string }) => {
      const isEdit = Boolean(payload.id);
      const url = isEdit ? `/api/admin/coupons/${payload.id}` : '/api/admin/coupons';
      const body: any = {
        code: payload.code.trim().toUpperCase(),
        description: payload.description || null,
        discountType: payload.discountType,
        discountValue: String(payload.discountValue),
        minOrderAmount: payload.minOrderAmount ? String(payload.minOrderAmount) : null,
        maxDiscountAmount: payload.maxDiscountAmount ? String(payload.maxDiscountAmount) : null,
        usageLimit: payload.usageLimit ? Number(payload.usageLimit) : null,
        perUserLimit: payload.perUserLimit ? Number(payload.perUserLimit) : null,
        freeShipping: !!payload.freeShipping,
        appliesToShipping: !!payload.appliesToShipping,
        isActive: !!payload.isActive,
        startsAt: payload.startsAt || null,
        expiresAt: payload.expiresAt || null,
        isInfluencerCode: !!payload.isInfluencerCode,
        influencerName: payload.influencerName || null,
        influencerInstagram: payload.influencerInstagram || null,
      };
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Kayıt başarısız');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setModalOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
      toast({ title: 'Kupon kaydedildi' });
    },
    onError: (e: Error) => {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Silme başarısız');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast({ title: 'Kupon silindi' });
    },
    onError: (e: Error) => {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (c: Coupon) => {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (!res.ok) throw new Error('Güncellenemedi');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setDraft({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount || '',
      maxDiscountAmount: c.maxDiscountAmount || '',
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit ?? 1,
      freeShipping: c.freeShipping,
      appliesToShipping: c.appliesToShipping,
      isActive: c.isActive,
      startsAt: c.startsAt ? toInputDate(c.startsAt) : '',
      expiresAt: c.expiresAt ? toInputDate(c.expiresAt) : '',
      isInfluencerCode: c.isInfluencerCode,
      influencerName: c.influencerName || '',
      influencerInstagram: c.influencerInstagram || '',
    });
    setModalOpen(true);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1400);
    } catch {
      toast({ title: 'Kopyalanamadı', variant: 'destructive' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim()) {
      toast({ title: 'Kod zorunlu', variant: 'destructive' });
      return;
    }
    if (!draft.discountValue || Number(draft.discountValue) <= 0) {
      toast({ title: 'Geçerli bir indirim değeri girin', variant: 'destructive' });
      return;
    }
    if (draft.discountType === 'percentage' && Number(draft.discountValue) > 100) {
      toast({ title: 'Yüzde indirim 100\'den büyük olamaz', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...draft, id: editingId || undefined });
  };

  return (
    <>
      <PageHeader
        title="Kuponlar"
        description="İndirim kodları, kampanyalar ve influencer kuponlarını yönetin."
        actions={
          <PrimaryButton onClick={openCreate} data-testid="button-create-coupon">
            <Plus className="w-4 h-4" />
            Yeni Kupon
          </PrimaryButton>
        }
      />

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          icon={Ticket}
          label="Toplam Kupon"
          value={stats.total}
          tone="neutral"
        />
        <StatCard
          icon={CheckCircle2}
          label="Aktif Kupon"
          value={stats.active}
          tone="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Toplam Kullanım"
          value={stats.totalUses}
          tone="blue"
        />
        <StatCard
          icon={UsersIcon}
          label="Influencer Kuponu"
          value={stats.influencer}
          tone="orange"
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput
          placeholder="Kod, açıklama veya influencer ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-80"
          data-testid="input-coupon-search"
        />
        <SelectInput
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          data-testid="select-coupon-status"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
          <option value="expired">Süresi Dolmuş</option>
        </SelectInput>
      </div>

      {/* ── Table / list ── */}
      {error ? (
        <InlineAlert tone="error">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Kuponlar yüklenirken hata oluştu.
          </span>
        </InlineAlert>
      ) : isLoading ? (
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Ticket}
            title="Henüz kupon yok"
            description={
              search || statusFilter !== 'all'
                ? 'Arama kriterlerinize uyan kupon bulunamadı.'
                : 'İlk indirim kodunuzu oluşturarak başlayın.'
            }
            action={
              !search && statusFilter === 'all' ? (
                <PrimaryButton onClick={openCreate}>
                  <Plus className="w-4 h-4" />
                  İlk Kuponu Oluştur
                </PrimaryButton>
              ) : null
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr className="text-left text-[11px] font-medium text-neutral-500 uppercase tracking-[0.06em]">
                  <th className="px-4 py-2.5">Kod</th>
                  <th className="px-4 py-2.5">İndirim</th>
                  <th className="px-4 py-2.5">Min. Sipariş</th>
                  <th className="px-4 py-2.5">Kullanım</th>
                  <th className="px-4 py-2.5">Geçerlilik</th>
                  <th className="px-4 py-2.5">Durum</th>
                  <th className="px-4 py-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((c) => {
                  const state = couponState(c);
                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/50" data-testid={`row-coupon-${c.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-[12px] font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded" data-testid={`text-coupon-code-${c.id}`}>
                            {c.code}
                          </code>
                          <button
                            onClick={() => handleCopy(c.code)}
                            className="text-neutral-400 hover:text-neutral-700 transition-colors"
                            title="Kopyala"
                            data-testid={`button-copy-${c.id}`}
                          >
                            {copiedCode === c.code ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {c.isInfluencerCode && (
                            <StatusBadge tone="orange">Influencer</StatusBadge>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-[260px]">
                            {c.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-900 font-medium">
                        {c.discountType === 'percentage' ? (
                          <span>%{Number(c.discountValue).toFixed(0)}</span>
                        ) : (
                          <span>{Number(c.discountValue).toLocaleString('tr-TR')} ₺</span>
                        )}
                        {c.freeShipping && (
                          <span className="ml-1.5 text-[10px] text-emerald-600">+ Kargo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.minOrderAmount
                          ? `${Number(c.minOrderAmount).toLocaleString('tr-TR')} ₺`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 tabular-nums">
                        {c.usageCount}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 text-[12px]">
                        {c.expiresAt ? formatDate(c.expiresAt) : 'Süresiz'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <IconButton
                            onClick={() => toggleActiveMutation.mutate(c)}
                            title={c.isActive ? 'Pasif yap' : 'Aktif yap'}
                            data-testid={`button-toggle-${c.id}`}
                          >
                            <Power className={`w-3.5 h-3.5 ${c.isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                          </IconButton>
                          <IconButton
                            onClick={() => openEdit(c)}
                            title="Düzenle"
                            data-testid={`button-edit-${c.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </IconButton>
                          <IconButton
                            tone="danger"
                            onClick={() => {
                              if (confirm(`${c.code} kuponunu silmek istediğinize emin misiniz?`)) {
                                deleteMutation.mutate(c.id);
                              }
                            }}
                            title="Sil"
                            data-testid={`button-delete-${c.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-neutral-100">
            {filtered.map((c) => {
              const state = couponState(c);
              return (
                <div key={c.id} className="p-4" data-testid={`card-coupon-${c.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-[13px] font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                          {c.code}
                        </code>
                        <button
                          onClick={() => handleCopy(c.code)}
                          className="text-neutral-400"
                        >
                          {copiedCode === c.code ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {c.description && (
                        <p className="text-[12px] text-neutral-500 mt-1">{c.description}</p>
                      )}
                    </div>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                    <div>
                      <p className="text-neutral-500">İndirim</p>
                      <p className="font-medium text-neutral-900">
                        {c.discountType === 'percentage'
                          ? `%${Number(c.discountValue).toFixed(0)}`
                          : `${Number(c.discountValue).toLocaleString('tr-TR')} ₺`}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Kullanım</p>
                      <p className="font-medium text-neutral-900 tabular-nums">
                        {c.usageCount}
                        {c.usageLimit ? `/${c.usageLimit}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Bitiş</p>
                      <p className="font-medium text-neutral-900">
                        {c.expiresAt ? formatDate(c.expiresAt) : 'Süresiz'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SecondaryButton
                      onClick={() => openEdit(c)}
                      className="!h-8 !px-2.5 !text-[12px] flex-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Düzenle
                    </SecondaryButton>
                    <IconButton
                      onClick={() => toggleActiveMutation.mutate(c)}
                    >
                      <Power className={`w-3.5 h-3.5 ${c.isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    </IconButton>
                    <IconButton
                      tone="danger"
                      onClick={() => {
                        if (confirm(`${c.code} kuponunu silmek istediğinize emin misiniz?`)) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Create / Edit Modal ── */}
      <AdminModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
          setDraft(emptyDraft);
        }}
        title={editingId ? 'Kuponu Düzenle' : 'Yeni Kupon Oluştur'}
        description={editingId ? draft.code : 'İndirim kodunun detaylarını girin.'}
        size="lg"
        testId="modal-coupon"
        footer={
          <>
            <SecondaryButton
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                setDraft(emptyDraft);
              }}
            >
              İptal
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              form="coupon-form"
              disabled={saveMutation.isPending}
              data-testid="button-save-coupon"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Güncelle' : 'Oluştur'}
            </PrimaryButton>
          </>
        }
      >
        <form id="coupon-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Temel Bilgiler */}
          <div>
            <SectionHeading number={1} title="Temel Bilgiler" description="Kod ve açıklama" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <FormField label="Kupon Kodu" required>
                  <TextInput
                    value={draft.code}
                    onChange={(e) =>
                      setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s/g, '') })
                    }
                    placeholder="ORN: HOSGELDIN20"
                    className="font-mono uppercase"
                    data-testid="input-coupon-code"
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Açıklama" hint="Yönetici notu (müşteriye görünmez)">
                  <TextInput
                    value={draft.description || ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Örn: Hoş geldin kampanyası"
                    data-testid="input-coupon-description"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Section 2: İndirim */}
          <div>
            <SectionHeading number={2} title="İndirim Detayları" description="Tip, değer ve sınırlar" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="İndirim Tipi" required>
                <SelectInput
                  value={draft.discountType}
                  onChange={(e) =>
                    setDraft({ ...draft, discountType: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="w-full"
                  data-testid="select-discount-type"
                >
                  <option value="percentage">Yüzde (%)</option>
                  <option value="fixed">Sabit Tutar (₺)</option>
                </SelectInput>
              </FormField>
              <FormField
                label={draft.discountType === 'percentage' ? 'Yüzde' : 'Tutar'}
                required
                hint={draft.discountType === 'percentage' ? '0–100 arası' : 'TL cinsinden'}
              >
                <div className="relative">
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.discountValue}
                    onChange={(e) => setDraft({ ...draft, discountValue: e.target.value })}
                    className="pr-9"
                    data-testid="input-discount-value"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400 pointer-events-none">
                    {draft.discountType === 'percentage' ? '%' : '₺'}
                  </span>
                </div>
              </FormField>
              {draft.discountType === 'percentage' && (
                <FormField label="Maks. İndirim" hint="Boş = sınırsız">
                  <div className="relative">
                    <TextInput
                      type="number"
                      min="0"
                      value={draft.maxDiscountAmount || ''}
                      onChange={(e) =>
                        setDraft({ ...draft, maxDiscountAmount: e.target.value })
                      }
                      placeholder="Sınırsız"
                      className="pr-9"
                      data-testid="input-max-discount"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400 pointer-events-none">
                      ₺
                    </span>
                  </div>
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FormField label="Min. Sipariş Tutarı" hint="Boş = limit yok">
                <div className="relative">
                  <TextInput
                    type="number"
                    min="0"
                    value={draft.minOrderAmount || ''}
                    onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })}
                    placeholder="0"
                    className="pr-9"
                    data-testid="input-min-order"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400 pointer-events-none">
                    ₺
                  </span>
                </div>
              </FormField>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <CheckPill
                checked={!!draft.freeShipping}
                onChange={(v) => setDraft({ ...draft, freeShipping: v })}
                label="Ücretsiz Kargo"
                testId="check-free-shipping"
              />
              <CheckPill
                checked={!!draft.appliesToShipping}
                onChange={(v) => setDraft({ ...draft, appliesToShipping: v })}
                label="Kargoya da Uygula"
                testId="check-applies-shipping"
              />
            </div>
          </div>

          {/* Section 3: Kullanım Limitleri */}
          <div>
            <SectionHeading number={3} title="Kullanım Limitleri" description="Toplam ve kullanıcı bazlı sınırlar" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Toplam Kullanım Limiti" hint="Boş = sınırsız">
                <TextInput
                  type="number"
                  min="0"
                  value={draft.usageLimit ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      usageLimit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Sınırsız"
                  data-testid="input-usage-limit"
                />
              </FormField>
              <FormField label="Kullanıcı Başına Limit" hint="Boş = sınırsız">
                <TextInput
                  type="number"
                  min="1"
                  value={draft.perUserLimit ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      perUserLimit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="1"
                  data-testid="input-per-user-limit"
                />
              </FormField>
            </div>
          </div>

          {/* Section 4: Tarih Aralığı */}
          <div>
            <SectionHeading number={4} title="Geçerlilik Tarihi" description="Boş bırakılırsa sınırsız geçerlidir" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Başlangıç">
                <TextInput
                  type="date"
                  value={draft.startsAt || ''}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                  data-testid="input-starts-at"
                />
              </FormField>
              <FormField label="Bitiş">
                <TextInput
                  type="date"
                  value={draft.expiresAt || ''}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                  data-testid="input-expires-at"
                />
              </FormField>
            </div>
          </div>

          {/* Section 5: Influencer (opsiyonel) */}
          <div>
            <SectionHeading
              number={5}
              title="Influencer Kuponu"
              description="Bu kupon bir influencer için mi?"
            />
            <CheckPill
              checked={!!draft.isInfluencerCode}
              onChange={(v) => setDraft({ ...draft, isInfluencerCode: v })}
              label="Influencer kuponu olarak işaretle"
              testId="check-influencer"
            />
            {draft.isInfluencerCode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <FormField label="Influencer Adı">
                  <TextInput
                    value={draft.influencerName || ''}
                    onChange={(e) => setDraft({ ...draft, influencerName: e.target.value })}
                    placeholder="Örn: Ayşe Yılmaz"
                    data-testid="input-influencer-name"
                  />
                </FormField>
                <FormField label="Instagram">
                  <TextInput
                    value={draft.influencerInstagram || ''}
                    onChange={(e) => setDraft({ ...draft, influencerInstagram: e.target.value })}
                    placeholder="@kullaniciadi"
                    data-testid="input-influencer-instagram"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* Section 6: Durum */}
          <div className="border-t border-neutral-200 pt-4">
            <CheckPill
              checked={!!draft.isActive}
              onChange={(v) => setDraft({ ...draft, isActive: v })}
              label="Kupon aktif"
              testId="check-active"
              tone="emerald"
            />
          </div>
        </form>
      </AdminModal>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'neutral' | 'emerald' | 'blue' | 'orange';
}) {
  const toneClasses: Record<typeof tone, { bg: string; text: string }> = {
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  };
  const t = toneClasses[tone];
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${t.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-neutral-500 truncate">{label}</p>
          <p className="text-[18px] font-semibold text-neutral-900 tabular-nums leading-tight">
            {value.toLocaleString('tr-TR')}
          </p>
        </div>
      </div>
    </Card>
  );
}

function CheckPill({
  checked,
  onChange,
  label,
  testId,
  tone = 'neutral',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
  tone?: 'neutral' | 'emerald';
}) {
  const activeClass =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
      : 'bg-neutral-900 border-neutral-900 text-white';
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-[12px] font-medium transition-all ${
        checked
          ? activeClass
          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
          checked
            ? tone === 'emerald'
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-white border-white'
            : 'border-neutral-300'
        }`}
      >
        {checked && (
          <CheckCircle2 className={`w-3 h-3 ${tone === 'emerald' ? 'text-white' : 'text-neutral-900'}`} strokeWidth={3} />
        )}
      </span>
      {label}
    </button>
  );
}

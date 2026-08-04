/**
 * Pazaryeri push (site → Trendyol) admin dialogları:
 *   - ProductLinksDialog: ürün bağlantıları, yön (pull/push) yönetimi,
 *     push durumu, "Trendyol'a Gönder" sihirbazı, stok/fiyatı hemen gönder.
 *   - PushQueueDialog: outbox kuyruğu (bekleyen/gönderilen/hatalı), retry.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  RefreshCw,
  Send,
  Upload,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import AdminModal from './_ui/AdminModal';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  StatusBadge,
  FormField,
  TextInput,
  SelectInput,
  SearchInput,
  InlineAlert,
} from './_ui/AdminUI';

type ProductLink = {
  id: string;
  productId: string | null;
  productName: string | null;
  externalId: string;
  syncDirection: 'pull' | 'push';
  barcode: string | null;
  stockCode: string | null;
  pushStatus: string | null;
  pushError: string | null;
  lastPushedAt: string | null;
  tyBrandName: string | null;
  tyCategoryId: string | null;
  tyBrandId: string | null;
  pushAttributes: Record<string, string>;
  lastSyncedAt: string;
};

type SiteProduct = {
  id: string;
  name: string;
  basePrice: string;
  isActive: boolean;
  images?: string[];
};

type CategoryMapping = {
  id: string;
  externalId: string;
  name: string;
  fullPath?: string | null;
};

type BrandOption = { id: string; name: string };

type AttributeDef = {
  attributeId: string;
  name: string;
  required: boolean;
  allowCustom: boolean;
  varianter: boolean;
  slicer: boolean;
  values: Array<{ id: string; name: string }>;
};

type QueueItem = {
  id: string;
  productId: string;
  productName: string | null;
  kind: string;
  status: string;
  attempts: number;
  error: string | null;
  batchRequestId: string | null;
  updatedAt: string;
  createdAt: string;
};

const PUSH_STATUS_BADGE: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'neutral' }> = {
  sent: { label: 'Gönderildi', tone: 'blue' },
  approved: { label: 'Kabul edildi', tone: 'emerald' },
  rejected: { label: 'Reddedildi', tone: 'red' },
  error: { label: 'Hata', tone: 'red' },
};

const QUEUE_STATUS_BADGE: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'neutral' }> = {
  pending: { label: 'Bekliyor', tone: 'amber' },
  sent: { label: 'Gönderildi', tone: 'blue' },
  confirmed: { label: 'Onaylandı', tone: 'emerald' },
  failed: { label: 'Başarısız', tone: 'red' },
};

const KIND_LABEL: Record<string, string> = {
  stock_price: 'Stok/Fiyat',
  create: 'Ürün oluşturma',
  update: 'Ürün güncelleme',
};

function fmt(d: string | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

// ============================================================================
// Ürün Bağlantıları + Gönderim Sihirbazı
// ============================================================================
export function ProductLinksDialog({
  marketplaceId,
  open,
  onClose,
}: {
  marketplaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [wizardProduct, setWizardProduct] = useState<SiteProduct | null>(null);
  const [wizardLink, setWizardLink] = useState<ProductLink | null>(null);
  const [errorLink, setErrorLink] = useState<ProductLink | null>(null);
  const [search, setSearch] = useState('');

  const linksQuery = useQuery<ProductLink[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'product-links'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketplaces/${marketplaceId}/product-links`);
      return await res.json();
    },
    refetchInterval: 10_000,
    enabled: open,
  });

  const productsQuery = useQuery<SiteProduct[]>({
    queryKey: ['/api/admin/products'],
    enabled: open,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'product-links'] });

  const directionMutation = useMutation({
    mutationFn: async ({ linkId, syncDirection, barcode }: { linkId: string; syncDirection: 'pull' | 'push'; barcode?: string }) => {
      const res = await apiRequest('PUT', `/api/admin/marketplaces/${marketplaceId}/product-links/${linkId}`, {
        syncDirection,
        ...(barcode ? { barcode } : {}),
      });
      return await res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Senkron yönü güncellendi' });
    },
    onError: (err: Error) =>
      toast({ title: 'Güncellenemedi', description: err.message, variant: 'destructive' }),
  });

  const pushStockMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/product-links/${linkId}/push-stock`);
    },
    onSuccess: () => {
      toast({ title: 'Stok/fiyat gönderimi kuyruğa alındı' });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: 'Gönderilemedi', description: err.message, variant: 'destructive' }),
  });

  const links = linksQuery.data ?? [];
  const linkedProductIds = new Set(links.map((l) => l.productId).filter(Boolean));
  const products = productsQuery.data ?? [];

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return links;
    return links.filter(
      (l) =>
        (l.productName ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (l.barcode ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        l.externalId.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [links, search]);

  const unlinkedProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return products.filter(
      (p) =>
        p.isActive &&
        !linkedProductIds.has(p.id) &&
        (!q || p.name.toLocaleLowerCase('tr-TR').includes(q)),
    );
  }, [products, links, search]);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Ürün Bağlantıları ve Trendyol'a Gönderim"
      size="xl"
    >
      <div className="space-y-4" data-testid="dialog-product-links">
        <InlineAlert tone="neutral">
          <strong>Yön:</strong> "Çek" ürünler Trendyol'dan siteye senkronlanır. "Gönder"
          ürünlerde merkez site'dir — stok/fiyat değişimleri otomatik Trendyol'a iletilir ve
          saatlik çekme senkronu bu ürünlere dokunmaz.
        </InlineAlert>

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün adı veya barkod ara…"
          data-testid="input-search-links"
        />

        {linksQuery.isLoading ? (
          <LoadingState />
        ) : (
          <>
            {filteredLinks.length > 0 && (
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 overflow-hidden">
                {filteredLinks.map((link) => {
                  const badge = link.pushStatus ? PUSH_STATUS_BADGE[link.pushStatus] : null;
                  const hasErrorDetail =
                    !!link.pushError && (link.pushStatus === 'rejected' || link.pushStatus === 'error');
                  return (
                    <div
                      key={link.id}
                      className="p-3 flex flex-wrap items-center gap-2"
                      data-testid={`row-link-${link.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-neutral-900 truncate">
                          {link.productName ?? '(site ürünü yok)'}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-2">
                          <span>Barkod: {link.barcode ?? link.externalId}</span>
                          {link.tyBrandName && <span>Marka: {link.tyBrandName}</span>}
                          {link.lastPushedAt && <span>Son gönderim: {fmt(link.lastPushedAt)}</span>}
                        </div>
                        {link.pushError && (
                          <div className="text-[11px] text-red-600 mt-0.5 truncate" title={link.pushError}>
                            {link.pushError}
                          </div>
                        )}
                      </div>
                      {badge &&
                        (hasErrorDetail ? (
                          <button
                            type="button"
                            onClick={() => setErrorLink(link)}
                            className="cursor-pointer"
                            title="Hata detayını göster"
                            data-testid={`button-push-error-${link.id}`}
                          >
                            <StatusBadge tone={badge.tone}>{badge.label} ⓘ</StatusBadge>
                          </button>
                        ) : (
                          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                        ))}
                      {link.pushStatus === 'rejected' && link.productId && (
                        <GhostButton
                          onClick={() => {
                            const p = products.find((sp) => sp.id === link.productId);
                            setWizardLink(link);
                            setWizardProduct(
                              p ?? {
                                id: link.productId!,
                                name: link.productName ?? '(ürün)',
                                basePrice: '0',
                                isActive: true,
                              },
                            );
                          }}
                          data-testid={`button-fix-resend-${link.id}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Düzelt &amp; Yeniden Gönder
                        </GhostButton>
                      )}
                      <StatusBadge tone={link.syncDirection === 'push' ? 'blue' : 'neutral'}>
                        {link.syncDirection === 'push' ? (
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpFromLine className="w-3 h-3" /> Gönder
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <ArrowDownToLine className="w-3 h-3" /> Çek
                          </span>
                        )}
                      </StatusBadge>
                      <SelectInput
                        value={link.syncDirection}
                        onChange={(e) => {
                          const dir = e.target.value as 'pull' | 'push';
                          if (dir === 'push' && !link.barcode) {
                            const barcode = window.prompt(
                              'Bu ürünün Trendyol barkodunu girin (push için zorunlu):',
                              link.externalId,
                            );
                            if (!barcode) return;
                            directionMutation.mutate({ linkId: link.id, syncDirection: dir, barcode });
                            return;
                          }
                          directionMutation.mutate({ linkId: link.id, syncDirection: dir });
                        }}
                        className="w-28"
                        data-testid={`select-direction-${link.id}`}
                      >
                        <option value="pull">Çek</option>
                        <option value="push">Gönder</option>
                      </SelectInput>
                      {link.syncDirection === 'push' && (
                        <GhostButton
                          onClick={() => pushStockMutation.mutate(link.id)}
                          disabled={pushStockMutation.isPending}
                          data-testid={`button-push-stock-${link.id}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Stok/Fiyat Gönder
                        </GhostButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Henüz bağlantısı olmayan site ürünleri → Trendyol'a Gönder sihirbazı */}
            <div>
              <div className="text-[12px] font-semibold text-neutral-700 mb-2">
                Trendyol'da olmayan site ürünleri ({unlinkedProducts.length})
              </div>
              {unlinkedProducts.length === 0 ? (
                <div className="text-[12px] text-neutral-500">
                  Tüm aktif ürünlerin pazaryeri bağlantısı var.
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 overflow-hidden">
                  {unlinkedProducts.map((p) => (
                    <div key={p.id} className="p-3 flex items-center gap-3" data-testid={`row-unlinked-${p.id}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-neutral-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-neutral-500">{Number(p.basePrice).toLocaleString('tr-TR')} TL</div>
                      </div>
                      <SecondaryButton
                        onClick={() => setWizardProduct(p)}
                        data-testid={`button-push-wizard-${p.id}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Trendyol'a Gönder
                      </SecondaryButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {wizardProduct && (
        <PushWizardDialog
          marketplaceId={marketplaceId}
          product={wizardProduct}
          initialLink={wizardLink}
          open={!!wizardProduct}
          onClose={() => {
            setWizardProduct(null);
            setWizardLink(null);
          }}
          onDone={() => {
            setWizardProduct(null);
            setWizardLink(null);
            invalidate();
          }}
        />
      )}

      {errorLink && (
        <AdminModal
          open={!!errorLink}
          onClose={() => setErrorLink(null)}
          title={`Trendyol Red Nedeni — ${errorLink.productName ?? errorLink.barcode ?? errorLink.externalId}`}
          size="md"
        >
          <div className="space-y-3" data-testid="dialog-push-error-detail">
            <InlineAlert tone="error">
              Trendyol bu ürünü {errorLink.pushStatus === 'rejected' ? 'reddetti' : 'hata ile yanıtladı'}.
              Aşağıdaki kural ihlallerini düzeltip yeniden gönderebilirsiniz.
            </InlineAlert>
            <div
              className="text-[13px] text-neutral-800 whitespace-pre-wrap break-words bg-neutral-50 border border-neutral-200 rounded-lg p-3 max-h-[50vh] overflow-y-auto"
              data-testid="text-push-error-full"
            >
              {errorLink.pushError}
            </div>
          </div>
        </AdminModal>
      )}
    </AdminModal>
  );
}

// ============================================================================
// Gönderim sihirbazı — kategori + marka + zorunlu özellikler + fiyat meta
// ============================================================================
function PushWizardDialog({
  marketplaceId,
  product,
  initialLink,
  open,
  onClose,
  onDone,
}: {
  marketplaceId: string;
  product: SiteProduct;
  initialLink?: ProductLink | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState(initialLink?.barcode ?? '');
  const [stockCode, setStockCode] = useState(initialLink?.stockCode ?? '');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryId, setCategoryId] = useState(initialLink?.tyCategoryId ?? '');
  const [brandSearch, setBrandSearch] = useState(initialLink?.tyBrandName ?? 'Sepetzen');
  const [brand, setBrand] = useState<BrandOption | null>(
    initialLink?.tyBrandId && initialLink?.tyBrandName
      ? { id: initialLink.tyBrandId, name: initialLink.tyBrandName }
      : null,
  );
  const [attrValues, setAttrValues] = useState<Record<string, { valueId?: string; custom?: string }>>({});
  const [attrsPrefilled, setAttrsPrefilled] = useState(false);
  const [vatRate, setVatRate] = useState('20');
  const [listPrice, setListPrice] = useState('');
  const [dimensionalWeight, setDimensionalWeight] = useState('1');

  // Trendyol kategori snapshot'ı (mevcut mapping tablosundan)
  const categoriesQuery = useQuery<CategoryMapping[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'category-mappings'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketplaces/${marketplaceId}/category-mappings`);
      return await res.json();
    },
    enabled: open,
  });

  const brandsQuery = useQuery<BrandOption[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'brands', brandSearch],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/brands?q=${encodeURIComponent(brandSearch)}`,
      );
      return await res.json();
    },
    enabled: open && brandSearch.trim().length >= 2,
    staleTime: 60_000,
  });

  const attributesQuery = useQuery<AttributeDef[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'category-attributes', categoryId],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/admin/marketplaces/${marketplaceId}/categories/${categoryId}/attributes`,
      );
      return await res.json();
    },
    enabled: open && !!categoryId,
  });

  const categories = categoriesQuery.data ?? [];
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLocaleLowerCase('tr-TR');
    const list = q
      ? categories.filter((c) =>
          (c.fullPath ?? c.name).toLocaleLowerCase('tr-TR').includes(q),
        )
      : categories;
    return list.slice(0, 50);
  }, [categories, categorySearch]);

  const attributes = attributesQuery.data ?? [];
  const requiredAttrs = attributes.filter((a) => a.required);

  // Reddedilen ürün yeniden gönderilirken önceki attribute değerlerini doldur.
  // Saklanan değer valueId ya da serbest metin olabilir; kategori tanımına bakarak ayırt ederiz.
  useEffect(() => {
    if (attrsPrefilled || !initialLink?.pushAttributes || attributes.length === 0) return;
    if (categoryId !== initialLink.tyCategoryId) return;
    const next: Record<string, { valueId?: string; custom?: string }> = {};
    for (const [attributeId, stored] of Object.entries(initialLink.pushAttributes)) {
      if (!stored) continue;
      const def = attributes.find((a) => a.attributeId === attributeId);
      if (def && def.values.some((v) => v.id === stored)) {
        next[attributeId] = { valueId: stored };
      } else {
        next[attributeId] = { custom: stored };
      }
    }
    if (Object.keys(next).length > 0) {
      setAttrValues((prev) => ({ ...next, ...prev }));
    }
    setAttrsPrefilled(true);
  }, [attributes, attrsPrefilled, initialLink, categoryId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const attrs = Object.entries(attrValues)
        .filter(([, v]) => v.valueId || v.custom)
        .map(([attributeId, v]) => ({
          attributeId,
          ...(v.valueId ? { attributeValueId: v.valueId } : {}),
          ...(v.custom ? { customAttributeValue: v.custom } : {}),
        }));
      const res = await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/push-product`, {
        productId: product.id,
        barcode: barcode.trim(),
        ...(stockCode.trim() ? { stockCode: stockCode.trim() } : {}),
        tyCategoryId: categoryId,
        tyBrandId: brand?.id,
        tyBrandName: brand?.name,
        attributes: attrs,
        vatRate: Number(vatRate),
        ...(listPrice ? { listPrice: Number(listPrice) } : {}),
        dimensionalWeight: Number(dimensionalWeight) || 1,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ürün gönderildi',
        description: 'Trendyol batch işleme aldı; sonuç birkaç dakika içinde bağlantı listesinde görünür.',
      });
      onDone();
    },
    onError: (err: Error) =>
      toast({ title: 'Gönderilemedi', description: err.message, variant: 'destructive' }),
  });

  const missingRequired = requiredAttrs.filter(
    (a) => !(attrValues[a.attributeId]?.valueId || attrValues[a.attributeId]?.custom),
  );
  const canSubmit =
    barcode.trim().length >= 3 && !!categoryId && !!brand && missingRequired.length === 0;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={`Trendyol'a Gönder — ${product.name}`}
      size="lg"
      footer={
        <>
          <GhostButton onClick={onClose}>Vazgeç</GhostButton>
          <PrimaryButton
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            data-testid="button-submit-push"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Gönder
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4" data-testid="dialog-push-wizard">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Barkod *" hint="Trendyol'da tekil olmalı; onaydan sonra değiştirilemez.">
            <TextInput
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="ör. SPZ-BICAK-001"
              data-testid="input-push-barcode"
            />
          </FormField>
          <FormField label="Stok Kodu" hint="Boşsa barkod kullanılır.">
            <TextInput
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              placeholder="ör. SPZ-001"
              data-testid="input-push-stockcode"
            />
          </FormField>
        </div>

        <FormField label="Trendyol Kategorisi *" hint="Leaf (en alt) kategori seçin.">
          <div className="space-y-2">
            <SearchInput
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Kategori ara… (ör. Outdoor Bıçak)"
              data-testid="input-push-category-search"
            />
            <SelectInput
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              data-testid="select-push-category"
            >
              <option value="">Kategori seçin…</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.externalId}>
                  {c.fullPath ?? c.name}
                </option>
              ))}
            </SelectInput>
            {categories.length === 0 && !categoriesQuery.isLoading && (
              <div className="text-[11px] text-amber-600">
                Kategori listesi boş — önce bir "Tam Senkron" çalıştırın (kategori ağacı indirilir).
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Marka *" hint="Trendyol marka havuzundan seçilir.">
          <div className="space-y-2">
            <SearchInput
              value={brandSearch}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                setBrand(null);
              }}
              placeholder="Marka ara…"
              data-testid="input-push-brand-search"
            />
            {brand ? (
              <StatusBadge tone="emerald">Seçili: {brand.name}</StatusBadge>
            ) : brandsQuery.isFetching ? (
              <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Aranıyor…
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(brandsQuery.data ?? []).slice(0, 8).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrand(b)}
                    className="px-2 py-1 text-[12px] rounded-md border border-neutral-200 hover:bg-neutral-50"
                    data-testid={`button-brand-${b.id}`}
                  >
                    {b.name}
                  </button>
                ))}
                {brandSearch.trim().length >= 2 && (brandsQuery.data ?? []).length === 0 && !brandsQuery.isLoading && (
                  <span className="text-[11px] text-amber-600">
                    Marka bulunamadı. Trendyol'da kayıtlı olmayan markalar için satıcı panelinden
                    marka başvurusu gerekir.
                  </span>
                )}
              </div>
            )}
          </div>
        </FormField>

        {categoryId && (
          <div className="space-y-3">
            <div className="text-[12px] font-semibold text-neutral-700">
              Kategori Özellikleri {attributesQuery.isLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
            </div>
            {attributes
              .filter((a) => a.required || a.values.length > 0)
              .slice(0, 20)
              .map((a) => (
                <FormField key={a.attributeId} label={`${a.name}${a.required ? ' *' : ''}`}>
                  {a.values.length > 0 ? (
                    <SelectInput
                      value={attrValues[a.attributeId]?.valueId ?? ''}
                      onChange={(e) =>
                        setAttrValues((prev) => ({
                          ...prev,
                          [a.attributeId]: { valueId: e.target.value || undefined },
                        }))
                      }
                      data-testid={`select-attr-${a.attributeId}`}
                    >
                      <option value="">Seçin…</option>
                      {a.values.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </SelectInput>
                  ) : (
                    <TextInput
                      value={attrValues[a.attributeId]?.custom ?? ''}
                      onChange={(e) =>
                        setAttrValues((prev) => ({
                          ...prev,
                          [a.attributeId]: { custom: e.target.value || undefined },
                        }))
                      }
                      placeholder={a.allowCustom ? 'Serbest değer' : ''}
                    />
                  )}
                </FormField>
              ))}
            {missingRequired.length > 0 && (
              <InlineAlert tone="warning">
                Zorunlu özellikler eksik: {missingRequired.map((a) => a.name).join(', ')}
              </InlineAlert>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="KDV Oranı (%)">
            <SelectInput value={vatRate} onChange={(e) => setVatRate(e.target.value)} data-testid="select-push-vat">
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </SelectInput>
          </FormField>
          <FormField label="Liste Fiyatı (TL)" hint={`Satış: ${Number(product.basePrice).toLocaleString('tr-TR')} TL`}>
            <TextInput
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Boşsa satış fiyatı"
              data-testid="input-push-listprice"
            />
          </FormField>
          <FormField label="Desi">
            <TextInput
              type="number"
              value={dimensionalWeight}
              onChange={(e) => setDimensionalWeight(e.target.value)}
              data-testid="input-push-desi"
            />
          </FormField>
        </div>
      </div>
    </AdminModal>
  );
}

// ============================================================================
// Push Kuyruğu
// ============================================================================
export function PushQueueDialog({
  marketplaceId,
  open,
  onClose,
}: {
  marketplaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const queueQuery = useQuery<QueueItem[]>({
    queryKey: ['/api/admin/marketplaces', marketplaceId, 'push-queue'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketplaces/${marketplaceId}/push-queue`);
      return await res.json();
    },
    refetchInterval: 5000,
    enabled: open,
  });

  const retryMutation = useMutation({
    mutationFn: async (queueId: string) => {
      await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/push-queue/${queueId}/retry`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'push-queue'] });
      toast({ title: 'Yeniden kuyruğa alındı' });
    },
    onError: (err: Error) =>
      toast({ title: 'Başarısız', description: err.message, variant: 'destructive' }),
  });

  const processNowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/admin/marketplaces/${marketplaceId}/push-now`);
    },
    onSuccess: () => {
      toast({ title: 'Kuyruk işleniyor', description: 'Sonuçlar birkaç saniye içinde güncellenir.' });
      setTimeout(
        () => qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', marketplaceId, 'push-queue'] }),
        3000,
      );
    },
  });

  const rows = queueQuery.data ?? [];
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <AdminModal open={open} onClose={onClose} title="Trendyol Gönderim Kuyruğu" size="lg">
      <div className="space-y-3" data-testid="dialog-push-queue">
        <div className="flex items-center gap-2">
          <StatusBadge tone={pendingCount > 0 ? 'amber' : 'neutral'}>Bekleyen: {pendingCount}</StatusBadge>
          <StatusBadge tone={failedCount > 0 ? 'red' : 'neutral'}>Hatalı: {failedCount}</StatusBadge>
          <div className="flex-1" />
          <SecondaryButton
            onClick={() => processNowMutation.mutate()}
            disabled={processNowMutation.isPending}
            data-testid="button-process-queue-now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Şimdi İşle
          </SecondaryButton>
        </div>

        {queueQuery.isLoading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Kuyruk boş"
            description="Push yönündeki ürünlerde stok/fiyat değiştiğinde gönderimler burada görünür."
          />
        ) : (
          <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 overflow-hidden max-h-[50vh] overflow-y-auto">
            {rows.map((r) => {
              const badge = QUEUE_STATUS_BADGE[r.status] ?? { label: r.status, tone: 'neutral' as const };
              return (
                <div key={r.id} className="p-3 flex flex-wrap items-center gap-2" data-testid={`row-queue-${r.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-neutral-900 truncate">
                      {r.productName ?? r.productId}
                    </div>
                    <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-2">
                      <span>{KIND_LABEL[r.kind] ?? r.kind}</span>
                      <span>{fmt(r.updatedAt)}</span>
                      {r.attempts > 0 && <span>Deneme: {r.attempts}</span>}
                    </div>
                    {r.error && (
                      <div className="text-[11px] text-red-600 mt-0.5 break-words" title={r.error}>
                        {r.error}
                      </div>
                    )}
                  </div>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  {r.status === 'failed' && (
                    <GhostButton
                      onClick={() => retryMutation.mutate(r.id)}
                      disabled={retryMutation.isPending}
                      data-testid={`button-retry-${r.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Tekrar Dene
                    </GhostButton>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminModal>
  );
}

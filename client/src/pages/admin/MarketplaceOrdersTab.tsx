/**
 * Trendyol Siparişleri sekmesi — pazaryeri siparişlerinin tam görünümü.
 * Sipariş numarasına göre gruplu liste: tarih, durum, müşteri, tutar, kargo.
 * Stok düşümü yapılmış, geri yüklenmiş veya eşleşememiş satırlar işaretlenir.
 * Mobilde kart görünümü, genişte tablo benzeri satırlar.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Truck,
  User,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import {
  EmptyState,
  LoadingState,
  SecondaryButton,
  GhostButton,
  StatusBadge,
  SelectInput,
} from './_ui/AdminUI';

type Marketplace = { id: string; name: string; type: string; isActive: boolean };

type OrderLine = {
  id: string;
  lineId: string;
  barcode: string | null;
  quantity: number;
  status: string | null;
  statusGroup: string;
  productId: string | null;
  productName: string | null;
  productTitle: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  stockApplied: boolean;
  stockRestored: boolean;
  note: string | null;
};

type MarketplaceOrder = {
  orderNumber: string;
  orderedAt: string | null;
  customerName: string | null;
  cargoProvider: string | null;
  cargoTracking: string | null;
  statusGroup: string;
  totalPrice: number | null;
  hasIssue: boolean;
  lines: OrderLine[];
};

type OrdersResponse = {
  summary: {
    total: number;
    unmatched: number;
    restored: number;
    byGroup: Record<string, number>;
  };
  orders: MarketplaceOrder[];
};

const GROUP_BADGE: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'neutral' }> = {
  new: { label: 'Yeni', tone: 'blue' },
  preparing: { label: 'Hazırlanıyor', tone: 'blue' },
  shipped: { label: 'Kargoda', tone: 'amber' },
  delivered: { label: 'Teslim edildi', tone: 'emerald' },
  cancelled: { label: 'İptal', tone: 'red' },
  returned: { label: 'İade', tone: 'red' },
};

const GROUP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'new', label: 'Yeni' },
  { value: 'preparing', label: 'Hazırlanıyor' },
  { value: 'shipped', label: 'Kargoda' },
  { value: 'delivered', label: 'Teslim edildi' },
  { value: 'cancelled', label: 'İptal' },
  { value: 'returned', label: 'İade' },
];

const DAY_OPTIONS = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
  { value: '365', label: 'Son 1 yıl' },
];

function fmtPrice(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

function fmtDate(d: string | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

export default function MarketplaceOrdersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [days, setDays] = useState('30');
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [selectedMpId, setSelectedMpId] = useState<string | null>(null);

  const mpQuery = useQuery<Marketplace[]>({
    queryKey: ['/api/admin/marketplaces'],
  });
  const marketplaces = (mpQuery.data ?? []).filter((m) => m.isActive);
  const mpId = selectedMpId ?? marketplaces[0]?.id ?? null;

  const ordersQuery = useQuery<OrdersResponse>({
    queryKey: ['/api/admin/marketplaces', mpId, 'orders', statusFilter, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('days', days);
      const res = await apiRequest('GET', `/api/admin/marketplaces/${mpId}/orders?${params}`);
      return await res.json();
    },
    enabled: !!mpId,
    refetchInterval: 60_000,
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/admin/marketplaces/${mpId}/pull-orders`);
    },
    onSuccess: () => {
      toast({ title: 'Siparişler çekildi' });
      qc.invalidateQueries({ queryKey: ['/api/admin/marketplaces', mpId, 'orders'] });
    },
    onError: (err: Error) =>
      toast({ title: 'Çekilemedi', description: err.message, variant: 'destructive' }),
  });

  const summary = ordersQuery.data?.summary;
  const orders = ordersQuery.data?.orders ?? [];

  const summaryChips = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Sipariş', value: summary.total, tone: 'neutral' as const },
      { label: 'Kargoda', value: summary.byGroup.shipped ?? 0, tone: 'amber' as const },
      { label: 'Teslim', value: summary.byGroup.delivered ?? 0, tone: 'emerald' as const },
      {
        label: 'İptal ve iade',
        value: (summary.byGroup.cancelled ?? 0) + (summary.byGroup.returned ?? 0),
        tone: 'red' as const,
      },
      { label: 'Eşleşmeyen satır', value: summary.unmatched, tone: summary.unmatched > 0 ? ('red' as const) : ('neutral' as const) },
    ];
  }, [summary]);

  if (mpQuery.isLoading) return <LoadingState />;

  if (marketplaces.length === 0) {
    return (
      <EmptyState
        title="Pazaryeri yok"
        description="Trendyol siparişlerini görmek için önce Pazaryerleri sekmesinden bir bağlantı ekleyin."
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="tab-marketplace-orders">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 mr-auto">Trendyol Siparişleri</h2>
        {marketplaces.length > 1 && (
          <SelectInput
            value={mpId ?? ''}
            onChange={(e) => setSelectedMpId(e.target.value)}
            className="w-44"
            data-testid="select-orders-marketplace"
          >
            {marketplaces.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectInput>
        )}
        <SecondaryButton
          onClick={() => pullMutation.mutate()}
          disabled={pullMutation.isPending}
          data-testid="button-pull-orders"
        >
          {pullMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Şimdi Çek
        </SecondaryButton>
      </div>

      {/* Özet sayılar */}
      {summary && (
        <div className="flex flex-wrap gap-2" data-testid="orders-summary">
          {summaryChips.map((c) => (
            <div
              key={c.label}
              className="bg-white border border-neutral-200 rounded-lg px-3 py-2 flex items-baseline gap-2"
            >
              <span className="text-lg font-semibold text-neutral-900">{c.value}</span>
              <span className="text-[11px] text-neutral-500">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {summary && summary.unmatched > 0 && (
        <div className="flex items-center gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {summary.unmatched} sipariş satırı site ürünüyle eşleşemedi, bu satırlarda stok düşümü
          yapılmadı. İlgili ürünleri Ürün Gönderimi ekranından barkodla bağlayın.
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <SelectInput
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
          data-testid="select-orders-status"
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-36"
          data-testid="select-orders-days"
        >
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
      </div>

      {ordersQuery.isLoading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Sipariş yok"
          description="Seçili dönem ve durum için Trendyol siparişi bulunamadı."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const badge = GROUP_BADGE[o.statusGroup] ?? { label: o.statusGroup, tone: 'neutral' as const };
            const expanded = openOrder === o.orderNumber;
            return (
              <div
                key={o.orderNumber}
                className="bg-white border border-neutral-200 rounded-lg overflow-hidden"
                data-testid={`order-card-${o.orderNumber}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenOrder(expanded ? null : o.orderNumber)}
                  className="w-full text-left p-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-neutral-50"
                  data-testid={`button-order-toggle-${o.orderNumber}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-neutral-900">
                        #{o.orderNumber}
                      </span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      {o.hasIssue && (
                        <StatusBadge tone="red">
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Sorunlu
                          </span>
                        </StatusBadge>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5 flex flex-wrap gap-x-3">
                      <span>{fmtDate(o.orderedAt)}</span>
                      {o.customerName && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" /> {o.customerName}
                        </span>
                      )}
                      {o.cargoProvider && (
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {o.cargoProvider}
                          {o.cargoTracking ? ` (${o.cargoTracking})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {o.totalPrice != null && (
                      <span className="text-[13px] font-semibold text-neutral-900">
                        {fmtPrice(o.totalPrice)}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-400">
                      {o.lines.length} ürün
                    </span>
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-neutral-100 divide-y divide-neutral-50">
                    {o.lines.map((l) => {
                      const lb = GROUP_BADGE[l.statusGroup] ?? { label: l.status ?? '-', tone: 'neutral' as const };
                      return (
                        <div
                          key={l.id}
                          className="p-3 flex flex-wrap items-center gap-2 text-[12px]"
                          data-testid={`order-line-${l.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-neutral-900 truncate">
                              {l.productName ?? l.productTitle ?? '(ürün adı yok)'}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-2">
                              <span>Barkod: {l.barcode ?? '-'}</span>
                              <span>Adet: {l.quantity}</span>
                              {l.unitPrice != null && <span>Birim: {fmtPrice(l.unitPrice)}</span>}
                              {l.totalPrice != null && <span>Tutar: {fmtPrice(l.totalPrice)}</span>}
                            </div>
                            {l.note && (
                              <div className="text-[11px] text-amber-700 mt-0.5">{l.note}</div>
                            )}
                          </div>
                          <StatusBadge tone={lb.tone}>{lb.label}</StatusBadge>
                          {!l.productId ? (
                            <StatusBadge tone="red">Eşleşmedi</StatusBadge>
                          ) : l.stockRestored ? (
                            <StatusBadge tone="amber">
                              <span className="inline-flex items-center gap-1">
                                <PackageX className="w-3 h-3" /> Stok geri eklendi
                              </span>
                            </StatusBadge>
                          ) : l.stockApplied ? (
                            <StatusBadge tone="emerald">
                              <span className="inline-flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" /> Stok düşüldü
                              </span>
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">Stok düşümü yok</StatusBadge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

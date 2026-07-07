import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { formatTRDateShort, formatTRDateNumeric } from '@shared/dateFormat';
import {
  ShoppingBag,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Truck,
  Eye,
  BarChart3,
  ArrowUpRight,
  ChevronDown,
  Package,
  RefreshCw,
  Banknote,
  Loader2,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  EmptyState,
  SearchInput,
  SelectInput,
  SecondaryButton,
  StatusBadge,
  TextInput,
  Toolbar,
} from './_ui/AdminUI';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  total: string;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  createdAt: string;
}

function BankTransferBadge({ awaitingTransfer = false }: { awaitingTransfer?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 h-5 rounded-md bg-polen-orange/15 border border-polen-orange/40 text-[10.5px] font-semibold text-black uppercase tracking-wider"
      data-testid="badge-bank-transfer"
    >
      🏦 Havale{awaitingTransfer && ' · Onay Bekliyor'}
    </span>
  );
}

type StatusTone = 'neutral' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'red' | 'orange';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'confirmed', label: 'Yeni' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'processing', label: 'Hazırlanıyor' },
  { value: 'shipped', label: 'Kargoda' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: StatusTone; icon: React.ElementType }
> = {
  confirmed: { label: 'Yeni Sipariş', tone: 'orange', icon: Banknote },
  pending: { label: 'Beklemede', tone: 'amber', icon: Clock },
  processing: { label: 'Hazırlanıyor', tone: 'blue', icon: RefreshCw },
  shipped: { label: 'Kargoda', tone: 'indigo', icon: Truck },
  completed: { label: 'Tamamlandı', tone: 'emerald', icon: CheckCircle2 },
  cancelled: { label: 'İptal', tone: 'red', icon: XCircle },
};

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'En yeni önce' },
  { value: 'date-asc', label: 'En eski önce' },
  { value: 'amount-desc', label: 'Yüksek tutar' },
  { value: 'amount-asc', label: 'Düşük tutar' },
];

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return formatTRDateShort(dateStr);
}

function formatCurrency(amount: string | number): string {
  return Number(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
}

function StatusSelect({
  orderId,
  currentStatus,
  onChange,
}: {
  orderId: string;
  currentStatus: string;
  onChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sipariş durumu: ${cfg.label}. Değiştirmek için aç.`}
        data-testid={`select-status-${orderId}`}
      >
        <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="menu"
            aria-label="Sipariş durumu seç"
            className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-md shadow-lg overflow-hidden min-w-[150px] py-1"
          >
            {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
              <button
                key={val}
                type="button"
                role="menuitemradio"
                aria-checked={val === currentStatus}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(orderId, val);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors ${
                  val === currentStatus
                    ? 'text-neutral-900 font-medium'
                    : 'text-neutral-600'
                }`}
              >
                <StatusBadge tone={conf.tone}>{conf.label}</StatusBadge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="w-8 h-8 rounded-md bg-neutral-50 border border-neutral-200 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-neutral-600" />
        </div>
        {hint}
      </div>
      <p
        className="text-[20px] font-semibold tracking-tight text-neutral-900 leading-none tabular-nums"
        data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {value}
      </p>
      <p className="text-[11px] text-neutral-500 mt-1.5">{label}</p>
    </Card>
  );
}

function TableSkeletonRow() {
  return (
    <tr className="border-b border-neutral-100 animate-pulse">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-neutral-100" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-neutral-100" />
            <div className="h-2.5 w-36 rounded bg-neutral-100" />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-24 rounded bg-neutral-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-16 rounded bg-neutral-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-20 rounded-full bg-neutral-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-14 rounded bg-neutral-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-16 rounded bg-neutral-100" />
      </td>
      <td className="px-5 py-3.5" />
    </tr>
  );
}

export default function OrdersPanel() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const {
    data: orders = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const r = await fetch('/api/admin/orders', { credentials: 'include' });
      if (!r.ok) throw new Error('Orders request failed');
      return r.json();
    },
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthOrders = orders.filter(
      (o) => new Date(o.createdAt) >= thisMonthStart,
    );
    const lastMonthOrders = orders.filter(
      (o) =>
        new Date(o.createdAt) >= lastMonthStart &&
        new Date(o.createdAt) < thisMonthStart,
    );

    const thisMonthRevenue = thisMonthOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total), 0);
    const lastMonthRevenue = lastMonthOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total), 0);

    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const awaitingAction = confirmed + pending;
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total), 0);
    const avgOrder = orders.length ? totalRevenue / orders.length : 0;

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : null;

    return {
      awaitingAction,
      thisMonthRevenue,
      revenueGrowth,
      avgOrder,
      totalRevenue,
      thisMonthOrders: thisMonthOrders.length,
    };
  }, [orders]);

  const monthlyData = useMemo(() => {
    const months: { label: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthOrders = orders.filter((o) => {
        const od = new Date(o.createdAt);
        return (
          od.getFullYear() === y &&
          od.getMonth() === m &&
          o.status !== 'cancelled'
        );
      });
      months.push({
        label: d.toLocaleDateString('tr-TR', { month: 'short' }),
        revenue: monthOrders.reduce((s, o) => s + Number(o.total), 0),
        count: monthOrders.length,
      });
    }
    return months;
  }, [orders]);

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.shippingAddress?.city || '').toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((o) => new Date(o.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter((o) => new Date(o.createdAt).getTime() <= to);
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-desc':
          return Number(b.total) - Number(a.total);
        case 'amount-asc':
          return Number(a.total) - Number(b.total);
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return sorted;
  }, [orders, statusFilter, search, sort, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filtersActive =
    statusFilter !== 'all' || !!search.trim() || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-5" data-testid="tab-orders">
      <PageHeader
        title="Siparişler"
        description={
          isLoading
            ? 'Siparişler yükleniyor…'
            : `${orders.length.toLocaleString('tr-TR')} sipariş${
                stats.awaitingAction > 0
                  ? ` - ${stats.awaitingAction} işlem bekliyor`
                  : ''
              }`
        }
        actions={
          <SecondaryButton
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-orders"
          >
            {isFetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Yenile
          </SecondaryButton>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={ShoppingBag}
          label="Bu ay sipariş"
          value={stats.thisMonthOrders.toLocaleString('tr-TR')}
        />
        <KpiCard
          icon={Banknote}
          label="Yeni / Beklemede"
          value={stats.awaitingAction.toLocaleString('tr-TR')}
          hint={
            stats.awaitingAction > 0 ? (
              <StatusBadge tone="amber">İşlem bekliyor</StatusBadge>
            ) : null
          }
        />
        <KpiCard
          icon={TrendingUp}
          label="Bu ay ciro"
          value={`₺${formatCurrency(stats.thisMonthRevenue)}`}
          hint={
            stats.revenueGrowth !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
                  stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
                data-testid="text-revenue-growth"
              >
                <ArrowUpRight
                  className={`w-3 h-3 ${stats.revenueGrowth < 0 ? 'rotate-180' : ''}`}
                />
                {Math.abs(stats.revenueGrowth).toFixed(0)}%
              </span>
            ) : null
          }
        />
        <KpiCard
          icon={BarChart3}
          label="Ortalama sepet"
          value={`₺${formatCurrency(stats.avgOrder)}`}
        />
      </div>

      {/* Monthly Chart */}
      <Card className="p-5">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h3 className="text-[13px] font-semibold text-neutral-900">
              Aylık Ciro
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Son 6 ay (iptal edilenler hariç)
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[14px] font-semibold text-neutral-900 tabular-nums"
              data-testid="text-total-revenue"
            >
              ₺{formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-[11px] text-neutral-500">Toplam</p>
          </div>
        </div>
        <div className="flex items-end gap-3 h-28" data-testid="chart-monthly-revenue">
          {monthlyData.map((m, i) => {
            const height =
              maxRevenue > 0
                ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 8 : 0)
                : 0;
            const isCurrent = i === monthlyData.length - 1;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center" style={{ height: '88px' }}>
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 group relative ${
                      isCurrent
                        ? 'bg-neutral-900'
                        : 'bg-neutral-200 hover:bg-neutral-300'
                    }`}
                    style={{
                      height: `${height}%`,
                      minHeight: m.revenue > 0 ? '4px' : '0px',
                    }}
                  >
                    {m.revenue > 0 && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-neutral-900 rounded-md px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg z-10">
                        ₺{formatCurrency(m.revenue)} · {m.count} sipariş
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium ${isCurrent ? 'text-neutral-900' : 'text-neutral-500'}`}
                >
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Toolbar */}
      <Card className="p-3">
        <Toolbar>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => {
              const count = statusCounts[opt.value] || 0;
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  data-testid={`filter-status-${opt.value}`}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {opt.label}
                  {count > 0 && (
                    <span
                      className={`text-[10px] tabular-nums ${
                        active ? 'text-white/70' : 'text-neutral-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Toolbar>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <SearchInput
            placeholder="Sipariş no, müşteri, e-posta, şehir…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-orders"
            className="sm:flex-1"
          />
          <div className="flex items-center gap-2">
            <TextInput
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-date-from"
              aria-label="Başlangıç tarihi"
              className="!w-[150px]"
            />
            <span className="text-[12px] text-neutral-400">–</span>
            <TextInput
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-date-to"
              aria-label="Bitiş tarihi"
              className="!w-[150px]"
            />
          </div>
          <SelectInput
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            data-testid="select-sort-orders"
            aria-label="Sıralama"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </Card>

      {/* Orders list */}
      <Card className="overflow-hidden">
        {isError ? (
          <div className="py-10 px-6">
            <EmptyState
              icon={XCircle}
              title="Siparişler yüklenemedi"
              description="Bağlantınızı kontrol edip yeniden deneyin."
              action={
                <SecondaryButton onClick={() => refetch()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekrar dene
                </SecondaryButton>
              }
            />
          </div>
        ) : isLoading ? (
          <>
            {/* Mobile skeleton */}
            <div className="md:hidden divide-y divide-neutral-100" data-testid="loading-orders-mobile">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-md bg-neutral-100 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-28 rounded bg-neutral-100" />
                        <div className="h-2.5 w-20 rounded bg-neutral-100" />
                      </div>
                    </div>
                    <div className="h-3 w-12 rounded bg-neutral-100" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 rounded-full bg-neutral-100" />
                    <div className="h-3 w-16 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:block">
            <table className="w-full" data-testid="loading-orders">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Sipariş
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Şehir
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableSkeletonRow key={i} />
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtersActive ? 'Eşleşen sipariş bulunamadı' : 'Henüz sipariş yok'}
            description={
              filtersActive
                ? 'Filtreleri sıfırlayarak tüm siparişleri görüntüleyebilirsiniz.'
                : 'İlk sipariş geldiğinde burada listelenecek.'
            }
            action={
              filtersActive ? (
                <SecondaryButton
                  onClick={() => {
                    setStatusFilter('all');
                    setSearch('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  data-testid="button-clear-filters"
                >
                  Filtreleri temizle
                </SecondaryButton>
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" data-testid="table-orders">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Sipariş
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Şehir
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`${order.orderNumber} – ${order.customerName} siparişini aç`}
                      className="hover:bg-neutral-50/60 transition-colors group cursor-pointer focus:outline-none focus-visible:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900/15"
                      data-testid={`row-order-${order.id}`}
                      onClick={() => navigate(`/toov-admin/orders/${order.id}`)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        const target = e.target as HTMLElement;
                        if (
                          target !== e.currentTarget &&
                          target.closest(
                            'button, a, input, select, textarea, [role="menu"], [role="menuitemradio"]',
                          )
                        )
                          return;
                        e.preventDefault();
                        navigate(`/toov-admin/orders/${order.id}`);
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 text-[11px] font-semibold shrink-0">
                            {getInitials(order.customerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-neutral-900 truncate max-w-[160px]">
                              {order.customerName}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate max-w-[160px]">
                              {order.customerEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[12px] text-neutral-700">
                            {order.orderNumber}
                          </span>
                          {order.paymentMethod === 'bank_transfer' && (
                            <BankTransferBadge awaitingTransfer={order.paymentStatus === 'awaiting_transfer'} />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-neutral-600">
                          {order.shippingAddress?.city || '-'}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusSelect
                          orderId={order.id}
                          currentStatus={order.status}
                          onChange={(id, status) =>
                            updateStatusMutation.mutate({ id, status })
                          }
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-semibold text-neutral-900 tabular-nums">
                          ₺{formatCurrency(order.total)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-[12px] text-neutral-700">
                            {timeAgo(order.createdAt)}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {formatTRDateNumeric(order.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end">
                          <span
                            className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-neutral-200 bg-white text-[11.5px] text-neutral-600 group-hover:text-neutral-900 group-hover:border-neutral-300 transition-colors"
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="w-3 h-3" />
                            Detay
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-neutral-100">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  href={`/toov-admin/orders/${order.id}`}
                  className="block p-4 hover:bg-neutral-50/60 transition-colors"
                  data-testid={`card-order-${order.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 text-[11px] font-semibold shrink-0">
                        {getInitials(order.customerName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">
                          {order.customerName}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] text-neutral-500 font-mono truncate">
                            {order.orderNumber}
                          </p>
                          {order.paymentMethod === 'bank_transfer' && (
                            <BankTransferBadge awaitingTransfer={order.paymentStatus === 'awaiting_transfer'} />
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold text-neutral-900 shrink-0 tabular-nums">
                      ₺{formatCurrency(order.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <StatusSelect
                        orderId={order.id}
                        currentStatus={order.status}
                        onChange={(id, status) =>
                          updateStatusMutation.mutate({ id, status })
                        }
                      />
                      {order.shippingAddress?.city && (
                        <span className="text-[11px] text-neutral-500">
                          · {order.shippingAddress.city}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-500">
                        {timeAgo(order.createdAt)}
                      </span>
                      <span
                        className="p-1.5 rounded-md border border-neutral-200 text-neutral-500"
                        data-testid={`button-view-order-mobile-${order.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export { StatusPill };

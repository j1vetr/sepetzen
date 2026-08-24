import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Package,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import type { Order, Product, ProductVariant, Stats, TabType } from './_shared/types';
import { StatusBadge as AdminStatusBadge } from './_ui/AdminUI';

type IconType = ComponentType<{ className?: string }>;
type Tone = 'amber' | 'blue' | 'red' | 'purple' | 'neutral' | 'emerald';

interface DashboardTabProps {
  stats: Stats | null | undefined;
  orders: Order[];
  products: Product[];
  allVariants: ProductVariant[];
  getStatusLabel: (status: string) => string;
  onNavigate: (tab: TabType) => void;
  onOverdueOrders: () => void;
  onMarketplaceOrders: () => void;
  pendingReviewsCount?: number;
  pendingMarketplaceOrdersCount?: number;
  pendingReturnsCount?: number;
  statsLoading?: boolean;
  ordersLoading?: boolean;
  productsLoading?: boolean;
  allVariantsLoading?: boolean;
  allVariantsError?: boolean;
  pendingReviewsLoading?: boolean;
  pendingReviewsError?: boolean;
  pendingMarketplaceOrdersLoading?: boolean;
  pendingMarketplaceOrdersError?: boolean;
  marketplaceSyncFailureCount?: number;
  marketplaceSyncLoading?: boolean;
  marketplaceSyncError?: boolean;
  pendingReturnsLoading?: boolean;
  pendingReturnsError?: boolean;
  statsError?: boolean;
  ordersError?: boolean;
  productsError?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function isSameDay(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isSameWeek(date: Date, now: Date): boolean {
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7;
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return date >= start && date <= now;
}

function isOverdueOrder(order: Order, now: number): boolean {
  const createdAt = new Date(order.createdAt).getTime();
  return (
    Number.isFinite(createdAt) &&
    ['pending', 'confirmed', 'processing'].includes(order.status) &&
    now - createdAt >= 24 * 60 * 60 * 1000
  );
}

function timeAgo(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return new Date(value).toLocaleDateString('tr-TR');
}

function toneClasses(tone: Tone) {
  return {
    amber: {
      icon: 'bg-amber-50 text-amber-700',
      text: 'text-amber-800',
      border: 'border-amber-200',
      soft: 'bg-amber-50',
    },
    blue: {
      icon: 'bg-blue-50 text-blue-700',
      text: 'text-blue-800',
      border: 'border-blue-200',
      soft: 'bg-blue-50',
    },
    red: {
      icon: 'bg-red-50 text-red-700',
      text: 'text-red-800',
      border: 'border-red-200',
      soft: 'bg-red-50',
    },
    purple: {
      icon: 'bg-violet-50 text-violet-700',
      text: 'text-violet-800',
      border: 'border-violet-200',
      soft: 'bg-violet-50',
    },
    neutral: {
      icon: 'bg-neutral-100 text-neutral-700',
      text: 'text-neutral-800',
      border: 'border-neutral-200',
      soft: 'bg-neutral-50',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      soft: 'bg-emerald-50',
    },
  }[tone];
}

function Section({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-neutral-900">{title}</h3>
          {description && <p className="mt-0.5 truncate text-[12px] text-neutral-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-4 sm:px-6">{children}</div>
    </section>
  );
}

function InlineError({ label }: { label: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  detail,
  icon: Icon,
  loading,
  error,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconType;
  loading: boolean;
  error: boolean;
  onClick?: () => void;
}) {
  const className =
    'w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors ' +
    (onClick ? 'cursor-pointer hover:border-neutral-400 hover:shadow-sm' : '');
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
        <span className="rounded-lg bg-neutral-100 p-1.5 text-neutral-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 min-h-[32px]">
        {loading ? (
          <span className="block h-7 w-20 animate-pulse rounded bg-neutral-100" aria-label={`${label} yükleniyor`} />
        ) : error ? (
          <span className="text-[15px] font-medium text-red-600">Veri alınamadı</span>
        ) : (
          <span className="text-[25px] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
            {value}
          </span>
        )}
      </div>
      {!loading && <p className={`mt-2 text-[11px] ${error ? 'text-red-600' : 'text-neutral-500'}`}>{detail}</p>}
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function QueueRow({
  label,
  description,
  actionLabel,
  count,
  icon: Icon,
  tone,
  loading,
  error,
  onClick,
}: {
  label: string;
  description: string;
  actionLabel: string;
  count: number;
  icon: IconType;
  tone: Tone;
  loading: boolean;
  error: boolean;
  onClick: () => void;
}) {
  const colors = toneClasses(tone);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-3 text-left transition-colors hover:border-neutral-200 hover:bg-neutral-50"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-neutral-900">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-neutral-500">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {loading ? (
          <span className="h-6 w-9 animate-pulse rounded bg-neutral-100" aria-label={`${label} yükleniyor`} />
        ) : error ? (
          <span className="text-[11px] font-medium text-red-600">Alınamadı</span>
        ) : (
          <span className={`text-[18px] font-semibold tabular-nums ${count > 0 ? colors.text : 'text-neutral-400'}`}>
            {formatNumber(count)}
          </span>
        )}
        <span className="hidden text-[11px] font-medium text-neutral-500 sm:block">{actionLabel}</span>
        <ChevronRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-neutral-600" />
      </span>
    </button>
  );
}

type HealthState = 'healthy' | 'attention' | 'loading' | 'error';

function HealthRow({
  label,
  description,
  state,
  icon: Icon,
}: {
  label: string;
  description: string;
  state: HealthState;
  icon: IconType;
}) {
  const stateMeta = {
    healthy: { label: 'Normal', className: 'bg-emerald-50 text-emerald-700', StateIcon: CheckCircle2 },
    attention: { label: 'Dikkat', className: 'bg-amber-50 text-amber-700', StateIcon: AlertTriangle },
    loading: { label: 'Kontrol ediliyor', className: 'bg-neutral-100 text-neutral-600', StateIcon: RefreshCw },
    error: { label: 'Ulaşılamadı', className: 'bg-red-50 text-red-700', StateIcon: AlertCircle },
  }[state];
  const StateIcon = stateMeta.StateIcon;

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-neutral-800">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-neutral-500">{description}</p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${stateMeta.className}`}>
        <StateIcon className={`h-3 w-3 ${state === 'loading' ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{stateMeta.label}</span>
      </span>
    </div>
  );
}

function OrderStatusBadge({
  status,
  getStatusLabel,
}: {
  status: string;
  getStatusLabel: (status: string) => string;
}) {
  const tone: Tone =
    status === 'pending' || status === 'confirmed'
      ? 'amber'
      : status === 'processing'
        ? 'blue'
        : status === 'shipped'
          ? 'neutral'
          : status === 'completed' || status === 'delivered'
            ? 'emerald'
            : status === 'cancelled'
              ? 'red'
              : 'neutral';
  return <AdminStatusBadge tone={tone}>{getStatusLabel(status)}</AdminStatusBadge>;
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-100 py-3 last:border-b-0">
      <span className="h-9 w-9 shrink-0 rounded-md bg-neutral-100" />
      <span className="flex-1 space-y-1.5">
        <span className="block h-3.5 w-40 rounded bg-neutral-100" />
        <span className="block h-3 w-28 rounded bg-neutral-50" />
      </span>
      <span className="h-4 w-16 rounded bg-neutral-100" />
    </div>
  );
}

function ActivityOrderRow({
  order,
  getStatusLabel,
  onClick,
}: {
  order: Order;
  getStatusLabel: (status: string) => string;
  onClick: () => void;
}) {
  const items = order.items ?? [];
  const visibleItems = items.slice(0, 2);
  const extraCount = items.length - visibleItems.length;
  const firstName = items[0]?.productName;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-md border-b border-neutral-100 px-2 py-3 text-left transition-colors last:border-b-0 hover:bg-neutral-50"
      >
        <span className="flex shrink-0 gap-1">
          {visibleItems.length > 0 ? (
            visibleItems.map((item, index) => (
              <span key={index} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                {item.productImage ? (
                  <img src={item.productImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-neutral-400" />
                )}
              </span>
            ))
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100">
              <Package className="h-4 w-4 text-neutral-300" />
            </span>
          )}
          {extraCount > 0 && (
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 text-[10px] font-semibold text-neutral-500">
              +{extraCount}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {firstName && (
            <span className="block truncate text-[13px] font-medium leading-snug text-neutral-900">
              {firstName}
              {items.length > 1 && <span className="font-normal text-neutral-500"> ve {items.length - 1} ürün daha</span>}
            </span>
          )}
          <span className={`block truncate text-[11px] text-neutral-500 tabular-nums ${firstName ? 'mt-0.5' : ''}`}>
            {order.orderNumber}
            {order.customerName && ` · ${order.customerName}`}
            {order.shippingAddress?.city && ` · ${order.shippingAddress.city}`}
            {order.createdAt && ` · ${timeAgo(order.createdAt)}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[13px] font-semibold text-neutral-900 tabular-nums">{formatCurrency(Number(order.total) || 0)}</span>
          <OrderStatusBadge status={order.status} getStatusLabel={getStatusLabel} />
        </span>
      </button>
    </li>
  );
}

function ProductActivityRow({ product, onClick }: { product: Product; onClick: () => void }) {
  const source = product.images?.find((image) => !/\.(mp4|webm|mov)(\?.*)?$/i.test(image)) || product.images?.[0];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-md border-b border-neutral-100 px-2 py-2.5 text-left transition-colors last:border-b-0 hover:bg-neutral-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
          {source ? <img src={source} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-neutral-300" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-neutral-900">{product.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
            {formatCurrency(Number(product.basePrice) || 0)}
            {!product.isActive && <span className="ml-1.5 text-red-500">Pasif</span>}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </button>
    </li>
  );
}

export default function DashboardTab({
  stats,
  orders,
  products,
  allVariants,
  getStatusLabel,
  onNavigate,
  onOverdueOrders,
  onMarketplaceOrders,
  pendingReviewsCount = 0,
  pendingMarketplaceOrdersCount = 0,
  pendingReturnsCount = 0,
  statsLoading = false,
  ordersLoading = false,
  productsLoading = false,
  allVariantsLoading = false,
  allVariantsError = false,
  pendingReviewsLoading = false,
  pendingReviewsError = false,
  pendingMarketplaceOrdersLoading = false,
  pendingMarketplaceOrdersError = false,
  marketplaceSyncFailureCount = 0,
  marketplaceSyncLoading = false,
  marketplaceSyncError = false,
  pendingReturnsLoading = false,
  pendingReturnsError = false,
  statsError = false,
  ordersError = false,
  productsError = false,
}: DashboardTabProps) {
  const now = new Date();
  const todayOrders = orders.filter((order) => isSameDay(new Date(order.createdAt), now));
  const weekOrders = orders.filter((order) => isSameWeek(new Date(order.createdAt), now));
  const todayRevenue = todayOrders
    .filter((order) => order.status !== 'cancelled')
    .reduce((total, order) => total + (Number(order.total) || 0), 0);
  const weekRevenue = weekOrders
    .filter((order) => order.status !== 'cancelled')
    .reduce((total, order) => total + (Number(order.total) || 0), 0);

  const pendingOrderCount = orders.filter((order) => order.status === 'pending' || order.status === 'confirmed').length;
  const processingOrderCount = orders.filter((order) => order.status === 'processing').length;
  const overdueOrderCount = orders.filter((order) => isOverdueOrder(order, now.getTime())).length;
  const activeVariants = allVariants.filter((variant) => variant.product?.isActive !== false);
  const outOfStockCount = activeVariants.filter((variant) => (variant.stock ?? 0) <= 0).length;
  const lowStockCount = activeVariants.filter((variant) => (variant.stock ?? 0) > 0 && (variant.stock ?? 0) <= 5).length;
  const totalStock = activeVariants.reduce((total, variant) => total + (variant.stock ?? 0), 0);
  const activeProducts = products.filter((product) => product.isActive).length;

  const recentOrders = orders.slice(0, 6);
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const ordersReady = !ordersLoading && !ordersError;
  const inventoryReady = !allVariantsLoading && !allVariantsError;
  const queueReady =
    ordersReady &&
    inventoryReady &&
    !pendingReviewsLoading &&
    !pendingReviewsError &&
    !pendingMarketplaceOrdersLoading &&
    !pendingMarketplaceOrdersError &&
    !marketplaceSyncLoading &&
    !marketplaceSyncError &&
    !pendingReturnsLoading &&
    !pendingReturnsError;
  const queueItems = [
    {
      label: 'Yeni siparişler',
      description: 'Beklemede veya onay bekliyor',
      actionLabel: 'Siparişlere git',
      count: pendingOrderCount,
      icon: Clock,
      tone: 'amber' as Tone,
      loading: ordersLoading,
      error: ordersError,
      onClick: () => onNavigate('orders'),
      priority: 4,
    },
    {
      label: 'Hazırlanacak siparişler',
      description: 'Paketleme adımına geçecek',
      actionLabel: 'Siparişlere git',
      count: processingOrderCount,
      icon: PackageOpen,
      tone: 'blue' as Tone,
      loading: ordersLoading,
      error: ordersError,
      onClick: () => onNavigate('orders'),
      priority: 7,
    },
    {
      label: 'Pazaryeri siparişleri',
      description: 'Satış kanalında kontrol bekleyenler',
      actionLabel: 'Kanala git',
      count: pendingMarketplaceOrdersCount,
      icon: Store,
      tone: 'neutral' as Tone,
      loading: pendingMarketplaceOrdersLoading,
      error: pendingMarketplaceOrdersError,
      onClick: onMarketplaceOrders,
      priority: 5,
    },
    {
      label: 'Senkron hataları',
      description: 'Son kanal senkronunda başarısız olan bağlantılar',
      actionLabel: 'Kanala git',
      count: marketplaceSyncFailureCount,
      icon: AlertCircle,
      tone: 'red' as Tone,
      loading: marketplaceSyncLoading,
      error: marketplaceSyncError,
      onClick: () => onNavigate('marketplaces'),
      priority: 1,
    },
    {
      label: 'Geciken işlemler',
      description: '24 saati aşan, kargoya verilmemiş siparişler',
      actionLabel: 'En eskileri aç',
      count: overdueOrderCount,
      icon: Clock,
      tone: 'red' as Tone,
      loading: ordersLoading,
      error: ordersError,
      onClick: onOverdueOrders,
      priority: 3,
    },
    {
      label: 'Bekleyen iadeler',
      description: 'İnceleme ve karar bekliyor',
      actionLabel: 'İadelere git',
      count: pendingReturnsCount,
      icon: RotateCcw,
      tone: 'amber' as Tone,
      loading: pendingReturnsLoading,
      error: pendingReturnsError,
      onClick: () => onNavigate('orders'),
      priority: 4,
    },
    {
      label: 'Stok biten varyantlar',
      description: 'Aktif ürünlerde satış riski',
      actionLabel: 'Stoka git',
      count: outOfStockCount,
      icon: XCircle,
      tone: 'red' as Tone,
      loading: allVariantsLoading,
      error: allVariantsError,
      onClick: () => onNavigate('inventory'),
      priority: 2,
    },
    {
      label: 'Kritik stok',
      description: `5 adede kadar olan aktif varyantlar`,
      actionLabel: 'Stoka git',
      count: lowStockCount,
      icon: AlertTriangle,
      tone: 'amber' as Tone,
      loading: allVariantsLoading,
      error: allVariantsError,
      onClick: () => onNavigate('inventory'),
      priority: 6,
    },
    {
      label: 'Bekleyen yorumlar',
      description: 'Onay veya ret bekliyor',
      actionLabel: 'Yorumlara git',
      count: pendingReviewsCount,
      icon: Star,
      tone: 'purple' as Tone,
      loading: pendingReviewsLoading,
      error: pendingReviewsError,
      onClick: () => onNavigate('reviews'),
      priority: 8,
    },
  ];
  const visibleQueueItems = queueItems
    .filter((item) => item.count > 0 || item.loading || item.error)
    .sort((a, b) => a.priority - b.priority);

  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, {});
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const inventoryHealth: HealthState = allVariantsLoading
    ? 'loading'
    : allVariantsError
      ? 'error'
      : outOfStockCount > 0 || lowStockCount > 0
        ? 'attention'
        : 'healthy';
  const orderHealth: HealthState = ordersLoading ? 'loading' : ordersError ? 'error' : pendingOrderCount > 0 ? 'attention' : 'healthy';
  const reviewHealth: HealthState = pendingReviewsLoading
    ? 'loading'
    : pendingReviewsError
      ? 'error'
      : pendingReviewsCount > 0
        ? 'attention'
        : 'healthy';
  const channelHealth: HealthState = pendingMarketplaceOrdersLoading
    ? 'loading'
    : pendingMarketplaceOrdersError
      ? 'error'
      : pendingMarketplaceOrdersCount > 0
        ? 'attention'
        : 'healthy';
  const syncHealth: HealthState = marketplaceSyncLoading
    ? 'loading'
    : marketplaceSyncError
      ? 'error'
      : marketplaceSyncFailureCount > 0
        ? 'attention'
        : 'healthy';

  return (
    <div className="space-y-6 sm:space-y-7" data-testid="tab-dashboard">
      <header className="flex flex-wrap items-end justify-between gap-4" data-testid="dashboard-header">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Komuta merkezi</p>
          <h2 className="mt-1 text-[21px] font-semibold tracking-tight text-neutral-900">Güne başlarken</h2>
          <p className="mt-1 text-[13px] capitalize text-neutral-500">{formatDate(now)}</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Bugün</p>
            {ordersLoading ? (
              <span className="mt-1 block h-5 w-24 animate-pulse rounded bg-neutral-100" aria-label="Bugünkü siparişler yükleniyor" />
            ) : (
              <p className={`mt-1 text-[16px] font-semibold tabular-nums ${ordersError ? 'text-red-600' : 'text-neutral-900'}`}>
                {ordersError ? 'Veri alınamadı' : `${formatNumber(todayOrders.length)} sipariş`}
              </p>
            )}
            {!ordersLoading && !ordersError && <p className="text-[11px] text-neutral-500">{formatCurrency(todayRevenue)}</p>}
          </div>
          <div className="hidden h-9 w-px bg-neutral-200 sm:block" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Bu hafta</p>
            {ordersLoading ? (
              <span className="mt-1 block h-5 w-24 animate-pulse rounded bg-neutral-100" aria-label="Haftalık siparişler yükleniyor" />
            ) : (
              <p className={`mt-1 text-[16px] font-semibold tabular-nums ${ordersError ? 'text-red-600' : 'text-neutral-900'}`}>
                {ordersError ? 'Veri alınamadı' : `${formatNumber(weekOrders.length)} sipariş`}
              </p>
            )}
            {!ordersLoading && !ordersError && <p className="text-[11px] text-neutral-500">{formatCurrency(weekRevenue)}</p>}
          </div>
        </div>
      </header>

      {statsError && <InlineError label="Mağaza özeti yüklenemedi. Değerler yeniden bağlantı kurulduğunda güncellenecek." />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="dashboard-snapshot">
        <SnapshotCard
          label="Bugünkü satış"
          value={formatCurrency(todayRevenue)}
          detail={ordersError ? 'Sipariş verisi alınamadı' : `${formatNumber(todayOrders.length)} sipariş`}
          icon={Wallet}
          loading={ordersLoading}
          error={ordersError}
          onClick={() => onNavigate('analytics')}
        />
        <SnapshotCard
          label="Sipariş akışı"
          value={formatNumber(pendingOrderCount + processingOrderCount)}
          detail={ordersError ? 'Sipariş verisi alınamadı' : `${formatNumber(pendingOrderCount)} yeni, ${formatNumber(processingOrderCount)} hazırlanıyor`}
          icon={ShoppingCart}
          loading={ordersLoading}
          error={ordersError}
          onClick={() => onNavigate('orders')}
        />
        <SnapshotCard
          label="Stok riski"
          value={formatNumber(outOfStockCount + lowStockCount)}
          detail={allVariantsError ? 'Stok verisi alınamadı' : `${formatNumber(outOfStockCount)} biten, ${formatNumber(lowStockCount)} kritik varyant`}
          icon={Layers}
          loading={allVariantsLoading}
          error={allVariantsError}
          onClick={() => onNavigate('inventory')}
        />
        <SnapshotCard
          label="İade bekleyen"
          value={formatNumber(pendingReturnsCount)}
          detail={pendingReturnsError ? 'İade verisi alınamadı' : 'İnceleme bekleyen talep'}
          icon={RotateCcw}
          loading={pendingReturnsLoading}
          error={pendingReturnsError}
          onClick={() => onNavigate('orders')}
        />
        <SnapshotCard
          label="Satış kanalı"
          value={formatNumber(pendingMarketplaceOrdersCount)}
          detail={pendingMarketplaceOrdersError ? 'Kanal verisi alınamadı' : 'Kontrol bekleyen Trendyol siparişi'}
          icon={Store}
          loading={pendingMarketplaceOrdersLoading}
          error={pendingMarketplaceOrdersError}
          onClick={onMarketplaceOrders}
        />
      </div>

      <Section
        title="Bugün yapılacaklar"
        description={
          !queueReady
            ? 'Sayaçlar güncelleniyor, kesin değerler birazdan hazır'
            : visibleQueueItems.length > 0
              ? `${formatNumber(visibleQueueItems.length)} öncelikli alan müdahale bekliyor`
              : 'Şu anda müdahale bekleyen işlem yok'
        }
        action={
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
            <RefreshCw className="h-3 w-3" />
            30 ila 60 saniyede yenilenir
          </span>
        }
        className="overflow-hidden"
      >
        {visibleQueueItems.length > 0 ? (
          <div className="divide-y divide-neutral-100" data-testid="dashboard-action-queue">
            {visibleQueueItems.map(({ priority: _priority, ...item }) => (
              <QueueRow key={item.label} {...item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="dashboard-queue-empty">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13px] font-medium text-neutral-800">Günün kuyruğu temiz</p>
            <p className="mt-1 max-w-sm text-[12px] text-neutral-500">Yeni bir sipariş veya işlem geldiğinde burada öncelik sırasıyla gösterilecek.</p>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Section
          title="Mağaza sağlığı"
          description="Yöneticinin güvenle kontrol etmesi gereken alanlar"
          action={
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900"
              data-testid="link-store-health-settings"
            >
              Ayarlar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
          className="lg:col-span-1"
        >
          <div className="-my-1 divide-y divide-neutral-100" data-testid="dashboard-store-health">
            <HealthRow
              label="Sipariş operasyonu"
              description={ordersError ? 'Sipariş verisine ulaşılamıyor' : `${formatNumber(pendingOrderCount)} yeni iş bekliyor`}
              state={orderHealth}
              icon={ShoppingCart}
            />
            <HealthRow
              label="Stok durumu"
              description={allVariantsError ? 'Stok verisine ulaşılamıyor' : `${formatNumber(totalStock)} adet aktif varyant stoğu`}
              state={inventoryHealth}
              icon={Package}
            />
            <HealthRow
              label="Satış kanalı"
              description={pendingMarketplaceOrdersError ? 'Kanal kuyruğuna ulaşılamıyor' : `${formatNumber(pendingMarketplaceOrdersCount)} sipariş kontrol bekliyor`}
              state={channelHealth}
              icon={Store}
            />
            <HealthRow
              label="Senkron sağlığı"
              description={
                marketplaceSyncError
                  ? 'Senkron geçmişine ulaşılamıyor'
                  : marketplaceSyncFailureCount > 0
                    ? `${formatNumber(marketplaceSyncFailureCount)} bağlantının son senkronu başarısız`
                    : 'Son senkronlarda başarısız bağlantı yok'
              }
              state={syncHealth}
              icon={RefreshCw}
            />
            <HealthRow
              label="Yorum moderasyonu"
              description={pendingReviewsError ? 'Yorum verisine ulaşılamıyor' : `${formatNumber(pendingReviewsCount)} yorum kontrol bekliyor`}
              state={reviewHealth}
              icon={Star}
            />
          </div>
          <p className="mt-4 border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
            Siparişler 30 saniyede, stok ve sayaçlar 60 saniyede otomatik yenilenir.
          </p>
        </Section>

        <Section
          title="Sipariş görünümü"
          description="Mevcut siparişlerin durum dağılımı"
          action={
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900"
              data-testid="link-order-status"
            >
              Siparişler
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
          className="lg:col-span-2"
        >
          {ordersError ? (
            <InlineError label="Sipariş durumu dağılımı yüklenemedi." />
          ) : ordersLoading ? (
            <div className="space-y-4 py-2" data-testid="dashboard-status-loading">
              <span className="block h-3 w-full animate-pulse rounded bg-neutral-100" />
              <span className="block h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
              <span className="block h-3 w-3/5 animate-pulse rounded bg-neutral-100" />
            </div>
          ) : statusEntries.length === 0 ? (
            <div className="flex items-center gap-3 py-7 text-[12px] text-neutral-500" data-testid="dashboard-status-empty">
              <ShoppingCart className="h-5 w-5 text-neutral-300" />
              Henüz sipariş durumu oluşmadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 py-1 sm:grid-cols-2" data-testid="dashboard-status-breakdown">
              {statusEntries.map(([status, count]) => {
                const maxCount = Math.max(...statusEntries.map(([, value]) => value), 1);
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate text-[12px] text-neutral-700">{getStatusLabel(status)}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-neutral-900">{formatNumber(count)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-neutral-700" style={{ width: `${Math.max(5, (count / maxCount) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Section
          title="Son siparişler"
          description={ordersReady && orders.length > 0 ? `Son ${formatNumber(Math.min(orders.length, 6))} kayıt` : 'Operasyon akışının son hareketleri'}
          action={
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900"
              data-testid="link-view-all-orders"
            >
              Tümünü gör
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
          className="lg:col-span-2"
        >
          {ordersError ? (
            <InlineError label="Son siparişler yüklenemedi. Birazdan tekrar denenecek." />
          ) : ordersLoading && recentOrders.length === 0 ? (
            <div data-testid="dashboard-orders-loading">
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="dashboard-orders-empty">
              <ShoppingCart className="h-7 w-7 text-neutral-300" />
              <p className="mt-2 text-[13px] font-medium text-neutral-700">Henüz sipariş yok</p>
              <p className="mt-1 text-[12px] text-neutral-500">İlk sipariş geldiğinde operasyon özeti burada görünecek.</p>
            </div>
          ) : (
            <ul className="-my-1" data-testid="list-recent-orders">
              {recentOrders.map((order) => (
                <ActivityOrderRow key={order.id} order={order} getStatusLabel={getStatusLabel} onClick={() => onNavigate('orders')} />
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Son katalog hareketleri"
          description="Yeni eklenen ürünler ve yayın durumu"
          action={
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900"
              data-testid="link-view-all-products"
            >
              Ürünlere git
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {productsError && products.length === 0 ? (
            <InlineError label="Katalog verisi yüklenemedi." />
          ) : productsLoading && recentProducts.length === 0 ? (
            <div>
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          ) : recentProducts.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-neutral-500">Henüz ürün yok.</p>
          ) : (
            <ul className="-my-1" data-testid="list-recent-products">
              {recentProducts.map((product) => (
                <ProductActivityRow key={product.id} product={product} onClick={() => onNavigate('products')} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neutral-500" />
          <div>
            <p className="text-[12px] font-medium text-neutral-800">Daha ayrıntılı satış görünümü mü gerekiyor?</p>
            <p className="text-[11px] text-neutral-500">
              Günlük özet operasyon içindir. Dönem karşılaştırmaları ve net ciro raporlarda bulunur.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('analytics')}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-700 hover:text-neutral-950"
          data-testid="link-dashboard-analytics"
        >
          Raporlara git
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
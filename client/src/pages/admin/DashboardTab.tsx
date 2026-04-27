import {
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Clock,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import type { ReactNode, ComponentType } from 'react';
import type { Stats, Order, Product, TabType } from './_shared/types';

interface DashboardTabProps {
  stats: Stats | null | undefined;
  orders: Order[];
  products: Product[];
  getStatusLabel: (status: string) => string;
  onNavigate: (tab: TabType) => void;
  statsLoading?: boolean;
  ordersLoading?: boolean;
  productsLoading?: boolean;
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

function todayLabel(): string {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">
          {label}
        </span>
        <Icon className="w-4 h-4 text-neutral-400" />
      </div>
      <div className="mt-3 sm:mt-4 min-h-[40px] flex items-end">
        {loading ? (
          <span className="block h-7 sm:h-8 w-24 rounded bg-neutral-100" aria-hidden="true" />
        ) : (
          <span className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-neutral-900 tabular-nums leading-none">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function PageSection({
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
    <section className={`bg-white border border-neutral-200 rounded-xl ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-neutral-100">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-neutral-900 truncate">{title}</h3>
          {description && (
            <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 sm:px-6 py-4">{children}</div>
    </section>
  );
}

function StatusBadge({
  status,
  getStatusLabel,
}: {
  status: string;
  getStatusLabel: (status: string) => string;
}) {
  const tone: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  const cls = tone[status] ?? 'bg-neutral-50 text-neutral-700 border-neutral-200';
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function OrderRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-100 last:border-b-0">
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="block h-3.5 w-24 rounded bg-neutral-100" />
        <span className="block h-3 w-32 rounded bg-neutral-50" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="block h-3.5 w-16 rounded bg-neutral-100" />
        <span className="block h-4 w-20 rounded-full bg-neutral-50" />
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
        <span className="text-[13px] text-neutral-700 truncate">{label}</span>
      </div>
      {loading ? (
        <span className="block h-4 w-10 rounded bg-neutral-100" />
      ) : (
        <span className="text-[15px] font-semibold text-neutral-900 tabular-nums">{value}</span>
      )}
    </div>
  );
}

function InlineError({ label }: { label: string }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700"
      role="alert"
    >
      <AlertCircle className="w-3.5 h-3.5 mt-[1px] shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export default function DashboardTab({
  stats,
  orders,
  products,
  getStatusLabel,
  onNavigate,
  statsLoading = false,
  ordersLoading = false,
  productsLoading = false,
  statsError = false,
  ordersError = false,
  productsError = false,
}: DashboardTabProps) {
  const recentOrders = orders.slice(0, 5);
  const activeProducts = products.filter((p) => p.isActive).length;
  const showStatsLoading = statsLoading && !stats && !statsError;

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="tab-dashboard">
      <header data-testid="dashboard-header">
        <p className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">
          Genel Bakış
        </p>
        <h2 className="mt-1 text-[20px] sm:text-[22px] font-semibold tracking-tight text-neutral-900">
          Bugünkü tablo
        </h2>
        <p className="mt-1 text-[13px] text-neutral-500 first-letter:uppercase">
          {todayLabel()}
        </p>
      </header>

      {statsError && (
        <InlineError label="İstatistikler şu anda yüklenemedi. Bağlantı geri geldiğinde otomatik yenilenir." />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Package}
          label="Ürün"
          value={formatNumber(stats?.totalProducts ?? 0)}
          loading={showStatsLoading}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Sipariş"
          value={formatNumber(stats?.totalOrders ?? 0)}
          loading={showStatsLoading}
        />
        <KpiCard
          icon={Users}
          label="Kullanıcı"
          value={formatNumber(stats?.totalUsers ?? 0)}
          loading={showStatsLoading}
        />
        <KpiCard
          icon={Wallet}
          label="Gelir"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          loading={showStatsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <PageSection
          title="Son Siparişler"
          description={
            !ordersLoading && orders.length > 0
              ? `Toplam ${formatNumber(orders.length)} sipariş`
              : undefined
          }
          action={
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              data-testid="link-view-all-orders"
            >
              Tümü
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {ordersError ? (
            <InlineError label="Siparişler yüklenemedi. Birazdan tekrar denenecek." />
          ) : ordersLoading && recentOrders.length === 0 ? (
            <div data-testid="dashboard-orders-loading">
              <OrderRowSkeleton />
              <OrderRowSkeleton />
              <OrderRowSkeleton />
            </div>
          ) : recentOrders.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center py-10"
              data-testid="dashboard-orders-empty"
            >
              <ShoppingCart className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-[13px] font-medium text-neutral-700">Henüz sipariş yok</p>
              <p className="text-[12px] text-neutral-500 mt-1 max-w-xs">
                İlk siparişin geldiğinde burada özet olarak gösterilecek.
              </p>
            </div>
          ) : (
            <ul className="-my-1" data-testid="list-recent-orders">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  data-testid={`row-order-${order.id}`}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate('orders')}
                    className="w-full flex items-center justify-between gap-4 py-3 border-b border-neutral-100 last:border-b-0 text-left hover:bg-neutral-50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium text-neutral-900 truncate tabular-nums"
                        data-testid={`text-order-number-${order.id}`}
                      >
                        {order.orderNumber}
                      </p>
                      <p className="text-[12px] text-neutral-500 truncate mt-0.5">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="text-[13px] font-semibold text-neutral-900 tabular-nums"
                        data-testid={`text-order-total-${order.id}`}
                      >
                        {formatCurrency(Number(order.total) || 0)}
                      </span>
                      <StatusBadge status={order.status} getStatusLabel={getStatusLabel} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title="Hızlı İstatistikler" description="Anlık özet">
          {statsError && productsError ? (
            <InlineError label="İstatistikler yüklenemedi. Birazdan tekrar denenecek." />
          ) : (
            <div className="-my-1">
              <StatRow
                icon={Clock}
                label="Bekleyen siparişler"
                value={formatNumber(stats?.pendingOrders ?? 0)}
                loading={showStatsLoading}
              />
              <StatRow
                icon={Layers}
                label="Kategoriler"
                value={formatNumber(stats?.totalCategories ?? 0)}
                loading={showStatsLoading}
              />
              <StatRow
                icon={CheckCircle2}
                label="Aktif ürünler"
                value={formatNumber(activeProducts)}
                loading={productsLoading && products.length === 0 && !productsError}
              />
            </div>
          )}
        </PageSection>
      </div>
    </div>
  );
}

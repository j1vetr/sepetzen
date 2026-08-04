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
  TrendingUp,
  Sparkles,
  Star,
  Ticket,
  LayoutTemplate,
  Settings,
  Store,
  Truck,
  XCircle,
  PackageOpen,
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameWeek(d: Date, now: Date): boolean {
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7; // Pazartesi başlangıç
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return d >= start && d <= now;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  onClick?: () => void;
}) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 text-left w-full ${
        onClick ? 'hover:border-neutral-400 hover:shadow-sm transition-all cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">
          {label}
        </span>
        <span className="p-1.5 rounded-lg bg-neutral-100">
          <Icon className="w-4 h-4 text-neutral-600" />
        </span>
      </div>
      <div className="mt-3 min-h-[40px] flex items-end">
        {loading ? (
          <span className="block h-7 sm:h-8 w-24 rounded bg-neutral-100" aria-hidden="true" />
        ) : (
          <span className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-neutral-900 tabular-nums leading-none">
            {value}
          </span>
        )}
      </div>
      {sub && !loading && (
        <p className="mt-2 text-[12px] text-neutral-500">{sub}</p>
      )}
    </Wrapper>
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

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_BAR: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-amber-400',
  processing: 'bg-blue-400',
  shipped: 'bg-indigo-400',
  completed: 'bg-emerald-400',
  delivered: 'bg-emerald-400',
  cancelled: 'bg-red-400',
};

const STATUS_ICON: Record<string, ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: Clock,
  processing: PackageOpen,
  shipped: Truck,
  completed: CheckCircle2,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

function StatusBadge({
  status,
  getStatusLabel,
}: {
  status: string;
  getStatusLabel: (status: string) => string;
}) {
  const cls = STATUS_TONE[status] ?? 'bg-neutral-50 text-neutral-700 border-neutral-200';
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

const QUICK_ACTIONS: { tab: TabType; label: string; desc: string; Icon: ComponentType<{ className?: string }> }[] = [
  { tab: 'orders', label: 'Siparişler', desc: 'Sipariş yönetimi', Icon: ShoppingCart },
  { tab: 'products', label: 'Ürünler', desc: 'Ekle & düzenle', Icon: Package },
  { tab: 'inventory', label: 'Stok', desc: 'Stok takibi', Icon: Layers },
  { tab: 'coupons', label: 'Kuponlar', desc: 'İndirim kodları', Icon: Ticket },
  { tab: 'reviews', label: 'Yorumlar', desc: 'Onay bekleyenler', Icon: Star },
  { tab: 'homepage', label: 'Ana Sayfa', desc: 'Vitrin düzeni', Icon: LayoutTemplate },
  { tab: 'marketplaces', label: 'Pazaryerleri', desc: 'Trendyol & co.', Icon: Store },
  { tab: 'settings', label: 'Ayarlar', desc: 'Sistem ayarları', Icon: Settings },
];

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
  const recentOrders = orders.slice(0, 6);
  const activeProducts = products.filter((p) => p.isActive).length;
  const showStatsLoading = statsLoading && !stats && !statsError;

  const now = new Date();
  const todayOrders = orders.filter((o) => isSameDay(new Date(o.createdAt), now));
  const weekOrders = orders.filter((o) => isSameWeek(new Date(o.createdAt), now));
  const todayRevenue = todayOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const weekRevenue = weekOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusRows = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusRows.map(([, c]) => c));

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="tab-dashboard">
      <header className="flex flex-wrap items-end justify-between gap-4" data-testid="dashboard-header">
        <div>
          <p className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">
            Genel Bakış
          </p>
          <h2 className="mt-1 text-[20px] sm:text-[22px] font-semibold tracking-tight text-neutral-900">
            Bugünkü tablo
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500 first-letter:uppercase">{todayLabel()}</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">Bugün</p>
            <p className="text-[17px] font-semibold text-neutral-900 tabular-nums">
              {formatNumber(todayOrders.length)} sipariş · {formatCurrency(todayRevenue)}
            </p>
          </div>
          <div className="hidden sm:block w-px h-9 bg-neutral-200" />
          <div className="hidden sm:block">
            <p className="text-[11px] font-medium tracking-wide uppercase text-neutral-500">Bu Hafta</p>
            <p className="text-[17px] font-semibold text-neutral-900 tabular-nums">
              {formatNumber(weekOrders.length)} sipariş · {formatCurrency(weekRevenue)}
            </p>
          </div>
        </div>
      </header>

      {statsError && (
        <InlineError label="İstatistikler şu anda yüklenemedi. Bağlantı geri geldiğinde otomatik yenilenir." />
      )}

      {(stats?.pendingOrders ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100 transition-colors"
          data-testid="banner-pending-orders"
        >
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-[13px] text-amber-800 flex-1">
            <strong>{formatNumber(stats!.pendingOrders)}</strong> sipariş işlem bekliyor.
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-700">
            Siparişlere git <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Wallet}
          label="Toplam Gelir"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          sub={`Bu hafta ${formatCurrency(weekRevenue)}`}
          loading={showStatsLoading}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Sipariş"
          value={formatNumber(stats?.totalOrders ?? 0)}
          sub={`${formatNumber(stats?.pendingOrders ?? 0)} bekleyen`}
          loading={showStatsLoading}
          onClick={() => onNavigate('orders')}
        />
        <KpiCard
          icon={Package}
          label="Ürün"
          value={formatNumber(stats?.totalProducts ?? 0)}
          sub={`${formatNumber(activeProducts)} aktif · ${formatNumber(stats?.totalCategories ?? 0)} kategori`}
          loading={showStatsLoading}
          onClick={() => onNavigate('products')}
        />
        <KpiCard
          icon={Users}
          label="Kullanıcı"
          value={formatNumber(stats?.totalUsers ?? 0)}
          sub="Kayıtlı müşteri"
          loading={showStatsLoading}
          onClick={() => onNavigate('users')}
        />
      </div>

      <PageSection title="Hızlı Erişim" description="Sık kullanılan bölümlere tek tıkla gidin">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map(({ tab, label, desc, Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className="group flex items-center gap-3 px-3.5 py-3 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all text-left"
              data-testid={`quick-action-${tab}`}
            >
              <span className="p-2 rounded-lg bg-neutral-100 group-hover:bg-white transition-colors shrink-0">
                <Icon className="w-4 h-4 text-neutral-700" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{label}</span>
                <span className="block text-[11px] text-neutral-500 truncate">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </PageSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <PageSection
          className="lg:col-span-2"
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
                <li key={order.id} data-testid={`row-order-${order.id}`}>
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
                        {order.shippingAddress?.city ? ` · ${order.shippingAddress.city}` : ''}
                        {order.createdAt ? ` · ${timeAgo(order.createdAt)}` : ''}
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

        <div className="space-y-4 sm:space-y-6">
          <PageSection title="Sipariş Durumları" description="Tüm siparişlerin dağılımı">
            {statusRows.length === 0 ? (
              <p className="text-[12px] text-neutral-500 py-4 text-center">Henüz veri yok</p>
            ) : (
              <div className="space-y-3 py-1">
                {statusRows.map(([status, count]) => {
                  const Icon = STATUS_ICON[status] ?? Clock;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                          <Icon className="w-3.5 h-3.5 text-neutral-400" />
                          {getStatusLabel(status)}
                        </span>
                        <span className="text-[12px] font-semibold text-neutral-900 tabular-nums">
                          {formatNumber(count)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STATUS_BAR[status] ?? 'bg-neutral-400'}`}
                          style={{ width: `${Math.max(4, (count / maxStatus) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PageSection>

          <PageSection
            title="Son Eklenen Ürünler"
            action={
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                data-testid="link-view-all-products"
              >
                Tümü
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {productsError && products.length === 0 ? (
              <InlineError label="Ürünler yüklenemedi." />
            ) : productsLoading && recentProducts.length === 0 ? (
              <div>
                <OrderRowSkeleton />
                <OrderRowSkeleton />
              </div>
            ) : recentProducts.length === 0 ? (
              <p className="text-[12px] text-neutral-500 py-4 text-center">Henüz ürün yok</p>
            ) : (
              <ul className="-my-1" data-testid="list-recent-products">
                {recentProducts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate('products')}
                      className="w-full flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-b-0 text-left hover:bg-neutral-50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <span className="w-9 h-9 rounded-md bg-neutral-100 overflow-hidden shrink-0">
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-medium text-neutral-900 truncate">{p.name}</span>
                        <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          {formatCurrency(Number(p.basePrice) || 0)}
                          {p.isNew && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600">
                              <Sparkles className="w-2.5 h-2.5" /> Yeni
                            </span>
                          )}
                          {p.isFeatured && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                              <TrendingUp className="w-2.5 h-2.5" /> Öne çıkan
                            </span>
                          )}
                          {!p.isActive && <span className="text-[10px] text-red-500">Pasif</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      </div>
    </div>
  );
}

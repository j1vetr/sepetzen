import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, Package,
  Award, BarChart3, Loader2, Globe, Download, CreditCard, Store, XCircle, Minus, type LucideIcon,
} from 'lucide-react';
import type {
  AnalyticsStatusRow, AnalyticsBestSeller, AnalyticsCountryRow,
  AnalyticsGranularity, AnalyticsOverview, AnalyticsBreakdownRow, AnalyticsSeriesRow,
} from './_shared/types';

const fmtInt = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtPrice = (n: number) => '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtCompact = (n: number) => '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoShift(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Kırılıma göre varsayılan başlangıç tarihi (sunucudaki varsayılanla aynı). */
function defaultStart(granularity: AnalyticsGranularity): string {
  const now = new Date();
  if (granularity === 'day') return isoShift(-29);
  if (granularity === 'month') return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1)).toISOString().slice(0, 10);
  return new Date(Date.UTC(now.getFullYear() - 4, 0, 1)).toISOString().slice(0, 10);
}

function bucketLabel(bucket: string, granularity: AnalyticsGranularity): string {
  const date = new Date(`${bucket}T00:00:00.000Z`);
  if (granularity === 'year') return String(date.getUTCFullYear());
  if (granularity === 'month') return new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date);
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(date);
}

function fullBucketLabel(bucket: string, granularity: AnalyticsGranularity): string {
  const date = new Date(`${bucket}T00:00:00.000Z`);
  if (granularity === 'year') return String(date.getUTCFullYear());
  if (granularity === 'month') return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' };
  const f = new Intl.DateTimeFormat('tr-TR', opts);
  return `${f.format(new Date(`${start}T00:00:00Z`))} – ${f.format(new Date(`${end}T00:00:00Z`))}`;
}

const BREAKDOWN_COLORS = ['#0f172a', '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export default function AnalyticsPanel() {
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('day');
  const [start, setStart] = useState<string>(() => defaultStart('day'));
  const [end, setEnd] = useState<string>(isoToday);

  const params = new URLSearchParams({ granularity, start, end }).toString();

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery<AnalyticsOverview>({
    queryKey: ['admin-analytics-overview', granularity, start, end],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/overview?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Satış analizi yüklenemedi');
      return res.json();
    },
  });

  const { data: bestSellers, isLoading: bestSellersLoading } = useQuery({
    queryKey: ['admin-best-sellers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/best-sellers?limit=8', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: statusBreakdown } = useQuery({
    queryKey: ['admin-status-breakdown'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/status-breakdown', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: countryBreakdown } = useQuery({
    queryKey: ['admin-country-breakdown'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/country-breakdown', { credentials: 'include' });
      return res.json();
    },
  });

  const applyGranularity = (next: AnalyticsGranularity) => {
    setGranularity(next);
    setStart(defaultStart(next));
    setEnd(isoToday());
  };

  const applyPreset = (days: number) => {
    setGranularity(days > 180 ? 'month' : 'day');
    setStart(isoShift(-(days - 1)));
    setEnd(isoToday());
  };

  const STATUS_META: Record<string, { label: string; color: string }> = {
    confirmed:  { label: 'Yeni Sipariş', color: '#f97316' },
    pending:    { label: 'Beklemede',    color: '#f59e0b' },
    processing: { label: 'İşleniyor',    color: '#3b82f6' },
    shipped:    { label: 'Kargoda',      color: '#a855f7' },
    completed:  { label: 'Tamamlandı',   color: '#10b981' },
    cancelled:  { label: 'İptal',        color: '#ef4444' },
  };

  const totalStatusOrders = (statusBreakdown || []).reduce((s: number, r: AnalyticsStatusRow) => s + r.count, 0);
  const maxBestRevenue = bestSellers?.length > 0 ? Math.max(...bestSellers.map((b: AnalyticsBestSeller) => b.revenue)) : 1;
  const series: AnalyticsSeriesRow[] = overview?.series ?? [];
  const maxNetRevenue = useMemo(() => Math.max(1, ...series.map((row) => row.netRevenue)), [series]);
  const hasData = series.some((row) => row.orders > 0);
  const chartHeight = 200;

  const ChangeBadge = ({ value }: { value: number | null | undefined }) => {
    if (value === null || value === undefined) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-neutral-100 text-neutral-400" title="Önceki dönemde veri yok">
          <Minus className="w-3 h-3" /> —
        </span>
      );
    }
    const positive = value >= 0;
    return (
      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const KpiCard = ({ icon: Icon, iconClass, label, value, sub, change, loading, testId }: {
    icon: LucideIcon; iconClass: string; label: string; value: string; sub?: string;
    change?: number | null; loading?: boolean; testId: string;
  }) => (
    <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid={testId}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && <ChangeBadge value={change} />}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-neutral-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</p>
      )}
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );

  const BreakdownList = ({ rows, emptyText }: { rows: AnalyticsBreakdownRow[]; emptyText: string }) => {
    const total = rows.reduce((sum, row) => sum + row.revenue, 0);
    if (rows.length === 0) {
      return <div className="px-6 py-10 text-center text-sm text-neutral-500">{emptyText}</div>;
    }
    return (
      <div className="px-6 py-5 space-y-4">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          {rows.map((row, index) => (
            <div
              key={row.key}
              style={{ width: `${total > 0 ? (row.revenue / total) * 100 : 0}%`, backgroundColor: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length] }}
            />
          ))}
        </div>
        <div className="space-y-3">
          {rows.map((row, index) => {
            const share = total > 0 ? (row.revenue / total) * 100 : 0;
            return (
              <div key={row.key} className="flex items-center gap-3" data-testid={`row-breakdown-${row.key}`}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length] }} />
                <span className="text-sm text-neutral-700 flex-1 truncate">{row.label}</span>
                <span className="text-xs text-neutral-400 whitespace-nowrap">{fmtInt(row.orders)} sipariş</span>
                <span className="text-sm font-semibold text-neutral-900 whitespace-nowrap">{fmtPrice(row.revenue)}</span>
                <span className="text-xs text-neutral-400 w-10 text-right">{share.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Dönem seçici */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Kırılım</p>
              <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5">
                {([['day', 'Günlük'], ['month', 'Aylık'], ['year', 'Yıllık']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => applyGranularity(value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${granularity === value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                    data-testid={`button-granularity-${value}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Başlangıç</p>
              <input
                type="date"
                value={start}
                max={end}
                onChange={(event) => setStart(event.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900"
                data-testid="input-analytics-start"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Bitiş</p>
              <input
                type="date"
                value={end}
                min={start}
                onChange={(event) => setEnd(event.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900"
                data-testid="input-analytics-end"
              />
            </div>
            <div className="flex gap-1.5">
              {([[7, '7 gün'], [30, '30 gün'], [365, '1 yıl']] as const).map(([days, label]) => (
                <button
                  key={days}
                  onClick={() => applyPreset(days)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  data-testid={`button-preset-${days}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <a
            href={`/api/admin/analytics/export?${params}`}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            data-testid="link-export-csv"
          >
            <Download className="w-4 h-4" /> CSV indir
          </a>
        </div>
        {overview && (
          <p className="mt-3 text-xs text-neutral-400">
            Seçili dönem: {formatRange(overview.range.start, overview.range.end)} · Karşılaştırma: {formatRange(overview.previousRange.start, overview.previousRange.end)}
          </p>
        )}
      </div>

      {overviewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Satış analizi yüklenemedi. Tarih aralığını kontrol edip tekrar deneyin.
        </div>
      )}

      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          testId="card-net-revenue"
          icon={DollarSign} iconClass="bg-emerald-500/10 text-emerald-600"
          label="Net ciro (iptaller düşülmüş)"
          value={overview ? fmtPrice(overview.summary.netRevenue) : '-'}
          sub={overview ? `Önceki dönem: ${fmtPrice(overview.previousSummary.netRevenue)}` : undefined}
          change={overview?.changes.netRevenue}
          loading={overviewLoading}
        />
        <KpiCard
          testId="card-net-orders"
          icon={ShoppingBag} iconClass="bg-blue-500/10 text-blue-600"
          label="Net sipariş"
          value={overview ? fmtInt(overview.summary.netOrders) : '-'}
          sub={overview ? `Önceki dönem: ${fmtInt(overview.previousSummary.netOrders)}` : undefined}
          change={overview?.changes.netOrders}
          loading={overviewLoading}
        />
        <KpiCard
          testId="card-avg-order"
          icon={TrendingUp} iconClass="bg-purple-500/10 text-purple-600"
          label="Ortalama sepet tutarı"
          value={overview ? fmtPrice(overview.summary.avgOrderValue) : '-'}
          sub={overview ? `Önceki dönem: ${fmtPrice(overview.previousSummary.avgOrderValue)}` : undefined}
          change={overview?.changes.avgOrderValue}
          loading={overviewLoading}
        />
        <KpiCard
          testId="card-cancelled"
          icon={XCircle} iconClass="bg-red-500/10 text-red-600"
          label="İptal / iade"
          value={overview ? `${fmtInt(overview.summary.cancelledOrders)} sipariş` : '-'}
          sub={overview ? `${fmtPrice(overview.summary.cancelledRevenue)} · oran %${overview.summary.cancelRate.toFixed(1)}` : undefined}
          loading={overviewLoading}
        />
      </div>

      {/* Satış grafiği */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Satış Grafiği</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {granularity === 'day' ? 'Günlük' : granularity === 'month' ? 'Aylık' : 'Yıllık'} net ciro dağılımı
            </p>
          </div>
          {overview && (
            <div className="text-right">
              <p className="text-xs text-neutral-500">Brüt ciro</p>
              <p className="text-sm font-semibold text-neutral-900">{fmtPrice(overview.summary.grossRevenue)}</p>
            </div>
          )}
        </div>

        {overviewLoading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight + 40 }}>
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : hasData ? (
          <div>
            <div className="relative" style={{ height: chartHeight }}>
              {[0, 25, 50, 75, 100].map((pct) => (
                <div key={pct} className="absolute w-full border-t border-neutral-200/70" style={{ bottom: `${pct}%` }}>
                  {pct > 0 && (
                    <span className="absolute right-0 -translate-y-1/2 text-[10px] text-neutral-400 pr-1 select-none">
                      {fmtCompact((maxNetRevenue * pct) / 100)}
                    </span>
                  )}
                </div>
              ))}
              <div className="absolute inset-0 flex items-end gap-[3px] pr-12 overflow-x-auto">
                {series.map((row) => {
                  const height = Math.max((row.netRevenue / maxNetRevenue) * 100, row.netRevenue > 0 ? 2 : 0);
                  return (
                    <div key={row.bucket} className="flex-1 min-w-[6px] h-full flex items-end group relative">
                      <div
                        className="w-full rounded-t-md bg-neutral-800 transition-all duration-300 group-hover:bg-blue-500"
                        style={{ height: `${height}%`, minHeight: row.netRevenue > 0 ? '4px' : '0' }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-start bg-white border border-neutral-200 rounded-lg px-3 py-2 shadow-xl z-20 pointer-events-none whitespace-nowrap">
                          <span className="text-neutral-500 text-[10px]">{fullBucketLabel(row.bucket, granularity)}</span>
                          <span className="text-neutral-900 text-xs font-semibold">{fmtPrice(row.netRevenue)} net</span>
                          <span className="text-neutral-500 text-[10px]">{row.netOrders} sipariş · {row.cancelledOrders} iptal</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Masaüstü: bar başına etiket */}
            <div className="hidden sm:flex gap-[3px] mt-2 pr-12">
              {series.map((row, index) => {
                const step = Math.ceil(series.length / 12);
                const showLabel = series.length <= 12 || index % step === 0;
                return (
                  <div key={row.bucket} className="flex-1 min-w-[6px] text-center">
                    <span className="text-[9px] text-neutral-400 block truncate">{showLabel ? bucketLabel(row.bucket, granularity) : ''}</span>
                  </div>
                );
              })}
            </div>
            {/* Mobil: dar ekranda etiketler üst üste binmesin diye yalnızca uçlar ve orta nokta */}
            <div className="flex sm:hidden justify-between mt-2 pr-12">
              {[0, Math.floor((series.length - 1) / 2), series.length - 1]
                .filter((index, position, all) => index >= 0 && all.indexOf(index) === position)
                .map((index) => (
                  <span key={series[index].bucket} className="text-[10px] text-neutral-400">
                    {bucketLabel(series[index].bucket, granularity)}
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-neutral-500 text-sm" style={{ height: chartHeight }}>
            Bu dönem için satış verisi bulunamadı
          </div>
        )}
      </div>

      {/* Ödeme yöntemi + kanal kırılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Ödeme Yöntemi Kırılımı</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Net satışlar, seçili dönem</p>
            </div>
            <CreditCard className="w-4 h-4 text-neutral-500" />
          </div>
          <BreakdownList rows={overview?.paymentBreakdown ?? []} emptyText="Bu dönemde ödeme verisi yok" />
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Sipariş Kaynağı</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Web sitesi ve pazaryerleri</p>
            </div>
            <Store className="w-4 h-4 text-neutral-500" />
          </div>
          <BreakdownList rows={overview?.channelBreakdown ?? []} emptyText="Bu dönemde sipariş kaynağı verisi yok" />
        </div>
      </div>

      {/* Detay tablosu */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Dönem Detayı</h3>
            <p className="text-xs text-neutral-500 mt-0.5">İptal edilen siparişler net rakamlardan düşülmüştür</p>
          </div>
          <BarChart3 className="w-4 h-4 text-neutral-500" />
        </div>

        {overviewLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
        ) : !hasData ? (
          <div className="p-8 text-center text-sm text-neutral-500">Bu dönemde sipariş yok</div>
        ) : (
          <>
            {/* Masaüstü tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" data-testid="table-analytics-detail">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Dönem</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Sipariş</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">İptal</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Brüt Ciro</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Net Ciro</th>
                    <th className="text-right px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Ort. Sepet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {series.filter((row) => row.orders > 0).map((row) => (
                    <tr key={row.bucket} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-neutral-900">{fullBucketLabel(row.bucket, granularity)}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-700">{fmtInt(row.orders)}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-500">{fmtInt(row.cancelledOrders)}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-700">{fmtPrice(row.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{fmtPrice(row.netRevenue)}</td>
                      <td className="px-6 py-3 text-right text-sm text-neutral-700">{fmtPrice(row.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
                {overview && (
                  <tfoot>
                    <tr className="bg-neutral-50 border-t border-neutral-200">
                      <td className="px-6 py-3 text-sm font-semibold text-neutral-900">Toplam</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{fmtInt(overview.summary.orders)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">{fmtInt(overview.summary.cancelledOrders)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{fmtPrice(overview.summary.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{fmtPrice(overview.summary.netRevenue)}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">{fmtPrice(overview.summary.avgOrderValue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobil kart listesi */}
            <div className="md:hidden divide-y divide-neutral-200/60">
              {series.filter((row) => row.orders > 0).map((row) => (
                <div key={row.bucket} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-neutral-900">{fullBucketLabel(row.bucket, granularity)}</span>
                    <span className="text-sm font-semibold text-neutral-900">{fmtPrice(row.netRevenue)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-500">
                    <span>{fmtInt(row.orders)} sipariş · {fmtInt(row.cancelledOrders)} iptal</span>
                    <span>Ort. {fmtPrice(row.avgOrderValue)}</span>
                  </div>
                </div>
              ))}
              {overview && (
                <div className="px-4 py-4 bg-neutral-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-neutral-900">Toplam</span>
                    <span className="text-sm font-semibold text-neutral-900">{fmtPrice(overview.summary.netRevenue)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-500">
                    <span>{fmtInt(overview.summary.orders)} sipariş · {fmtInt(overview.summary.cancelledOrders)} iptal</span>
                    <span>Ort. {fmtPrice(overview.summary.avgOrderValue)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Çok satanlar + sipariş durumu */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">En Çok Satan Ürünler</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Tüm zamanlar, satış adedine göre</p>
            </div>
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="divide-y divide-neutral-200/60">
            {bestSellersLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
            ) : bestSellers?.filter((b: AnalyticsBestSeller) => b.totalSold > 0).length > 0 ? (
              bestSellers.filter((b: AnalyticsBestSeller) => b.totalSold > 0).map((item: AnalyticsBestSeller, index: number) => {
                const barPct = maxBestRevenue > 0 ? (item.revenue / maxBestRevenue) * 100 : 0;
                const rankColors = ['text-yellow-500', 'text-neutral-500', 'text-amber-600'];
                return (
                  <div key={item.product?.id ?? item.productId} className="flex items-center gap-3 px-6 py-3 hover:bg-neutral-50/50 transition-colors">
                    <span className={`w-5 text-xs font-bold text-center flex-shrink-0 ${rankColors[index] || 'text-neutral-400'}`}>{index + 1}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      {item.product?.images?.[0]
                        ? <img src={item.product?.images?.[0] ?? ''} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-neutral-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{item.product?.name ?? item.productName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-neutral-100 rounded-full h-1">
                          <div className="bg-neutral-800 h-1 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">{item.totalSold} adet</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-neutral-900">{fmtPrice(item.revenue)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-neutral-500 text-sm">Henüz satış verisi yok</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Sipariş Dağılımı</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Duruma göre tüm zamanlar</p>
            </div>
            <BarChart3 className="w-4 h-4 text-neutral-500" />
          </div>

          {statusBreakdown?.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return (statusBreakdown || []).map((r: AnalyticsStatusRow) => {
                      const pct = totalStatusOrders > 0 ? (r.count / totalStatusOrders) * 100 : 0;
                      const color = STATUS_META[r.status]?.color || '#71717a';
                      const el = (
                        <circle
                          key={r.status}
                          cx="50" cy="50" r="15.9"
                          fill="none"
                          stroke={color}
                          strokeWidth="31.8"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-neutral-900">{totalStatusOrders}</p>
                  <p className="text-[10px] text-neutral-500">sipariş</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 space-y-2.5">
            {(statusBreakdown || []).map((r: AnalyticsStatusRow) => {
              const meta = STATUS_META[r.status] || { label: r.status, color: '#71717a' };
              const pct = totalStatusOrders > 0 ? (r.count / totalStatusOrders) * 100 : 0;
              return (
                <div key={r.status} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  <span className="text-xs text-neutral-500 flex-1">{meta.label}</span>
                  <span className="text-xs font-semibold text-neutral-900">{r.count}</span>
                  <span className="text-[10px] text-neutral-400 w-8 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ülke kırılımı */}
      {countryBreakdown?.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Ülke Bazında Gelir</h3>
              <p className="text-xs text-neutral-500 mt-0.5">İptal edilen siparişler hariç</p>
            </div>
            <Globe className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Ülke</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Sipariş</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Gelir</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {countryBreakdown.map((row: AnalyticsCountryRow) => {
                  const totalRevenue = countryBreakdown.reduce((s: number, r: AnalyticsCountryRow) => s + r.revenue, 0);
                  const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={row.country} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Globe className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                          <span className="text-sm text-neutral-900">{row.country}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-neutral-700">{row.count}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">{fmtPrice(row.revenue)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-neutral-100 rounded-full h-1">
                            <div className="bg-neutral-700 h-1 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-neutral-500 w-8 text-right">{share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-neutral-200/60">
            {countryBreakdown.map((row: AnalyticsCountryRow) => {
              const totalRevenue = countryBreakdown.reduce((s: number, r: AnalyticsCountryRow) => s + r.revenue, 0);
              const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
              return (
                <div key={row.country} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-neutral-900 truncate">{row.country}</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 flex-shrink-0">{fmtPrice(row.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-xs text-neutral-500">{row.count} sipariş</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-neutral-100 rounded-full h-1">
                        <div className="bg-neutral-700 h-1 rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500 w-8 text-right">{share.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

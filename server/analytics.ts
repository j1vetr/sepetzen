/**
 * Satış analizi hesaplamaları.
 *
 * Tüm rakamlar sunucuda hesaplanır; admin paneli yalnızca sonucu gösterir.
 *
 * NET SATIŞ TANIMI (tek yer): iptal/iade/red edilmiş siparişler net satışa
 * dâhil edilmez. Brüt ciro tüm siparişleri, net ciro yalnızca bu durumların
 * dışındaki siparişleri kapsar.
 */
import { sql } from "drizzle-orm";
import { db } from "./storage";

/** Net satıştan düşülen sipariş durumları. */
export const CANCELLED_ORDER_STATUSES = ["cancelled", "refunded", "returned"] as const;

/** Raporların gün/ay/yıl kırılımı için kullanılan saat dilimi. */
const REPORT_TIMEZONE = "Europe/Istanbul";

export type Granularity = "day" | "month" | "year";

export interface AnalyticsRange {
  /** YYYY-MM-DD (dahil) */
  start: string;
  /** YYYY-MM-DD (dahil) */
  end: string;
}

export interface AnalyticsSummary {
  orders: number;
  grossRevenue: number;
  cancelledOrders: number;
  cancelledRevenue: number;
  netOrders: number;
  netRevenue: number;
  avgOrderValue: number;
  cancelRate: number;
}

export interface AnalyticsSeriesRow {
  /** Dönem başlangıcı, YYYY-MM-DD */
  bucket: string;
  orders: number;
  netOrders: number;
  cancelledOrders: number;
  grossRevenue: number;
  netRevenue: number;
  avgOrderValue: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface SalesOverview {
  granularity: Granularity;
  range: AnalyticsRange;
  previousRange: AnalyticsRange;
  summary: AnalyticsSummary;
  previousSummary: AnalyticsSummary;
  changes: {
    netRevenue: number | null;
    netOrders: number | null;
    avgOrderValue: number | null;
    grossRevenue: number | null;
    cancelledOrders: number | null;
  };
  series: AnalyticsSeriesRow[];
  paymentBreakdown: BreakdownRow[];
  channelBreakdown: BreakdownRow[];
}

/** Sipariş tarihini rapor saat dilimine çeviren SQL ifadesi. */
const localOrderTs = sql`(orders.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${sql.raw(`'${REPORT_TIMEZONE}'`)})`;

const cancelledFilter = sql`orders.status IN ('cancelled', 'refunded', 'returned')`;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  // Gün bazlı hesaplar için UTC gün başlangıcı yeterli; SQL tarafında
  // karşılaştırma yerel damgaya (timestamp) göre yapılır.
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

/** Seçilen kırılıma göre varsayılan tarih aralığı. */
export function defaultRange(granularity: Granularity, today: Date): AnalyticsRange {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (granularity === "day") {
    return { start: toIsoDate(addDays(end, -29)), end: toIsoDate(end) };
  }
  if (granularity === "month") {
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }
  const start = new Date(Date.UTC(end.getUTCFullYear() - 4, 0, 1));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/**
 * Seçili aralığın hemen öncesine denk gelen karşılaştırma aralığı.
 * Kırılım gün ise gün sayısı, ay ise ay sayısı, yıl ise yıl sayısı korunur;
 * böylece 12 aylık dönem önceki 12 ayla kıyaslanır (kayan gün sayısıyla değil).
 */
export function previousRangeOf(range: AnalyticsRange, granularity: Granularity = "day"): AnalyticsRange {
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(range.end);
  const previousEnd = toIsoDate(addDays(start, -1));

  if (granularity === "month") {
    const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
    const previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - months, start.getUTCDate()));
    return { start: toIsoDate(previousStart), end: previousEnd };
  }

  if (granularity === "year") {
    const years = end.getUTCFullYear() - start.getUTCFullYear() + 1;
    const previousStart = new Date(Date.UTC(start.getUTCFullYear() - years, start.getUTCMonth(), start.getUTCDate()));
    return { start: toIsoDate(previousStart), end: previousEnd };
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return { start: toIsoDate(addDays(start, -days)), end: previousEnd };
}

/** Aralıktaki tüm dönem kovalarını (boş olanlar dâhil) üretir. */
function buildBuckets(range: AnalyticsRange, granularity: Granularity): string[] {
  const buckets: string[] = [];
  const end = parseIsoDate(range.end);
  let cursor = parseIsoDate(range.start);
  if (granularity === "month") cursor = startOfMonth(cursor);
  if (granularity === "year") cursor = startOfYear(cursor);

  // Aşırı uzun aralıklarda tarayıcıyı boğmamak için üst sınır.
  const maxBuckets = 400;
  while (cursor.getTime() <= end.getTime() && buckets.length < maxBuckets) {
    buckets.push(toIsoDate(cursor));
    if (granularity === "day") cursor = addDays(cursor, 1);
    else if (granularity === "month") cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    else cursor = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
  }
  return buckets;
}

/** Ham payment_method değerlerini tek bir okunur etikete indirger. */
export function paymentMethodLabel(raw: string | null | undefined): { key: string; label: string } {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return { key: "unknown", label: "Belirtilmemiş" };
  if (value === "iyzico") return { key: "iyzico", label: "Kredi Kartı (iyzico)" };
  if (value === "paytr") return { key: "paytr", label: "Kredi Kartı (PayTR)" };
  if (value === "bank_transfer" || value.includes("havale") || value.includes("eft")) {
    return { key: "bank_transfer", label: "Havale / EFT" };
  }
  if (value === "card" || value === "credit_card" || value.includes("kredi")) {
    return { key: "card", label: "Kredi Kartı" };
  }
  if (value === "cash_on_delivery" || value.includes("kapıda") || value.includes("kapida")) {
    return { key: "cash_on_delivery", label: "Kapıda Ödeme" };
  }
  return { key: value, label: raw as string };
}

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentChange(current: number, previous: number): number | null {
  // Önceki dönem sıfırsa yüzde değişim anlamsızdır; null döner ve arayüz
  // "karşılaştırma yok" gösterir.
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function emptySummary(): AnalyticsSummary {
  return {
    orders: 0,
    grossRevenue: 0,
    cancelledOrders: 0,
    cancelledRevenue: 0,
    netOrders: 0,
    netRevenue: 0,
    avgOrderValue: 0,
    cancelRate: 0,
  };
}

async function fetchSummary(range: AnalyticsRange): Promise<AnalyticsSummary> {
  const startTs = `${range.start} 00:00:00`;
  const endTs = `${range.end} 23:59:59.999999`;
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS orders,
      COALESCE(SUM(CAST(orders.total AS DECIMAL)), 0) AS gross_revenue,
      COUNT(*) FILTER (WHERE ${cancelledFilter})::int AS cancelled_orders,
      COALESCE(SUM(CAST(orders.total AS DECIMAL)) FILTER (WHERE ${cancelledFilter}), 0) AS cancelled_revenue
    FROM orders
    WHERE ${localOrderTs} BETWEEN ${startTs}::timestamp AND ${endTs}::timestamp
  `);
  const row = (result.rows || [])[0] as Record<string, unknown> | undefined;
  if (!row) return emptySummary();

  const orders = numeric(row.orders);
  const grossRevenue = numeric(row.gross_revenue);
  const cancelledOrders = numeric(row.cancelled_orders);
  const cancelledRevenue = numeric(row.cancelled_revenue);
  const netOrders = orders - cancelledOrders;
  const netRevenue = grossRevenue - cancelledRevenue;

  return {
    orders,
    grossRevenue,
    cancelledOrders,
    cancelledRevenue,
    netOrders,
    netRevenue,
    avgOrderValue: netOrders > 0 ? netRevenue / netOrders : 0,
    cancelRate: orders > 0 ? (cancelledOrders / orders) * 100 : 0,
  };
}

async function fetchSeries(range: AnalyticsRange, granularity: Granularity): Promise<AnalyticsSeriesRow[]> {
  const startTs = `${range.start} 00:00:00`;
  const endTs = `${range.end} 23:59:59.999999`;
  const truncUnit = granularity === "day" ? "day" : granularity === "month" ? "month" : "year";

  const result = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC(${truncUnit}, ${localOrderTs}), 'YYYY-MM-DD') AS bucket,
      COUNT(*)::int AS orders,
      COALESCE(SUM(CAST(orders.total AS DECIMAL)), 0) AS gross_revenue,
      COUNT(*) FILTER (WHERE ${cancelledFilter})::int AS cancelled_orders,
      COALESCE(SUM(CAST(orders.total AS DECIMAL)) FILTER (WHERE ${cancelledFilter}), 0) AS cancelled_revenue
    FROM orders
    WHERE ${localOrderTs} BETWEEN ${startTs}::timestamp AND ${endTs}::timestamp
    GROUP BY 1
    ORDER BY 1
  `);

  const byBucket = new Map<string, AnalyticsSeriesRow>();
  for (const raw of (result.rows || []) as Record<string, unknown>[]) {
    const orders = numeric(raw.orders);
    const cancelledOrders = numeric(raw.cancelled_orders);
    const netOrders = orders - cancelledOrders;
    const netRevenue = numeric(raw.gross_revenue) - numeric(raw.cancelled_revenue);
    byBucket.set(String(raw.bucket), {
      bucket: String(raw.bucket),
      orders,
      netOrders,
      cancelledOrders,
      grossRevenue: numeric(raw.gross_revenue),
      netRevenue,
      avgOrderValue: netOrders > 0 ? netRevenue / netOrders : 0,
    });
  }

  return buildBuckets(range, granularity).map(
    (bucket) =>
      byBucket.get(bucket) ?? {
        bucket,
        orders: 0,
        netOrders: 0,
        cancelledOrders: 0,
        grossRevenue: 0,
        netRevenue: 0,
        avgOrderValue: 0,
      },
  );
}

async function fetchPaymentBreakdown(range: AnalyticsRange): Promise<BreakdownRow[]> {
  const startTs = `${range.start} 00:00:00`;
  const endTs = `${range.end} 23:59:59.999999`;
  const result = await db.execute(sql`
    SELECT
      orders.payment_method AS payment_method,
      COUNT(*)::int AS orders,
      COALESCE(SUM(CAST(orders.total AS DECIMAL)), 0) AS revenue
    FROM orders
    WHERE ${localOrderTs} BETWEEN ${startTs}::timestamp AND ${endTs}::timestamp
      AND NOT (${cancelledFilter})
    GROUP BY 1
  `);

  // Farklı ham değerler aynı etikete düşebildiği için sonuçlar birleştirilir.
  const merged = new Map<string, BreakdownRow>();
  for (const raw of (result.rows || []) as Record<string, unknown>[]) {
    const { key, label } = paymentMethodLabel(raw.payment_method as string | null);
    const current = merged.get(key) ?? { key, label, orders: 0, revenue: 0 };
    current.orders += numeric(raw.orders);
    current.revenue += numeric(raw.revenue);
    merged.set(key, current);
  }
  return Array.from(merged.values()).sort((a, b) => b.revenue - a.revenue);
}

async function fetchChannelBreakdown(range: AnalyticsRange): Promise<BreakdownRow[]> {
  const startTs = `${range.start} 00:00:00`;
  const endTs = `${range.end} 23:59:59.999999`;

  const siteResult = await db.execute(sql`
    SELECT COUNT(*)::int AS orders, COALESCE(SUM(CAST(orders.total AS DECIMAL)), 0) AS revenue
    FROM orders
    WHERE ${localOrderTs} BETWEEN ${startTs}::timestamp AND ${endTs}::timestamp
      AND NOT (${cancelledFilter})
  `);
  const siteRow = (siteResult.rows || [])[0] as Record<string, unknown> | undefined;

  // Pazaryeri siparişleri ayrı tabloda satır bazında tutulur; sipariş sayısı
  // için benzersiz pazaryeri sipariş numarası kullanılır.
  const marketplaceResult = await db.execute(sql`
    SELECT
      COALESCE(m.name, 'Pazaryeri') AS channel,
      COUNT(DISTINCT l.order_number)::int AS orders,
      COALESCE(SUM(CAST(l.total_price AS DECIMAL)), 0) AS revenue
    FROM marketplace_order_lines l
    LEFT JOIN marketplaces m ON m.id = l.marketplace_id
    WHERE (COALESCE(l.ordered_at, l.created_at) AT TIME ZONE 'UTC' AT TIME ZONE ${sql.raw(`'${REPORT_TIMEZONE}'`)})
          BETWEEN ${startTs}::timestamp AND ${endTs}::timestamp
      AND COALESCE(l.status, '') NOT ILIKE '%cancel%'
      AND COALESCE(l.status, '') NOT ILIKE '%return%'
    GROUP BY 1
    ORDER BY 3 DESC
  `);

  const rows: BreakdownRow[] = [
    {
      key: "site",
      label: "Web Sitesi",
      orders: numeric(siteRow?.orders),
      revenue: numeric(siteRow?.revenue),
    },
    ...((marketplaceResult.rows || []) as Record<string, unknown>[]).map((raw) => ({
      key: `marketplace:${String(raw.channel)}`,
      label: String(raw.channel),
      orders: numeric(raw.orders),
      revenue: numeric(raw.revenue),
    })),
  ];

  return rows.filter((row) => row.orders > 0 || row.revenue > 0);
}

/** Seçili aralık için tüm analiz verisini üretir. */
export async function getSalesOverview(range: AnalyticsRange, granularity: Granularity): Promise<SalesOverview> {
  const previousRange = previousRangeOf(range, granularity);

  const [summary, previousSummary, series, paymentBreakdown, channelBreakdown] = await Promise.all([
    fetchSummary(range),
    fetchSummary(previousRange),
    fetchSeries(range, granularity),
    fetchPaymentBreakdown(range),
    fetchChannelBreakdown(range),
  ]);

  return {
    granularity,
    range,
    previousRange,
    summary,
    previousSummary,
    changes: {
      netRevenue: percentChange(summary.netRevenue, previousSummary.netRevenue),
      netOrders: percentChange(summary.netOrders, previousSummary.netOrders),
      avgOrderValue: percentChange(summary.avgOrderValue, previousSummary.avgOrderValue),
      grossRevenue: percentChange(summary.grossRevenue, previousSummary.grossRevenue),
      cancelledOrders: percentChange(summary.cancelledOrders, previousSummary.cancelledOrders),
    },
    series,
    paymentBreakdown,
    channelBreakdown,
  };
}

function formatBucketLabel(bucket: string, granularity: Granularity): string {
  const date = parseIsoDate(bucket);
  if (granularity === "year") return String(date.getUTCFullYear());
  if (granularity === "month") {
    return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function csvCell(value: string | number): string {
  const text = typeof value === "number" ? value.toFixed(2).replace(".", ",") : value;
  return `"${String(text).replace(/"/g, '""')}"`;
}

/** Seçili dönemin satış tablosunu Excel uyumlu CSV'ye çevirir. */
export function overviewToCsv(overview: SalesOverview): string {
  const lines: string[] = [];
  lines.push(["Dönem", "Sipariş", "İptal", "Net Sipariş", "Brüt Ciro (TL)", "Net Ciro (TL)", "Ortalama Sepet (TL)"].map(csvCell).join(";"));

  for (const row of overview.series) {
    lines.push(
      [
        csvCell(formatBucketLabel(row.bucket, overview.granularity)),
        csvCell(String(row.orders)),
        csvCell(String(row.cancelledOrders)),
        csvCell(String(row.netOrders)),
        csvCell(row.grossRevenue),
        csvCell(row.netRevenue),
        csvCell(row.avgOrderValue),
      ].join(";"),
    );
  }

  const { summary } = overview;
  lines.push(
    [
      csvCell("TOPLAM"),
      csvCell(String(summary.orders)),
      csvCell(String(summary.cancelledOrders)),
      csvCell(String(summary.netOrders)),
      csvCell(summary.grossRevenue),
      csvCell(summary.netRevenue),
      csvCell(summary.avgOrderValue),
    ].join(";"),
  );

  // Excel'in Türkçe karakterleri doğru açması için BOM eklenir.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

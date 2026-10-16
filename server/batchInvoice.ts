/**
 * Gün sonu toplu fatura. Aynı müşterinin (e-posta + fatura bilgisi) aynı takvim
 * gününe (Europe/Istanbul) ait siparişleri tek faturada birleştirilir.
 *
 * Akış: toplu mod açıkken ödenen siparişler eInvoiceStatus='batch_pending' olur.
 * Zamanlayıcı (veya admin) çalıştırınca siparişler gruplanır, her grup için bir
 * invoice_batches kaydı açılır, siparişler koşullu UPDATE ile bu kayda bağlanır
 * (aynı sipariş iki gruba giremez) ve tek fatura kesilir.
 */
import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import { orders, invoiceBatches, type Order, type InvoiceBatch } from "../shared/schema";
import { storage } from "./storage";
import { createInvoiceViaProvider } from "./invoiceService";

const TZ = "Europe/Istanbul";
const EXCLUDED_ORDER_STATUSES = ["cancelled", "refunded"];

export interface BatchInvoiceSettings {
  enabled: boolean;
  time: string; // HH:MM
  includeToday: boolean;
}

export interface BatchRunSummary {
  trigger: "cron" | "manual";
  startedAt: string;
  finishedAt: string;
  groups: number;
  sent: number;
  failed: number;
  retried: number;
}

export async function getBatchInvoiceSettings(): Promise<BatchInvoiceSettings> {
  const [enabled, time, includeToday] = await Promise.all([
    storage.getSiteSetting("batch_invoice_enabled"),
    storage.getSiteSetting("batch_invoice_time"),
    storage.getSiteSetting("batch_invoice_include_today"),
  ]);
  return {
    enabled: enabled === "1",
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time || "") ? (time as string) : "00:30",
    includeToday: includeToday === "1",
  };
}

export async function saveBatchInvoiceSettings(s: BatchInvoiceSettings): Promise<void> {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) throw new Error("Saat HH:MM biçiminde olmalı");
  await storage.setSiteSetting("batch_invoice_enabled", s.enabled ? "1" : "0");
  await storage.setSiteSetting("batch_invoice_time", s.time);
  await storage.setSiteSetting("batch_invoice_include_today", s.includeToday ? "1" : "0");
}

export async function getLastRunSummary(): Promise<BatchRunSummary | null> {
  const raw = await storage.getSiteSetting("batch_invoice_last_run");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const istanbulDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

const istanbulNow = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { date: istanbulDate(now), hm: `${h === "24" ? "00" : h}:${m}` };
};

function groupKeyOf(o: Order): string {
  const b = o.billingAddress as Record<string, any> | null;
  const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const shipping = (o.shippingAddress ?? {}) as Record<string, string>;
  return [
    norm(o.customerEmail),
    norm(b?.invoiceType ?? "individual"),
    norm(b?.companyName),
    norm(b?.taxNumber),
    norm(b?.taxOffice),
    norm(b?.tcknNumber),
    norm(b?.address || shipping.address),
    norm(b?.city || shipping.city),
    norm(b?.district || shipping.district),
  ].join("|");
}

export interface PendingGroup {
  key: string;
  customerEmail: string;
  customerName: string;
  businessDate: string;
  due: boolean; // bu çalışmada faturalanır mı (gün bitmiş mi)
  orderCount: number;
  total: number;
  orderNumbers: string[];
}

async function loadEligibleOrders(email?: string): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.eInvoiceStatus, "batch_pending"),
        isNull(orders.invoiceBatchId),
        notInArray(orders.status, EXCLUDED_ORDER_STATUSES),
        email ? sql`lower(${orders.customerEmail}) = ${email.trim().toLowerCase()}` : sql`true`,
      ),
    )
    .orderBy(orders.createdAt);
  return rows;
}

function buildGroups(rows: Order[], includeToday: boolean) {
  const today = istanbulDate(new Date());
  const map = new Map<string, { date: string; orders: Order[] }>();
  for (const o of rows) {
    const date = istanbulDate(o.createdAt);
    const k = `${groupKeyOf(o)}#${date}`;
    const g = map.get(k) ?? { date, orders: [] };
    g.orders.push(o);
    map.set(k, g);
  }
  return Array.from(map.entries()).map(([key, g]) => ({
    key,
    date: g.date,
    due: includeToday || g.date < today,
    orders: g.orders,
  }));
}

export async function listPendingGroups(includeToday: boolean, email?: string): Promise<PendingGroup[]> {
  const rows = await loadEligibleOrders(email);
  return buildGroups(rows, includeToday)
    .map((g) => ({
      key: g.key,
      customerEmail: g.orders[0].customerEmail,
      customerName: g.orders[0].customerName,
      businessDate: g.date,
      due: g.due,
      orderCount: g.orders.length,
      total: g.orders.reduce((s, o) => s + parseFloat(o.total), 0),
      orderNumbers: g.orders.map((o) => o.orderNumber),
    }))
    .sort((a, b) => a.businessDate.localeCompare(b.businessDate) || a.customerEmail.localeCompare(b.customerEmail));
}

export async function listBatches(limit = 100): Promise<InvoiceBatch[]> {
  return db.select().from(invoiceBatches).orderBy(desc(invoiceBatches.createdAt)).limit(limit);
}

/** Bir toplu faturayı keser (yeni ya da yeniden deneme). Batch 'processing' olmalı. */
async function sendBatch(batchId: string): Promise<boolean> {
  const [batch] = await db.select().from(invoiceBatches).where(eq(invoiceBatches.id, batchId));
  if (!batch) return false;
  const batchOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.invoiceBatchId, batchId), notInArray(orders.status, EXCLUDED_ORDER_STATUSES)))
    .orderBy(orders.createdAt);

  if (batchOrders.length === 0) {
    await db.update(invoiceBatches).set({ status: "cancelled", errorMessage: "Tüm siparişler iptal edildi" }).where(eq(invoiceBatches.id, batchId));
    return true;
  }

  try {
    const items: Array<{ productName: string; sku?: string | null; price: string; quantity: number }> = [];
    for (const o of batchOrders) {
      const oi = await storage.getOrderItems(o.id);
      for (const i of oi) items.push({ productName: i.productName, sku: (i as any).sku ?? null, price: i.price, quantity: i.quantity });
    }
    const first = batchOrders[0];
    const label = `TOPLU-${batch.businessDate.replace(/-/g, "")}-${batchId.slice(0, 6).toUpperCase()}`;
    const { provider, update } = await createInvoiceViaProvider({ ...first, orderNumber: label }, items);

    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ ...update, invoiceBatchId: batchId } as any)
        .where(inArray(orders.id, batchOrders.map((o) => o.id)));
      await tx
        .update(invoiceBatches)
        .set({
          status: "sent",
          provider,
          ettn: update.ettn ?? null,
          invoiceNumber: update.eInvoiceNumber ?? null,
          invoiceUrl: update.invoiceUrl ?? null,
          externalId: update.eInvoiceExternalId ?? null,
          orderCount: batchOrders.length,
          total: batchOrders.reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
          errorMessage: null,
          sentAt: new Date(),
        })
        .where(eq(invoiceBatches.id, batchId));
    });
    console.log(`[Toplu Fatura] Gönderildi: ${batch.customerEmail} ${batch.businessDate} (${batchOrders.length} sipariş)`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Toplu Fatura] Başarısız: ${batch.customerEmail} ${batch.businessDate}:`, msg);
    await db.update(invoiceBatches).set({ status: "failed", errorMessage: msg.slice(0, 500) }).where(eq(invoiceBatches.id, batchId));
    return false;
  }
}

/** Başarısız bir toplu faturayı yeniden dener. */
export async function retryBatch(batchId: string): Promise<boolean> {
  const [claimed] = await db
    .update(invoiceBatches)
    .set({ status: "processing" })
    .where(and(eq(invoiceBatches.id, batchId), eq(invoiceBatches.status, "failed")))
    .returning();
  if (!claimed) throw new Error("Bu toplu fatura yeniden denenemez");
  return sendBatch(batchId);
}

let running = false;
export const isBatchRunning = () => running;

export async function runBatchInvoices(opts: {
  trigger: "cron" | "manual";
  includeToday: boolean;
  email?: string;
}): Promise<BatchRunSummary> {
  if (running) throw new Error("Toplu fatura çalışması zaten devam ediyor");
  running = true;
  const startedAt = new Date();
  const summary: BatchRunSummary = { trigger: opts.trigger, startedAt: startedAt.toISOString(), finishedAt: "", groups: 0, sent: 0, failed: 0, retried: 0 };
  try {
    // Önce önceki çalışmalarda başarısız olanları tekrar dene (tek müşteri seçildiyse atla).
    if (!opts.email) {
      const failed = await db.select().from(invoiceBatches).where(eq(invoiceBatches.status, "failed"));
      for (const b of failed) {
        const [claimed] = await db
          .update(invoiceBatches)
          .set({ status: "processing" })
          .where(and(eq(invoiceBatches.id, b.id), eq(invoiceBatches.status, "failed")))
          .returning();
        if (!claimed) continue;
        summary.retried++;
        (await sendBatch(b.id)) ? summary.sent++ : summary.failed++;
      }
    }

    const rows = await loadEligibleOrders(opts.email);
    for (const g of buildGroups(rows, opts.includeToday).filter((x) => x.due)) {
      const [batch] = await db
        .insert(invoiceBatches)
        .values({
          customerEmail: g.orders[0].customerEmail,
          customerName: g.orders[0].customerName,
          businessDate: g.date,
          status: "processing",
          trigger: opts.trigger,
          orderCount: g.orders.length,
          total: g.orders.reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
        })
        .returning();
      const claimed = await db
        .update(orders)
        .set({ invoiceBatchId: batch.id })
        .where(and(inArray(orders.id, g.orders.map((o) => o.id)), isNull(orders.invoiceBatchId), eq(orders.eInvoiceStatus, "batch_pending")))
        .returning({ id: orders.id });
      if (claimed.length === 0) {
        await db.delete(invoiceBatches).where(eq(invoiceBatches.id, batch.id));
        continue;
      }
      summary.groups++;
      (await sendBatch(batch.id)) ? summary.sent++ : summary.failed++;
    }
    return summary;
  } finally {
    summary.finishedAt = new Date().toISOString();
    await storage.setSiteSetting("batch_invoice_last_run", JSON.stringify(summary)).catch(() => {});
    running = false;
  }
}

/** Dakikada bir kontrol eder; ayarlı saat geçtiyse ve bugün çalışmadıysa çalıştırır. */
export function startBatchInvoiceScheduler(): void {
  const tick = async () => {
    try {
      const settings = await getBatchInvoiceSettings();
      if (!settings.enabled || running) return;
      const now = istanbulNow();
      if (now.hm < settings.time) return;
      const last = await storage.getSiteSetting("batch_invoice_last_cron_date");
      if (last === now.date) return;
      await storage.setSiteSetting("batch_invoice_last_cron_date", now.date);
      console.log("[Toplu Fatura] Zamanlanmış çalışma başladı");
      const s = await runBatchInvoices({ trigger: "cron", includeToday: settings.includeToday });
      console.log("[Toplu Fatura] Tamamlandı:", JSON.stringify(s));
    } catch (err) {
      console.error("[Toplu Fatura] Zamanlayıcı hatası:", err);
    }
  };
  setInterval(tick, 60 * 1000);
  setTimeout(tick, 15 * 1000);
}

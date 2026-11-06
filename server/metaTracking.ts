import crypto from "crypto";
import type { Request } from "express";
import { db, storage } from "./storage";
import { sql } from "drizzle-orm";
import type { Order, OrderItem } from "@shared/schema";

/**
 * Meta Pixel + Conversions API (CAPI).
 *
 * - Tarayıcı Pixel olayları ve sunucu CAPI olayları aynı event_id ile gönderilir, Meta tekilleştirir.
 * - Purchase olayı sunucuda sipariş oluştuğunda/ödendiğinde gönderilir (kullanıcı sayfayı kapatsa da kaybolmaz).
 * - Kişisel veriler (e-posta, telefon, ad, şehir) Meta'ya gönderilmeden önce SHA-256 ile özetlenir.
 * - Ürün kimliği varsayılan olarak stok kodudur (Meta katalog akışındaki id ile aynı).
 */

export const META_EVENTS = [
  "PageView",
  "ViewContent",
  "Search",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "CompleteRegistration",
  "Lead",
] as const;
export type MetaEventName = (typeof META_EVENTS)[number];

export const META_EVENT_LABELS: Record<MetaEventName, string> = {
  PageView: "Sayfa görüntüleme",
  ViewContent: "Ürün görüntüleme",
  Search: "Arama",
  AddToCart: "Sepete ekleme",
  AddToWishlist: "Favorilere ekleme",
  InitiateCheckout: "Ödemeye başlama",
  AddPaymentInfo: "Ödeme bilgisi ekleme",
  Purchase: "Satın alma",
  CompleteRegistration: "Üyelik tamamlama",
  Lead: "İletişim formu",
};

export interface MetaConfig {
  pixelEnabled: boolean;
  pixelId: string;
  capiEnabled: boolean;
  capiToken: string;
  testEventCode: string;
  apiVersion: string;
  contentIdSource: "sku" | "id";
  requireConsent: boolean;
  purchaseValue: "total" | "products";
  bankPurchaseTiming: "created" | "paid";
  events: Record<MetaEventName, boolean>;
}

let configCache: { at: number; value: MetaConfig } | null = null;

export function invalidateMetaConfigCache(): void {
  configCache = null;
}

export async function getMetaConfig(): Promise<MetaConfig> {
  if (configCache && Date.now() - configCache.at < 15_000) return configCache.value;
  const s = await storage.getSiteSettings();
  const events = {} as Record<MetaEventName, boolean>;
  for (const e of META_EVENTS) events[e] = s[`meta_evt_${e}`] !== "false";
  const pixelId = (s.meta_pixel_id || "").replace(/\D/g, "");
  const value: MetaConfig = {
    pixelEnabled: s.meta_pixel_enabled === "true" && !!pixelId,
    pixelId,
    capiEnabled: s.meta_capi_enabled === "true" && !!pixelId && !!(s.meta_capi_token || "").trim(),
    capiToken: (s.meta_capi_token || "").trim(),
    testEventCode: (s.meta_test_event_code || "").trim(),
    apiVersion: /^v\d+\.\d+$/.test((s.meta_api_version || "").trim()) ? s.meta_api_version.trim() : "v21.0",
    contentIdSource: s.meta_content_id_source === "id" ? "id" : "sku",
    requireConsent: s.meta_require_consent === "true",
    purchaseValue: s.meta_purchase_value === "products" ? "products" : "total",
    bankPurchaseTiming: s.meta_purchase_timing_bank === "created" ? "created" : "paid",
    events,
  };
  configCache = { at: Date.now(), value };
  return value;
}

/** Tarayıcıya açılan, gizli bilgi içermeyen yapılandırma */
export async function getPublicMetaConfig() {
  const c = await getMetaConfig();
  return {
    pixelEnabled: c.pixelEnabled,
    pixelId: c.pixelEnabled ? c.pixelId : "",
    capiEnabled: c.capiEnabled,
    contentIdSource: c.contentIdSource,
    requireConsent: c.requireConsent,
    events: c.events,
  };
}

// ── Olay günlüğü (bellekte, son 200 kayıt) ─────────────────────────────────

export interface MetaLogEntry {
  time: string;
  event: string;
  eventId: string;
  source: "sunucu" | "tarayıcı aktarımı";
  status: "ok" | "hata" | "atlandı";
  detail: string;
  value?: number;
}
const LOG_LIMIT = 200;
const eventLog: MetaLogEntry[] = [];
function pushLog(entry: Omit<MetaLogEntry, "time">) {
  eventLog.unshift({ time: new Date().toISOString(), ...entry });
  if (eventLog.length > LOG_LIMIT) eventLog.length = LOG_LIMIT;
}
export function getMetaLog(): MetaLogEntry[] {
  return eventLog;
}

// ── Özetleme yardımcıları ───────────────────────────────────────────────────

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const norm = (v: unknown) => String(v ?? "").trim().toLocaleLowerCase("tr");

function hashEmail(v: unknown): string | undefined {
  const e = norm(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? sha256(e) : undefined;
}
function hashPhone(v: unknown): string | undefined {
  let d = String(v ?? "").replace(/\D/g, "");
  if (!d) return undefined;
  d = d.replace(/^00/, "");
  if (d.length === 11 && d.startsWith("0")) d = "9" + d; // 05xx -> 905xx
  else if (d.length === 10) d = "90" + d;
  return d.length >= 10 ? sha256(d) : undefined;
}
function hashText(v: unknown, stripNonLetters = false): string | undefined {
  let t = norm(v);
  if (stripNonLetters) t = t.replace(/[^a-z0-9çğıöşüâîû]/g, "");
  return t ? sha256(t) : undefined;
}

export interface UserInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  zip?: string;
  country?: string;
  externalId?: string;
}

export interface TrackContext {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
}

function buildUserData(user: UserInput | undefined, ctx: TrackContext): Record<string, unknown> {
  const u = user || {};
  const countryRaw = norm(u.country);
  const country = !countryRaw || countryRaw === "türkiye" || countryRaw === "turkiye" || countryRaw === "tr" ? "tr" : undefined;
  const data: Record<string, unknown> = {
    em: hashEmail(u.email) ? [hashEmail(u.email)] : undefined,
    ph: hashPhone(u.phone) ? [hashPhone(u.phone)] : undefined,
    fn: hashText(u.firstName, true) ? [hashText(u.firstName, true)] : undefined,
    ln: hashText(u.lastName, true) ? [hashText(u.lastName, true)] : undefined,
    ct: hashText(u.city, true) ? [hashText(u.city, true)] : undefined,
    zp: hashText(u.zip, true) ? [hashText(u.zip, true)] : undefined,
    country: country ? [sha256(country)] : undefined,
    external_id: u.externalId ? [sha256(String(u.externalId))] : undefined,
    client_ip_address: ctx.ip || undefined,
    client_user_agent: ctx.userAgent || undefined,
    fbp: ctx.fbp || undefined,
    fbc: ctx.fbc || undefined,
  };
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  return data;
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const m = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : undefined;
}

/** İstekten Meta için gerekli tarayıcı bilgilerini çıkarır */
export function contextFromRequest(req: Request, sourceUrl?: string): TrackContext {
  const cookieHeader = req.headers.cookie;
  let fbc = parseCookie(cookieHeader, "_fbc");
  const url = sourceUrl || (typeof req.headers.referer === "string" ? req.headers.referer : undefined);
  if (!fbc && url) {
    try {
      const fbclid = new URL(url).searchParams.get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    } catch { /* geçersiz URL */ }
  }
  return {
    ip: req.ip,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    fbp: parseCookie(cookieHeader, "_fbp"),
    fbc,
    sourceUrl: url,
  };
}

/** Siparişle birlikte saklanacak bağlam (CAPI Purchase için) */
export function serializeContext(ctx: TrackContext): string {
  return JSON.stringify(ctx);
}
function parseStoredContext(raw: string | null | undefined): TrackContext {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}

// ── Gönderim ───────────────────────────────────────────────────────────────

export interface CapiEventInput {
  eventName: MetaEventName | string;
  eventId: string;
  eventTime?: number;
  sourceUrl?: string;
  user?: UserInput;
  ctx: TrackContext;
  customData?: Record<string, unknown>;
  source?: MetaLogEntry["source"];
  forceTestCode?: string;
}

export async function sendCapiEvent(input: CapiEventInput): Promise<{ ok: boolean; detail: string; response?: unknown }> {
  const cfg = await getMetaConfig();
  const source = input.source ?? "sunucu";
  const value = typeof input.customData?.value === "number" ? (input.customData.value as number) : undefined;
  if (!cfg.capiEnabled) {
    return { ok: false, detail: "Conversions API kapalı" };
  }
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.sourceUrl || input.ctx.sourceUrl || undefined,
        user_data: buildUserData(input.user, input.ctx),
        custom_data: input.customData && Object.keys(input.customData).length ? input.customData : undefined,
      },
    ],
  };
  const testCode = input.forceTestCode ?? cfg.testEventCode;
  if (testCode) body.test_event_code = testCode;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.capiToken)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message ? String(json.error.message) : `HTTP ${res.status}`;
      pushLog({ event: String(input.eventName), eventId: input.eventId, source, status: "hata", detail: msg.slice(0, 300), value });
      return { ok: false, detail: msg, response: json };
    }
    const detail = `Meta aldı (${json?.events_received ?? 1} olay)${testCode ? ", test kodu ile" : ""}`;
    pushLog({ event: String(input.eventName), eventId: input.eventId, source, status: "ok", detail, value });
    return { ok: true, detail, response: json };
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "Meta'ya ulaşılamadı (10 sn)" : err?.message || "Bilinmeyen hata";
    pushLog({ event: String(input.eventName), eventId: input.eventId, source, status: "hata", detail: msg, value });
    return { ok: false, detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ── Sipariş / Purchase ──────────────────────────────────────────────────────

async function contentIdFor(productId: string | null | undefined, source: "sku" | "id"): Promise<string | null> {
  if (!productId) return null;
  if (source === "id") return productId;
  const p = await storage.getProduct(productId).catch(() => undefined);
  return (p?.sku && p.sku.trim()) || productId;
}

export async function resolveContentIds(productIds: string[]): Promise<Record<string, string>> {
  const cfg = await getMetaConfig();
  const map: Record<string, string> = {};
  for (const id of productIds) {
    const resolved = await contentIdFor(id, cfg.contentIdSource);
    if (resolved) map[id] = resolved;
  }
  return map;
}

export async function buildPurchasePayload(order: Order, items: OrderItem[]) {
  const cfg = await getMetaConfig();
  const contents: { id: string; quantity: number; item_price: number }[] = [];
  for (const item of items) {
    const id = await contentIdFor(item.productId, cfg.contentIdSource);
    if (!id) continue;
    contents.push({ id, quantity: item.quantity, item_price: Number(parseFloat(item.price).toFixed(2)) });
  }
  const total = parseFloat(order.total);
  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discountAmount || "0");
  const value = cfg.purchaseValue === "products" ? Math.max(0, subtotal - discount) : total;
  return {
    value: Number((Number.isFinite(value) ? value : 0).toFixed(2)),
    currency: "TRY",
    content_type: "product",
    content_ids: contents.map((c) => c.id),
    contents,
    num_items: items.reduce((n, i) => n + i.quantity, 0),
    order_id: order.orderNumber,
  };
}

export const purchaseEventId = (orderNumber: string) => `purchase_${orderNumber}`;

/** Siparişin Purchase olayını sunucudan Meta'ya gönderir (event_id ile tarayıcı olayıyla tekilleşir) */
export async function sendMetaPurchase(order: Order, ctxOverride?: TrackContext): Promise<void> {
  const cfg = await getMetaConfig();
  const eventId = purchaseEventId(order.orderNumber);
  if (!cfg.capiEnabled || !cfg.events.Purchase) return;
  try {
    const items = await storage.getOrderItems(order.id);
    const customData = await buildPurchasePayload(order, items);
    const stored = parseStoredContext((order as any).trackingContext);
    const ctx: TrackContext = { ...stored, ...(ctxOverride || {}) };
    const addr = (order.shippingAddress || {}) as { city?: string; postalCode?: string; country?: string };
    const parts = (order.customerName || "").trim().split(/\s+/);
    await sendCapiEvent({
      eventName: "Purchase",
      eventId,
      eventTime: Math.floor(new Date(order.createdAt ?? Date.now()).getTime() / 1000),
      user: {
        email: order.customerEmail,
        phone: order.customerPhone,
        firstName: parts[0],
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
        city: addr.city,
        zip: addr.postalCode,
        country: addr.country,
      },
      ctx,
      customData,
    });
  } catch (err: any) {
    pushLog({ event: "Purchase", eventId, source: "sunucu", status: "hata", detail: err?.message || "Purchase hazırlanamadı" });
  }
}

/** Havale siparişi için Purchase gönderim zamanı ayara göre belirlenir */
export async function shouldSendPurchaseNow(order: Order, phase: "created" | "paid"): Promise<boolean> {
  const cfg = await getMetaConfig();
  if (order.paymentMethod === "bank_transfer") return cfg.bankPurchaseTiming === phase;
  // Kart/cüzdan: ödeme alındığında, diğer yöntemler: sipariş oluştuğunda
  if (order.paymentStatus === "paid") return phase === "paid";
  return phase === "created";
}

// ── Tarayıcıdan gelen olayların aktarımı ────────────────────────────────────

const rate = new Map<string, { n: number; reset: number }>();
export function allowTrackRequest(ip: string | undefined): boolean {
  const key = ip || "unknown";
  const now = Date.now();
  const entry = rate.get(key);
  if (!entry || entry.reset < now) {
    rate.set(key, { n: 1, reset: now + 60_000 });
    if (rate.size > 5000) rate.forEach((v, k) => { if (v.reset < now) rate.delete(k); });
    return true;
  }
  entry.n += 1;
  return entry.n <= 120;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);

export async function relayBrowserEvent(req: Request, userFromSession?: UserInput): Promise<{ ok: boolean; reason?: string }> {
  const cfg = await getMetaConfig();
  const b = req.body || {};
  const eventName = str(b.eventName, 40) as MetaEventName | undefined;
  if (!eventName || !(META_EVENTS as readonly string[]).includes(eventName)) return { ok: false, reason: "invalid_event" };
  if (eventName === "Purchase") return { ok: false, reason: "purchase_is_server_side" };
  if (!cfg.capiEnabled || !cfg.events[eventName]) return { ok: false, reason: "disabled" };
  const eventId = str(b.eventId, 120);
  if (!eventId) return { ok: false, reason: "missing_event_id" };

  const sourceUrl = str(b.sourceUrl, 500);
  const ctx = contextFromRequest(req, sourceUrl);

  const input: any = b.userData && typeof b.userData === "object" ? b.userData : {};
  const user: UserInput = {
    ...(userFromSession || {}),
    email: str(input.email) || userFromSession?.email,
    phone: str(input.phone, 40) || userFromSession?.phone,
    firstName: str(input.firstName, 80) || userFromSession?.firstName,
    lastName: str(input.lastName, 80) || userFromSession?.lastName,
    city: str(input.city, 80) || userFromSession?.city,
    zip: str(input.zip, 20) || userFromSession?.zip,
    country: str(input.country, 40) || userFromSession?.country,
  };

  // Özel veri: yalnızca bilinen alanlar, ürün kimlikleri sunucuda stok koduna çevrilir
  const cd: any = b.customData && typeof b.customData === "object" ? b.customData : {};
  const customData: Record<string, unknown> = { currency: "TRY" };
  if (typeof cd.value === "number" && Number.isFinite(cd.value)) customData.value = Number(cd.value.toFixed(2));
  if (typeof cd.num_items === "number") customData.num_items = Math.min(Math.floor(cd.num_items), 1000);
  if (str(cd.search_string)) customData.search_string = str(cd.search_string);
  if (str(cd.content_name)) customData.content_name = str(cd.content_name);
  if (str(cd.content_category)) customData.content_category = str(cd.content_category);
  if (Array.isArray(cd.contents) && cd.contents.length) {
    const rows = cd.contents.slice(0, 50).filter((c: any) => c && typeof c.productId === "string");
    const map = await resolveContentIds(rows.map((c: any) => c.productId));
    const contents = rows
      .map((c: any) => ({
        id: map[c.productId],
        quantity: Math.max(1, Math.min(1000, Math.floor(Number(c.quantity) || 1))),
        item_price: Number.isFinite(Number(c.price)) ? Number(Number(c.price).toFixed(2)) : undefined,
      }))
      .filter((c: any) => c.id);
    if (contents.length) {
      customData.contents = contents;
      customData.content_ids = contents.map((c: any) => c.id);
      customData.content_type = "product";
    }
  }
  if (eventName === "PageView") delete customData.currency;

  const result = await sendCapiEvent({
    eventName,
    eventId,
    sourceUrl,
    user,
    ctx,
    customData,
    source: "tarayıcı aktarımı",
  });
  return { ok: result.ok, reason: result.ok ? undefined : "capi_error" };
}

// ── Kurulum ────────────────────────────────────────────────────────────────

export async function ensureMetaTrackingColumns(): Promise<void> {
  await db.execute(sql`alter table orders add column if not exists tracking_context text`);
  await db.execute(sql`alter table pending_payments add column if not exists tracking_context text`);
}

/**
 * ShipEntegra adaptörü (REST, clientId/clientSecret ile alınan Bearer token).
 *
 * Akış: POST /auth/token ile token alınır (bellekte önbelleklenir) →
 * POST /orders/manual ile manuel sipariş oluşturulur →
 * POST /logistics/labels/shipentegra ile etiket ve takip numarası üretilir.
 * Takip: GET /logistics/shipments/activities?trackingNumber=...
 * Sipariş sorgu: GET /orders/manual/{orderId} ve GET /orders/manual?orderNumber=...
 *
 * Dokümantasyon: https://docs.shipentegra.com (uç noktalar ve alan adları
 * ShipEntegra'nın resmi n8n düğümü ile doğrulanmıştır).
 */
import { storage } from '../storage';
import type {
  CargoProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  LabelResult,
  ProviderStatus,
  ShipmentRef,
  TestConnectionResult,
  TrackShipmentResult,
  CancelShipmentResult,
} from './types';
import { providerError } from './types';

const SANDBOX_URL = 'https://newfront.shipentegra.com/v1';
const PRODUCTION_URL = 'https://publicapi.shipentegra.com/v1';
const LABEL = 'ShipEntegra';

export interface ShipEntegraCredentials {
  clientId: string;
  clientSecret: string;
  testMode: boolean;
  enabled: boolean;
  shippingType: number;
  sender: {
    name: string;
    address: string;
    city: string;
    zipCode: string;
    phone: string;
    email: string;
  };
}

export async function getShipEntegraCredentials(): Promise<ShipEntegraCredentials> {
  const s = await storage.getSiteSettings();
  return {
    clientId: s.shipentegra_client_id || '',
    clientSecret: s.shipentegra_client_secret || '',
    testMode: s.shipentegra_test_mode === 'true',
    enabled: s.shipentegra_enabled === 'true',
    shippingType: parseInt(s.shipentegra_shipping_type || '1', 10) || 1,
    sender: {
      name: s.shipentegra_sender_name || s.site_name || '',
      address: s.shipentegra_sender_address || '',
      city: s.shipentegra_sender_city || '',
      zipCode: s.shipentegra_sender_zip || '',
      phone: s.shipentegra_sender_phone || s.site_phone || '',
      email: s.shipentegra_sender_email || s.site_email || '',
    },
  };
}

function baseUrl(creds: ShipEntegraCredentials): string {
  return creds.testMode ? SANDBOX_URL : PRODUCTION_URL;
}

// ── Token önbelleği ────────────────────────────────────────────────────────
let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

function cacheKey(creds: ShipEntegraCredentials): string {
  return `${creds.testMode ? 'test' : 'live'}:${creds.clientId}`;
}

export function clearShipEntegraTokenCache(): void {
  tokenCache = null;
}

async function getAccessToken(creds: ShipEntegraCredentials): Promise<{ token?: string; error?: string }> {
  if (!creds.clientId || !creds.clientSecret) {
    return { error: 'ShipEntegra Client ID / Client Secret girilmemiş. Ayarlar > Kargo bölümünden ekleyin.' };
  }

  const key = cacheKey(creds);
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now()) {
    return { token: tokenCache.token };
  }

  const response = await fetch(`${baseUrl(creds)}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error ||
      (response.status === 401 || response.status === 403 ? 'Client ID / Client Secret geçersiz.' : `HTTP ${response.status}`);
    return { error: String(message).slice(0, 300) };
  }

  const token = parsed?.data?.accessToken || parsed?.accessToken;
  if (!token) return { error: 'ShipEntegra token yanıtı beklenen biçimde değil.' };

  // Token geçerlilik süresi belirtilmezse güvenli tarafta kalıp 50 dakika kullanılır.
  tokenCache = { key, token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return { token };
}

interface SeResponse { ok: boolean; status: number; data: any; error?: string }

async function request(
  creds: ShipEntegraCredentials,
  path: string,
  init: { method?: string; body?: any } = {},
): Promise<SeResponse> {
  const auth = await getAccessToken(creds);
  if (!auth.token) return { ok: false, status: 401, data: null, error: auth.error };

  const doFetch = async (token: string) => fetch(`${baseUrl(creds)}${path}`, {
    method: init.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'tr',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  let response = await doFetch(auth.token);

  // Token süresi dolduysa bir kez yenile.
  if (response.status === 401) {
    clearShipEntegraTokenCache();
    const retryAuth = await getAccessToken(creds);
    if (!retryAuth.token) return { ok: false, status: 401, data: null, error: retryAuth.error };
    response = await doFetch(retryAuth.token);
  }

  const text = await response.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error?.message || parsed?.error ||
      (response.status === 401 || response.status === 403 ? 'Yetkisiz istek. API bilgilerinizi kontrol edin.' : `HTTP ${response.status}`);
    return { ok: false, status: response.status, data: parsed, error: String(message).slice(0, 300) };
  }

  return { ok: true, status: response.status, data: parsed?.data ?? parsed };
}

/** ShipEntegra alan kalıplarına uyacak biçimde metni sadeleştirir. */
function sanitize(value: string, maxLength: number): string {
  return (value || '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^\w\s,'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizePhone(phone: string): string {
  return (phone || '').replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 32);
}

/**
 * ShipEntegra sipariş kimliğini yanıttan çıkarır. Yanıt gövdesi `data`
 * altında sarmalanmış olabilir (request() bunu zaten açar) ve sürüme göre
 * `orderId` / `id` alanlarından biri döner.
 */
function extractOrderId(raw: any): string | undefined {
  if (!raw) return undefined;
  const node = Array.isArray(raw) ? raw[0] : (raw.order || raw);
  const id = node?.orderId ?? node?.id;
  return id !== undefined && id !== null ? String(id) : undefined;
}

/** ShipEntegra sipariş yanıtından takip numarası / etiket bağlantısını çıkarır. */
function extractOrderFields(raw: any): { trackingNumber?: string; labelUrl?: string; statusText?: string } {
  if (!raw || typeof raw !== 'object') return {};
  const node = raw.order || raw;
  const shipment = node.shipment || node.label || {};
  const trackingNumber =
    node.trackingNumber || node.tracking || node.barcode ||
    shipment.trackingNumber || shipment.tracking || shipment.barcode || '';
  const labelUrl = node.label || node.labelUrl || node.labelURL || shipment.label || shipment.labelUrl || '';
  return {
    trackingNumber: typeof trackingNumber === 'string' && trackingNumber ? trackingNumber : undefined,
    labelUrl: typeof labelUrl === 'string' && labelUrl.startsWith('http') ? labelUrl : undefined,
    statusText: typeof node.status === 'string' ? node.status : undefined,
  };
}

/**
 * Kayıtlı ShipEntegra sipariş kimliği (veya sipariş numarası) ile gönderiyi
 * arar. Etiket adımı ilk denemede başarısız olduğunda takip numarası ve etiket
 * bu yolla kurtarılır.
 */
async function lookupOrder(
  creds: ShipEntegraCredentials,
  ref: ShipmentRef,
): Promise<{ trackingNumber?: string; labelUrl?: string; statusText?: string; orderId?: string; error?: string }> {
  const paths: string[] = [];
  if (ref.shipmentId) paths.push(`/orders/manual/${encodeURIComponent(ref.shipmentId)}?filter=carrier`);
  if (ref.orderNumber) paths.push(`/orders/manual?orderNumber=${encodeURIComponent(ref.orderNumber)}&page=1&limit=20`);
  if (!paths.length) return { error: 'Gönderi kimliği bulunamadı.' };

  let lastError: string | undefined;
  for (const path of paths) {
    try {
      const res = await request(creds, path);
      if (!res.ok) {
        lastError = res.error;
        continue;
      }
      const payload = Array.isArray(res.data) ? res.data[0] : (res.data?.orders?.[0] ?? res.data);
      if (!payload) continue;
      const fields = extractOrderFields(payload);
      const orderId = payload?.orderId ?? payload?.id ?? ref.shipmentId;
      return { ...fields, orderId: orderId ? String(orderId) : undefined };
    } catch (error: any) {
      lastError = providerError(LABEL, error);
    }
  }
  return { error: lastError };
}

export const shipentegraProvider: CargoProvider = {
  id: 'shipentegra',
  label: LABEL,
  supportsLabel: true,
  supportsCancel: false,

  async status(): Promise<ProviderStatus> {
    const creds = await getShipEntegraCredentials();
    const missing: string[] = [];
    if (!creds.clientId) missing.push('Client ID');
    if (!creds.clientSecret) missing.push('Client Secret');
    if (!creds.sender.name || !creds.sender.address || !creds.sender.city || !creds.sender.zipCode) {
      missing.push('gönderici adresi');
    }
    return {
      id: 'shipentegra',
      label: LABEL,
      enabled: creds.enabled,
      configured: missing.length === 0,
      missing: missing.length ? `Eksik ayar: ${missing.join(', ')}` : undefined,
    };
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const creds = await getShipEntegraCredentials();
    const status = await shipentegraProvider.status();
    if (!status.configured) {
      return { success: false, error: `ShipEntegra ayarları eksik. ${status.missing}` };
    }

    const weight = parseFloat(input.weightKg || input.desi || '1') || 1;
    // /orders/manual sözleşmesi: items[].name (3-512), quantity, unitPrice
    const items = (input.items.length ? input.items : [{ title: 'Siparis urunu', quantity: 1, unitPrice: input.totalAmount }])
      .slice(0, 100)
      .map((item, i) => ({
        name: (sanitize(item.title || 'Urun', 512) || 'Urun').padEnd(3, ' ').trim(),
        quantity: item.quantity || 1,
        unitPrice: Math.max(parseFloat(item.unitPrice || '0') || 0.01, 0.01),
        sku: item.sku ? String(item.sku).slice(0, 128) : undefined,
      }));

    // description 5-50 karakter olmalı.
    const description = (sanitize(items[0]?.name || 'Siparis', 50) || 'Siparis').padEnd(5, '.').slice(0, 50);
    const shippingAmount = Math.max(parseFloat(input.totalAmount || '0') || 0.01, 0.01);

    const body = {
      // Sipariş numarası ShipEntegra'da `number` alanında tutulur;
      // reference1 panelde hızlı arama için kullanılır.
      number: input.orderNumber.slice(0, 128),
      reference1: input.orderNumber.slice(0, 40),
      description,
      currency: (input.currency === 'TL' ? 'TRY' : input.currency) || 'TRY',
      packageQuantity: 1,
      weight,
      height: 20,
      width: 20,
      length: 20,
      shippingAmount,
      addressName: sanitize(input.recipient.name, 80) || 'Musteri',
      rememberMyAddress: false,
      shippingAddress: {
        name: sanitize(input.recipient.name, 128) || 'Musteri',
        address: sanitize(input.recipient.address, 255) || sanitize(input.recipient.city, 255),
        country: (input.recipient.countryCode || 'TR').toUpperCase().slice(0, 2),
        city: sanitize(input.recipient.city, 128) || '-',
        state: sanitize(input.recipient.district, 128) || undefined,
        postalCode: (input.recipient.postalCode || '00000').slice(0, 20),
        email: input.recipient.email ? input.recipient.email.slice(0, 60) : undefined,
        phone: sanitizePhone(input.recipient.phone).slice(0, 25) || undefined,
      },
      items,
    };

    try {
      const orderRes = await request(creds, '/orders/manual', { method: 'POST', body });
      if (!orderRes.ok) {
        return { success: false, error: `ShipEntegra siparişi oluşturulamadı: ${orderRes.error}` };
      }

      const orderId = extractOrderId(orderRes.data);
      if (!orderId) {
        return { success: false, error: 'ShipEntegra sipariş kimliği alınamadı. Yanıt beklenen biçimde değil.' };
      }

      const labelRes = await request(creds, '/logistics/labels/shipentegra', {
        method: 'POST',
        body: {
          orderId: Number(orderId),
          weight,
          content: description,
          currency: (input.currency === 'TL' ? 'TRY' : input.currency) || 'TRY',
        },
      });

      if (!labelRes.ok) {
        // Sipariş oluştu ama etiket alınamadı — sipariş kimliği kaydedilir ki
        // yönetici tekrar deneyebilsin.
        return {
          success: true,
          shipmentId: String(orderId),
          carrierName: LABEL,
          pending: true,
          message: `ShipEntegra siparişi oluşturuldu (ID: ${orderId}) ancak etiket alınamadı: ${labelRes.error}`,
        };
      }

      const data = labelRes.data || {};
      const trackingNumber = data.trackingNumber || data.tracking || data.barcode || '';
      const labelUrl = data.label || data.labelUrl || data.url || '';

      return {
        success: true,
        shipmentId: String(orderId),
        trackingNumber: trackingNumber || undefined,
        labelUrl: labelUrl || undefined,
        carrierName: LABEL,
        pending: !trackingNumber,
        message: trackingNumber
          ? `ShipEntegra gönderisi oluşturuldu. Takip no: ${trackingNumber}`
          : 'ShipEntegra siparişi oluşturuldu, takip numarası henüz üretilmedi.',
      };
    } catch (error: any) {
      console.error('[ShipEntegra] createShipment error:', error);
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async track(ref: ShipmentRef): Promise<TrackShipmentResult> {
    const creds = await getShipEntegraCredentials();
    let trackingNumber = ref.trackingNumber || '';

    // Takip numarası henüz siparişe yazılmadıysa (etiket üretimi gecikmiş veya
    // ilk denemede başarısız olmuşsa) kayıtlı sipariş kimliği üzerinden aranır.
    if (!trackingNumber) {
      const lookup = await lookupOrder(creds, ref);
      if (lookup.error) return { success: false, error: `ShipEntegra durum sorgulanamadı: ${lookup.error}` };
      if (lookup.trackingNumber) {
        trackingNumber = lookup.trackingNumber;
      } else {
        return {
          success: true,
          found: false,
          labelUrl: lookup.labelUrl,
          error: 'Takip numarası henüz oluşmadı. Etiket üretildikten sonra tekrar sorgulayın.',
        };
      }
    }

    try {
      const res = await request(creds, `/logistics/shipments/activities?trackingNumber=${encodeURIComponent(trackingNumber)}`);
      if (!res.ok) return { success: false, error: `ShipEntegra durum sorgulanamadı: ${res.error}` };

      const activities: any[] = Array.isArray(res.data) ? res.data : (res.data?.activities || []);
      if (!activities.length) {
        return { success: true, found: false, trackingNumber, error: 'Kargo hareketi bulunamadı.' };
      }

      const latest = activities[activities.length - 1] || activities[0];
      const statusText: string = latest?.status || latest?.description || latest?.activity || '';
      const delivered = /teslim|delivered/i.test(statusText);

      return {
        success: true,
        found: true,
        trackingNumber,
        statusCode: latest?.statusCode || undefined,
        statusText: statusText || undefined,
        delivered,
      };
    } catch (error: any) {
      console.error('[ShipEntegra] track error:', error);
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async getLabel(ref: ShipmentRef): Promise<LabelResult> {
    if (ref.labelUrl) return { success: true, url: ref.labelUrl };

    const creds = await getShipEntegraCredentials();
    try {
      // 1) Sipariş kaydında etiket oluşmuş mu?
      const lookup = await lookupOrder(creds, ref);
      if (lookup.labelUrl) return { success: true, url: lookup.labelUrl };

      const orderId = lookup.orderId || ref.shipmentId;
      if (!orderId) {
        return {
          success: false,
          error: lookup.error
            ? `ShipEntegra etiketi alınamadı: ${lookup.error}`
            : 'ShipEntegra etiketi bulunamadı. Önce gönderi oluşturun.',
        };
      }

      // 2) Sipariş var ama etiketi yok (oluşturma sırasında etiket adımı
      //    başarısız olmuş olabilir) — etiket üretimi bir kez tekrarlanır.
      const labelRes = await request(creds, '/logistics/labels/shipentegra', {
        method: 'POST',
        body: { orderId: Number(orderId), content: 'Siparis' },
      });
      if (!labelRes.ok) {
        return { success: false, error: `ShipEntegra etiketi üretilemedi: ${labelRes.error}` };
      }

      const data = labelRes.data || {};
      const url = data.label || data.labelUrl || data.url || '';
      if (!url) {
        return { success: false, error: 'ShipEntegra etiket bağlantısı yanıtta bulunamadı.' };
      }
      return { success: true, url };
    } catch (error: any) {
      console.error('[ShipEntegra] getLabel error:', error);
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async testConnection(): Promise<TestConnectionResult> {
    const creds = await getShipEntegraCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      return { success: false, error: 'ShipEntegra Client ID / Client Secret girilmemiş.' };
    }
    try {
      const res = await request(creds, '/users/carriers');
      if (!res.ok) return { success: false, error: `ShipEntegra bağlantısı doğrulanamadı: ${res.error}` };
      return {
        success: true,
        message: `ShipEntegra bağlantısı başarılı${creds.testMode ? ' (test ortamı)' : ''}.`,
      };
    } catch (error: any) {
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async cancelShipment(): Promise<CancelShipmentResult> {
    return {
      success: false,
      error: 'ShipEntegra gönderileri API üzerinden iptal edilemiyor. ShipEntegra panelinden iptal ediniz.',
    };
  },
};

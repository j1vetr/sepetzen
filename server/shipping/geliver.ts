/**
 * Geliver adaptörü (REST, Bearer token).
 *
 * Tek aşamalı akış kullanılır: POST /transactions isteği hem gönderiyi oluşturur
 * hem de seçilen providerServiceCode ile etiketi satın alır. Yanıtta barkod,
 * takip numarası ve etiket URL'si döner.
 *
 * Dokümantasyon: https://docs.geliver.io
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

const BASE_URL = 'https://api.geliver.io/api/v1';
const LABEL = 'Geliver';

export interface GeliverCredentials {
  token: string;
  senderAddressId: string;
  serviceCode: string;
  storeUrl: string;
  testMode: boolean;
  enabled: boolean;
}

/** Maskeli değer ('••••••••') gerçek bir kimlik bilgisi değildir, kayıtlı değer kullanılmalıdır. */
function isMaskedValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^•+$/.test(trimmed);
}

/**
 * Kayıtlı ayarlardan kimlik bilgilerini okur. `overrides` verilirse (admin
 * ekranındaki kaydedilmemiş form değerleri) bunlar kayıtlı değerlerin önüne
 * geçer; maskeli token gönderilmişse kayıtlı token kullanılır. Token'daki
 * baş/son boşluklar (kopyala-yapıştır hatası) her durumda temizlenir.
 */
export async function getGeliverCredentials(overrides?: Record<string, string>): Promise<GeliverCredentials> {
  const s = await storage.getSiteSettings();
  const o = overrides || {};
  const pick = (key: string): string | undefined => {
    const candidate = o[key];
    if (typeof candidate === 'string' && !isMaskedValue(candidate)) return candidate;
    return (s as Record<string, string | undefined>)[key];
  };
  return {
    token: (pick('geliver_api_token') || '').trim(),
    senderAddressId: (pick('geliver_sender_address_id') || '').trim(),
    serviceCode: (pick('geliver_service_code') || '').trim() || 'GELIVER_STANDART',
    storeUrl: pick('geliver_store_url') || s.site_url || '',
    testMode: (pick('geliver_test_mode') ?? '') === 'true',
    enabled: (pick('geliver_enabled') ?? '') === 'true',
  };
}

/** Türkiye plaka kodu (cityCode) eşlemesi — Geliver adres alanında zorunlu. */
const CITY_CODES: Record<string, string> = {
  'ADANA': '01', 'ADIYAMAN': '02', 'AFYONKARAHISAR': '03', 'AFYON': '03', 'AGRI': '04', 'AMASYA': '05',
  'ANKARA': '06', 'ANTALYA': '07', 'ARTVIN': '08', 'AYDIN': '09', 'BALIKESIR': '10', 'BILECIK': '11',
  'BINGOL': '12', 'BITLIS': '13', 'BOLU': '14', 'BURDUR': '15', 'BURSA': '16', 'CANAKKALE': '17',
  'CANKIRI': '18', 'CORUM': '19', 'DENIZLI': '20', 'DIYARBAKIR': '21', 'EDIRNE': '22', 'ELAZIG': '23',
  'ERZINCAN': '24', 'ERZURUM': '25', 'ESKISEHIR': '26', 'GAZIANTEP': '27', 'GIRESUN': '28',
  'GUMUSHANE': '29', 'HAKKARI': '30', 'HATAY': '31', 'ISPARTA': '32', 'MERSIN': '33', 'ICEL': '33',
  'ISTANBUL': '34', 'IZMIR': '35', 'KARS': '36', 'KASTAMONU': '37', 'KAYSERI': '38', 'KIRKLARELI': '39',
  'KIRSEHIR': '40', 'KOCAELI': '41', 'KONYA': '42', 'KUTAHYA': '43', 'MALATYA': '44', 'MANISA': '45',
  'KAHRAMANMARAS': '46', 'MARDIN': '47', 'MUGLA': '48', 'MUS': '49', 'NEVSEHIR': '50', 'NIGDE': '51',
  'ORDU': '52', 'RIZE': '53', 'SAKARYA': '54', 'SAMSUN': '55', 'SIIRT': '56', 'SINOP': '57', 'SIVAS': '58',
  'TEKIRDAG': '59', 'TOKAT': '60', 'TRABZON': '61', 'TUNCELI': '62', 'SANLIURFA': '63', 'USAK': '64',
  'VAN': '65', 'YOZGAT': '66', 'ZONGULDAK': '67', 'AKSARAY': '68', 'BAYBURT': '69', 'KARAMAN': '70',
  'KIRIKKALE': '71', 'BATMAN': '72', 'SIRNAK': '73', 'BARTIN': '74', 'ARDAHAN': '75', 'IGDIR': '76',
  'YALOVA': '77', 'KARABUK': '78', 'KILIS': '79', 'OSMANIYE': '80', 'DUZCE': '81',
};

function normalizeCityKey(city: string): string {
  return city
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export function cityCodeFor(city: string): string {
  return CITY_CODES[normalizeCityKey(city)] || '';
}

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('90') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 11) return `+9${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return `+${digits}`;
}

interface GeliverResponse {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

async function request(
  creds: GeliverCredentials,
  path: string,
  init: { method?: string; body?: any } = {},
): Promise<GeliverResponse> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init.method || 'GET',
    headers: {
      'Authorization': `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      parsed?.message ||
      parsed?.error?.message ||
      parsed?.error ||
      (response.status === 401 || response.status === 403
        ? 'API anahtarı geçersiz veya yetkisiz.'
        : `HTTP ${response.status}`);
    return { ok: false, status: response.status, data: parsed, error: String(message).slice(0, 300) };
  }

  return { ok: true, status: response.status, data: parsed?.data ?? parsed };
}

/** Geliver takip durum kodlarının Türkçe karşılıkları. */
const STATUS_TEXT: Record<string, string> = {
  PRE_TRANSIT: 'Kargo bekleniyor',
  TRANSIT: 'Yolda',
  DELIVERED: 'Teslim edildi',
  RETURNED: 'İade edildi',
  FAILURE: 'Teslimat başarısız',
  CANCELLED: 'İptal edildi',
  UNKNOWN: 'Durum bilinmiyor',
};

function shipmentToTracking(shipment: any): TrackShipmentResult {
  const statusCode: string = shipment?.trackingStatus?.trackingStatusCode || shipment?.statusCode || '';
  const trackingNumber = shipment?.trackingNumber || shipment?.barcode || '';
  return {
    success: true,
    found: !!trackingNumber,
    trackingNumber: trackingNumber || undefined,
    trackingUrl: shipment?.trackingURL || shipment?.trackingUrl || undefined,
    statusCode: statusCode || undefined,
    statusText: STATUS_TEXT[statusCode] || statusCode || undefined,
    delivered: statusCode === 'DELIVERED',
    labelUrl: shipment?.labelURL || shipment?.responsiveLabelURL || undefined,
  };
}

export const geliverProvider: CargoProvider = {
  id: 'geliver',
  label: LABEL,
  supportsLabel: true,
  supportsCancel: true,

  async status(): Promise<ProviderStatus> {
    const creds = await getGeliverCredentials();
    const missing: string[] = [];
    if (!creds.token) missing.push('API token');
    if (!creds.serviceCode) missing.push('servis kodu');
    return {
      id: 'geliver',
      label: LABEL,
      enabled: creds.enabled,
      configured: missing.length === 0,
      missing: missing.length ? `Eksik ayar: ${missing.join(', ')}` : undefined,
    };
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const creds = await getGeliverCredentials();
    if (!creds.token) {
      return { success: false, error: 'Geliver API token girilmemiş. Ayarlar > Kargo bölümünden ekleyin.' };
    }

    const cityCode = cityCodeFor(input.recipient.city);
    if (input.recipient.countryCode === 'TR' && !cityCode) {
      return { success: false, error: `Geliver için şehir plaka kodu belirlenemedi: "${input.recipient.city}". Sipariş adresini kontrol edin.` };
    }

    const items = (input.items.length ? input.items : [{ title: 'Sipariş', quantity: 1 }]).map(i => ({
      title: (i.title || 'Ürün').slice(0, 100),
      quantity: i.quantity || 1,
    }));

    const body: any = {
      providerServiceCode: creds.serviceCode,
      shipment: {
        test: creds.testMode,
        recipientAddress: {
          name: input.recipient.name,
          email: input.recipient.email || undefined,
          phone: normalizePhone(input.recipient.phone),
          address1: input.recipient.address.slice(0, 250),
          countryCode: input.recipient.countryCode || 'TR',
          cityCode,
          cityName: input.recipient.city,
          districtName: input.recipient.district || input.recipient.city,
          zip: input.recipient.postalCode || undefined,
        },
        length: '20',
        width: '20',
        height: '20',
        distanceUnit: 'cm',
        weight: input.weightKg || input.desi || '1',
        massUnit: 'kg',
        items,
        productPaymentOnDelivery: false,
        hidePackageContentOnTag: false,
        order: {
          sourceCode: 'API',
          sourceIdentifier: creds.storeUrl || undefined,
          orderNumber: input.orderNumber,
          totalAmount: input.totalAmount || undefined,
          totalAmountCurrency: input.currency || 'TL',
        },
      },
    };
    if (creds.senderAddressId) body.shipment.senderAddressID = creds.senderAddressId;

    try {
      const res = await request(creds, '/transactions', { method: 'POST', body });
      if (!res.ok) {
        return { success: false, error: `Geliver gönderi oluşturulamadı: ${res.error}` };
      }

      const shipment = res.data?.shipment || res.data?.transaction?.shipment || res.data;
      const trackingNumber: string = shipment?.trackingNumber || shipment?.barcode || '';
      const labelUrl: string = shipment?.labelURL || shipment?.responsiveLabelURL || '';

      if (!shipment?.id && !trackingNumber) {
        return { success: false, error: 'Geliver beklenmeyen bir yanıt döndürdü. Gönderi oluşturulamadı.' };
      }

      const carrierName = shipment?.providerServiceName || shipment?.providerName || `Geliver (${creds.serviceCode})`;

      return {
        success: true,
        shipmentId: shipment?.id || undefined,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: shipment?.trackingURL || shipment?.trackingUrl || undefined,
        labelUrl: labelUrl || undefined,
        carrierName,
        pending: !trackingNumber,
        message: trackingNumber
          ? `Geliver gönderisi oluşturuldu. Barkod: ${trackingNumber}`
          : 'Geliver gönderisi oluşturuldu, takip numarası kısa süre içinde oluşacak.',
      };
    } catch (error: any) {
      console.error('[Geliver] createShipment error:', error);
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async track(ref: ShipmentRef): Promise<TrackShipmentResult> {
    const creds = await getGeliverCredentials();
    if (!creds.token) return { success: false, error: 'Geliver API token girilmemiş.' };
    if (!ref.shipmentId) {
      return { success: false, error: 'Bu sipariş için Geliver gönderi kaydı yok. Önce "Gönderi Oluştur" ile kayıt açın.' };
    }

    try {
      const res = await request(creds, `/shipments/${encodeURIComponent(ref.shipmentId)}`);
      if (!res.ok) {
        return { success: false, error: `Geliver durum sorgulanamadı: ${res.error}` };
      }
      const shipment = res.data?.shipment || res.data;
      return shipmentToTracking(shipment);
    } catch (error: any) {
      console.error('[Geliver] track error:', error);
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async getLabel(ref: ShipmentRef): Promise<LabelResult> {
    if (ref.labelUrl) return { success: true, url: ref.labelUrl };

    const creds = await getGeliverCredentials();
    if (!creds.token) return { success: false, error: 'Geliver API token girilmemiş.' };
    if (!ref.shipmentId) {
      return { success: false, error: 'Bu sipariş için Geliver gönderi kaydı yok. Önce gönderi oluşturun.' };
    }

    try {
      const res = await request(creds, `/shipments/${encodeURIComponent(ref.shipmentId)}`);
      if (!res.ok) return { success: false, error: `Geliver etiketi alınamadı: ${res.error}` };
      const shipment = res.data?.shipment || res.data;
      const url = shipment?.labelURL || shipment?.responsiveLabelURL;
      if (!url) return { success: false, error: 'Geliver etiketi henüz hazır değil.' };
      return { success: true, url };
    } catch (error: any) {
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async testConnection(overrides?: Record<string, string>): Promise<TestConnectionResult> {
    const creds = await getGeliverCredentials(overrides);
    if (!creds.token) {
      return {
        success: false,
        error: 'Geliver API token girilmemiş. Geliver panelinde Ayarlar > API bölümünden token oluşturup API Token alanına yapıştırın.',
      };
    }
    try {
      const res = await request(creds, '/addresses?isRecipientAddress=false&limit=1&page=1');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error:
              'Geliver bağlantısı doğrulanamadı: Token geçersiz veya yetkisi yetersiz. ' +
              'Geliver panelinde (geliver.io) API bölümünden TAM YETKİLİ yeni bir token oluşturun ve eksiksiz kopyalayıp buraya yapıştırın. ' +
              `Geliver yanıtı: ${res.error}`,
          };
        }
        if (res.status >= 500) {
          return {
            success: false,
            error: `Geliver bağlantısı doğrulanamadı: Geliver sunucusunda geçici bir sorun var (HTTP ${res.status}). Birkaç dakika sonra tekrar deneyin. Geliver yanıtı: ${res.error}`,
          };
        }
        return { success: false, error: `Geliver bağlantısı doğrulanamadı: ${res.error}` };
      }
      return { success: true, message: 'Geliver bağlantısı başarılı, token doğrulandı.' };
    } catch (error: any) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        return { success: false, error: 'Geliver bağlantısı doğrulanamadı: Geliver sunucusu yanıt vermedi (zaman aşımı). İnternet bağlantınızı kontrol edip tekrar deneyin.' };
      }
      return { success: false, error: providerError(LABEL, error) };
    }
  },

  async cancelShipment(ref: ShipmentRef): Promise<CancelShipmentResult> {
    const creds = await getGeliverCredentials();
    if (!creds.token || !ref.shipmentId) {
      return { success: false, error: 'İptal edilecek Geliver gönderisi bulunamadı.' };
    }
    try {
      const res = await request(creds, `/shipments/${encodeURIComponent(ref.shipmentId)}`, { method: 'DELETE' });
      if (!res.ok) return { success: false, error: `Geliver gönderisi iptal edilemedi: ${res.error}` };
      return { success: true, message: 'Geliver gönderisi iptal edildi.' };
    } catch (error: any) {
      return { success: false, error: providerError(LABEL, error) };
    }
  },
};

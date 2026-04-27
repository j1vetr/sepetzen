import { storage } from './storage';
import type { Order } from '@shared/schema';

export interface WhatsAppResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
}

export type WhatsAppEvent =
  | 'order_received_customer'
  | 'order_received_admin'
  | 'order_preparing_customer'
  | 'order_shipped_customer'
  | 'order_delivered_customer'
  | 'order_cancelled_customer'
  | 'order_cancelled_admin';

export const WHATSAPP_EVENT_LABELS: Record<WhatsAppEvent, string> = {
  order_received_customer: 'Sipariş alındı (müşteriye)',
  order_received_admin: 'Yeni sipariş bildirimi (yöneticiye)',
  order_preparing_customer: 'Sipariş hazırlanıyor (müşteriye)',
  order_shipped_customer: 'Kargoya verildi (müşteriye)',
  order_delivered_customer: 'Teslim edildi (müşteriye)',
  order_cancelled_customer: 'Sipariş iptal edildi (müşteriye)',
  order_cancelled_admin: 'Sipariş iptal edildi (yöneticiye)',
};

export const DEFAULT_TEMPLATES: Record<WhatsAppEvent, string> = {
  order_received_customer:
    'Merhaba {{musteriAdi}},\n\n{{siteAdi}}\'dan {{siparisNo}} numaralı siparişiniz alındı. Toplam tutar: {{toplam}} TL.\n\nSiparişiniz hazırlanmaya başladığında size tekrar haber vereceğiz.\n\nTeşekkürler!',
  order_received_admin:
    'Yeni sipariş geldi!\n\nSipariş No: {{siparisNo}}\nMüşteri: {{musteriAdi}}\nTelefon: {{musteriTelefon}}\nTutar: {{toplam}} TL',
  order_preparing_customer:
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz hazırlanmaya başladı. En kısa sürede kargoya teslim edilecek.\n\n{{siteAdi}}',
  order_shipped_customer:
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz kargoya verildi.\n\nKargo Firması: {{kargoFirma}}\nTakip No: {{kargoTakipNo}}\nTakip Linki: {{kargoTakipLink}}\n\n{{siteAdi}}',
  order_delivered_customer:
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n{{siteAdi}}',
  order_cancelled_customer:
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz iptal edilmiştir. Detaylı bilgi için bizimle iletişime geçebilirsiniz.\n\n{{siteAdi}}',
  order_cancelled_admin:
    'Sipariş iptal edildi!\n\nSipariş No: {{siparisNo}}\nMüşteri: {{musteriAdi}}\nTutar: {{toplam}} TL',
};

const DEFAULT_ENDPOINT = 'http://127.0.0.1:3225/api/send-message';

interface WhatsAppConfig {
  enabled: boolean;
  apiKey: string;
  endpoint: string;
  adminPhone: string;
  siteName: string;
  events: Record<WhatsAppEvent, boolean>;
  templates: Record<WhatsAppEvent, string>;
}

async function getConfig(): Promise<WhatsAppConfig | null> {
  const settings = await storage.getSiteSettings();
  const enabled = settings.wpileti_enabled === 'true';
  if (!enabled) return null;

  const apiKey = settings.wpileti_api_key || '';
  if (!apiKey) return null;

  const endpoint = settings.wpileti_endpoint || DEFAULT_ENDPOINT;
  const adminPhone = settings.wpileti_admin_phone || '';
  const siteName = settings.site_name || 'Polen Stone';

  const events = {} as Record<WhatsAppEvent, boolean>;
  const templates = {} as Record<WhatsAppEvent, string>;
  for (const evt of Object.keys(DEFAULT_TEMPLATES) as WhatsAppEvent[]) {
    events[evt] = settings[`wpileti_evt_${evt}`] !== 'false';
    const tplValue = settings[`wpileti_tpl_${evt}`];
    templates[evt] = tplValue && tplValue.trim() ? tplValue : DEFAULT_TEMPLATES[evt];
  }

  return { enabled, apiKey, endpoint, adminPhone, siteName, events, templates };
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, '');
  while (digits.startsWith('+') || digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) digits = '90' + digits;
  if (!/^90\d{10}$/.test(digits)) return null;
  return digits;
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 4) + '*'.repeat(phone.length - 6) + phone.slice(-2);
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

async function sendRaw(
  config: WhatsAppConfig,
  rawPhone: string | null | undefined,
  message: string,
  event: WhatsAppEvent | 'test'
): Promise<WhatsAppResult> {
  const receiver = normalizePhone(rawPhone);
  if (!receiver) {
    console.log(`[WhatsApp] invalid phone, skipping event=${event} input=${rawPhone || '(empty)'}`);
    return { success: false, skipped: true, error: 'Geçersiz telefon numarası' };
  }

  console.log(`[WhatsApp] sending to ${maskPhone(receiver)} event=${event}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        receiver,
        data: { message },
      }),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error(`[WhatsApp] HTTP ${res.status} event=${event} body=${text.slice(0, 200)}`);
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    console.log(`[WhatsApp] sent ok event=${event}`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'wpileti timeout (10s)' : err?.message || 'Bilinmeyen hata';
    console.error(`[WhatsApp] failed event=${event}: ${msg}`);
    return { success: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

function orderVars(order: Order, config: WhatsAppConfig): Record<string, string> {
  return {
    musteriAdi: order.customerName || 'Değerli müşterimiz',
    musteriTelefon: order.customerPhone || '',
    musteriEposta: order.customerEmail || '',
    siparisNo: order.orderNumber,
    toplam: String(order.total),
    araToplam: String(order.subtotal),
    kargoUcreti: String(order.shippingCost),
    kargoTakipNo: order.trackingNumber || '',
    kargoTakipLink: order.trackingUrl || '',
    kargoFirma: order.shippingCarrier || '',
    siteAdi: config.siteName,
  };
}

async function sendEventToCustomer(order: Order, event: WhatsAppEvent): Promise<WhatsAppResult> {
  const config = await getConfig();
  if (!config) return { success: false, skipped: true, error: 'WhatsApp servisi kapalı' };
  if (!config.events[event]) {
    console.log(`[WhatsApp] event ${event} disabled, skipping`);
    return { success: false, skipped: true, error: 'Bu olay için bildirim kapalı' };
  }
  const message = renderTemplate(config.templates[event], orderVars(order, config));
  return sendRaw(config, order.customerPhone, message, event);
}

async function sendEventToAdmin(order: Order, event: WhatsAppEvent): Promise<WhatsAppResult> {
  const config = await getConfig();
  if (!config) return { success: false, skipped: true, error: 'WhatsApp servisi kapalı' };
  if (!config.events[event]) {
    console.log(`[WhatsApp] event ${event} disabled, skipping`);
    return { success: false, skipped: true, error: 'Bu olay için bildirim kapalı' };
  }
  if (!config.adminPhone) {
    console.log(`[WhatsApp] admin phone not configured, skipping event=${event}`);
    return { success: false, skipped: true, error: 'Yönetici telefonu yapılandırılmamış' };
  }
  const message = renderTemplate(config.templates[event], orderVars(order, config));
  return sendRaw(config, config.adminPhone, message, event);
}

export async function sendOrderReceivedToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_received_customer');
}
export async function sendOrderReceivedToAdmin(order: Order) {
  return sendEventToAdmin(order, 'order_received_admin');
}
export async function sendOrderPreparingToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_preparing_customer');
}
export async function sendOrderShippedToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_shipped_customer');
}
export async function sendOrderDeliveredToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_delivered_customer');
}
export async function sendOrderCancelledToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_cancelled_customer');
}
export async function sendOrderCancelledToAdmin(order: Order) {
  return sendEventToAdmin(order, 'order_cancelled_admin');
}

export async function sendTestWhatsApp(rawPhone: string, customMessage?: string): Promise<WhatsAppResult> {
  const config = await getConfig();
  if (!config) {
    return {
      success: false,
      error: 'WhatsApp servisi kapalı veya API anahtarı eksik. Önce ayarları kaydedip servisi etkinleştirin.',
    };
  }
  const message =
    customMessage && customMessage.trim()
      ? customMessage
      : `Merhaba! Bu ${config.siteName} WhatsApp bildirim sisteminin test mesajıdır. Ayarlarınız çalışıyor.`;
  return sendRaw(config, rawPhone, message, 'test');
}

export const WHATSAPP_EVENT_KEYS = Object.keys(DEFAULT_TEMPLATES) as WhatsAppEvent[];

export const WHATSAPP_TEMPLATE_VARIABLES = [
  'musteriAdi',
  'musteriTelefon',
  'musteriEposta',
  'siparisNo',
  'toplam',
  'araToplam',
  'kargoUcreti',
  'kargoTakipNo',
  'kargoTakipLink',
  'kargoFirma',
  'siteAdi',
];

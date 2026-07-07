import { storage } from './storage';
import type { Order } from '@shared/schema';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { formatTRDate, formatTRTime, formatTRDateTime } from '@shared/dateFormat';

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
  | 'order_cancelled_admin'
  | 'order_bank_transfer_pending_customer'
  | 'order_bank_transfer_admin'
  | 'review_pending_admin';

export const WHATSAPP_EVENT_LABELS: Record<WhatsAppEvent, string> = {
  order_received_customer: 'Sipariş alındı (müşteriye)',
  order_received_admin: 'Yeni sipariş bildirimi (yöneticiye)',
  order_preparing_customer: 'Sipariş hazırlanıyor (müşteriye)',
  order_shipped_customer: 'Kargoya verildi (müşteriye)',
  order_delivered_customer: 'Teslim edildi (müşteriye)',
  order_cancelled_customer: 'Sipariş iptal edildi (müşteriye)',
  order_cancelled_admin: 'Sipariş iptal edildi (yöneticiye)',
  order_bank_transfer_pending_customer: 'Havale ödeme alındı – onay bekleniyor (müşteriye)',
  order_bank_transfer_admin: 'Havale ile ödeme – kontrol et (yöneticiye)',
  review_pending_admin: 'Yeni yorum onay bekliyor (yöneticiye)',
};

const DIVIDER = '━━━━━━━━━━━━━━━';

const PREVIOUS_DEFAULT_TEMPLATES: Record<WhatsAppEvent, string[]> = {
  order_received_customer: [
    'Merhaba {{musteriAdi}},\n\n{{siteAdi}}\'dan {{siparisNo}} numaralı siparişiniz alındı. Toplam tutar: {{toplam}} TL.\n\nSiparişiniz hazırlanmaya başladığında size tekrar haber vereceğiz.\n\nTeşekkürler!',
    '✅ *Siparişiniz alındı*\n\nMerhaba {{musteriAdi}}, {{siteAdi}}\'dan *{{siparisNo}}* numaralı siparişiniz başarıyla alındı.\n\nToplam: *{{toplam}} TL*\n\nHazırlanmaya başladığında size tekrar haber vereceğiz. Bizi tercih ettiğiniz için teşekkürler.',
  ],
  order_received_admin: [
    'Yeni sipariş geldi!\n\nSipariş No: {{siparisNo}}\nMüşteri: {{musteriAdi}}\nTelefon: {{musteriTelefon}}\nTutar: {{toplam}} TL',
  ],
  order_preparing_customer: [
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz hazırlanmaya başladı. En kısa sürede kargoya teslim edilecek.\n\n{{siteAdi}}',
    '📦 *Siparişiniz hazırlanıyor*\n\nMerhaba {{musteriAdi}}, *{{siparisNo}}* numaralı siparişiniz atölyemizde özenle hazırlanıyor. En kısa sürede kargoya teslim edilecek.\n\n- {{siteAdi}}',
  ],
  order_shipped_customer: [
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz kargoya verildi.\n\nKargo Firması: {{kargoFirma}}\nTakip No: {{kargoTakipNo}}\nTakip Linki: {{kargoTakipLink}}\n\n{{siteAdi}}',
    '🚚 *Kargoya verildi*\n\nMerhaba {{musteriAdi}}, *{{siparisNo}}* numaralı siparişiniz kargoya verildi.\n\nKargo: {{kargoFirma}}\nTakip No: *{{kargoTakipNo}}*\nTakip: {{kargoTakipLink}}\n\n- {{siteAdi}}',
  ],
  order_delivered_customer: [
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n{{siteAdi}}',
    '🎉 *Siparişiniz teslim edildi*\n\nMerhaba {{musteriAdi}}, *{{siparisNo}}* numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz. Memnun kaldıysanız bir değerlendirme bırakırsanız çok seviniriz.\n\n- {{siteAdi}}',
  ],
  order_cancelled_customer: [
    'Merhaba {{musteriAdi}},\n\n{{siparisNo}} numaralı siparişiniz iptal edilmiştir. Detaylı bilgi için bizimle iletişime geçebilirsiniz.\n\n{{siteAdi}}',
    'ℹ️ *Sipariş iptal bildirimi*\n\nMerhaba {{musteriAdi}}, *{{siparisNo}}* numaralı siparişiniz iptal edilmiştir. Detaylı bilgi veya yardım için bizimle iletişime geçebilirsiniz.\n\n- {{siteAdi}}',
  ],
  order_cancelled_admin: [
    'Sipariş iptal edildi!\n\nSipariş No: {{siparisNo}}\nMüşteri: {{musteriAdi}}\nTutar: {{toplam}} TL',
  ],
  order_bank_transfer_pending_customer: [
    `🏦 *Siparişiniz alındı – Havale onayı bekleniyor*\n\nMerhaba {{musteriAdi}}, *{{siparisNo}}* numaralı siparişiniz başarıyla oluşturuldu.\n\nÖdemenizi aşağıdaki hesaba *{{toplam}} TL* olarak gönderebilirsiniz:\n\nBanka: ${BANK_TRANSFER_INFO.bankName}\nIBAN: ${BANK_TRANSFER_INFO.iban}\nAd Soyad: ${BANK_TRANSFER_INFO.accountHolder}\n\nHavaleniz hesabımıza ulaştığında siparişiniz hazırlanmaya başlanacak ve size tekrar bilgi vereceğiz.\n\n- {{siteAdi}}`,
  ],
  order_bank_transfer_admin: [
    '⚠️ *HAVALE İLE ÖDEME - KONTROL ET*\n\nMüşteri havale yöntemiyle yeni bir sipariş oluşturdu.\n\nSipariş No: {{siparisNo}}\nMüşteri: {{musteriAdi}}\nTelefon: {{musteriTelefon}}\nTutar: {{toplam}} TL\n\nHesap hareketlerini kontrol edip admin panelinden onaylayabilirsin.',
  ],
  review_pending_admin: [
    '💬 *YENİ YORUM ONAY BEKLİYOR*\n\nÜrün: *{{urunAdi}}*\nYazan: {{yorumYazari}} {{misafirEtiketi}}\nPuan: {{yildizlar}} ({{puan}}/5)\n{{baslikSatiri}}{{icerikSatiri}}\nAdmin panelinden onaylamak için: {{adminPanelUrl}}',
  ],
};

export const DEFAULT_TEMPLATES: Record<WhatsAppEvent, string> = {
  order_received_customer:
    `🎉 *SİPARİŞİNİZ ALINDI*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\nBizi tercih ettiğiniz için teşekkürler! Siparişiniz başarıyla oluşturuldu ve hazırlık sırasına alındı.\n\n📦 *Sipariş No:* {{siparisNo}}\n🛒 *Ürün Sayısı:* {{urunSayisi}}\n💰 *Toplam:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔍 Siparişinizi takip edin:\n{{siparisTakipLink}}\n\nHazırlığa başladığımızda yine haberdar edeceğiz. ✨\n\n- {{siteAdi}}`,
  order_received_admin:
    `🛍️ *YENİ SİPARİŞ*\n${DIVIDER}\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n📧 *E-posta:* {{musteriEposta}}\n🛒 *Ürün:* {{urunSayisi}} kalem\n💰 *Tutar:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  order_preparing_customer:
    `📦 *SİPARİŞİNİZ HAZIRLANIYOR*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz atölyemizde özenle hazırlanıyor. 🛠️\n\nKargoya verildiğinde takip numarası ile birlikte size tekrar yazacağız. 🚚\n\n🔍 Sipariş takibi:\n{{siparisTakipLink}}\n\n- {{siteAdi}}`,
  order_shipped_customer:
    `🚚 *KARGOYA VERİLDİ*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz kargoya teslim edildi! 📮\n\n🚛 *Kargo Firması:* {{kargoFirma}}\n🏷️ *Takip No:* {{kargoTakipNo}}\n\n🔗 Kargo takibi:\n{{kargoTakipLink}}\n\n📋 Sipariş detayı:\n{{siparisTakipLink}}\n\nGüzel günlerde kullanın! 🌟\n\n- {{siteAdi}}`,
  order_delivered_customer:
    `🎉 *TESLİMAT TAMAMLANDI*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz başarıyla teslim edildi. ✅\n\nBizi tercih ettiğiniz için çok teşekkür ederiz. 🙏\n\n⭐ Memnun kaldıysanız ürün sayfasından kısa bir değerlendirme bırakırsanız çok mutlu oluruz.\n\n- {{siteAdi}}`,
  order_cancelled_customer:
    `ℹ️ *SİPARİŞ İPTALİ*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz iptal edilmiştir.\n\n💳 *Tutar:* {{toplam}} ₺\n🕐 *Tarih:* {{siparisTarihSaat}}\n\nÖdemeniz alındıysa iade süreci en kısa sürede başlatılacaktır. Sorularınız için bize yazabilirsiniz. 💬\n\n- {{siteAdi}}`,
  order_cancelled_admin:
    `❌ *SİPARİŞ İPTAL EDİLDİ*\n${DIVIDER}\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n💰 *Tutar:* {{toplam}} ₺\n💳 *Ödeme:* {{odemeYontemi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  order_bank_transfer_pending_customer:
    `🏦 *HAVALE ONAYI BEKLENİYOR*\n${DIVIDER}\n\nMerhaba {{musteriAdi}} 👋\n\n*{{siparisNo}}* numaralı siparişiniz oluşturuldu. Aşağıdaki hesaba ödemenizi gönderdiğinizde siparişiniz hazırlığa alınacak. ✅\n\n💰 *Tutar:* {{toplam}} ₺\n🛒 *Ürün Sayısı:* {{urunSayisi}}\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n📋 *Banka Bilgileri*\n🏦 Banka: ${BANK_TRANSFER_INFO.bankName}\n🔢 IBAN: \`${BANK_TRANSFER_INFO.iban}\`\n👤 Ad Soyad: ${BANK_TRANSFER_INFO.accountHolder}\n📝 Açıklama: {{siparisNo}}\n\n💡 Açıklamaya sipariş numaranızı yazmayı unutmayın.\n\n🔍 Sipariş takibi:\n{{siparisTakipLink}}\n\n- {{siteAdi}}`,
  order_bank_transfer_admin:
    `⚠️ *HAVALE ÖDEME - KONTROL ET*\n${DIVIDER}\n\nMüşteri havale yöntemiyle yeni bir sipariş oluşturdu. Hesap hareketlerini kontrol edip onaylayın. 🔍\n\n📦 *Sipariş No:* {{siparisNo}}\n👤 *Müşteri:* {{musteriAdi}}\n📞 *Telefon:* {{musteriTelefon}}\n📧 *E-posta:* {{musteriEposta}}\n💰 *Tutar:* {{toplam}} ₺\n🛒 *Ürün:* {{urunSayisi}} kalem\n🕐 *Tarih:* {{siparisTarihSaat}}\n\n🔧 Yönetim paneli:\n{{adminPanelUrl}}`,
  review_pending_admin:
    `💬 *YENİ YORUM - ONAY BEKLİYOR*\n${DIVIDER}\n\n🪨 *Ürün:* {{urunAdi}}\n👤 *Yazan:* {{yorumYazari}} {{misafirEtiketi}}\n⭐ *Puan:* {{yildizlar}} ({{puan}}/5)\n{{baslikSatiri}}{{icerikSatiri}}\n🔧 Onaylamak için:\n{{adminPanelUrl}}`,
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
  const siteName = settings.site_name || 'Sepetzen';

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  iyzico: 'Kredi Kartı',
  credit_card: 'Kredi Kartı',
  card: 'Kredi Kartı',
  bank_transfer: 'Havale / EFT',
  cash_on_delivery: 'Kapıda Ödeme',
};

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'Belirtilmedi';
  return PAYMENT_METHOD_LABELS[method] || method;
}

async function resolveSiteUrl(): Promise<string> {
  try {
    const settings = await storage.getSiteSettings();
    const raw = (settings.site_url || '').trim();
    if (raw) return raw.replace(/\/+$/, '');
  } catch (err) {
    console.error('[WhatsApp] site_url lookup failed:', err);
  }
  return (process.env.SITE_URL || 'https://sepetzen.com').replace(/\/+$/, '');
}

async function orderVars(order: Order, config: WhatsAppConfig): Promise<Record<string, string>> {
  // urunSayisi = sipariş kalem sayısı (line item count, NOT toplam adet).
  let urunSayisi = 0;
  try {
    const items = await storage.getOrderItems(order.id);
    urunSayisi = items.length;
  } catch (err) {
    console.error('[WhatsApp] orderVars items lookup failed:', err);
  }

  const siteUrl = await resolveSiteUrl();
  const siparisTakipLink = `${siteUrl}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const adminPanelUrl = `${siteUrl}/toov-admin/orders/${order.id}`;

  return {
    musteriAdi: order.customerName || 'Değerli müşterimiz',
    musteriTelefon: order.customerPhone || '',
    musteriEposta: order.customerEmail || '',
    siparisNo: order.orderNumber,
    toplam: String(order.total),
    araToplam: String(order.subtotal),
    kargoUcreti: String(order.shippingCost),
    kargoTakipNo: order.trackingNumber || '-',
    kargoTakipLink: order.trackingUrl || siparisTakipLink,
    kargoFirma: order.shippingCarrier || 'Aras Kargo',
    siparisTarihi: formatTRDate(order.createdAt),
    siparisSaati: formatTRTime(order.createdAt),
    siparisTarihSaat: formatTRDateTime(order.createdAt),
    urunSayisi: String(urunSayisi || 1),
    odemeYontemi: paymentMethodLabel(order.paymentMethod),
    siparisTakipLink,
    adminPanelUrl,
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

  // KVKK / customer opt-out: if the order's email is linked to a registered
  // user who turned off WhatsApp notifications, skip the message. Anonymous
  // (guest) checkouts have no preference row and stay opted in by default.
  if (order.customerEmail) {
    try {
      const user = await storage.getUserByEmail(order.customerEmail);
      if (user && user.whatsappOptIn === false) {
        console.log(`[WhatsApp] customer opted out, skipping event=${event} email=${order.customerEmail}`);
        return { success: false, skipped: true, error: 'Müşteri WhatsApp bildirimlerini kapatmış' };
      }
    } catch (err) {
      console.error('[WhatsApp] opt-in lookup failed, sending anyway:', err);
    }
  }

  const message = renderTemplate(config.templates[event], await orderVars(order, config));
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
  const message = renderTemplate(config.templates[event], await orderVars(order, config));
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
export async function sendBankTransferPendingToCustomer(order: Order) {
  return sendEventToCustomer(order, 'order_bank_transfer_pending_customer');
}
export async function sendBankTransferPendingToAdmin(order: Order) {
  return sendEventToAdmin(order, 'order_bank_transfer_admin');
}

export interface ReviewPendingPayload {
  productName: string;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  isGuest: boolean;
}

export async function sendReviewPendingToAdmin(payload: ReviewPendingPayload): Promise<WhatsAppResult> {
  const config = await getConfig();
  if (!config) return { success: false, skipped: true, error: 'WhatsApp servisi kapalı' };
  if (!config.events.review_pending_admin) {
    console.log('[WhatsApp] event review_pending_admin disabled, skipping');
    return { success: false, skipped: true, error: 'Bu olay için bildirim kapalı' };
  }
  if (!config.adminPhone) {
    console.log('[WhatsApp] admin phone not configured, skipping event=review_pending_admin');
    return { success: false, skipped: true, error: 'Yönetici telefonu yapılandırılmamış' };
  }

  const stars = '⭐'.repeat(payload.rating);
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const baslikSatiri = payload.title ? `Başlık: _${truncate(payload.title, 80)}_\n` : '';
  const icerikSatiri = payload.content ? `Yorum: "${truncate(payload.content, 200)}"\n\n` : '\n';

  const siteUrl = await resolveSiteUrl();
  const vars: Record<string, string> = {
    urunAdi: payload.productName,
    yorumYazari: payload.authorName,
    misafirEtiketi: payload.isGuest ? '(misafir)' : '',
    yildizlar: stars,
    puan: String(payload.rating),
    baslikSatiri,
    icerikSatiri,
    siteAdi: config.siteName,
    adminPanelUrl: `${siteUrl}/toov-admin?tab=reviews`,
  };

  const message = renderTemplate(config.templates.review_pending_admin, vars);
  return sendRaw(config, config.adminPhone, message, 'review_pending_admin');
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

/**
 * Migrates saved WhatsApp templates whose value still equals one of the
 * previous shipped defaults to the latest DEFAULT_TEMPLATES. Templates that
 * an admin has manually customized (not matching any previous default) are
 * preserved untouched. Safe to call on every server boot.
 */
export async function upgradeOldDefaultTemplates(): Promise<{ upgraded: string[]; preserved: string[] }> {
  const upgraded: string[] = [];
  const preserved: string[] = [];
  try {
    const settings = await storage.getSiteSettings();
    for (const evt of WHATSAPP_EVENT_KEYS) {
      const tplKey = `wpileti_tpl_${evt}`;
      const saved = settings[tplKey];
      if (!saved || !saved.trim()) continue;
      const previous = PREVIOUS_DEFAULT_TEMPLATES[evt] || [];
      if (previous.includes(saved)) {
        await storage.setSiteSetting(tplKey, DEFAULT_TEMPLATES[evt]);
        upgraded.push(evt);
      } else {
        preserved.push(evt);
      }
    }
    if (upgraded.length) {
      console.log(`[WhatsApp] upgraded ${upgraded.length} stale default template(s): ${upgraded.join(', ')}`);
    }
    if (preserved.length) {
      console.log(`[WhatsApp] preserved ${preserved.length} customized template(s): ${preserved.join(', ')}`);
    }
  } catch (err) {
    console.error('[WhatsApp] upgradeOldDefaultTemplates failed:', err);
  }
  return { upgraded, preserved };
}

export const WHATSAPP_TEMPLATE_VARIABLES = [
  'musteriAdi',
  'musteriTelefon',
  'musteriEposta',
  'siparisNo',
  'siparisTarihi',
  'siparisSaati',
  'siparisTarihSaat',
  'urunSayisi',
  'odemeYontemi',
  'toplam',
  'araToplam',
  'kargoUcreti',
  'kargoTakipNo',
  'kargoTakipLink',
  'kargoFirma',
  'siparisTakipLink',
  'adminPanelUrl',
  'siteAdi',
];

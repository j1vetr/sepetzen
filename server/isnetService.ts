/**
 * İŞNET e-Fatura / e-Arşiv SOAP Entegrasyonu
 *
 * Kimlik doğrulama: IP-VKN tabanlı (SOAP Header'da kullanıcı/şifre gerekmez).
 * Test ortamı firma VKN : 4810173324
 * Canlı ortamda ISNET_COMPANY_TAX_CODE ve ISNET_USE_LIVE env değişkenleri set edilmeli.
 *
 * Test endpoint : https://einvoiceservicetest.isnet.net.tr/InvoiceService/ServiceContract/InvoiceService.svc
 */

import axios from 'axios';
import type { Order } from '@shared/schema';

// ── Yapılandırma ──────────────────────────────────────────────────────────────

const TEST_ENDPOINT =
  'https://einvoiceservicetest.isnet.net.tr/InvoiceService/ServiceContract/InvoiceService.svc';

function getEndpoint(): string {
  const live = process.env.ISNET_LIVE_ENDPOINT;
  if (process.env.ISNET_USE_LIVE === 'true' && live) return live;
  return TEST_ENDPOINT;
}

const COMPANY_TAX_CODE =
  process.env.ISNET_COMPANY_TAX_CODE || '4810173324'; // Test VKN

const DEFAULT_VAT_RATE = 20; // %20 KDV

// ── Türkiye İl Kodu Haritası (GİB / Plaka Kodları) ───────────────────────────
const CITY_CODES: Record<string, number> = {
  adana: 1, adıyaman: 2, afyonkarahisar: 3, afyon: 3, ağrı: 4,
  amasya: 5, ankara: 6, antalya: 7, artvin: 8, aydın: 9,
  balıkesir: 10, bilecik: 11, bingöl: 12, bitlis: 13, bolu: 14,
  burdur: 15, bursa: 16, çanakkale: 17, çankırı: 18, çorum: 19,
  denizli: 20, diyarbakır: 21, edirne: 22, elazığ: 23, erzincan: 24,
  erzurum: 25, eskişehir: 26, gaziantep: 27, giresun: 28, gümüşhane: 29,
  hakkari: 30, hatay: 31, isparta: 32, mersin: 33, içel: 33,
  istanbul: 34, izmir: 35, kars: 36, kastamonu: 37, kayseri: 38,
  kırklareli: 39, kırşehir: 40, kocaeli: 41, konya: 42, kütahya: 43,
  malatya: 44, manisa: 45, kahramanmaraş: 46, mardin: 47, muğla: 48,
  muş: 49, nevşehir: 50, niğde: 51, ordu: 52, rize: 53, sakarya: 54,
  samsun: 55, siirt: 56, sinop: 57, sivas: 58, tekirdağ: 59, tokat: 60,
  trabzon: 61, tunceli: 62, şanlıurfa: 63, urfa: 63, uşak: 64, van: 65,
  yozgat: 66, zonguldak: 67, aksaray: 68, bayburt: 69, karaman: 70,
  kırıkkale: 71, batman: 72, şırnak: 73, bartın: 74, ardahan: 75,
  iğdır: 76, yalova: 77, karabük: 78, kilis: 79, osmaniye: 80, düzce: 81,
};

function getCityCode(cityName: string): number | null {
  if (!cityName) return null;
  const key = cityName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i');
  return CITY_CODES[key] ?? null;
}

// ── XML yardımcıları ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  return `<ein:${name}>${esc(String(value))}</ein:${name}>`;
}

/** ETTN, InvoiceNumber gibi değerleri XML yanıtından çıkarır. */
function pick(xml: string, ...names: string[]): string | null {
  for (const name of names) {
    const m = xml.match(new RegExp(`<[^>:]*:?${name}[^>]*>([^<]+)<`));
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function succeeded(xml: string): boolean {
  // ResultType: 0 = Success, 1 = Failed
  const v = pick(xml, 'Result', 'ResultType');
  return v === '0' || v?.toLowerCase() === 'success' || v?.toLowerCase() === 'ok';
}

function errMsg(xml: string): string {
  return pick(xml, 'ErrorMessage', 'Description', 'Message') ?? 'Bilinmeyen hata';
}

// ── SOAP gönderici ────────────────────────────────────────────────────────────

async function soapCall(operation: string, body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:tem="http://tempuri.org/"
  xmlns:ein="http://schemas.datacontract.org/2004/07/EInvoice.Service.Model"
  xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const endpoint = getEndpoint();
  const resp = await axios.post(endpoint, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `http://tempuri.org/IInvoiceService/${operation}`,
    },
    timeout: 30_000,
  });
  return resp.data as string;
}

// ── Tip tanımları ─────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  productName: string;
  productCode: string;
  quantity: number;
  /** KDV hariç birim fiyat */
  unitPriceExVat: number;
  vatRate: number;
  vatAmount: number;
  /** KDV hariç satır toplamı */
  lineTotal: number;
  discountRate?: number;
  discountAmount?: number;
}

export interface IsnetResult {
  ettn: string;
  invoiceNumber: string | null;
}

// ── Sipariş kalemlerini fatura satırlarına dönüştür ───────────────────────────

export function buildInvoiceLines(
  items: Array<{
    productName: string;
    sku?: string | null;
    price: string; // KDV dahil birim fiyat
    quantity: number;
  }>,
  vatRate: number = DEFAULT_VAT_RATE,
): InvoiceLineItem[] {
  return items.map((item) => {
    const priceWithVat = parseFloat(item.price) * item.quantity;
    const lineTotal = priceWithVat / (1 + vatRate / 100);
    const vatAmount = priceWithVat - lineTotal;
    const unitPriceExVat = lineTotal / item.quantity;
    return {
      productName: item.productName.slice(0, 200),
      productCode: (item.sku || item.productName.slice(0, 20).replace(/\s+/g, '-')).slice(0, 50),
      quantity: item.quantity,
      unitPriceExVat,
      vatRate,
      vatAmount,
      lineTotal,
    };
  });
}

// ── e-Arşiv Fatura Gönder ─────────────────────────────────────────────────────

export async function sendArchiveInvoice(
  order: Pick<
    Order,
    'orderNumber' | 'customerName' | 'customerEmail' | 'shippingAddress' | 'billingAddress'
  >,
  lines: InvoiceLineItem[],
): Promise<IsnetResult> {
  const billing = order.billingAddress;
  const shipping = order.shippingAddress as Record<string, string>;

  const receiverName =
    billing?.invoiceType === 'corporate' && billing.companyName
      ? billing.companyName
      : order.customerName;

  const receiverTaxCode =
    billing?.invoiceType === 'corporate'
      ? (billing.taxNumber ?? '')
      : (billing?.tcknNumber ?? '');

  const city = billing?.city || shipping?.city || '';
  const cityCode = getCityCode(city);
  const today = new Date().toISOString().split('T')[0];

  const totalPayable = lines.reduce((s, l) => s + l.lineTotal + l.vatAmount, 0);
  const totalVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  const totalLine = lines.reduce((s, l) => s + l.lineTotal, 0);

  const detailsXml = lines
    .map(
      (l) => `
                <ein:ArchiveInvoiceDetail>
                    ${tag('CurrencyCode', 'TRY')}
                    ${tag('DiscountAmount', (l.discountAmount ?? 0).toFixed(2))}
                    ${tag('DiscountRate', (l.discountRate ?? 0).toFixed(2))}
                    ${tag('LineExtensionAmount', l.lineTotal.toFixed(2))}
                    <ein:Product>
                        ${tag('ExternalProductCode', l.productCode)}
                        ${tag('MeasureUnit', 'NIU')}
                        ${tag('ProductCode', l.productCode)}
                        ${tag('ProductName', l.productName)}
                        ${tag('UnitPrice', l.unitPriceExVat.toFixed(4))}
                    </ein:Product>
                    ${tag('Quantity', l.quantity.toFixed(2))}
                    ${tag('SpecialBasisAmount', '0.00')}
                    ${tag('SpecialBasisPercent', '0.00')}
                    ${tag('SpecialBasisTaxAmount', '0.00')}
                    ${tag('VATAmount', l.vatAmount.toFixed(2))}
                    ${tag('VATRate', l.vatRate)}
                </ein:ArchiveInvoiceDetail>`,
    )
    .join('');

  const body = `
        <tem:SendArchiveInvoice>
            <tem:request>
                <ein:ArchiveInvoices>
                    <ein:ArchiveInvoice>
                        ${tag('CurrencyCode', 'TRY')}
                        ${tag('ExternalArchiveInvoiceCode', order.orderNumber)}
                        ${tag('InvoiceCreationDate', today)}
                        ${tag('InvoiceDate', today)}
                        <ein:InvoiceDetails>${detailsXml}
                        </ein:InvoiceDetails>
                        <ein:Receiver>
                            <ein:Address>
                                ${cityCode ? tag('CityCode', cityCode) : ''}
                                ${tag('EMail', order.customerEmail)}
                            </ein:Address>
                            ${tag('ReceiverName', receiverName)}
                            ${receiverTaxCode ? tag('ReceiverTaxCode', receiverTaxCode) : ''}
                            ${tag('RecipientType', 'EARSIV')}
                            ${tag('SendingType', 'ELEKTRONIK')}
                        </ein:Receiver>
                        ${tag('TotalDiscountAmount', '0.00')}
                        ${tag('TotalLineExtensionAmount', totalLine.toFixed(2))}
                        ${tag('TotalPayableAmount', totalPayable.toFixed(2))}
                        ${tag('TotalTaxInclusiveAmount', totalPayable.toFixed(2))}
                        ${tag('TotalVATAmount', totalVat.toFixed(2))}
                    </ein:ArchiveInvoice>
                </ein:ArchiveInvoices>
                ${tag('CompanyTaxCode', COMPANY_TAX_CODE)}
            </tem:request>
        </tem:SendArchiveInvoice>`;

  const xml = await soapCall('SendArchiveInvoice', body);
  if (!succeeded(xml)) throw new Error(`İŞNET e-Arşiv hatası: ${errMsg(xml)}`);

  const ettn = pick(xml, 'ETTN', 'Ettn', 'ettn');
  if (!ettn) throw new Error('İŞNET yanıtında ETTN bulunamadı');

  return { ettn, invoiceNumber: pick(xml, 'InvoiceNumber', 'ArchiveInvoiceNumber') };
}

// ── e-Arşiv Fatura E-posta Gönder ────────────────────────────────────────────

export async function sendArchiveInvoiceMail(ettn: string, email: string): Promise<void> {
  const body = `
        <tem:SendArchiveInvoiceMail>
            <tem:request>
                ${tag('CompanyTaxCode', COMPANY_TAX_CODE)}
                ${tag('Email', email)}
                ${tag('Ettn', ettn)}
            </tem:request>
        </tem:SendArchiveInvoiceMail>`;

  const xml = await soapCall('SendArchiveInvoiceMail', body);
  if (!succeeded(xml)) {
    console.warn(`[İŞNET] Fatura e-postası gönderilemedi (${ettn}): ${errMsg(xml)}`);
  }
}

// ── e-Arşiv Fatura İptal ──────────────────────────────────────────────────────

export async function cancelArchiveInvoice(ettn: string, reason = 'Sipariş iptali'): Promise<void> {
  const body = `
        <tem:CancelArchiveInvoice>
            <tem:request>
                <ein:ArchiveInvoiceList>
                    <ein:ArchiveInvoiceCancellation>
                        ${tag('CancellationReason', reason)}
                        ${tag('ETTN', ettn)}
                    </ein:ArchiveInvoiceCancellation>
                </ein:ArchiveInvoiceList>
                ${tag('CompanyTaxCode', COMPANY_TAX_CODE)}
            </tem:request>
        </tem:CancelArchiveInvoice>`;

  const xml = await soapCall('CancelArchiveInvoice', body);
  if (!succeeded(xml)) throw new Error(`İŞNET fatura iptali başarısız: ${errMsg(xml)}`);
}

// ── Sipariş için fatura oluştur (ana giriş noktası) ───────────────────────────
// Fire-and-forget olarak çağrılır; hata sipariş akışını engellemez.
// Başarılı/başarısız sonuç `updateFn` callback'i ile kaydedilir.

export async function issueInvoiceForOrder(
  order: Order,
  items: Array<{ productName: string; sku?: string | null; price: string; quantity: number }>,
  updateFn: (data: Partial<Pick<Order, 'ettn' | 'eInvoiceNumber' | 'eInvoiceStatus' | 'eInvoiceSentAt' | 'eInvoiceType'>>) => Promise<void>,
): Promise<void> {
  try {
    const lines = buildInvoiceLines(items);
    const result = await sendArchiveInvoice(order, lines);

    await updateFn({
      ettn: result.ettn,
      eInvoiceNumber: result.invoiceNumber,
      eInvoiceStatus: 'sent',
      eInvoiceSentAt: new Date(),
      eInvoiceType: 'earchive',
    });

    // İŞNET üzerinden müşteriye PDF e-postası gönder (best-effort)
    sendArchiveInvoiceMail(result.ettn, order.customerEmail).catch((err) =>
      console.warn('[İŞNET] Fatura e-postası iletilemedi:', err?.message),
    );

    console.log(`[İŞNET] e-Arşiv fatura gönderildi: ${order.orderNumber} → ETTN ${result.ettn}`);
  } catch (err) {
    console.error(`[İŞNET] Fatura gönderilemedi (${order.orderNumber}):`, err);
    await updateFn({ eInvoiceStatus: 'failed' }).catch(() => {});
  }
}

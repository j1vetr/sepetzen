/**
 * BirFatura (OutEBelgeV2) e-Arşiv / e-Fatura entegrasyonu.
 *
 * Dokümantasyon: https://developers.birfatura.com/dokuman/outebelgev2-api
 *
 * Gerekli secret'lar: BIRFATURA_API_KEY, BIRFATURA_SECRET_KEY, BIRFATURA_INTEGRATION_KEY
 * Opsiyonel: BIRFATURA_BASE_URL (varsayılan https://uygulama.edonustur.com)
 */

import axios from 'axios';
import { randomUUID } from 'crypto';
import type { Order } from '@shared/schema';
import { storage } from './storage';

const DEFAULT_VAT_RATE = 20;
/** Bireysel müşteride TCKN yoksa GİB'in kabul ettiği genel değer. */
const ANONYMOUS_TAX_NO = '11111111111';

/** Anahtarlar önce admin panelindeki ayarlardan, yoksa ortam secret'larından okunur. */
async function setting(key: string, envName: string): Promise<string> {
  return ((await storage.getSiteSetting(key)) || process.env[envName] || '').trim();
}

async function baseUrl(): Promise<string> {
  return (await setting('birfatura_base_url', 'BIRFATURA_BASE_URL') || 'https://uygulama.edonustur.com').replace(/\/+$/, '');
}

async function authHeaders(): Promise<Record<string, string>> {
  const apiKey = await setting('birfatura_api_key', 'BIRFATURA_API_KEY');
  const secretKey = await setting('birfatura_secret_key', 'BIRFATURA_SECRET_KEY');
  const integrationKey = await setting('birfatura_integration_key', 'BIRFATURA_INTEGRATION_KEY');
  if (!apiKey || !secretKey || !integrationKey) {
    throw new Error('BirFatura API anahtarları tanımlı değil. Ayarlar > Fatura bölümünden girin.');
  }
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
    'X-Secret-Key': secretKey,
    'X-Integration-Key': integrationKey,
  };
}

async function call(path: string, body: unknown): Promise<unknown> {
  const resp = await axios.post(`${await baseUrl()}/api/OutEBelgeV2/${path}`, body, {
    headers: await authHeaders(),
    timeout: 30_000,
    validateStatus: () => true,
  });
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`BirFatura HTTP ${resp.status}: ${describe(resp.data)}`);
  }
  assertNotFailed(resp.data);
  return resp.data;
}

function describe(data: unknown): string {
  if (typeof data === 'string') return data.slice(0, 300);
  try {
    return JSON.stringify(data).slice(0, 300);
  } catch {
    return 'yanıt okunamadı';
  }
}

/** Yanıt gövdesinde (iç içe olabilir) verilen anahtar adlarından ilk değeri bulur. */
function findValue(data: unknown, keyPattern: RegExp, depth = 0): unknown {
  if (data == null || typeof data !== 'object' || depth > 5) return undefined;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (keyPattern.test(k) && v != null && v !== '') return v;
  }
  for (const v of Object.values(data as Record<string, unknown>)) {
    const found = findValue(v, keyPattern, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function assertNotFailed(data: unknown): void {
  const success = findValue(data, /^(success|isSuccess|isSucceed|result)$/i);
  if (success === false || (typeof success === 'string' && success.toLowerCase() === 'false')) {
    const msg = findValue(data, /^(message|error|errorMessage|description)$/i);
    throw new Error(`BirFatura hatası: ${typeof msg === 'string' ? msg : describe(data)}`);
  }
}

export interface InvoiceLineItem {
  productName: string;
  productCode: string;
  quantity: number;
  /** KDV hariç birim fiyat */
  unitPriceExVat: number;
  /** KDV dahil birim fiyat */
  unitPriceIncVat: number;
  vatRate: number;
}

export interface BirfaturaResult {
  ettn: string;
  invoiceNumber: string | null;
  pdfUrl: string | null;
}

export function buildInvoiceLines(
  items: Array<{ productName: string; sku?: string | null; price: string; quantity: number }>,
  vatRate: number = DEFAULT_VAT_RATE,
): InvoiceLineItem[] {
  return items.map((item) => {
    const unitPriceIncVat = parseFloat(item.price);
    return {
      productName: item.productName.slice(0, 200),
      productCode: (item.sku || item.productName.slice(0, 20).replace(/\s+/g, '-')).slice(0, 50),
      quantity: item.quantity,
      unitPriceExVat: unitPriceIncVat / (1 + vatRate / 100),
      unitPriceIncVat,
      vatRate,
    };
  });
}

const r = (n: number) => Math.round(n * 10000) / 10000;

export async function sendInvoice(
  order: Pick<
    Order,
    'orderNumber' | 'customerName' | 'customerEmail' | 'shippingAddress' | 'billingAddress'
  >,
  lines: InvoiceLineItem[],
): Promise<BirfaturaResult> {
  const billing = order.billingAddress;
  const shipping = (order.shippingAddress ?? {}) as Record<string, string>;
  const corporate = billing?.invoiceType === 'corporate' && !!billing.companyName;

  const totalEx = lines.reduce((s, l) => s + l.unitPriceExVat * l.quantity, 0);
  const totalInc = lines.reduce((s, l) => s + l.unitPriceIncVat * l.quantity, 0);
  const today = new Date().toISOString().split('T')[0];
  const ettn = randomUUID();

  const billingName = corporate ? (billing!.companyName as string) : order.customerName;
  const billingAddress = billing?.address || shipping.address || '';
  const billingCity = billing?.city || shipping.city || '';
  const billingTown = billing?.district || shipping.district || '';

  const invoice = {
    orderCode: order.orderNumber,
    orderDate: today,
    invoiceDate: today,
    invoiceExplanation: `Sipariş ${order.orderNumber}`,
    isDocumentNoAuto: true,
    ettn,
    billingName,
    billingAddress,
    billingTown,
    billingCity,
    taxOffice: corporate ? billing?.taxOffice ?? '' : '',
    taxNo: corporate ? billing?.taxNumber ?? '' : billing?.tcknNumber || ANONYMOUS_TAX_NO,
    email: order.customerEmail,
    shippingName: order.customerName,
    shippingAddress: shipping.address || billingAddress,
    shippingTown: shipping.district || billingTown,
    shippingCity: shipping.city || billingCity,
    shippingCountry: 'Türkiye',
    currency: 'TRY',
    currencyRate: 1,
    totalPaidTaxExcluding: r(totalEx),
    totalPaidTaxIncluding: r(totalInc),
    productsTotalTaxExcluding: r(totalEx),
    productsTotalTaxIncluding: r(totalInc),
    orderDetails: lines.map((l) => ({
      productCode: l.productCode,
      productName: l.productName,
      productQuantityType: 'Adet',
      productQuantity: l.quantity,
      vatRate: l.vatRate,
      productUnitPriceTaxExcluding: r(l.unitPriceExVat),
      productUnitPriceTaxIncluding: r(l.unitPriceIncVat),
    })),
  };

  const data = await call('SendBasicInvoiceFromModel', { invoice });

  const invoiceNumber = findValue(data, /^(eInvoiceId|invoiceNumber|invoiceNo|documentNo|documentNumber)$/i);
  const pdfUrl = findValue(data, /(pdf|link|url)/i);
  const returnedEttn = findValue(data, /^(ettn|uuid|documentUUID)$/i);

  return {
    ettn: typeof returnedEttn === 'string' ? returnedEttn : ettn,
    invoiceNumber: typeof invoiceNumber === 'string' ? invoiceNumber : null,
    pdfUrl: typeof pdfUrl === 'string' && /^https?:\/\//i.test(pdfUrl) ? pdfUrl : null,
  };
}

/** Belgenin PDF bağlantısını UUID ile sorgular (resmileşme sonrası oluşur). */
export async function getPdfLink(ettn: string): Promise<string | null> {
  const data = await call('GetPDFLinkByUUID', { uuid: ettn });
  const link = findValue(data, /(pdf|link|url)/i);
  return typeof link === 'string' && /^https?:\/\//i.test(link) ? link : null;
}

/** e-Arşiv fatura iptali (SendDocumentAnswer, IPTAL kodu). */
export async function cancelArchiveInvoice(ettn: string, reason = 'Sipariş iptali'): Promise<void> {
  await call('SendDocumentAnswer', {
    documentUUID: ettn,
    acceptOrRejectCode: 'IPTAL',
    acceptOrRejectReason: reason,
    systemTypeCodes: 'EARSIV',
  });
}

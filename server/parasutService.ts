/**
 * Paraşüt API v4 e-Arşiv / e-Fatura entegrasyonu.
 *
 * Dokümantasyon: https://apidocs.parasut.com/
 *
 * Kimlik bilgileri admin panelinde (Ayarlar > Fatura) saklanır:
 * firma ID, client id, client secret, kullanıcı adı ve şifre (OAuth2 password grant).
 * Client id ve secret bilgilerini Paraşüt destek ekibi (destek@parasut.com) verir.
 */

import axios from 'axios';
import type { Order } from '@shared/schema';
import { storage } from './storage';
import type { InvoiceLineItem } from './birfaturaService';

const API_ROOT = 'https://api.parasut.com';
const ANONYMOUS_TAX_NO = '11111111111';
const REQUEST_GAP_MS = 120;

interface ParasutConfig {
  companyId: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  paymentAccountId: string;
}

export interface ParasutResult {
  ettn: string | null;
  invoiceNumber: string | null;
  salesInvoiceId: string;
  documentType: 'earchive' | 'einvoice';
}

async function loadConfig(): Promise<ParasutConfig> {
  const get = async (k: string) => ((await storage.getSiteSetting(k)) || '').trim();
  const cfg: ParasutConfig = {
    companyId: await get('parasut_company_id'),
    clientId: await get('parasut_client_id'),
    clientSecret: await get('parasut_client_secret'),
    username: await get('parasut_username'),
    password: await get('parasut_password'),
    paymentAccountId: await get('parasut_payment_account_id'),
  };
  if (!cfg.companyId || !cfg.clientId || !cfg.clientSecret || !cfg.username || !cfg.password) {
    throw new Error('Paraşüt bilgileri eksik. Ayarlar > Fatura bölümünden girin.');
  }
  return cfg;
}

let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

async function getToken(cfg: ParasutConfig): Promise<string> {
  const key = `${cfg.clientId}|${cfg.username}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    username: cfg.username,
    password: cfg.password,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  });
  const resp = await axios.post(`${API_ROOT}/oauth/token`, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20_000,
    validateStatus: () => true,
  });
  if (resp.status !== 200 || !resp.data?.access_token) {
    throw new Error(`Paraşüt giriş hatası (HTTP ${resp.status}): ${describe(resp.data)}`);
  }
  tokenCache = {
    key,
    token: resp.data.access_token,
    expiresAt: Date.now() + (Number(resp.data.expires_in) || 7200) * 1000,
  };
  return tokenCache.token;
}

/** Paraşüt API'si 10 saniyede 10 istekle sınırlıdır, istekler arasına kısa bekleme konur. */
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function describe(data: unknown): string {
  if (typeof data === 'string') return data.slice(0, 300);
  try {
    const errors = (data as any)?.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((e: any) => [e.title, e.detail].filter(Boolean).join(': '))
        .join(' | ')
        .slice(0, 400);
    }
    return JSON.stringify(data).slice(0, 300);
  } catch {
    return 'yanıt okunamadı';
  }
}

async function api(
  cfg: ParasutConfig,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  opts: { body?: unknown; params?: Record<string, string> } = {},
): Promise<{ status: number; data: any }> {
  await throttle();
  const token = await getToken(cfg);
  const resp = await axios.request({
    method,
    url: `${API_ROOT}/v4/${cfg.companyId}/${path}`,
    data: opts.body,
    params: opts.params,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 30_000,
    validateStatus: () => true,
  });
  if (resp.status === 401) tokenCache = null;
  return { status: resp.status, data: resp.data };
}

async function apiOk(
  cfg: ParasutConfig,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  opts: { body?: unknown; params?: Record<string, string> } = {},
): Promise<any> {
  const { status, data } = await api(cfg, method, path, opts);
  if (status < 200 || status >= 300) {
    throw new Error(`Paraşüt HTTP ${status} (${method} ${path}): ${describe(data)}`);
  }
  return data;
}

async function findOrCreateContact(cfg: ParasutConfig, order: Order): Promise<string> {
  const billing = order.billingAddress;
  const shipping = (order.shippingAddress ?? {}) as Record<string, string>;
  const corporate = billing?.invoiceType === 'corporate' && !!billing.companyName;
  const name = corporate ? (billing!.companyName as string) : order.customerName;
  const taxNumber = corporate
    ? (billing?.taxNumber ?? '').trim()
    : (billing?.tcknNumber ?? '').trim() || ANONYMOUS_TAX_NO;

  const searchParams: Record<string, string> =
    corporate && taxNumber ? { 'filter[tax_number]': taxNumber } : { 'filter[email]': order.customerEmail };
  const found = await apiOk(cfg, 'GET', 'contacts', { params: { ...searchParams, 'page[size]': '5' } });
  const candidates: any[] = Array.isArray(found?.data) ? found.data : [];
  const match = candidates.find((c) => {
    const a = c.attributes ?? {};
    return a.account_type !== 'supplier' && (corporate || (a.name ?? '').toLowerCase() === name.toLowerCase());
  });
  if (match) return String(match.id);

  const created = await apiOk(cfg, 'POST', 'contacts', {
    body: {
      data: {
        type: 'contacts',
        attributes: {
          name,
          email: order.customerEmail,
          contact_type: corporate ? 'company' : 'person',
          account_type: 'customer',
          tax_number: taxNumber,
          tax_office: corporate ? billing?.taxOffice ?? '' : '',
          city: billing?.city || shipping.city || '',
          district: billing?.district || shipping.district || '',
          address: billing?.address || shipping.address || '',
        },
      },
    },
  });
  return String(created.data.id);
}

async function waitForJob(cfg: ParasutConfig, jobId: string): Promise<void> {
  for (let i = 0; i < 25; i++) {
    const res = await apiOk(cfg, 'GET', `trackable_jobs/${jobId}`);
    const attrs = res?.data?.attributes ?? {};
    if (attrs.status === 'done') return;
    if (attrs.status === 'error') {
      const errors = Array.isArray(attrs.errors) ? attrs.errors.join(' | ') : 'bilinmeyen hata';
      throw new Error(`Paraşüt resmileştirme hatası: ${errors}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Paraşüt resmileştirme zaman aşımına uğradı, Paraşüt panelinden kontrol edin.');
}

function paymentTypeFor(method: string | null | undefined): string {
  const m = (method || '').toLowerCase();
  if (m.includes('havale') || m.includes('eft') || m.includes('bank_transfer') || m.includes('transfer')) return 'EFT/HAVALE';
  if (m.includes('kapida') || m.includes('cod')) return 'KAPIDAODEME';
  return 'KREDIKARTI/BANKAKARTI';
}

export async function sendParasutInvoice(
  order: Pick<
    Order,
    'orderNumber' | 'customerName' | 'customerEmail' | 'shippingAddress' | 'billingAddress' | 'paymentMethod'
  >,
  lines: InvoiceLineItem[],
): Promise<ParasutResult> {
  const cfg = await loadConfig();
  const today = new Date().toISOString().split('T')[0];
  const billing = order.billingAddress;
  const corporate = billing?.invoiceType === 'corporate' && !!billing.companyName;

  const contactId = await findOrCreateContact(cfg, order as Order);

  const attributes: Record<string, unknown> = {
    item_type: 'invoice',
    description: `Sipariş ${order.orderNumber}`,
    issue_date: today,
    due_date: today,
    currency: 'TRL',
    order_no: order.orderNumber,
    order_date: today,
  };
  if (cfg.paymentAccountId) {
    attributes.payment_account_id = Number(cfg.paymentAccountId);
    attributes.payment_date = today;
    attributes.payment_description = `Sipariş ${order.orderNumber} online tahsilat`;
  }

  const invoiceRes = await apiOk(cfg, 'POST', 'sales_invoices', {
    body: {
      data: {
        type: 'sales_invoices',
        attributes,
        relationships: {
          contact: { data: { id: contactId, type: 'contacts' } },
          details: {
            data: lines.map((l) => ({
              type: 'sales_invoice_details',
              attributes: {
                quantity: l.quantity,
                unit_price: Math.round(l.unitPriceExVat * 10000) / 10000,
                vat_rate: l.vatRate,
                description: l.productName,
              },
            })),
          },
        },
      },
    },
  });
  const salesInvoiceId = String(invoiceRes.data.id);

  // Alıcı e-Fatura mükellefi mi? Yalnızca kurumsal (VKN'li) alıcılarda sorgulanır.
  let eInvoiceAddress: string | null = null;
  const vkn = corporate ? (billing?.taxNumber ?? '').trim() : '';
  if (/^\d{10}$/.test(vkn)) {
    const inbox = await apiOk(cfg, 'GET', 'e_invoice_inboxes', { params: { 'filter[vkn]': vkn } });
    const first = Array.isArray(inbox?.data) ? inbox.data[0] : null;
    eInvoiceAddress = first?.attributes?.e_invoice_address ?? null;
  }

  const relationships = { sales_invoice: { data: { id: salesInvoiceId, type: 'sales_invoices' } } };
  let documentType: 'earchive' | 'einvoice';
  let jobRes: any;
  if (eInvoiceAddress) {
    documentType = 'einvoice';
    jobRes = await apiOk(cfg, 'POST', 'e_invoices', {
      body: {
        data: {
          type: 'e_invoices',
          attributes: { scenario: 'basic', to: eInvoiceAddress, vat_withholding_params: [] },
          relationships,
        },
      },
    });
  } else {
    documentType = 'earchive';
    const siteUrl = ((await storage.getSiteSetting('site_url')) || process.env.PUBLIC_BASE_URL || 'https://sepetzen.com').trim();
    jobRes = await apiOk(cfg, 'POST', 'e_archives', {
      body: {
        data: {
          type: 'e_archives',
          attributes: {
            vat_withholding_params: [],
            internet_sale: {
              url: siteUrl,
              payment_type: paymentTypeFor(order.paymentMethod),
              payment_platform: 'iyzico',
              payment_date: today,
            },
            shipment: { title: 'Kargo', date: today },
          },
          relationships,
        },
      },
    });
  }

  const jobId = jobRes?.data?.id;
  if (jobId) await waitForJob(cfg, String(jobId));

  const shown = await apiOk(cfg, 'GET', `sales_invoices/${salesInvoiceId}`, {
    params: { include: 'active_e_document' },
  });
  const doc = (Array.isArray(shown?.included) ? shown.included : []).find(
    (i: any) => i.type === 'e_archives' || i.type === 'e_invoices',
  );
  const ettn = doc?.attributes?.uuid;
  const invoiceNumber = doc?.attributes?.invoice_number ?? shown?.data?.attributes?.invoice_no;

  return {
    ettn: typeof ettn === 'string' ? ettn : null,
    invoiceNumber: invoiceNumber != null ? String(invoiceNumber) : null,
    salesInvoiceId,
    documentType,
  };
}

/** Faturayı Paraşüt'te iptal eder (satış faturası iptali). */
export async function cancelParasutInvoice(salesInvoiceId: string): Promise<void> {
  const cfg = await loadConfig();
  await apiOk(cfg, 'DELETE', `sales_invoices/${salesInvoiceId}/cancel`);
}

/** Kayıtlı bilgilerle giriş yapıp firmaya erişimi doğrular. */
export async function testParasutConnection(): Promise<void> {
  const cfg = await loadConfig();
  tokenCache = null;
  await apiOk(cfg, 'GET', 'contacts', { params: { 'page[size]': '1' } });
}

/**
 * Fatura sağlayıcısı yönlendirici. Aktif sağlayıcı `invoice_provider` ayarıdır
 * ('birfatura' veya 'parasut'). Sipariş hangi sağlayıcıyla kesildiyse iptal de
 * o sağlayıcıyla yapılır (`orders.e_invoice_provider`).
 */

import type { Order } from '@shared/schema';
import { storage } from './storage';
import { buildInvoiceLines, sendInvoice, cancelArchiveInvoice } from './birfaturaService';
import { sendParasutInvoice, cancelParasutInvoice } from './parasutService';

export type InvoiceProvider = 'birfatura' | 'parasut';

const PROVIDER_LABELS: Record<InvoiceProvider, string> = {
  birfatura: 'BirFatura',
  parasut: 'Paraşüt',
};

export async function getActiveInvoiceProvider(): Promise<InvoiceProvider> {
  const raw = await storage.getSiteSetting('invoice_provider');
  return raw === 'parasut' ? 'parasut' : 'birfatura';
}

export type InvoiceUpdate = Partial<
  Pick<
    Order,
    | 'ettn'
    | 'eInvoiceNumber'
    | 'eInvoiceStatus'
    | 'eInvoiceSentAt'
    | 'eInvoiceType'
    | 'invoiceUrl'
    | 'eInvoiceProvider'
    | 'eInvoiceExternalId'
  >
>;

type InvoiceOrderLike = Pick<
  Order,
  'orderNumber' | 'customerName' | 'customerEmail' | 'shippingAddress' | 'billingAddress' | 'paymentMethod'
>;
type InvoiceItemLike = { productName: string; sku?: string | null; price: string; quantity: number };

/** Aktif sağlayıcıda faturayı keser ve sipariş(ler)e yazılacak alanları döner. Hata fırlatır. */
export async function createInvoiceViaProvider(
  order: InvoiceOrderLike,
  items: InvoiceItemLike[],
): Promise<{ provider: InvoiceProvider; update: InvoiceUpdate }> {
  const provider = await getActiveInvoiceProvider();
  const lines = buildInvoiceLines(items);
  if (provider === 'parasut') {
    const result = await sendParasutInvoice(order, lines);
    return {
      provider,
      update: {
        ettn: result.ettn,
        eInvoiceNumber: result.invoiceNumber,
        eInvoiceStatus: 'sent',
        eInvoiceSentAt: new Date(),
        eInvoiceType: result.documentType,
        eInvoiceProvider: 'parasut',
        eInvoiceExternalId: result.salesInvoiceId,
      },
    };
  }
  const result = await sendInvoice(order, lines);
  return {
    provider,
    update: {
      ettn: result.ettn,
      eInvoiceNumber: result.invoiceNumber,
      eInvoiceStatus: 'sent',
      eInvoiceSentAt: new Date(),
      eInvoiceType: 'earchive',
      eInvoiceProvider: 'birfatura',
      eInvoiceExternalId: null,
      ...(result.pdfUrl ? { invoiceUrl: result.pdfUrl } : {}),
    },
  };
}

/** Toplu fatura modu açık mı? (site_settings: batch_invoice_enabled) */
export async function isBatchInvoiceEnabled(): Promise<boolean> {
  return (await storage.getSiteSetting('batch_invoice_enabled')) === '1';
}

/**
 * Sipariş için fatura oluşturur. Hata sipariş akışını engellemez; sonuç
 * `updateFn` ile kaydedilir (başarısızsa eInvoiceStatus = 'failed').
 * Toplu fatura modu açıksa (ve `immediate` verilmediyse) fatura kesilmez,
 * sipariş gün sonu toplu faturasına alınmak üzere 'batch_pending' olur.
 */
export async function issueInvoiceForOrder(
  order: Order,
  items: InvoiceItemLike[],
  updateFn: (data: InvoiceUpdate) => Promise<void>,
  opts: { immediate?: boolean } = {},
): Promise<void> {
  let provider: InvoiceProvider = 'birfatura';
  try {
    if (!opts.immediate && (await isBatchInvoiceEnabled())) {
      await updateFn({ eInvoiceStatus: 'batch_pending' });
      return;
    }
    provider = await getActiveInvoiceProvider();
    const result = await createInvoiceViaProvider(order, items);
    await updateFn(result.update);
    console.log(`[${PROVIDER_LABELS[provider]}] Fatura gönderildi: ${order.orderNumber}`);
  } catch (err) {
    console.error(
      `[${PROVIDER_LABELS[provider]}] Fatura gönderilemedi (${order.orderNumber}):`,
      err instanceof Error ? err.message : err,
    );
    await updateFn({ eInvoiceStatus: 'failed' }).catch(() => {});
  }
}

/** Siparişin mevcut faturasını, kesildiği sağlayıcı üzerinden iptal eder. */
export async function cancelInvoiceForOrder(
  order: Pick<Order, 'ettn' | 'eInvoiceProvider' | 'eInvoiceExternalId'>,
  reason: string,
): Promise<void> {
  if (order.eInvoiceProvider === 'parasut') {
    if (!order.eInvoiceExternalId) throw new Error('Paraşüt fatura kaydı bulunamadı');
    await cancelParasutInvoice(order.eInvoiceExternalId);
    return;
  }
  if (!order.ettn) throw new Error('Bu siparişe ait fatura yok');
  await cancelArchiveInvoice(order.ettn, reason);
}

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

type InvoiceUpdate = Partial<
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

/**
 * Sipariş için fatura oluşturur. Hata sipariş akışını engellemez; sonuç
 * `updateFn` ile kaydedilir (başarısızsa eInvoiceStatus = 'failed').
 */
export async function issueInvoiceForOrder(
  order: Order,
  items: Array<{ productName: string; sku?: string | null; price: string; quantity: number }>,
  updateFn: (data: InvoiceUpdate) => Promise<void>,
): Promise<void> {
  let provider: InvoiceProvider = 'birfatura';
  try {
    provider = await getActiveInvoiceProvider();
    const lines = buildInvoiceLines(items);
    if (provider === 'parasut') {
      const result = await sendParasutInvoice(order, lines);
      await updateFn({
        ettn: result.ettn,
        eInvoiceNumber: result.invoiceNumber,
        eInvoiceStatus: 'sent',
        eInvoiceSentAt: new Date(),
        eInvoiceType: result.documentType,
        eInvoiceProvider: 'parasut',
        eInvoiceExternalId: result.salesInvoiceId,
      });
      console.log(`[Paraşüt] Fatura gönderildi: ${order.orderNumber} → fatura ${result.salesInvoiceId}`);
    } else {
      const result = await sendInvoice(order, lines);
      await updateFn({
        ettn: result.ettn,
        eInvoiceNumber: result.invoiceNumber,
        eInvoiceStatus: 'sent',
        eInvoiceSentAt: new Date(),
        eInvoiceType: 'earchive',
        eInvoiceProvider: 'birfatura',
        eInvoiceExternalId: null,
        ...(result.pdfUrl ? { invoiceUrl: result.pdfUrl } : {}),
      });
      console.log(`[BirFatura] Fatura gönderildi: ${order.orderNumber} → ETTN ${result.ettn}`);
    }
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

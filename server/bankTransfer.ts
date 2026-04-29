export { BANK_TRANSFER_DISCOUNT_RATE, BANK_TRANSFER_INFO } from '../shared/bankInfo';

export function isBankTransferOrder(order: { paymentMethod?: string | null; paymentStatus?: string | null }): boolean {
  return order.paymentMethod === 'bank_transfer';
}

export function isAwaitingTransfer(order: { paymentMethod?: string | null; paymentStatus?: string | null }): boolean {
  return order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer';
}

export { BANK_TRANSFER_DISCOUNT_RATE, BANK_TRANSFER_INFO } from '../shared/bankInfo';

import { BANK_TRANSFER_INFO as DEFAULT_INFO } from '../shared/bankInfo';
import { storage } from './storage';

export interface BankTransferConfig {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  iban: string;
  discountRate: number; // 0.10 = %10
}

// Havale ayarları site_settings'ten okunur, boşsa koddaki varsayılanlara düşer.
export async function getBankTransferConfig(): Promise<BankTransferConfig> {
  const [enabled, bankName, accountHolder, iban, ratePercent] = await Promise.all([
    storage.getSiteSetting('bank_transfer_enabled'),
    storage.getSiteSetting('bank_transfer_bank_name'),
    storage.getSiteSetting('bank_transfer_account_holder'),
    storage.getSiteSetting('bank_transfer_iban'),
    storage.getSiteSetting('bank_transfer_discount_rate'),
  ]);
  const parsedPercent = parseFloat(ratePercent || '');
  const percent = Number.isFinite(parsedPercent) && parsedPercent >= 0 && parsedPercent <= 50
    ? parsedPercent
    : 10;
  return {
    enabled: enabled !== '0',
    bankName: bankName?.trim() || DEFAULT_INFO.bankName,
    accountHolder: accountHolder?.trim() || DEFAULT_INFO.accountHolder,
    iban: iban?.trim() || DEFAULT_INFO.iban,
    discountRate: percent / 100,
  };
}

export function isBankTransferOrder(order: { paymentMethod?: string | null; paymentStatus?: string | null }): boolean {
  return order.paymentMethod === 'bank_transfer';
}

export function isAwaitingTransfer(order: { paymentMethod?: string | null; paymentStatus?: string | null }): boolean {
  return order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'awaiting_transfer';
}

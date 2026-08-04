import { useQuery } from '@tanstack/react-query';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';

export interface BankTransferInfo {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  iban: string;
  discountPercent: number;
}

const DEFAULT_INFO: BankTransferInfo = {
  enabled: true,
  bankName: BANK_TRANSFER_INFO.bankName,
  accountHolder: BANK_TRANSFER_INFO.accountHolder,
  iban: BANK_TRANSFER_INFO.iban,
  discountPercent: 10,
};

// Havale banka bilgileri admin panelinden yönetilir, API'den okunur.
export function useBankTransferInfo(): BankTransferInfo {
  const { data } = useQuery<BankTransferInfo>({
    queryKey: ['bank-transfer-info'],
    queryFn: async () => {
      const res = await fetch('/api/payment/bank-transfer/info');
      if (!res.ok) return DEFAULT_INFO;
      return res.json();
    },
    refetchOnMount: 'always',
  });
  return data || DEFAULT_INFO;
}

import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, Building2, User as UserIcon } from 'lucide-react';
import { normalizeInvoiceInfo, validateInvoiceInfo, type InvoiceType } from '@shared/billing';

export type InvoiceFormValue = {
  invoiceType: InvoiceType;
  tcknNumber: string;
  companyName: string;
  taxOffice: string;
  taxNumber: string;
};

export const emptyInvoiceForm: InvoiceFormValue = {
  invoiceType: 'individual',
  tcknNumber: '',
  companyName: '',
  taxOffice: '',
  taxNumber: '',
};

/** Kayıtlı adres / sipariş kaydından form değerine dönüştürür. */
export function invoiceFormFrom(src?: Partial<Record<keyof InvoiceFormValue, string | null>> | null): InvoiceFormValue {
  return {
    invoiceType: src?.invoiceType === 'corporate' ? 'corporate' : 'individual',
    tcknNumber: src?.tcknNumber || '',
    companyName: src?.companyName || '',
    taxOffice: src?.taxOffice || '',
    taxNumber: src?.taxNumber || '',
  };
}

/** Sunucu ile birebir aynı kuralları çalıştırır; hata varsa Türkçe mesaj döner. */
export function validateInvoiceForm(value: InvoiceFormValue): string | null {
  return validateInvoiceInfo(normalizeInvoiceInfo(value));
}

/** İstemcinin sunucuya göndereceği temiz fatura kimlik bilgisi. */
export function invoicePayload(value: InvoiceFormValue) {
  return normalizeInvoiceInfo(value);
}

type Props = {
  value: InvoiceFormValue;
  onChange: (value: InvoiceFormValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputClassName: string;
  labelClassName?: string;
  selectClassName?: string;
  description?: string;
  /** Panelin içine eklenecek ek alanlar (ör. "fatura adresim farklı"). */
  children?: ReactNode;
  testIdPrefix?: string;
};

export function InvoiceFields({
  value,
  onChange,
  open,
  onOpenChange,
  inputClassName,
  labelClassName = 'block text-[12px] font-medium text-white/70 mb-1.5',
  description = 'Faturanız bu bilgilerle düzenlenir. Doldurmazsanız bireysel fatura kesilir.',
  children,
  testIdPrefix = 'invoice',
}: Props) {
  const set = (patch: Partial<InvoiceFormValue>) => onChange({ ...value, ...patch });
  const isCorporate = value.invoiceType === 'corporate';

  return (
    <div className="border border-white/10 rounded-xl bg-[#0F0F0F] overflow-hidden">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
        data-testid={`${testIdPrefix}-toggle`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-4 h-4 text-white/55 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-white">Fatura Bilgileri</span>
            <span className="block text-[11.5px] text-white/45 truncate">
              {isCorporate ? `Kurumsal${value.companyName ? ` · ${value.companyName}` : ''}` : 'Bireysel'}
            </span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-white/45 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/8">
              <p className="text-[11.5px] text-white/45 pt-3">{description}</p>

              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'individual', label: 'Bireysel', icon: UserIcon },
                  { key: 'corporate', label: 'Kurumsal', icon: Building2 },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set({ invoiceType: key })}
                    className={`flex items-center justify-center gap-2 h-11 rounded-lg border text-[13px] font-medium transition-all ${
                      value.invoiceType === key
                        ? 'border-white bg-white text-black'
                        : 'border-white/12 bg-[#141414] text-white/65 hover:border-white/30'
                    }`}
                    data-testid={`${testIdPrefix}-type-${key}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {isCorporate ? (
                <div className="space-y-4">
                  <div>
                    <label className={labelClassName} htmlFor={`${testIdPrefix}-company-name`}>Firma Ünvanı *</label>
                    <input
                      id={`${testIdPrefix}-company-name`}
                      type="text"
                      value={value.companyName}
                      onChange={(e) => set({ companyName: e.target.value })}
                      placeholder="Örnek Ticaret A.Ş."
                      className={inputClassName}
                      data-testid={`${testIdPrefix}-company-name`}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName} htmlFor={`${testIdPrefix}-tax-office`}>Vergi Dairesi *</label>
                      <input
                        id={`${testIdPrefix}-tax-office`}
                        type="text"
                        value={value.taxOffice}
                        onChange={(e) => set({ taxOffice: e.target.value })}
                        placeholder="Kadıköy"
                        className={inputClassName}
                        data-testid={`${testIdPrefix}-tax-office`}
                      />
                    </div>
                    <div>
                      <label className={labelClassName} htmlFor={`${testIdPrefix}-tax-number`}>Vergi No * (10 hane)</label>
                      <input
                        id={`${testIdPrefix}-tax-number`}
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        value={value.taxNumber}
                        onChange={(e) => set({ taxNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="1234567890"
                        className={inputClassName}
                        data-testid={`${testIdPrefix}-tax-number`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelClassName} htmlFor={`${testIdPrefix}-tckn`}>TC Kimlik No (opsiyonel, 11 hane)</label>
                  <input
                    id={`${testIdPrefix}-tckn`}
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={value.tcknNumber}
                    onChange={(e) => set({ tcknNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="12345678901"
                    className={inputClassName}
                    data-testid={`${testIdPrefix}-tckn`}
                  />
                  <p className="text-[11px] text-white/35 mt-1.5">E-arşiv fatura için gereklidir; boş bırakabilirsiniz.</p>
                </div>
              )}

              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

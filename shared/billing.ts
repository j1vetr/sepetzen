import { z } from "zod";

/**
 * Fatura kimlik bilgileri (Bireysel / Kurumsal).
 *
 * Tek kaynak: hem checkout ödeme uçları hem de kullanıcı adres defteri bu
 * dosyadaki normalize + doğrulama fonksiyonlarını kullanır. Aksi halde iki
 * yerde ayrı kural yazılır ve biri eksik kalır.
 */

export const INVOICE_TYPES = ["individual", "corporate"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export type InvoiceInfo = {
  invoiceType: InvoiceType;
  tcknNumber: string | null;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
};

/** Siparişte/pending payment'ta jsonb olarak saklanan fatura adresi. */
export type BillingAddress = {
  address: string;
  city: string;
  district: string;
  postalCode: string;
  country?: string;
  // Eski kayıtlarda bu alanlar bulunmayabilir; bu yüzden opsiyonel.
  invoiceType?: InvoiceType;
  tcknNumber?: string | null;
  companyName?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
};

export const invoiceInputSchema = z.object({
  invoiceType: z.enum(INVOICE_TYPES).optional().nullable(),
  tcknNumber: z.string().max(40).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  taxOffice: z.string().max(160).optional().nullable(),
  taxNumber: z.string().max(40).optional().nullable(),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const billingAddressInputSchema = invoiceInputSchema.extend({
  sameAsShipping: z.boolean().optional(),
  address: z.string().max(1000).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  postalCode: z.string().max(30).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
});
export type BillingAddressInput = z.infer<typeof billingAddressInputSchema>;

const onlyDigits = (v?: string | null) => String(v ?? "").replace(/\D/g, "");
const clean = (v?: string | null) => String(v ?? "").trim();

/**
 * Girdiyi tek biçime indirger. Seçilen tipe ait olmayan alanlar null'lanır ki
 * kurumsaldan bireysele dönen bir kullanıcının eski vergi bilgisi faturaya
 * sızmasın.
 */
export function normalizeInvoiceInfo(raw?: InvoiceInput | null): InvoiceInfo {
  const invoiceType: InvoiceType = raw?.invoiceType === "corporate" ? "corporate" : "individual";

  if (invoiceType === "corporate") {
    return {
      invoiceType,
      tcknNumber: null,
      companyName: clean(raw?.companyName) || null,
      taxOffice: clean(raw?.taxOffice) || null,
      taxNumber: onlyDigits(raw?.taxNumber) || null,
    };
  }

  return {
    invoiceType,
    tcknNumber: onlyDigits(raw?.tcknNumber) || null,
    companyName: null,
    taxOffice: null,
    taxNumber: null,
  };
}

/** Hata varsa kullanıcıya gösterilecek Türkçe mesaj, yoksa null döner. */
export function validateInvoiceInfo(info: InvoiceInfo): string | null {
  if (info.invoiceType === "corporate") {
    if (!info.companyName) return "Kurumsal fatura için firma ünvanı gerekli";
    if (!info.taxOffice) return "Kurumsal fatura için vergi dairesi gerekli";
    if (!info.taxNumber) return "Kurumsal fatura için vergi numarası gerekli";
    if (!/^\d{10}$/.test(info.taxNumber)) return "Vergi numarası 10 haneli olmalı";
    return null;
  }
  // TCKN bireysel faturada zorunlu değil; girildiyse formatı doğru olmalı.
  if (info.tcknNumber && !/^[1-9]\d{10}$/.test(info.tcknNumber)) {
    return "TC kimlik numarası 11 haneli olmalı";
  }
  return null;
}

export type ShippingAddressLike = {
  address: string;
  city: string;
  district: string;
  postalCode?: string | null;
  country?: string | null;
};

/**
 * Checkout'tan gelen fatura girdisini, teslimat adresine düşerek (fallback)
 * saklanabilir bir fatura adresine çevirir.
 *
 * Geriye dönük uyumluluk: `sameAsShipping` göndermeyen eski istemciler
 * fatura adresi alanlarını doldurduğunda ayrı adres olarak değerlendirilir.
 */
export function resolveBillingAddress(
  raw: unknown,
  shipping: ShippingAddressLike,
): { ok: true; value: BillingAddress } | { ok: false; error: string } {
  let input: BillingAddressInput | null = null;

  if (raw !== null && raw !== undefined) {
    const parsed = billingAddressInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Fatura bilgileri geçersiz" };
    }
    input = parsed.data;
  }

  const invoice = normalizeInvoiceInfo(input);
  const invoiceError = validateInvoiceInfo(invoice);
  if (invoiceError) return { ok: false, error: invoiceError };

  const hasOwnAddress = !!input && (!!clean(input.address) || !!clean(input.city) || !!clean(input.district));
  const useSeparate = !!input && input.sameAsShipping !== true && hasOwnAddress;

  const base = useSeparate
    ? {
        address: clean(input!.address),
        city: clean(input!.city),
        district: clean(input!.district),
        postalCode: clean(input!.postalCode),
        country: clean(input!.country) || clean(shipping.country) || undefined,
      }
    : {
        address: clean(shipping.address),
        city: clean(shipping.city),
        district: clean(shipping.district),
        postalCode: clean(shipping.postalCode),
        country: clean(shipping.country) || undefined,
      };

  if (!base.address || !base.city || !base.district) {
    return { ok: false, error: "Lütfen fatura adresini eksiksiz doldurun" };
  }

  return { ok: true, value: { ...base, ...invoice } };
}

/** Fatura sahibinin görünen adı: kurumsalda firma ünvanı, bireyselde müşteri adı. */
export function billingDisplayName(billing: BillingAddress | null | undefined, fallbackName: string): string {
  if (billing?.invoiceType === "corporate" && billing.companyName) return billing.companyName;
  return fallbackName;
}

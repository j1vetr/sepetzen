import Iyzipay from 'iyzipay';
import { storage } from './storage';

export type IyzicoMode = 'sandbox' | 'live';

const SANDBOX_URL = 'https://sandbox-api.iyzipay.com';
const LIVE_URL = 'https://api.iyzipay.com';

// Read iyzico credentials per call (not at module load) so secrets rotated
// at runtime via the secrets panel are picked up without restarting the app.
const getApiKey = () => process.env.IYZICO_API_KEY || '';
const getSecretKey = () => process.env.IYZICO_SECRET_KEY || '';

// Mode resolution priority:
//   1. Admin panel toggle (site_settings.iyzico_mode)
//   2. IYZICO_MODE env var ('live' | 'sandbox')
//   3. IYZICO_BASE_URL env var (legacy override)
//   4. Default: 'live' (production-first; explicitly opt in to sandbox)
export async function getIyzicoMode(): Promise<IyzicoMode> {
  try {
    const dbMode = await storage.getSiteSetting('iyzico_mode');
    if (dbMode === 'live' || dbMode === 'sandbox') return dbMode;
  } catch {
    // siteSettings unavailable — fall through to env var
  }
  const envMode = (process.env.IYZICO_MODE || '').toLowerCase();
  if (envMode === 'live' || envMode === 'production') return 'live';
  if (envMode === 'sandbox' || envMode === 'test') return 'sandbox';
  if (process.env.IYZICO_BASE_URL && process.env.IYZICO_BASE_URL.includes('sandbox')) {
    return 'sandbox';
  }
  return 'live';
}

export async function setIyzicoMode(mode: IyzicoMode): Promise<void> {
  await storage.setSiteSetting('iyzico_mode', mode);
}

function getBaseUrlForMode(mode: IyzicoMode): string {
  if (process.env.IYZICO_BASE_URL) return process.env.IYZICO_BASE_URL;
  return mode === 'live' ? LIVE_URL : SANDBOX_URL;
}

export type IyzicoBuyer = {
  id: string;
  name: string;
  surname: string;
  gsmNumber: string;
  email: string;
  identityNumber: string;
  registrationAddress: string;
  city: string;
  country: string;
  ip: string;
  zipCode?: string;
};

export type IyzicoAddress = {
  contactName: string;
  city: string;
  country: string;
  address: string;
  zipCode?: string;
};

export type IyzicoBasketItem = {
  id: string;
  name: string;
  category1: string;
  category2?: string;
  itemType: 'PHYSICAL' | 'VIRTUAL';
  price: string;
};

export type IyzicoCheckoutFormInitializeRequest = {
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  basketId: string;
  callbackUrl: string;
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
  enabledInstallments?: number[];
  paymentGroup?: 'PRODUCT' | 'LISTING' | 'SUBSCRIPTION';
};

export type IyzicoCheckoutFormInitializeResponse = {
  status: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number;
};

export type IyzicoCheckoutFormRetrieveResponse = {
  status: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
  paymentStatus?: 'SUCCESS' | 'FAILURE' | 'INIT_THREEDS' | 'CALLBACK_THREEDS' | 'BKM_POS_SELECTED' | 'CALLBACK_PECCO';
  paymentId?: string;
  conversationId?: string;
  price?: number;
  paidPrice?: number;
  currency?: string;
  installment?: number;
  basketId?: string;
  fraudStatus?: number;
  merchantCommissionRate?: number;
  merchantCommissionRateAmount?: number;
  iyziCommissionRateAmount?: number;
  iyziCommissionFee?: number;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  binNumber?: string;
  lastFourDigits?: string;
  itemTransactions?: Array<{
    itemId: string;
    paymentTransactionId: string;
    transactionStatus: number;
    price: number;
    paidPrice: number;
  }>;
};

async function buildClient(): Promise<Iyzipay> {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    throw new Error(
      '[iyzico] IYZICO_API_KEY ve IYZICO_SECRET_KEY ortam değişkenleri tanımlı değil.',
    );
  }
  const mode = await getIyzicoMode();
  return new Iyzipay({
    apiKey,
    secretKey,
    uri: getBaseUrlForMode(mode),
  });
}

export function isIyzicoConfigured(): boolean {
  return Boolean(getApiKey() && getSecretKey());
}

export async function createCheckoutFormInitialize(
  req: IyzicoCheckoutFormInitializeRequest,
): Promise<IyzicoCheckoutFormInitializeResponse> {
  const client = await buildClient();
  const payload = {
    locale: 'tr',
    conversationId: req.conversationId,
    price: req.price,
    paidPrice: req.paidPrice,
    currency: req.currency,
    basketId: req.basketId,
    paymentGroup: req.paymentGroup || 'PRODUCT',
    callbackUrl: req.callbackUrl,
    enabledInstallments: req.enabledInstallments ?? [1, 2, 3, 6, 9],
    buyer: req.buyer,
    shippingAddress: req.shippingAddress,
    billingAddress: req.billingAddress,
    basketItems: req.basketItems,
  };
  return new Promise((resolve) => {
    client.checkoutFormInitialize.create(payload as never, (err: unknown, result: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : String(err);
        resolve({ status: 'failure', errorMessage: message });
        return;
      }
      resolve(result as IyzicoCheckoutFormInitializeResponse);
    });
  });
}

export async function retrieveCheckoutForm(
  token: string,
): Promise<IyzicoCheckoutFormRetrieveResponse> {
  const client = await buildClient();
  return new Promise((resolve) => {
    client.checkoutForm.retrieve({ locale: 'tr', token } as never, (err: unknown, result: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : String(err);
        resolve({ status: 'failure', errorMessage: message });
        return;
      }
      resolve(result as IyzicoCheckoutFormRetrieveResponse);
    });
  });
}

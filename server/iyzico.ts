import Iyzipay from 'iyzipay';
import { storage } from './storage';

// iyzico LIVE/Production endpoint — sandbox kaldırıldı.
const LIVE_URL = 'https://api.iyzipay.com';

// Read iyzico credentials per call from site_settings so the admin can
// rotate keys without restarting the app. Env vars are no longer read.
async function getApiKey(): Promise<string> {
  return (await storage.getSiteSetting('iyzico_api_key')) || '';
}

async function getSecretKey(): Promise<string> {
  return (await storage.getSiteSetting('iyzico_secret_key')) || '';
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
  const apiKey = await getApiKey();
  const secretKey = await getSecretKey();
  if (!apiKey || !secretKey) {
    throw new Error(
      '[iyzico] iyzico API anahtarları yapılandırılmamış. Admin Paneli → Ayarlar → iyzico bölümünden ekleyin.',
    );
  }
  return new Iyzipay({
    apiKey,
    secretKey,
    uri: LIVE_URL,
  });
}

export async function isIyzicoConfigured(): Promise<boolean> {
  const apiKey = await getApiKey();
  const secretKey = await getSecretKey();
  return Boolean(apiKey && secretKey);
}

export type IyzicoTestResult = {
  ok: boolean;
  status?: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  systemTime?: number;
  apiKeyLength?: number;
  secretKeyLength?: number;
  uri: string;
};

// Calls iyzico's GET /payment/test endpoint, which only validates the HMAC
// signature and credentials. Useful as an admin "ping" to confirm the saved
// API key + secret key are accepted by the live gateway.
export async function testIyzicoConnection(): Promise<IyzicoTestResult> {
  const apiKey = await getApiKey();
  const secretKey = await getSecretKey();
  const base = {
    apiKeyLength: apiKey.length,
    secretKeyLength: secretKey.length,
    uri: LIVE_URL,
  };
  if (!apiKey || !secretKey) {
    return {
      ok: false,
      errorMessage: 'API anahtarları yapılandırılmamış',
      ...base,
    };
  }
  let client: Iyzipay;
  try {
    client = new Iyzipay({ apiKey, secretKey, uri: LIVE_URL });
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      ...base,
    };
  }
  return new Promise((resolve) => {
    (client as unknown as { apiTest: { retrieve: (cb: (e: unknown, r: unknown) => void) => void } }).apiTest.retrieve(
      (err: unknown, result: unknown) => {
        if (err) {
          resolve({
            ok: false,
            errorMessage: err instanceof Error ? err.message : String(err),
            ...base,
          });
          return;
        }
        const r = (result || {}) as { status?: 'success' | 'failure'; errorCode?: string; errorMessage?: string; systemTime?: number };
        resolve({
          ok: r.status === 'success',
          status: r.status,
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
          systemTime: r.systemTime,
          ...base,
        });
      },
    );
  });
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

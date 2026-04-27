import Iyzipay from 'iyzipay';

const API_KEY = process.env.IYZICO_API_KEY || '';
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || '';
const BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

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

function buildClient(): Iyzipay {
  if (!API_KEY || !SECRET_KEY) {
    throw new Error(
      '[iyzico] IYZICO_API_KEY ve IYZICO_SECRET_KEY ortam değişkenleri tanımlı değil.',
    );
  }
  return new Iyzipay({
    apiKey: API_KEY,
    secretKey: SECRET_KEY,
    uri: BASE_URL,
  });
}

export function isIyzicoConfigured(): boolean {
  return Boolean(API_KEY && SECRET_KEY);
}

export function getIyzicoMode(): 'sandbox' | 'production' {
  return BASE_URL.includes('sandbox') ? 'sandbox' : 'production';
}

export async function createCheckoutFormInitialize(
  req: IyzicoCheckoutFormInitializeRequest,
): Promise<IyzicoCheckoutFormInitializeResponse> {
  const client = buildClient();
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
  const client = buildClient();
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

import crypto from 'crypto';
import { storage } from './storage';

// PayTR iFrame API — LIVE. Kimlik bilgileri yalnızca veritabanından (site_settings) okunur,
// admin panelden anahtar rotasyonu için uygulama yeniden başlatma gerekmez.
const GET_TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';
export const PAYTR_IFRAME_BASE = 'https://www.paytr.com/odeme/guvenli';

async function getMerchantId(): Promise<string> {
  return (await storage.getSiteSetting('paytr_merchant_id')) || '';
}
async function getMerchantKey(): Promise<string> {
  return (await storage.getSiteSetting('paytr_merchant_key')) || '';
}
async function getMerchantSalt(): Promise<string> {
  return (await storage.getSiteSetting('paytr_merchant_salt')) || '';
}

export async function isPaytrConfigured(): Promise<boolean> {
  const [id, key, salt] = await Promise.all([getMerchantId(), getMerchantKey(), getMerchantSalt()]);
  return Boolean(id && key && salt);
}

export type PaytrBasketItem = [name: string, price: string, quantity: number];

export type PaytrTokenRequest = {
  merchantOid: string;
  userIp: string;
  email: string;
  /** Toplam tutar TL (ör. 34.56) — kuruşa çevirme burada yapılır */
  amountTl: number;
  userName: string;
  userAddress: string;
  userPhone: string;
  basket: PaytrBasketItem[];
  okUrl: string;
  failUrl: string;
};

export type PaytrTokenResult =
  | { status: 'success'; token: string; iframeUrl: string }
  | { status: 'failure'; reason: string };

export async function createPaytrIframeToken(req: PaytrTokenRequest): Promise<PaytrTokenResult> {
  const [merchantId, merchantKey, merchantSalt] = await Promise.all([
    getMerchantId(),
    getMerchantKey(),
    getMerchantSalt(),
  ]);
  if (!merchantId || !merchantKey || !merchantSalt) {
    return { status: 'failure', reason: 'PayTR anahtarları yapılandırılmamış' };
  }

  const paymentAmount = Math.round(req.amountTl * 100); // kuruş
  const userBasket = Buffer.from(JSON.stringify(req.basket), 'utf8').toString('base64');
  const noInstallment = '0';
  const maxInstallment = '0';
  const currency = 'TL';
  const testMode = '0'; // LIVE

  // E-posta Türkçe karakter içermemeli
  const email = req.email.trim();

  const hashStr =
    merchantId +
    req.userIp +
    req.merchantOid +
    email +
    String(paymentAmount) +
    userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  const paytrToken = crypto
    .createHmac('sha256', merchantKey)
    .update(hashStr + merchantSalt)
    .digest('base64');

  const form = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: req.userIp,
    merchant_oid: req.merchantOid,
    email,
    payment_amount: String(paymentAmount),
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: '0',
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: req.userName.substring(0, 60),
    user_address: req.userAddress.substring(0, 400),
    user_phone: req.userPhone.substring(0, 20),
    merchant_ok_url: req.okUrl,
    merchant_fail_url: req.failUrl,
    timeout_limit: '30',
    currency,
    test_mode: testMode,
  });

  try {
    const resp = await fetch(GET_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = (await resp.json().catch(() => null)) as { status?: string; token?: string; reason?: string } | null;
    if (data?.status === 'success' && data.token) {
      return { status: 'success', token: data.token, iframeUrl: `${PAYTR_IFRAME_BASE}/${data.token}` };
    }
    return { status: 'failure', reason: data?.reason || `PayTR yanıtı alınamadı (HTTP ${resp.status})` };
  } catch (err) {
    return { status: 'failure', reason: err instanceof Error ? err.message : String(err) };
  }
}

export type PaytrCallbackBody = {
  merchant_oid?: string;
  status?: string;
  total_amount?: string;
  hash?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  payment_type?: string;
  payment_amount?: string;
  currency?: string;
  test_mode?: string;
};

// STEP 2 hash doğrulaması: base64(HMAC_SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key))
export async function verifyPaytrCallbackHash(body: PaytrCallbackBody): Promise<boolean> {
  const [merchantKey, merchantSalt] = await Promise.all([getMerchantKey(), getMerchantSalt()]);
  if (!merchantKey || !merchantSalt) return false;
  const { merchant_oid, status, total_amount, hash } = body;
  if (!merchant_oid || !status || !total_amount || !hash) return false;
  const expected = crypto
    .createHmac('sha256', merchantKey)
    .update(merchant_oid + merchantSalt + status + total_amount)
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
  } catch {
    return false;
  }
}

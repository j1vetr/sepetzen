// Cloudflare Turnstile captcha doğrulama yardımcısı.
// - Önce admin panelinden kaydedilen secret okunur (site_settings.turnstile_secret_key).
// - Yoksa env (TURNSTILE_SECRET_KEY) fallback'i denenir.
// - Production'da hiçbiri yoksa fail closed.

import { storage } from './storage';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  bypassed?: boolean;
  error?: string;
  errorCodes?: string[];
}

async function getSecret(): Promise<string | null> {
  try {
    const fromDb = await storage.getSiteSetting('turnstile_secret_key');
    if (fromDb && fromDb.trim()) return fromDb.trim();
  } catch (err) {
    console.error('[Turnstile] secret DB lookup failed:', err);
  }
  return process.env.TURNSTILE_SECRET_KEY || null;
}

/**
 * Cloudflare Turnstile token'ını doğrular.
 *
 * - Önce admin panelinden kaydedilen secret okunur, yoksa env fallback.
 * - Production'da hiçbiri yoksa fail closed.
 * - Diğer ortamlarda secret yoksa bypass — yerel/staging davranışı.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  const secret = await getSecret();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY tanımlı değil — production istek reddedildi.');
      return {
        success: false,
        error: 'Captcha doğrulaması yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.',
        errorCodes: ['missing-secret-key'],
      };
    }
    return { success: true, bypassed: true };
  }

  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Captcha doğrulaması eksik. Lütfen kutucuğu işaretleyin.',
      errorCodes: ['missing-input-response'],
    };
  }

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[Turnstile] HTTP ${res.status}`);
      return {
        success: false,
        error: 'Captcha sunucusuna ulaşılamadı. Lütfen tekrar deneyin.',
      };
    }

    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (data.success) {
      return { success: true };
    }

    const codes = data['error-codes'] || [];
    console.warn(`[Turnstile] verification failed: ${codes.join(', ')}`);
    return {
      success: false,
      error: 'Captcha doğrulaması başarısız. Lütfen tekrar deneyin.',
      errorCodes: codes,
    };
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'timeout' : err?.message || 'unknown';
    console.error(`[Turnstile] verify error: ${msg}`);
    return {
      success: false,
      error: 'Captcha doğrulanamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * İstek nesnesinden gerçek istemci IP'sini güvenli bir şekilde alır.
 * Trust proxy ayarı production'da Nginx arkası içindir.
 */
export function getClientIp(req: { ip?: string; headers: Record<string, any> }): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip;
}

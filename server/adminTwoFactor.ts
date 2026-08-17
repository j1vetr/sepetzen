import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  encryptCredentials,
  decryptCredentials,
} from "./marketplaces/crypto";
import { storage } from "./storage";
import type { AdminUser } from "@shared/schema";

/**
 * Admin girişi için TOTP (Google Authenticator) iki adımlı doğrulama yardımcıları.
 *
 * - Secret DB'de AES-256-GCM ile şifreli tutulur (MARKETPLACE_ENCRYPTION_KEY).
 * - Yedek kodlar bcrypt hash'li JSON dizisi olarak saklanır; her kod tek kullanımlıktır.
 * - TOTP doğrulamasında ±1 pencere toleransı vardır (saat kayması için).
 */

// ±1 adım (30sn) tolerans
authenticator.options = { window: 1 };

const ISSUER = "Sepetzen Admin";

export function generateTotpSecret(): string {
  return authenticator.generateSecret(); // base32
}

export function encryptTotpSecret(secret: string): string {
  return encryptCredentials({ secret });
}

export function decryptTotpSecret(blob: string): string {
  return decryptCredentials<{ secret: string }>(blob).secret;
}

export function buildOtpauthUrl(username: string, secret: string): string {
  return authenticator.keyuri(username, ISSUER, secret);
}

export async function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    return authenticator.verify({ token: normalized, secret });
  } catch {
    return false;
  }
}

const TOTP_STEP_MS = 30_000;

/**
 * Kodu doğrular VE eşleşen zaman adımını atomik olarak tüketir (replay koruması).
 * Aynı 6 haneli kod ikinci kez kabul edilmez.
 */
export async function verifyAndConsumeTotp(
  userId: string,
  secret: string,
  code: string,
): Promise<boolean> {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  let delta: number | null;
  try {
    delta = authenticator.checkDelta(normalized, secret);
  } catch {
    return false;
  }
  if (delta === null) return false;
  const matchedStep = Math.floor(Date.now() / TOTP_STEP_MS) + delta;
  return storage.consumeTotpStep(userId, matchedStep);
}

/** 8 adet XXXX-XXXX formatında yedek kod üretir (plaintext döner). */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 hex hane
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return JSON.stringify(hashes);
}

export function looksLikeBackupCode(code: string): boolean {
  return /^[0-9A-Fa-f]{4}-?[0-9A-Fa-f]{4}$/.test(code.replace(/\s/g, ""));
}

/**
 * Yedek kodu atomik (CAS) olarak tüketir: yalnızca DB'deki liste beklenen
 * değerden yeni listeye başarıyla geçen istek doğrulanmış sayılır. Eşzamanlı
 * yarışta CAS kaybeden taraf güncel listeyi yeniden okuyup tekrar dener.
 */
async function consumeBackupCodeAtomic(userId: string, code: string): Promise<boolean> {
  const normalized = code.replace(/\s/g, "").toUpperCase();
  const withDash =
    normalized.includes("-") || normalized.length !== 8
      ? normalized
      : `${normalized.slice(0, 4)}-${normalized.slice(4)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await storage.getAdminUser(userId);
    if (!user?.totpBackupCodes) return false;

    let hashes: string[];
    try {
      hashes = JSON.parse(user.totpBackupCodes);
      if (!Array.isArray(hashes)) return false;
    } catch {
      return false;
    }

    let matchIndex = -1;
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(withDash, hashes[i])) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex === -1) return false;

    const remaining = hashes.filter((_, idx) => idx !== matchIndex);
    const swapped = await storage.casAdminBackupCodes(
      userId,
      user.totpBackupCodes,
      JSON.stringify(remaining),
    );
    if (swapped) return true;
    // CAS kaybedildi (eşzamanlı istek listeyi değiştirdi) — yeniden dene
  }
  return false;
}

/**
 * Giriş/kapatma sırasında TOTP veya yedek kodu doğrular ve TÜKETİR:
 * TOTP için zaman adımı, yedek kod için ilgili hash atomik olarak yakılır.
 */
export async function verifyLoginCode(user: AdminUser, code: string): Promise<{ ok: boolean }> {
  if (!user.totpSecret) return { ok: false };
  const trimmed = String(code || "").trim();
  if (!trimmed) return { ok: false };

  if (/^\d{6}$/.test(trimmed.replace(/\s/g, ""))) {
    try {
      const secret = decryptTotpSecret(user.totpSecret);
      if (await verifyAndConsumeTotp(user.id, secret, trimmed)) return { ok: true };
    } catch (err) {
      console.error("[2FA] secret çözülemedi:", err);
      return { ok: false };
    }
  }

  if (looksLikeBackupCode(trimmed)) {
    if (await consumeBackupCodeAtomic(user.id, trimmed)) return { ok: true };
  }

  return { ok: false };
}

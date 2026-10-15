import crypto from "crypto";

/**
 * Pazaryeri kredensiyellerini AES-256-GCM ile şifreler/çözer.
 *
 * Anahtar kaynağı: SADECE process.env.MARKETPLACE_ENCRYPTION_KEY — 32-byte
 * (hex veya base64). Tüm ortamlarda zorunludur. Hiçbir koşulda dosya tabanlı
 * dev fallback YOKTUR; çünkü:
 *   - DB başka bir makineye taşındığında çözülemeyen kredensiyellere yol açar,
 *   - üretim ortamında yanlış sızıntı sınıfına geçer (anahtar diskte rastgele).
 *
 * Yeni kurulum için anahtar üretmek:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM önerilen
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.MARKETPLACE_ENCRYPTION_KEY;
  if (!envKey || !envKey.trim()) {
    throw new Error(
      "MARKETPLACE_ENCRYPTION_KEY is required (32-byte hex or base64). " +
        "Set it as a Replit Secret. Generate with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  const raw = envKey.trim();
  let buf: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    buf = Buffer.from(raw, "hex");
  } else {
    try {
      buf = Buffer.from(raw, "base64");
    } catch {
      throw new Error("MARKETPLACE_ENCRYPTION_KEY must be 32 bytes (hex or base64)");
    }
  }
  if (buf.length !== 32) {
    throw new Error(
      `MARKETPLACE_ENCRYPTION_KEY must decode to 32 bytes, got ${buf.length}`,
    );
  }
  cachedKey = buf;
  return cachedKey;
}

/**
 * Sunucu açılışında çağrılır: anahtar yapılandırmasını eager doğrular.
 * Production'da MARKETPLACE_ENCRYPTION_KEY yoksa fail-fast (loadKey throw eder).
 */
export function assertEncryptionKeyConfigured(): void {
  loadKey();
}

export function encryptCredentials(payload: Record<string, unknown>): string {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv | tag | cipher)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredentials<T extends Record<string, unknown> = Record<string, unknown>>(
  blob: string,
): T {
  const key = loadKey();
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("encrypted credentials payload is malformed");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const cipher = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(cipher), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/**
 * Bir API key/secret'ın yalnız son 4 hanesini gösterir (UI ve log için).
 */
export function maskSecret(value: string | undefined | null): string {
  if (!value) return "-";
  const s = String(value);
  if (s.length <= 4) return "*".repeat(s.length);
  return "•".repeat(Math.min(8, s.length - 4)) + s.slice(-4);
}

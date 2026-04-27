import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Pazaryeri kredensiyellerini AES-256-GCM ile şifreler/çözer.
 *
 * Anahtar kaynağı (öncelik sırası):
 *   1. process.env.MARKETPLACE_ENCRYPTION_KEY — 32-byte base64/hex
 *   2. .local/marketplace_key — ilk açılışta otomatik üretilir, kalıcı saklanır
 *
 * Üretim ortamında MUTLAKA env var'la verin; .local fallback yalnız geliştirme
 * konforu içindir (DB üzerinden kredensiyel taşınamaz çünkü key makineye bağlı).
 */

const KEY_FILE = path.join(process.cwd(), ".local", "marketplace_key");
const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM önerilen
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.MARKETPLACE_ENCRYPTION_KEY;
  if (envKey && envKey.trim()) {
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

  // Production'da env şart. Aksi halde başlatma kapatılır.
  if (isProductionEnv()) {
    throw new Error(
      "MARKETPLACE_ENCRYPTION_KEY is required in production (32-byte hex or base64). " +
        "Refusing to start with the dev fallback key — set the env var and redeploy.",
    );
  }

  // Sadece dev için: .local/marketplace_key fallback (kalıcı, makineye bağlı).
  try {
    if (fs.existsSync(KEY_FILE)) {
      const raw = fs.readFileSync(KEY_FILE, "utf8").trim();
      const buf = Buffer.from(raw, "base64");
      if (buf.length !== 32) throw new Error("invalid local key length");
      cachedKey = buf;
      return cachedKey;
    }
  } catch (err) {
    console.warn("[marketplace/crypto] failed to read local key, regenerating:", err);
  }

  const fresh = crypto.randomBytes(32);
  try {
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(KEY_FILE, fresh.toString("base64"), { mode: 0o600 });
    console.warn(
      "[marketplace/crypto] DEV ONLY: generated ephemeral key at .local/marketplace_key. " +
        "Production deployments MUST set MARKETPLACE_ENCRYPTION_KEY.",
    );
  } catch (err) {
    console.error("[marketplace/crypto] could not persist generated key:", err);
  }
  cachedKey = fresh;
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
  if (!value) return "—";
  const s = String(value);
  if (s.length <= 4) return "*".repeat(s.length);
  return "•".repeat(Math.min(8, s.length - 4)) + s.slice(-4);
}

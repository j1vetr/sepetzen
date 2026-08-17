/**
 * Admin girişi ve 2FA kod denemeleri için DB-destekli hız limiti.
 *
 * 15 dakikalık pencerede 5 başarısız deneme → 15 dakika kilit.
 * Sayaçlar auth_rate_limits tablosunda tutulur; sunucu yeniden
 * başlatılsa veya birden fazla instance çalışsa da kilit devam eder.
 *
 * DB geçici olarak kullanılamaz olursa süreç-içi yedek Map devreye girer
 * ve hız sınırlaması korunur (kilitler yalnızca bu instance'ta kalır).
 *
 * Anahtar: normalize edilmiş kullanıcı adı + IP (login) veya admin id (2FA).
 */

import { db } from "./db";
import { authRateLimits } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000; // 15 dakika
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 dakika kilit

// ---------------------------------------------------------------------------
// Yedek süreç-içi Map — yalnızca DB geçici hata verdiğinde kullanılır.
// ---------------------------------------------------------------------------
type FallbackEntry = { failures: number[]; lockedUntil: number };
const fallbackMap = new Map<string, FallbackEntry>();

function fallbackLockedForSeconds(key: string): number {
  const e = fallbackMap.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}

function fallbackRecordFailure(key: string): void {
  const now = Date.now();
  const e = fallbackMap.get(key) ?? { failures: [], lockedUntil: 0 };
  e.failures = e.failures.filter((t) => t > now - WINDOW_MS);
  e.failures.push(now);
  if (e.failures.length >= MAX_FAILURES) {
    e.lockedUntil = now + LOCK_MS;
    e.failures = [];
    console.warn(`[AuthRateLimit/fallback] kilitlendi: ${key} (${LOCK_MS / 60000} dk)`);
  }
  fallbackMap.set(key, e);
}

function fallbackRecordSuccess(key: string): void {
  fallbackMap.delete(key);
}

// ---------------------------------------------------------------------------
// Normalize yardımcısı
// ---------------------------------------------------------------------------
export function normalizeKey(...parts: (string | undefined)[]): string {
  return parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
}

// ---------------------------------------------------------------------------
// DB-destekli fonksiyonlar
// ---------------------------------------------------------------------------

/** Kilitliyse kalan saniyeyi döner, değilse 0. */
export async function lockedForSeconds(key: string): Promise<number> {
  try {
    const [row] = await db
      .select({ lockedUntil: authRateLimits.lockedUntil })
      .from(authRateLimits)
      .where(eq(authRateLimits.key, key));

    if (!row?.lockedUntil) return 0;
    const remaining = row.lockedUntil.getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  } catch (err) {
    // DB erişilemiyor — yedek Map'e bak (throttling korunur)
    console.error("[AuthRateLimit] DB lockedForSeconds hatası, yedek kullanılıyor:", (err as Error).message);
    return fallbackLockedForSeconds(key);
  }
}

/** Başarısız denemeyi kaydeder; MAX_FAILURES eşiğine ulaşılınca kilitler. */
export async function recordFailure(key: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const lockedUntilOnLock = new Date(now.getTime() + LOCK_MS);

  try {
    // UPSERT: satır yoksa oluştur; varsa pencere içinde sayacı artır.
    // Pencere dışındaysa (son hata çok eskiyse) yeni bir pencere başlat.
    await db.execute(sql`
      INSERT INTO auth_rate_limits (key, failure_count, window_start, locked_until, updated_at)
      VALUES (${key}, 1, ${now}, NULL, ${now})
      ON CONFLICT (key) DO UPDATE SET
        failure_count = CASE
          WHEN auth_rate_limits.window_start < ${windowStart}
            THEN 1
          ELSE auth_rate_limits.failure_count + 1
        END,
        window_start = CASE
          WHEN auth_rate_limits.window_start < ${windowStart}
            THEN ${now}
          ELSE auth_rate_limits.window_start
        END,
        locked_until = CASE
          WHEN auth_rate_limits.window_start < ${windowStart}
            THEN NULL
          WHEN auth_rate_limits.failure_count + 1 >= ${MAX_FAILURES}
            THEN ${lockedUntilOnLock}
          ELSE auth_rate_limits.locked_until
        END,
        updated_at = ${now}
    `);

    // Kilitleme uyarısını log'la (read-after-write, en iyi çaba)
    const [row] = await db
      .select({ lockedUntil: authRateLimits.lockedUntil })
      .from(authRateLimits)
      .where(eq(authRateLimits.key, key));
    if (row?.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      console.warn(`[AuthRateLimit] kilitlendi: ${key} (${LOCK_MS / 60000} dk)`);
    }
  } catch (err) {
    // DB erişilemiyor — yedek Map'e kaydet (throttling korunur)
    console.error("[AuthRateLimit] DB recordFailure hatası, yedek kullanılıyor:", (err as Error).message);
    fallbackRecordFailure(key);
  }
}

/** Başarılı girişte sayacı sıfırlar (DB satırını siler, yedek giriş de temizlenir). */
export async function recordSuccess(key: string): Promise<void> {
  fallbackRecordSuccess(key); // her iki kaynaktan da temizle
  try {
    await db.delete(authRateLimits).where(eq(authRateLimits.key, key));
  } catch (err) {
    // DB geçici hata; yedek Map zaten temizlendi, bu yeterli
    console.error("[AuthRateLimit] DB recordSuccess hatası:", (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Başlangıç: tabloyu idempotent olarak oluştur
// ---------------------------------------------------------------------------
export async function ensureTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        key TEXT PRIMARY KEY,
        failure_count INTEGER NOT NULL DEFAULT 0,
        window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_until TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) {
    // Oluşturulamazsa yedek Map devrede; başlangıç engellenmesin
    console.error("[AuthRateLimit] ensureTable hatası:", (err as Error).message);
  }
}

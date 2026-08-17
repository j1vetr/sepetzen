/**
 * Admin girişi ve 2FA kod denemeleri için basit, süreç-içi hız limiti.
 *
 * 15 dakikalık pencerede 5 başarısız deneme → 15 dakika kilit.
 * Anahtar: normalize kullanıcı adı + IP (login) veya admin id (2FA işlemleri).
 *
 * Not: Süreç-içi Map, çok-instance dağıtımda instance başına ayrı sayaç
 * demektir (autoscale'de saldırgan instance sayısı kadar ek deneme kazanır).
 * Tek-admin bu mağaza için kabul edilen pragmatik sınır; kalıcı/paylaşımlı
 * limit gerekirse sayaç DB'ye taşınmalı.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

type Entry = { failures: number[]; lockedUntil: number };

const entries = new Map<string, Entry>();

function prune(now: number) {
  // Map'in sınırsız büyümesini engelle (ör. rastgele kullanıcı adı denemeleri)
  if (entries.size < 1000) return;
  for (const [k, e] of Array.from(entries.entries())) {
    if (e.lockedUntil < now && (e.failures[e.failures.length - 1] ?? 0) < now - WINDOW_MS) {
      entries.delete(k);
    }
  }
}

export function normalizeKey(...parts: (string | undefined)[]): string {
  return parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
}

/** Kilitliyse kalan saniyeyi döner, değilse 0. */
export function lockedForSeconds(key: string): number {
  const e = entries.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const e = entries.get(key) ?? { failures: [], lockedUntil: 0 };
  e.failures = e.failures.filter((t) => t > now - WINDOW_MS);
  e.failures.push(now);
  if (e.failures.length >= MAX_FAILURES) {
    e.lockedUntil = now + LOCK_MS;
    e.failures = [];
    console.warn(`[AuthRateLimit] kilitlendi: ${key} (${LOCK_MS / 60000} dk)`);
  }
  entries.set(key, e);
}

export function recordSuccess(key: string): void {
  entries.delete(key);
}

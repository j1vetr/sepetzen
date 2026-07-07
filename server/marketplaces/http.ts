/**
 * Pazaryeri adapter'ları için ortak HTTP helper:
 *  - Basic auth header üretimi
 *  - User-Agent zorunluluğu (Trendyol header denetlemesi)
 *  - Retry (3 deneme, exponential backoff) — sadece retryable hatalarda
 *  - Rate-limit gözetimi (basit token-bucket; dakikada N istek)
 */

import { MarketplaceError } from "./types";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Retry telemetri callback'leri — sync engine bunları stats counter'larına bağlar.
 * Sessiz başarısızlık: implementasyon hataları HTTP akışını etkilemez.
 */
export interface HttpClientMetrics {
  /** Retryable bir hata sonrası backoff başlatıldığında çağrılır (her deneme için). */
  onRetry?: (info: {
    attempt: number;
    statusCode?: number;
    retryAfterMs?: number | null;
  }) => void;
  /** İlk denemede 2xx alınamayan ama sonraki denemede başarılı olan istek için bir kez çağrılır. */
  onRecover?: (info: { attempts: number; statusCode: number }) => void;
}

interface ClientOptions {
  baseUrl: string;
  basicAuthUser: string;
  basicAuthPass: string;
  userAgent: string;
  /** Dakika başına izin verilen istek sayısı. */
  rateLimitPerMinute?: number;
  /** Retry / recover telemetrisi (opsiyonel). */
  metrics?: HttpClientMetrics;
}

/** Basit token bucket — saniyede yeniden dolar. */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  constructor(private readonly perMinute: number) {
    this.tokens = perMinute;
    this.lastRefill = Date.now();
  }
  async take(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      // 100 ms bekle, tekrar dene
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  private refill() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    if (elapsedMs <= 0) return;
    const refillRate = this.perMinute / 60_000; // token / ms
    this.tokens = Math.min(this.perMinute, this.tokens + elapsedMs * refillRate);
    this.lastRefill = now;
  }
}

export class MarketplaceHttpClient {
  private readonly authHeader: string;
  private readonly limiter: RateLimiter;
  private metrics: HttpClientMetrics | undefined;

  constructor(private readonly opts: ClientOptions) {
    const credentials = `${opts.basicAuthUser}:${opts.basicAuthPass}`;
    this.authHeader = `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
    this.limiter = new RateLimiter(opts.rateLimitPerMinute ?? 600);
    this.metrics = opts.metrics;
  }

  /**
   * Telemetri kanalını çalışma sırasında bağla / değiştir.
   * Adapter constructor zamanında metrics belli olmadığı için (sync engine
   * adapter'ı oluşturduktan sonra runId'ye bağlı counter'ları takar).
   */
  setMetrics(metrics: HttpClientMetrics | undefined): void {
    this.metrics = metrics;
  }

  async request<T = unknown>(pathOrUrl: string, options: RequestOptions = {}): Promise<T> {
    const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute
      ? pathOrUrl
      : `${this.opts.baseUrl.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
    const method = options.method ?? "GET";

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "User-Agent": this.opts.userAgent,
      Accept: "application/json",
      ...options.headers,
    };

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    // Trendyol/Cloudflare upstream zaman zaman geçici 556/503 verir.
    // 5 deneme + uzunca backoff (1s, 2s, 4s, 8s + jitter) genelde yeterli.
    const maxAttempts = 5;
    let lastErr: unknown;
    let hadRetry = false; // bu request için en az bir retry yaşandı mı (recover sayımı için)
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.limiter.take();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
      try {
        const resp = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        clearTimeout(t);

        if (resp.status === 401 || resp.status === 403) {
          // Auth hataları retry edilmez
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace auth failed (${resp.status}): ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: false },
          );
        }

        if (resp.status === 429 || resp.status >= 500) {
          // Sunucu Retry-After önerdiyse onu honor et (Trendyol limitlere takıldığında
          // saniye cinsinden veya HTTP-date olarak bunu döner).
          const retryAfterMs = parseRetryAfterMs(resp.headers.get("retry-after"));
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace upstream ${resp.status}: ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: true, retryAfterMs },
          );
        }

        if (!resp.ok) {
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace request failed (${resp.status}): ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: false },
          );
        }

        // Başarılı dönüş — daha önce retry yaşandıysa bu bir "recover" demektir.
        if (hadRetry) {
          try {
            this.metrics?.onRecover?.({ attempts: attempt, statusCode: resp.status });
          } catch {
            /* telemetri sessiz */
          }
        }

        if (resp.status === 204) return undefined as T;

        const ct = resp.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          return (await resp.json()) as T;
        }
        // Non-JSON yanıtı text olarak dön. Çağıranın T'si string'i kapsar
        // (caller, response tipini bilerek doğru T'yi seçer).
        const text = await resp.text();
        return text as T;
      } catch (err) {
        clearTimeout(t);
        lastErr = err;
        const retryable =
          err instanceof MarketplaceError
            ? err.retryable
            : err instanceof Error && err.name === "AbortError"
              ? true
              : true; // network errors -> retry

        if (!retryable || attempt === maxAttempts) break;
        const status =
          err instanceof MarketplaceError && err.statusCode != null ? err.statusCode : undefined;
        const retryAfter =
          err instanceof MarketplaceError && err.retryAfterMs != null
            ? err.retryAfterMs
            : null;
        const expBackoff = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
        // Sunucu Retry-After verdiyse en az o kadar bekle; aksi halde exponential.
        // Üst sınır 60s (saatte-1 endpoint'lere takıldığımızda boş yere blocklanmayalım).
        const backoff = Math.min(60_000, Math.max(retryAfter ?? 0, expBackoff));
        console.warn(
          `[marketplaces.http] retryable error (status=${status ?? "net"}) attempt=${attempt}/${maxAttempts} url=${url} — backing off ${backoff}ms${
            retryAfter != null ? ` (Retry-After=${retryAfter}ms)` : ""
          }`,
        );
        try {
          this.metrics?.onRetry?.({ attempt, statusCode: status, retryAfterMs: retryAfter });
        } catch {
          /* telemetri sessiz */
        }
        hadRetry = true;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    if (lastErr instanceof MarketplaceError) throw lastErr;
    throw new MarketplaceError(
      `Marketplace request failed after retries: ${(lastErr as Error)?.message ?? String(lastErr)}`,
      { retryable: false },
    );
  }
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

/**
 * RFC 7231 Retry-After: ya saniye sayısı ("120") ya da HTTP-date.
 * Trendyol genelde saniye döner. Bilinmeyen format → null.
 */
function parseRetryAfterMs(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, Number(trimmed) * 1000);
  }
  const t = Date.parse(trimmed);
  if (!Number.isNaN(t)) {
    const ms = t - Date.now();
    return ms > 0 ? ms : 0;
  }
  return null;
}

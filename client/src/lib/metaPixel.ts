/**
 * Meta Pixel + Conversions API istemci tarafı.
 *
 * Her olay için tek bir event_id üretilir. Pixel olayı tarayıcıdan, aynı olay
 * /api/meta/event üzerinden sunucudan (CAPI) gönderilir ve Meta bunları tekilleştirir.
 * Purchase olayı sunucuda gönderilir, tarayıcıdaki Pixel olayı aynı event_id'yi kullanır.
 */

export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Lead';

interface MetaPublicConfig {
  pixelEnabled: boolean;
  pixelId: string;
  capiEnabled: boolean;
  contentIdSource: 'sku' | 'id';
  requireConsent: boolean;
  events: Partial<Record<MetaEventName, boolean>>;
}

export interface MetaContentItem {
  productId: string;
  sku?: string | null;
  quantity?: number;
  price?: number;
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  zip?: string;
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; callMethod?: unknown; push?: unknown; version?: string };
    _fbq?: unknown;
  }
}

const CONSENT_KEY = 'sepetzen-cookie-consent';
let configPromise: Promise<MetaPublicConfig | null> | null = null;
let pixelReady = false;

function loadConfig(): Promise<MetaPublicConfig | null> {
  if (!configPromise) {
    configPromise = fetch('/api/meta/config')
      .then((r) => (r.ok ? (r.json() as Promise<MetaPublicConfig>) : null))
      .catch(() => null);
  }
  return configPromise;
}

function consentGranted(cfg: MetaPublicConfig): boolean {
  if (!cfg.requireConsent) return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function installPixel(pixelId: string) {
  if (pixelReady || typeof window === 'undefined') return;
  if (!window.fbq) {
    const n: any = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    };
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  window.fbq!('init', pixelId);
  pixelReady = true;
}

export function newEventId(name: string): string {
  return `${name}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function contentIdOf(cfg: Pick<MetaPublicConfig, 'contentIdSource'>, item: { productId: string; sku?: string | null }): string {
  return cfg.contentIdSource === 'sku' && item.sku && item.sku.trim() ? item.sku.trim() : item.productId;
}

interface TrackOptions {
  contents?: MetaContentItem[];
  value?: number;
  searchString?: string;
  contentName?: string;
  contentCategory?: string;
  userData?: MetaUserData;
  /** Purchase gibi sunucuda zaten gönderilen olaylarda sunucu aktarımını kapatır */
  serverRelay?: boolean;
  eventId?: string;
  /** Hazır custom_data (Purchase için sunucudan gelen) */
  rawCustomData?: Record<string, unknown>;
}

export async function trackMeta(name: MetaEventName, opts: TrackOptions = {}): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.includes('/admin')) return;
    const cfg = await loadConfig();
    if (!cfg || !cfg.events[name]) return;
    if (!cfg.pixelEnabled && !cfg.capiEnabled) return;
    if (!consentGranted(cfg)) return;

    const eventId = opts.eventId || newEventId(name);
    const contents = (opts.contents || []).filter((c) => c.productId);

    let customData: Record<string, unknown> = {};
    if (opts.rawCustomData) {
      customData = opts.rawCustomData;
    } else {
      if (contents.length) {
        customData.content_type = 'product';
        customData.content_ids = contents.map((c) => contentIdOf(cfg, c));
        customData.contents = contents.map((c) => ({
          id: contentIdOf(cfg, c),
          quantity: c.quantity ?? 1,
          item_price: c.price,
        }));
        customData.num_items = contents.reduce((n, c) => n + (c.quantity ?? 1), 0);
      }
      if (typeof opts.value === 'number' && Number.isFinite(opts.value)) {
        customData.value = Number(opts.value.toFixed(2));
        customData.currency = 'TRY';
      }
      if (opts.searchString) customData.search_string = opts.searchString;
      if (opts.contentName) customData.content_name = opts.contentName;
      if (opts.contentCategory) customData.content_category = opts.contentCategory;
    }

    if (cfg.pixelEnabled) {
      installPixel(cfg.pixelId);
      window.fbq!('track', name, customData, { eventID: eventId });
    }

    const relay = opts.serverRelay !== false && name !== 'Purchase';
    if (cfg.capiEnabled && relay) {
      const serverData: Record<string, unknown> = { ...customData };
      // Sunucu ürün kimliklerini kendisi çözer
      delete serverData.content_ids;
      serverData.contents = contents.map((c) => ({ productId: c.productId, quantity: c.quantity ?? 1, price: c.price }));
      void fetch('/api/meta/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({
          eventName: name,
          eventId,
          sourceUrl: window.location.href,
          customData: serverData,
          userData: opts.userData,
        }),
      }).catch(() => {});
    }
  } catch {
    /* izleme hatası sayfayı bozmamalı */
  }
}

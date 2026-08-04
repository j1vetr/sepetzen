/**
 * Trendyol Integration API adapter — pazaryeri tipi 'trendyol'.
 *
 * API kökü: https://apigw.trendyol.com/integration/
 * Auth: Basic ${apiKey}:${apiSecret}
 * User-Agent zorunlu format: `${supplierId} - SelfIntegration`.
 *
 * --------------------------------------------------------------------
 * Servis limitleri (https://developers.trendyol.com/docs/1-servis-limitleri)
 *   - Ürün Filtreleme (/products) ......... 2000 req/min   ← bizim hot path
 *   - Stok ve Fiyat Güncelleme ............ NO LIMIT
 *   - TY Kategori Listesi ................. 50   req/min   (artık çağırmıyoruz)
 *   - İade/Sevkiyat Adres Bilgileri ....... 1    req/HOUR  (sadece debug)
 *   - Ürün Silme .......................... 100  req/min
 * Biz default 1500 req/min ile çalışıyoruz (limitin %75'i, headroom için).
 * --------------------------------------------------------------------
 *
 * Yalnız okuma fonksiyonları:
 *   - testConnection: /products?page=0&size=1
 *   - fetchCategoryTree: /product/product-categories (engine artık çağırmıyor)
 *   - fetchProductsPage: /product/sellers/{sellerId}/products?page=N&size=50
 *   - fetchStockAndPrice: aynı listing endpoint'ten yalnız barkode/stok/price alanları
 *
 * Sayfalama: cursor = page numarası (string). null → sayfa biter.
 */

import { MarketplaceHttpClient } from "../http";
import { registerAdapter } from "../registry";
import {
  BatchResult,
  BrandOption,
  CategoryAttributeDef,
  MarketplaceAdapter,
  MarketplaceConfig,
  MarketplaceCredentials,
  MarketplaceError,
  MarketplaceWriteAdapter,
  NormalizedCategory,
  NormalizedProduct,
  NormalizedStockPrice,
  NormalizedVariant,
  PageCursor,
  ProductsPage,
  ConnectionTestResult,
  StockPricePushItem,
} from "../types";

interface TrendyolCreds extends MarketplaceCredentials {
  supplierId: string | number;
  apiKey: string;
  apiSecret: string;
}

const DEFAULT_BASE = "https://apigw.trendyol.com/integration";
// Trendyol Cloudflare/LB katmanı büyük sayfalarda HTTP 556 (upstream overload)
// dönmeye eğilimli. 50, gateway'in stabil kabul ettiği güvenli üst sınır.
const DEFAULT_PAGE_SIZE = 50;

interface TrendyolCategory {
  id: number;
  name: string;
  parentId?: number | null;
  subCategories?: TrendyolCategory[];
}

interface TrendyolImage {
  url: string;
}

interface TrendyolAttribute {
  attributeName?: string;
  attributeValue?: string;
}

interface TrendyolProduct {
  id?: number;
  productMainId?: string;
  contentId?: number | string;
  barcode: string;
  productCode?: string;
  stockCode?: string;
  title: string;
  description?: string;
  brand?: string;
  categoryId?: number;
  /** Trendyol Listings API'da gerçek leaf categoryId burada gelir. */
  pimCategoryId?: number;
  categoryName?: string;
  listPrice?: number;
  salePrice: number;
  quantity: number;
  approved?: boolean;
  archived?: boolean;
  onSale?: boolean;
  rejected?: boolean;
  images: TrendyolImage[];
  attributes?: TrendyolAttribute[];
  size?: string;
  color?: string;
}

interface TrendyolListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: TrendyolProduct[];
}

class TrendyolAdapter implements MarketplaceAdapter, MarketplaceWriteAdapter {
  readonly type = "trendyol" as const;
  private readonly client: MarketplaceHttpClient;
  private readonly supplierId: string;

  constructor(creds: TrendyolCreds, config: MarketplaceConfig) {
    if (!creds.supplierId || !creds.apiKey || !creds.apiSecret) {
      throw new MarketplaceError(
        "Trendyol adapter requires supplierId, apiKey and apiSecret",
        { retryable: false },
      );
    }
    this.supplierId = String(creds.supplierId);
    const base =
      (config.sandbox && (process.env.TRENDYOL_SANDBOX_BASE_URL || ""))
        ? String(process.env.TRENDYOL_SANDBOX_BASE_URL)
        : DEFAULT_BASE;
    this.client = new MarketplaceHttpClient({
      baseUrl: base,
      basicAuthUser: String(creds.apiKey),
      basicAuthPass: String(creds.apiSecret),
      userAgent: `${this.supplierId} - SelfIntegration`,
      // Trendyol "Ürün Filtreleme" 2000 req/min — biz 1500 ile %75 headroom bırakıyoruz.
      // Diğer endpoint'lere bu adapter çağrı yapmadığından tek bir bucket yeterli.
      rateLimitPerMinute:
        typeof config.rateLimit === "number" ? (config.rateLimit as number) : 1500,
    });
  }

  /**
   * V2 onaylı ürün listeleme sayfası. (Eski /products endpoint'i Product v2
   * geçişi nedeniyle brownout/kapalı — UPGRADE_REQUIRED dönüyor.)
   * Boş katalogda Trendyol 404 "product.not.found" döndürür; bunu boş sayfa
   * olarak normalize ederiz (yeni satıcı hesabı = henüz onaylı ürün yok).
   */
  private async fetchApprovedPage(page: number, size = DEFAULT_PAGE_SIZE): Promise<TrendyolListResponse> {
    try {
      return await this.client.request<TrendyolListResponse>(
        `/product/sellers/${encodeURIComponent(this.supplierId)}/products/approved` +
          `?page=${page}&size=${size}`,
      );
    } catch (err) {
      if (err instanceof MarketplaceError && err.statusCode === 404) {
        return { page, size, totalElements: 0, totalPages: 0, content: [] };
      }
      throw err;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Hafif bir endpoint: ilk sayfa, size=1 (404 = boş katalog, yine başarı)
      await this.fetchApprovedPage(0, 1);
      return { ok: true, message: "Trendyol bağlantısı başarılı." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: `Trendyol bağlantı hatası: ${msg}`,
        details: { statusCode: (err as MarketplaceError)?.statusCode },
      };
    }
  }

  async fetchCategoryTree(): Promise<NormalizedCategory[]> {
    const resp = await this.client.request<{ categories: TrendyolCategory[] }>(
      `/product/product-categories`,
    );
    const out: NormalizedCategory[] = [];
    const walk = (nodes: TrendyolCategory[] | undefined, parentId: string | null) => {
      if (!nodes) return;
      for (const n of nodes) {
        out.push({
          externalId: String(n.id),
          name: n.name,
          parentExternalId: parentId,
        });
        if (n.subCategories?.length) walk(n.subCategories, String(n.id));
      }
    };
    walk(resp.categories, null);
    return out;
  }

  async fetchProductsPage(cursor: PageCursor): Promise<ProductsPage> {
    const page = cursor == null ? 0 : Number(cursor);
    // V2: yalnız onaylı ürünler listelenir (onaysız ürünler zaten satışta
    // değil; ayrıca /products/unapproved farklı bir şema döndürüyor).
    const resp = await this.fetchApprovedPage(page);

    const products = (resp.content ?? []).map((p) => normalize(p));
    const next = page + 1;
    const hasMore = resp.totalPages != null ? next < resp.totalPages : products.length > 0;

    return {
      products,
      nextCursor: hasMore ? next : null,
      total: resp.totalElements,
    };
  }

  async fetchStockAndPrice(externalIds: string[]): Promise<NormalizedStockPrice[]> {
    if (externalIds.length === 0) return [];
    // Trendyol'da hızlı tek-istek yolu yok; barcode'ları batch'leyelim (size=200).
    // Burada güvenli/genel yaklaşım: ürünleri sayfa sayfa tara, istenenleri filtre et.
    const wanted = new Set(externalIds.map(String));
    const out: NormalizedStockPrice[] = [];
    let page = 0;
    while (true) {
      const resp = await this.fetchApprovedPage(page);
      for (const p of resp.content ?? []) {
        const id = String(p.contentId ?? p.barcode);
        if (!wanted.has(id)) continue;
        const price = Number(p.salePrice ?? 0);
        const stock = Number(p.quantity ?? 0);
        // Trendyol her satırı bir barcode/SKU olarak döndürür → tek varyant.
        // sku alanı productVariants.sku ile eşleşir; barcode da yedek anahtardır.
        out.push({
          externalId: id,
          basePrice: price,
          totalStock: stock,
          isActive:
            (p.approved === undefined || p.approved === true) && !p.archived && !p.rejected,
          variants: [
            {
              externalVariantId: p.barcode ? String(p.barcode) : null,
              sku: p.stockCode ?? p.productCode ?? null,
              barcode: p.barcode ?? null,
              price,
              stock,
            },
          ],
        });
      }
      page += 1;
      if (resp.totalPages != null && page >= resp.totalPages) break;
      if (!resp.content || resp.content.length === 0) break;
      // Maksimum sayfa koruması
      if (page > 1000) break;
    }
    return out;
  }

  /**
   * Tek ürünün detayını döner. Trendyol'un dedike "GET product" endpoint'i
   * /products/{barcode} olabiliyor; biz güvenli şekilde liste filtresine
   * düşüyoruz: barcode ile sayfa sayfa tarayıp eşleşeni dönüyoruz.
   * Ağır endpoint kullanan yeni adapter'lar bu metodu daha verimli yazabilir.
   */
  async fetchProductDetails(externalId: string): Promise<NormalizedProduct | null> {
    const wanted = String(externalId);
    let page = 0;
    while (true) {
      const resp = await this.fetchApprovedPage(page);
      for (const p of resp.content ?? []) {
        const id = String(p.contentId ?? p.barcode);
        if (id === wanted) return normalize(p);
      }
      page += 1;
      if (resp.totalPages != null && page >= resp.totalPages) return null;
      if (!resp.content || resp.content.length === 0) return null;
      if (page > 1000) return null;
    }
  }

  // ==========================================================================
  // YAZMA (PUSH) YÜZEYİ — V2 servisleri. (V1 ürün servisleri 10 Ağustos 2026'da
  // kapanıyor; burada yalnız V2 endpoint'leri kullanılır.)
  // ==========================================================================

  /** Marka arama: GET /product/brands/by-name?name= */
  async searchBrands(query: string): Promise<BrandOption[]> {
    if (!query.trim()) return [];
    const resp = await this.client.request<Array<{ id: number; name: string }>>(
      `/product/brands/by-name?name=${encodeURIComponent(query.trim())}`,
    );
    return (Array.isArray(resp) ? resp : []).map((b) => ({
      id: String(b.id),
      name: b.name,
    }));
  }

  /** Kategori özellikleri: GET /product/product-categories/{id}/attributes */
  async fetchCategoryAttributes(externalCategoryId: string): Promise<CategoryAttributeDef[]> {
    const resp = await this.client.request<{
      categoryAttributes?: Array<{
        attribute: { id: number; name: string };
        required?: boolean;
        allowCustom?: boolean;
        varianter?: boolean;
        slicer?: boolean;
        attributeValues?: Array<{ id: number; name: string }>;
      }>;
    }>(`/product/product-categories/${encodeURIComponent(externalCategoryId)}/attributes`);
    return (resp.categoryAttributes ?? []).map((a) => ({
      attributeId: String(a.attribute.id),
      name: a.attribute.name,
      required: !!a.required,
      allowCustom: !!a.allowCustom,
      varianter: !!a.varianter,
      slicer: !!a.slicer,
      values: (a.attributeValues ?? []).map((v) => ({ id: String(v.id), name: v.name })),
    }));
  }

  /** V2 ürün oluşturma: POST /product/sellers/{sellerId}/products */
  async createProducts(items: Array<Record<string, unknown>>): Promise<string> {
    const resp = await this.client.request<{ batchRequestId: string }>(
      `/product/sellers/${encodeURIComponent(this.supplierId)}/products`,
      { method: "POST", body: { items } },
    );
    if (!resp?.batchRequestId) {
      throw new MarketplaceError("Trendyol createProducts: batchRequestId dönmedi");
    }
    return resp.batchRequestId;
  }

  /** V2 ürün güncelleme (fiyat/stok hariç): PUT /product/sellers/{sellerId}/products */
  async updateProducts(items: Array<Record<string, unknown>>): Promise<string> {
    const resp = await this.client.request<{ batchRequestId: string }>(
      `/product/sellers/${encodeURIComponent(this.supplierId)}/products`,
      { method: "PUT", body: { items } },
    );
    if (!resp?.batchRequestId) {
      throw new MarketplaceError("Trendyol updateProducts: batchRequestId dönmedi");
    }
    return resp.batchRequestId;
  }

  /**
   * Fiyat + stok: POST /inventory/sellers/{sellerId}/products/price-and-inventory
   * Trendyol servis limitlerine göre bu endpoint'in rate limiti YOK.
   */
  async updateStockAndPrice(items: StockPricePushItem[]): Promise<string> {
    const resp = await this.client.request<{ batchRequestId: string }>(
      `/inventory/sellers/${encodeURIComponent(this.supplierId)}/products/price-and-inventory`,
      {
        method: "POST",
        body: {
          items: items.map((i) => ({
            barcode: i.barcode,
            quantity: Math.max(0, Math.floor(i.quantity)),
            salePrice: i.salePrice,
            listPrice: i.listPrice,
          })),
        },
      },
    );
    if (!resp?.batchRequestId) {
      throw new MarketplaceError("Trendyol price-and-inventory: batchRequestId dönmedi");
    }
    return resp.batchRequestId;
  }

  /** Batch sonucu: GET /product/sellers/{sellerId}/products/batch-requests/{id} */
  async getBatchResult(batchRequestId: string): Promise<BatchResult> {
    const resp = await this.client.request<{
      batchRequestId: string;
      status?: string;
      itemCount?: number;
      items?: Array<{
        requestItem?: { barcode?: string; product?: { barcode?: string } };
        status?: string;
        failureReasons?: string[];
      }>;
    }>(
      `/product/sellers/${encodeURIComponent(this.supplierId)}/products/batch-requests/${encodeURIComponent(batchRequestId)}`,
    );
    const items = resp.items ?? [];
    const failures = items
      .filter((i) => (i.status ?? "").toUpperCase() === "FAILED" || (i.failureReasons?.length ?? 0) > 0)
      .map((i) => ({
        key:
          i.requestItem?.barcode ??
          i.requestItem?.product?.barcode ??
          "?",
        reasons: i.failureReasons ?? ["Bilinmeyen hata"],
      }));
    // Trendyol status alanı bazen boş; item statülerinden türet.
    // DİKKAT: batch işlenmeye başlamadan items[] BOŞ döner (itemCount > 0
    // iken) — bu durumda kesinlikle IN_PROGRESS'tir; boş listeyi "başarı"
    // sayıp erken approved işaretlemeyelim (canlı testte yakalanan bug).
    const anyInProgress =
      (resp.status ?? "").toUpperCase() === "IN_PROGRESS" ||
      (items.length === 0 && (resp.itemCount ?? 0) > 0) ||
      items.some((i) => {
        const s = (i.status ?? "").toUpperCase();
        return s !== "SUCCESS" && s !== "FAILED" && s !== "";
      });
    return {
      batchRequestId: resp.batchRequestId ?? batchRequestId,
      status: anyInProgress ? "IN_PROGRESS" : "DONE",
      itemCount: resp.itemCount ?? items.length,
      failedCount: failures.length,
      failures,
    };
  }
}

function normalize(p: TrendyolProduct): NormalizedProduct {
  const externalId = String(p.contentId ?? p.barcode);
  const code = p.productMainId || p.productCode || p.stockCode || p.barcode;

  // Renk attribute'sini bul
  const colorAttr = (p.attributes ?? []).find(
    (a) => a.attributeName && /renk|color/i.test(a.attributeName),
  );
  const sizeAttr = (p.attributes ?? []).find(
    (a) => a.attributeName && /(beden|size)/i.test(a.attributeName),
  );

  const variant: NormalizedVariant = {
    externalVariantId: String(p.barcode),
    sku: p.stockCode ?? p.productCode ?? null,
    barcode: p.barcode,
    size: p.size ?? sizeAttr?.attributeValue ?? null,
    color: p.color
      ? { name: p.color, hex: null }
      : colorAttr?.attributeValue
        ? { name: colorAttr.attributeValue, hex: null }
        : null,
    price: Number(p.salePrice ?? 0),
    stock: Number(p.quantity ?? 0),
  };

  const isActive =
    (p.approved === undefined || p.approved === true) && !p.archived && !p.rejected;

  return {
    externalId,
    externalProductCode: code ?? null,
    // Trendyol Listings API'da leaf kategori ID'si `pimCategoryId` alanında
    // gelir; eski/bazı yanıtlarda `categoryId`. İkisi de yoksa string("undefined")
    // basmamak için boş bırakıyoruz; engine bu durumda ürünü skip edecek.
    externalCategoryId:
      p.pimCategoryId != null
        ? String(p.pimCategoryId)
        : p.categoryId != null
          ? String(p.categoryId)
          : "",
    externalCategoryName: p.categoryName ?? null,
    name: p.title,
    description: p.description ?? null,
    brand: p.brand ?? null,
    basePrice: Number(p.salePrice ?? 0),
    totalStock: Number(p.quantity ?? 0),
    images: (p.images ?? [])
      .filter((i) => i && i.url)
      .map((i, idx) => ({ url: i.url, order: idx })),
    variants: [variant],
    isActive,
  };
}

// === Registry kaydı (modül import edilince çalışır) ===
registerAdapter("trendyol", {
  displayName: "Trendyol",
  factory: (creds, cfg) => new TrendyolAdapter(creds as TrendyolCreds, cfg),
  credentialFields: [
    {
      key: "supplierId",
      label: "Supplier ID (Cari)",
      type: "text",
      required: true,
      helpText: "Trendyol satıcı paneliniz > Hesap > Entegrasyon Bilgileri",
    },
    { key: "apiKey", label: "API Key", type: "text", required: true },
    { key: "apiSecret", label: "API Secret", type: "password", required: true },
  ],
});

export { TrendyolAdapter };

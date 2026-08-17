/**
 * Pazaryerinden bağımsız adapter sözleşmesi.
 * Yeni bir pazaryeri (N11, Hepsiburada, Amazon) eklemek için yalnız bu interface'i
 * implement eden bir factory yazıp registry'ye kaydetmek yeterlidir.
 *
 * Tek yön: pazaryeri → site (read-only). Sipariş/push fonksiyonu yok.
 */

export type MarketplaceType = "trendyol" | "n11" | "hepsiburada" | "amazon";

/** Adapter constructor'ına geçilen, çözülmüş kredensiyeller + non-secret config. */
export interface MarketplaceCredentials {
  [key: string]: string | number | boolean | undefined;
}

export interface MarketplaceConfig {
  sandbox?: boolean;
  [key: string]: unknown;
}

/** Normalize edilmiş kategori — pazaryerinden bağımsız. */
export interface NormalizedCategory {
  externalId: string;
  name: string;
  parentExternalId?: string | null;
}

/** Normalize edilmiş ürün görseli. */
export interface NormalizedImage {
  url: string;
  /** Trendyol'dan gelen sıralama (0 = ana görsel). */
  order: number;
}

/** Normalize edilmiş varyant (beden, renk, fiyat, stok). */
export interface NormalizedVariant {
  externalVariantId?: string | null;
  size?: string | null;
  color?: { name: string; hex?: string | null } | null;
  price: number;
  stock: number;
  sku?: string | null;
  barcode?: string | null;
}

/** Normalize edilmiş ürün. Sync engine bunu okur, IStorage'a yazar. */
export interface NormalizedProduct {
  /** Pazaryerine has tekil id (Trendyol contentId / barcode). */
  externalId: string;
  /** Pazaryerindeki müşteri-görünür ürün kodu (slug deterministliği için kullanılır). */
  externalProductCode?: string | null;
  /** Pazaryeri kategorisi external id — registry sonra eşleştirir. */
  externalCategoryId: string;
  /** Pazaryeri kategorisinin görünür adı — ürün payload'ında varsa.
   *  Engine bunu alıp kategori ağacı çekmeden lazy upsert yapar. */
  externalCategoryName?: string | null;
  name: string;
  description?: string | null;
  brand?: string | null;
  basePrice: number;
  /** Toplam stok (varyantların toplamı veya tek stok). */
  totalStock: number;
  images: NormalizedImage[];
  variants: NormalizedVariant[];
  /** Pazaryerinden gelen ürün durumu — `false` ise site'da gizlenir. */
  isActive: boolean;
}

/** Bir tek ürünün stok+fiyat snapshot'ı (delta sync için). */
export interface NormalizedStockPrice {
  externalId: string;
  basePrice: number;
  totalStock: number;
  isActive: boolean;
  /** Varyant düzeyinde değişim varsa. */
  variants?: Array<{
    externalVariantId?: string | null;
    sku?: string | null;
    barcode?: string | null;
    price: number;
    stock: number;
  }>;
}

/** Sayfalama cursor — adapter'a opaque. */
export type PageCursor = string | number | null;

export interface ProductsPage {
  products: NormalizedProduct[];
  /** null ise sayfa biter. */
  nextCursor: PageCursor;
  /** Bilgi amaçlı — toplam kayıt sayısı (varsa). */
  total?: number;
}

/** Bağlantı testi sonucu. */
export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Pazaryeri adapter sözleşmesi — minimum okuma yüzeyi.
 * Breaking change: ekleme yapmadan önce iki kere düşün.
 */
export interface MarketplaceAdapter {
  /** Saf bilgi — log/telemetri için. */
  readonly type: MarketplaceType;

  /** Kredensiyellerin geçerli olup olmadığını doğrular. */
  testConnection(): Promise<ConnectionTestResult>;

  /** Tüm kategori ağacını döndürür (genelde küçük). */
  fetchCategoryTree(): Promise<NormalizedCategory[]>;

  /** Onaylı ürünleri sayfa sayfa çeker. */
  fetchProductsPage(cursor: PageCursor): Promise<ProductsPage>;

  /**
   * Bir grup ürünün güncel stok+fiyatını döner (delta için).
   * externalId listesi ile çağrılır. Boş döndürülmüşler için sync motoru
   * detayını korur.
   */
  fetchStockAndPrice(externalIds: string[]): Promise<NormalizedStockPrice[]>;

  /**
   * Tek bir ürünün tam detayını çeker (tekrar senkronlama / rakip pazaryerleri
   * için). Bulunamazsa null döner. Engine: full sync hash atlamasının kırıldığı
   * veya elle "şu ürünü tazele" istendiği durumlarda kullanır.
   */
  fetchProductDetails(externalId: string): Promise<NormalizedProduct | null>;
}

// ============================================================================
// YAZMA (PUSH) YÜZEYİ — site → pazaryeri. Opsiyonel: adapter implement etmezse
// push motoru o pazaryerini atlar.
// ============================================================================

/** Marka arama sonucu (ürün gönderiminde zorunlu brandId için). */
export interface BrandOption {
  id: string;
  name: string;
}

/** Kategoriye özel özellik tanımı (Trendyol category-attributes). */
export interface CategoryAttributeDef {
  attributeId: string;
  name: string;
  required: boolean;
  allowCustom: boolean;
  /** Varyant belirleyici mi (ör. renk)? */
  varianter: boolean;
  /** Slicer (ör. beden) mi? */
  slicer: boolean;
  values: Array<{ id: string; name: string }>;
}

/** Stok+fiyat push item'ı — barcode pazaryerindeki tekil anahtar. */
export interface StockPricePushItem {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
}

/** Batch sonucu — pazaryeri asenkron işler, batchRequestId ile poll edilir. */
export interface BatchResult {
  batchRequestId: string;
  /** 'IN_PROGRESS' | 'DONE' (normalize edilmiş) */
  status: "IN_PROGRESS" | "DONE";
  itemCount: number;
  failedCount: number;
  /** Başarısız item'lar için insan-okur hata mesajları. */
  failures: Array<{ key: string; reasons: string[] }>;
}

/**
 * Yazma yeteneği olan adapter'ların ek sözleşmesi.
 * Tüm toplu işlemler batchRequestId döndürür; sonuç getBatchResult ile poll edilir.
 */
export interface MarketplaceWriteAdapter {
  searchBrands(query: string): Promise<BrandOption[]>;
  fetchCategoryAttributes(externalCategoryId: string): Promise<CategoryAttributeDef[]>;
  /** V2 ürün oluşturma. Ham item payload'ları adapter-spesifik şemadadır. */
  createProducts(items: Array<Record<string, unknown>>): Promise<string>;
  /** V2 ürün güncelleme (fiyat/stok HARİÇ). */
  updateProducts(items: Array<Record<string, unknown>>): Promise<string>;
  /** Fiyat + stok güncelleme. */
  updateStockAndPrice(items: StockPricePushItem[]): Promise<string>;
  getBatchResult(batchRequestId: string): Promise<BatchResult>;
}

// ============================================================================
// SİPARİŞ (ORDER) YÜZEYİ — pazaryeri → site stok düşümü. Opsiyonel: adapter
// implement etmezse order motoru o pazaryerini atlar.
// ============================================================================

/** Normalize edilmiş sipariş satırı. */
export interface NormalizedOrderLine {
  /** Pazaryeri satır id'si (idempotency anahtarının parçası). */
  lineId: string;
  barcode: string | null;
  quantity: number;
  /** Pazaryeri satır durumu (Created/Picking/Shipped/Cancelled/Returned/UnSupplied...). */
  status: string;
  /** Birim fiyat (pazaryeri para birimi, TL). Bilinmiyorsa null. */
  unitPrice: number | null;
  /** Pazaryerindeki ürün adı. */
  productTitle: string | null;
}

/** Normalize edilmiş sipariş (paket). */
export interface NormalizedOrder {
  /** Pazaryeri sipariş numarası (idempotency anahtarının parçası). */
  orderNumber: string;
  /** Pazaryeri paket id'si (statü güncelleme / fatura gönderimi için gerekli). */
  externalPackageId?: string | null;
  /** Sipariş/paket durumu. */
  status: string;
  orderedAt: Date | null;
  /** Müşteri adı (ad soyad). */
  customerName: string | null;
  /** Kargo firması. */
  cargoProvider: string | null;
  /** Kargo takip numarası. */
  cargoTracking: string | null;
  lines: NormalizedOrderLine[];
}

export interface OrdersPage {
  orders: NormalizedOrder[];
  /** null ise sayfa biter. */
  nextCursor: PageCursor;
  total?: number;
}

/** Sipariş çekme yeteneği olan adapter'ların ek sözleşmesi. */
export interface MarketplaceOrderAdapter {
  /**
   * Verilen zaman aralığındaki siparişleri sayfa sayfa döner.
   * startDate/endDate: epoch ms.
   */
  fetchOrdersPage(startDate: number, endDate: number, cursor: PageCursor): Promise<OrdersPage>;
}

// ============================================================================
// SORU-CEVAP (Q&A) YÜZEYİ — opsiyonel.
// ============================================================================

export interface NormalizedQuestion {
  id: string;
  status: string; // WAITING_FOR_ANSWER | ANSWERED | REPORTED | REJECTED | WAITING_FOR_APPROVE
  text: string;
  customerName: string | null;
  productName: string | null;
  productImageUrl: string | null;
  productWebUrl: string | null;
  askedAt: Date | null;
  answeredAt: Date | null;
  answerText: string | null;
  /** Cevap için kalan süre bilgisi varsa (saat). */
  showCustomerName?: boolean;
}

export interface QuestionsPage {
  questions: NormalizedQuestion[];
  nextCursor: PageCursor;
  total?: number;
}

export interface MarketplaceQnAAdapter {
  /** startDate/endDate epoch ms; status opsiyonel filtre. */
  fetchQuestionsPage(params: {
    startDate?: number;
    endDate?: number;
    status?: string;
    cursor?: PageCursor;
  }): Promise<QuestionsPage>;
  answerQuestion(questionId: string, text: string): Promise<void>;
}

export function supportsQnA(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceQnAAdapter {
  const a = adapter as Partial<MarketplaceQnAAdapter>;
  return (
    typeof a.fetchQuestionsPage === "function" && typeof a.answerQuestion === "function"
  );
}

// ============================================================================
// İADE (CLAIMS) YÜZEYİ — opsiyonel.
// ============================================================================

export interface NormalizedClaimItem {
  /** claimItem id — onay/red işlemlerinde kullanılır. */
  id: string;
  orderLineId: string | null;
  barcode: string | null;
  productName: string | null;
  productImageUrl: string | null;
  quantity: number;
  status: string; // Created / WaitingInAction / Accepted / Rejected / ...
  customerReason: string | null;
  customerNote: string | null;
}

export interface NormalizedClaim {
  id: string;
  orderNumber: string;
  claimDate: Date | null;
  orderDate: Date | null;
  customerName: string | null;
  cargoProvider: string | null;
  cargoTracking: string | null;
  /** İade paketinin bağlı olduğu orijinal paket id. */
  orderShipmentPackageId: string | null;
  items: NormalizedClaimItem[];
}

export interface ClaimsPage {
  claims: NormalizedClaim[];
  nextCursor: PageCursor;
  total?: number;
}

export interface ClaimIssueReason {
  id: string;
  name: string;
}

export interface MarketplaceClaimsAdapter {
  fetchClaimsPage(params: {
    startDate?: number;
    endDate?: number;
    claimItemStatus?: string;
    cursor?: PageCursor;
  }): Promise<ClaimsPage>;
  /** İade kalemlerini onayla (para iadesi süreci başlar). */
  approveClaimItems(claimId: string, claimLineItemIds: string[]): Promise<void>;
  fetchClaimIssueReasons(): Promise<ClaimIssueReason[]>;
}

export function supportsClaims(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceClaimsAdapter {
  const a = adapter as Partial<MarketplaceClaimsAdapter>;
  return (
    typeof a.fetchClaimsPage === "function" && typeof a.approveClaimItems === "function"
  );
}

// ============================================================================
// SİPARİŞ YAZMA (FULFILLMENT) YÜZEYİ — opsiyonel. Paket statüsü + fatura linki.
// ============================================================================

export interface MarketplaceFulfillmentAdapter {
  /**
   * Paket statüsünü güncelle. Trendyol: 'Picking' (hazırlanıyor) veya
   * 'Invoiced' (faturalandı). lines: pakete dahil satırlar (lineId + adet).
   */
  updatePackageStatus(
    packageId: string,
    status: "Picking" | "Invoiced",
    lines: Array<{ lineId: number; quantity: number }>,
    invoiceNumber?: string,
  ): Promise<void>;
  /** Müşteriye e-fatura linki gönder. */
  sendInvoiceLink(params: {
    packageId: string;
    invoiceLink: string;
    invoiceNumber?: string;
    invoiceDateTime?: number;
  }): Promise<void>;
}

export function supportsFulfillment(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceFulfillmentAdapter {
  const a = adapter as Partial<MarketplaceFulfillmentAdapter>;
  return (
    typeof a.updatePackageStatus === "function" && typeof a.sendInvoiceLink === "function"
  );
}

// ============================================================================
// HIZLI ENVANTER SORGUSU — opsiyonel. Barkodla direkt stok/fiyat lookup
// (sayfa taraması yerine). Sağlık kontrolü / uyuşmazlık tespiti kullanır.
// ============================================================================

export interface InventorySnapshotItem {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number | null;
  onSale: boolean;
}

export interface MarketplaceInventoryLookupAdapter {
  /** Barkod listesiyle (max ~50/istek, adapter böler) güncel stok/fiyat döner. */
  fetchInventoryByBarcodes(barcodes: string[]): Promise<InventorySnapshotItem[]>;
}

export function supportsInventoryLookup(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceInventoryLookupAdapter {
  return (
    typeof (adapter as Partial<MarketplaceInventoryLookupAdapter>).fetchInventoryByBarcodes ===
    "function"
  );
}

/** Type guard: adapter sipariş çekmeyi destekliyor mu? */
export function supportsOrders(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceOrderAdapter {
  return typeof (adapter as Partial<MarketplaceOrderAdapter>).fetchOrdersPage === "function";
}

/** Type guard: adapter yazma yüzeyini destekliyor mu? */
export function supportsWrites(
  adapter: MarketplaceAdapter,
): adapter is MarketplaceAdapter & MarketplaceWriteAdapter {
  const a = adapter as Partial<MarketplaceWriteAdapter>;
  return (
    typeof a.updateStockAndPrice === "function" &&
    typeof a.createProducts === "function" &&
    typeof a.getBatchResult === "function"
  );
}

/**
 * Adapter factory — registry tarafından çağrılır, her marketplace satırı için
 * ayrı instance üretir.
 */
export type MarketplaceAdapterFactory = (
  credentials: MarketplaceCredentials,
  config: MarketplaceConfig,
) => MarketplaceAdapter;

/** Adapter düzeyinde fırlatılan ortak hata. */
export class MarketplaceError extends Error {
  readonly statusCode?: number;
  readonly retryable: boolean;
  /** Sunucu Retry-After header'ı verdiyse, milisaniye cinsinden bekleme önerisi. */
  readonly retryAfterMs?: number | null;
  constructor(
    message: string,
    opts: { statusCode?: number; retryable?: boolean; retryAfterMs?: number | null } = {},
  ) {
    super(message);
    this.name = "MarketplaceError";
    this.statusCode = opts.statusCode;
    this.retryable = opts.retryable ?? false;
    this.retryAfterMs = opts.retryAfterMs ?? null;
  }
}

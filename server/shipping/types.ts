/**
 * Sağlayıcıdan bağımsız kargo entegrasyon katmanı.
 *
 * Her kargo sağlayıcısı (Aras, Geliver, ShipEntegra) bu arayüzü uygular.
 * Sipariş ekranı ve rotalar yalnızca bu arayüzü tanır; sağlayıcıya özel
 * SOAP/REST detayları ilgili adaptör dosyasında kalır.
 */

export type ShippingProviderId = 'aras' | 'geliver' | 'shipentegra';

export interface ShipmentRecipient {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  countryCode: string; // ISO-3166-1 alpha-2, örn. TR
}

export interface ShipmentItem {
  title: string;
  quantity: number;
  unitPrice?: string;
  sku?: string;
}

export interface CreateShipmentInput {
  orderNumber: string;
  recipient: ShipmentRecipient;
  items: ShipmentItem[];
  desi: string;
  weightKg?: string;
  totalAmount?: string;
  currency?: string;
  isWorldwide: boolean;
}

/** Sipariş üzerinde saklanan, sağlayıcıya tekrar erişmek için gereken referanslar. */
export interface ShipmentRef {
  orderNumber: string;
  shipmentId?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
}

export interface CreateShipmentResult {
  success: boolean;
  /** Kargo firması takip numarası (varsa hemen döner). */
  trackingNumber?: string;
  trackingUrl?: string;
  /** Sağlayıcı tarafındaki gönderi kimliği (etiket/iptal için gerekir). */
  shipmentId?: string;
  labelUrl?: string;
  /** Siparişe yazılacak kargo firması adı. */
  carrierName?: string;
  /** Kayıt oluştu ama takip numarası henüz yok (ör. Aras şube irsaliyesi bekleniyor). */
  pending?: boolean;
  message?: string;
  error?: string;
}

export interface TrackShipmentResult {
  success: boolean;
  found?: boolean;
  trackingNumber?: string;
  trackingUrl?: string;
  /** Sağlayıcının ham durum kodu. */
  statusCode?: string;
  /** Kullanıcıya gösterilecek Türkçe durum metni. */
  statusText?: string;
  delivered?: boolean;
  labelUrl?: string;
  message?: string;
  error?: string;
}

export interface LabelResult {
  success: boolean;
  /** Etiket doğrudan bir URL ise (PDF/PNG). */
  url?: string;
  /** Etiket uygulama içinde üretiliyorsa yönlendirilecek yol (Aras HTML etiketi). */
  redirectPath?: string;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CancelShipmentResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ProviderStatus {
  id: ShippingProviderId;
  label: string;
  enabled: boolean;
  configured: boolean;
  /** Eksik ayar varsa kullanıcıya gösterilecek Türkçe açıklama. */
  missing?: string;
}

export interface CargoProvider {
  readonly id: ShippingProviderId;
  readonly label: string;
  /** Etiket doğrudan URL olarak mı geliyor, yoksa uygulama mı üretiyor. */
  readonly supportsLabel: boolean;
  readonly supportsCancel: boolean;

  status(): Promise<ProviderStatus>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  track(ref: ShipmentRef): Promise<TrackShipmentResult>;
  getLabel(ref: ShipmentRef): Promise<LabelResult>;
  testConnection(): Promise<TestConnectionResult>;
  cancelShipment(ref: ShipmentRef, reason?: string): Promise<CancelShipmentResult>;
}

/** Ağ/parse hatalarını her sağlayıcıda aynı Türkçe biçimde döndürür. */
export function providerError(providerLabel: string, error: any): string {
  const raw = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    ? 'İstek zaman aşımına uğradı'
    : (error?.message || String(error));
  return `${providerLabel} bağlantı hatası: ${raw}`;
}

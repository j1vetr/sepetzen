/**
 * Kargo sağlayıcı kayıt defteri.
 *
 * Aktif sağlayıcı site ayarlarındaki `shipping_provider` anahtarıyla seçilir.
 * Ayar yoksa geriye dönük uyumluluk için Aras Kargo kullanılır.
 */
import { storage } from '../storage';
import { arasProvider } from './aras';
import { geliverProvider } from './geliver';
import { shipentegraProvider } from './shipentegra';
import type { CargoProvider, ProviderStatus, ShippingProviderId } from './types';

export * from './types';
export { arasTrackingUrl, ARAS_CARRIER_NAME } from './aras';

const PROVIDERS: Record<ShippingProviderId, CargoProvider> = {
  aras: arasProvider,
  geliver: geliverProvider,
  shipentegra: shipentegraProvider,
};

export const PROVIDER_IDS: ShippingProviderId[] = ['aras', 'geliver', 'shipentegra'];

export function isProviderId(value: string): value is ShippingProviderId {
  return (PROVIDER_IDS as string[]).includes(value);
}

export function getProvider(id: ShippingProviderId): CargoProvider {
  return PROVIDERS[id];
}

export async function getActiveProviderId(): Promise<ShippingProviderId> {
  const settings = await storage.getSiteSettings();
  const configured = settings.shipping_provider || '';
  return isProviderId(configured) ? configured : 'aras';
}

export async function getActiveProvider(): Promise<CargoProvider> {
  return getProvider(await getActiveProviderId());
}

/**
 * Tüm sağlayıcıların durumu + aktif sağlayıcının durum nesnesi.
 * `active` bilinçli olarak ID değil durum nesnesidir; admin arayüzü sağlayıcı
 * adını ve eksik ayar uyarısını doğrudan bu nesneden okur.
 */
export async function getProviderStatuses(): Promise<{
  activeId: ShippingProviderId;
  active: ProviderStatus;
  providers: ProviderStatus[];
}> {
  const activeId = await getActiveProviderId();
  const providers = await Promise.all(PROVIDER_IDS.map(id => PROVIDERS[id].status()));
  const active = providers.find(p => p.id === activeId) || providers[0];
  return { activeId, active, providers };
}

/**
 * Siparişte kayıtlı sağlayıcıyı döndürür. Gönderi başka bir sağlayıcı ile
 * oluşturulmuşsa (ör. ayar sonradan değiştiyse) o sağlayıcı kullanılmalıdır.
 */
export async function getProviderForOrder(order: { shipmentProvider?: string | null }): Promise<CargoProvider> {
  const stored = order.shipmentProvider || '';
  if (isProviderId(stored)) return PROVIDERS[stored];
  return getActiveProvider();
}

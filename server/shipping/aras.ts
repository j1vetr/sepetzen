/**
 * Aras Kargo adaptörü.
 *
 * Mevcut SOAP servisini (server/arasKargoService.ts) sağlayıcı arayüzüne sarar.
 * Davranış birebir korunur: SetOrder ile kayıt açılır, takip numarası şube
 * irsaliyesi oluştuktan sonra GetOrderWithIntegrationCode ile çekilir,
 * etiket uygulama içinde HTML olarak üretilir.
 */
import {
  createShipment as arasCreateShipment,
  queryShipmentByIntegrationCode,
  getCargoStatus,
  getLabelData,
  cancelShipment as arasCancelShipment,
  getArasCredentials,
} from '../arasKargoService';
import type {
  CargoProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  LabelResult,
  ProviderStatus,
  ShipmentRef,
  TestConnectionResult,
  TrackShipmentResult,
  CancelShipmentResult,
} from './types';

export const ARAS_CARRIER_NAME = 'Aras Kargo';

export function arasTrackingUrl(trackingNumber: string): string {
  return `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(trackingNumber)}`;
}

/** Aras barkodu sipariş numarasından türetilir (SetOrder ile aynı kural). */
function barcodeFor(orderNumber: string): string {
  return orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
}

export const arasProvider: CargoProvider = {
  id: 'aras',
  label: ARAS_CARRIER_NAME,
  supportsLabel: true,
  supportsCancel: true,

  async status(): Promise<ProviderStatus> {
    const creds = await getArasCredentials();
    const missing: string[] = [];
    if (!creds.username) missing.push('kullanıcı adı');
    if (!creds.password) missing.push('şifre');
    return {
      id: 'aras',
      label: ARAS_CARRIER_NAME,
      enabled: creds.enabled,
      configured: missing.length === 0,
      missing: missing.length ? `Eksik ayar: ${missing.join(', ')}` : undefined,
    };
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const result = await arasCreateShipment({
      orderNumber: input.orderNumber,
      customerName: input.recipient.name,
      customerPhone: input.recipient.phone,
      address: input.recipient.address,
      city: input.recipient.city,
      district: input.recipient.district,
      isWorldwide: input.isWorldwide,
    });

    if (!result.success) {
      return { success: false, error: result.error || result.resultMessage || 'Aras Kargo kaydı oluşturulamadı.' };
    }

    return {
      success: true,
      shipmentId: result.integrationCode,
      carrierName: ARAS_CARRIER_NAME,
      pending: true,
      message:
        'Aras Kargo sistemine kayıt gönderildi. Şube irsaliyeyi oluşturduktan sonra "Takip Durumu" ile takip numarası çekilebilir.',
    };
  },

  async track(ref: ShipmentRef): Promise<TrackShipmentResult> {
    const integrationCode = ref.shipmentId || ref.orderNumber;
    const query = await queryShipmentByIntegrationCode(integrationCode);

    if (!query.success) {
      return { success: false, error: query.error || 'Aras Kargo durumu sorgulanamadı.' };
    }
    if (!query.found || !query.trackingNumber) {
      return { success: true, found: false, error: query.error };
    }

    // Takip numarası bulunduysa gerçek kargo durumunu da çekmeyi dene (opsiyonel).
    let statusText: string | undefined;
    let delivered = false;
    try {
      const cargo = await getCargoStatus(integrationCode);
      if (cargo.success && cargo.found && cargo.status) {
        statusText = cargo.status;
        delivered = ['teslim', 'delivered'].some(k => cargo.status!.toLowerCase().includes(k));
      }
    } catch {
      // Durum sorgusu opsiyonel; takip numarası yine de döner.
    }

    return {
      success: true,
      found: true,
      trackingNumber: query.trackingNumber,
      trackingUrl: arasTrackingUrl(query.trackingNumber),
      statusText,
      delivered,
    };
  },

  async getLabel(ref: ShipmentRef): Promise<LabelResult> {
    // Aras etiketi uygulama içinde HTML olarak üretiliyor; mevcut rota kullanılır.
    const data = await getLabelData(ref.shipmentId || ref.orderNumber);
    if (!data.success) {
      return { success: false, error: data.error || 'Aras Kargo etiketi alınamadı.' };
    }
    return { success: true };
  },

  async testConnection(): Promise<TestConnectionResult> {
    const creds = await getArasCredentials();
    if (!creds.username || !creds.password) {
      return { success: false, error: 'Aras Kargo kullanıcı adı ve şifresi girilmemiş.' };
    }
    const { getAddressList } = await import('../arasKargoService');
    const result = await getAddressList();
    if (result.success) {
      return { success: true, message: `Bağlantı başarılı. ${result.addresses?.length || 0} gönderici adresi bulundu.` };
    }
    return { success: false, error: result.error || 'Aras Kargo bağlantısı doğrulanamadı.' };
  },

  async cancelShipment(ref: ShipmentRef, reason?: string): Promise<CancelShipmentResult> {
    const result = await arasCancelShipment(barcodeFor(ref.orderNumber), reason);
    if (result.success) {
      return { success: true, message: `Aras Kargo gönderisi iptal edildi. (OperationCode: ${result.operationCode || '-'})` };
    }
    return { success: false, error: result.error || 'Aras Kargo gönderisi iptal edilemedi.' };
  },
};

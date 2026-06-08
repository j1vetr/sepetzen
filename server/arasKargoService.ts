import { storage } from './storage';

const SETORDER_URL_DEFAULT = 'https://customerws.araskargo.com.tr/arascargoservice.asmx';
const QUERY_URL_DEFAULT = 'https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc';

export interface ArasCredentials {
  username: string;
  password: string;
  customerCode: string;
  setorderUrl: string;
  queryUrl: string;
  senderAddressId: string;
  defaultDesi: string;
  enabled: boolean;
}

export async function getArasCredentials(): Promise<ArasCredentials> {
  const settings = await storage.getSiteSettings();
  return {
    username: settings.aras_kargo_username || '',
    password: settings.aras_kargo_password || '',
    customerCode: settings.aras_kargo_customer_code || '',
    setorderUrl: settings.aras_kargo_setorder_url || SETORDER_URL_DEFAULT,
    queryUrl: settings.aras_kargo_query_url || QUERY_URL_DEFAULT,
    senderAddressId: settings.aras_kargo_sender_address_id || '',
    defaultDesi: settings.aras_kargo_default_desi || '1',
    enabled: settings.aras_kargo_enabled === 'true',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 11) return digits.slice(1);
  return digits;
}

function toUpperTurkish(str: string): string {
  return str
    .replace(/ı/g, 'I')
    .replace(/i/g, 'İ')
    .replace(/ş/g, 'Ş')
    .replace(/ğ/g, 'Ğ')
    .replace(/ü/g, 'Ü')
    .replace(/ö/g, 'Ö')
    .replace(/ç/g, 'Ç')
    .toUpperCase();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extract the text content of the FIRST matching XML tag.
 */
function parseXmlText(xml: string, tagName: string): string {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([^<]*)<\\/(?:\\w+:)?${tagName}>`, 'i'));
  return m ? m[1].trim() : '';
}

/**
 * Extract all text values from an array XML field (ArrayOfString → <string> elements).
 * Only returns leaf-text nodes (no nested tags).
 */
function parseStringArray(xml: string, parentTag: string): string[] {
  const parentRe = new RegExp(`<(?:\\w+:)?${parentTag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${parentTag}>`, 'gi');
  const results: string[] = [];
  let parentMatch;
  while ((parentMatch = parentRe.exec(xml)) !== null) {
    const inner = parentMatch[1];
    const stringRe = /<(?:\w+:)?string[^>]*>([^<]*)<\/(?:\w+:)?string>/gi;
    let sm;
    while ((sm = stringRe.exec(inner)) !== null) {
      const val = sm[1].trim();
      if (val) results.push(val);
    }
  }
  return results;
}

/**
 * Extract base64 binary values from ArrayOfBase64Binary → <base64Binary> elements.
 */
function parseBase64BinaryArray(xml: string, parentTag: string): string[] {
  const parentRe = new RegExp(`<(?:\\w+:)?${parentTag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${parentTag}>`, 'gi');
  const results: string[] = [];
  let parentMatch;
  while ((parentMatch = parentRe.exec(xml)) !== null) {
    const inner = parentMatch[1];
    const binRe = /<(?:\w+:)?base64Binary[^>]*>([^<]+)<\/(?:\w+:)?base64Binary>/gi;
    let bm;
    while ((bm = binRe.exec(inner)) !== null) {
      const val = bm[1].trim();
      if (val) results.push(val);
    }
    // Also try bare base64Binary at root level (some SOAP impls omit wrapper)
    if (results.length === 0) {
      const bareRe = /^([A-Za-z0-9+/\r\n]+=*)$/m;
      const val = inner.replace(/<[^>]+>/g, '').trim();
      if (val && bareRe.test(val)) results.push(val);
    }
  }
  return results;
}

// ── SetOrder ───────────────────────────────────────────────────────────────

export interface SetOrderResult {
  success: boolean;
  resultCode?: number;
  resultMessage?: string;
  integrationCode?: string;
  barcodeNumber?: string;
  error?: string;
}

export async function createShipment(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  district: string;
  isWorldwide?: boolean;
}): Promise<SetOrderResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik. Ayarlar > Aras Kargo bölümünden giriniz.' };
  }

  const phone = normalizePhone(params.customerPhone);
  const cityName = toUpperTurkish(params.city);
  const districtName = toUpperTurkish(params.district);
  const tradingWaybillNumber = params.orderNumber.slice(0, 16);
  const integrationCode = params.orderNumber.slice(0, 32);
  // BarcodeNumber: alphanumeric only, max 64 chars
  const barcodeNumber = params.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 32) || integrationCode.slice(0, 32);
  const desi = creds.defaultDesi;
  const fullAddress = params.address.slice(0, 250);

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <orderInfo>
        <Order>
          <UserName>${escapeXml(creds.username)}</UserName>
          <Password>${escapeXml(creds.password)}</Password>
          <TradingWaybillNumber>${escapeXml(tradingWaybillNumber)}</TradingWaybillNumber>
          <InvoiceNumber>${escapeXml(params.orderNumber.slice(0, 20))}</InvoiceNumber>
          <IntegrationCode>${escapeXml(integrationCode)}</IntegrationCode>
          <ReceiverName>${escapeXml(params.customerName)}</ReceiverName>
          <ReceiverAddress>${escapeXml(fullAddress)}</ReceiverAddress>
          <ReceiverPhone1>${escapeXml(phone)}</ReceiverPhone1>
          <ReceiverCityName>${escapeXml(cityName)}</ReceiverCityName>
          <ReceiverTownName>${escapeXml(districtName)}</ReceiverTownName>
          <VolumetricWeight>${escapeXml(desi)}</VolumetricWeight>
          <PieceCount>1</PieceCount>
          <PayorTypeCode>1</PayorTypeCode>
          <IsWorldWide>${params.isWorldwide ? '1' : '0'}</IsWorldWide>
          <PieceDetails>
            <PieceDetail>
              <VolumetricWeight>${escapeXml(desi)}</VolumetricWeight>
              <Weight>${escapeXml(desi)}</Weight>
              <BarcodeNumber>${escapeXml(barcodeNumber)}</BarcodeNumber>
              <ProductNumber></ProductNumber>
              <Description>Polen Stone Siparis</Description>
            </PieceDetail>
          </PieceDetails>
          <SenderAccountAddressId>${escapeXml(creds.senderAddressId)}</SenderAccountAddressId>
        </Order>
      </orderInfo>
      <userName>${escapeXml(creds.username)}</userName>
      <password>${escapeXml(creds.password)}</password>
    </SetOrder>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/SetOrder"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(30000),
    });

    const text = await response.text();
    console.log('[ArasKargo] SetOrder response:', text.slice(0, 600));

    // SetOrder returns ArrayOfOrderResultInfo → each has ResultCode + ResultMessage
    const resultCodeMatch = text.match(/<(?:\w+:)?ResultCode[^>]*>(\d+)<\/(?:\w+:)?ResultCode>/i);
    const resultMessageMatch = text.match(/<(?:\w+:)?ResultMessage[^>]*>([^<]*)<\/(?:\w+:)?ResultMessage>/i);

    const resultCode = resultCodeMatch ? parseInt(resultCodeMatch[1]) : -999;
    const resultMessage = resultMessageMatch ? resultMessageMatch[1].trim() : '';

    if (resultCode === 0) {
      return { success: true, resultCode, resultMessage: resultMessage || 'Kayıt başarıyla oluşturuldu', integrationCode, barcodeNumber };
    }

    if (resultCode === -999) {
      // Could not parse resultCode — check for common error patterns
      if (text.includes('401') || text.includes('Unauthorized')) {
        return { success: false, error: 'Kimlik doğrulama hatası. Kullanıcı adı/şifre kontrol edin.' };
      }
      // No result code at all might mean XML parse error on Aras side
      return { success: false, error: `Beklenmeyen yanıt: ${text.slice(0, 200)}` };
    }

    return { success: false, resultCode, resultMessage: resultMessage || `Hata kodu: ${resultCode}` };
  } catch (error: any) {
    console.error('[ArasKargo] SetOrder error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

// ── GetOrderWithIntegrationCode ───────────────────────────────────────────
// Returns ArrayOfOrder — the Order type has TradingWaybillNumber (= Aras tracking no)
// and PieceDetails[].BarcodeNumber.

export interface QueryShipmentResult {
  success: boolean;
  found?: boolean;
  trackingNumber?: string;   // TradingWaybillNumber assigned by Aras
  barcodeNumber?: string;    // PieceDetail.BarcodeNumber (for label)
  integrationCode?: string;
  unitId?: string;           // UnitID (receiving branch)
  error?: string;
}

export async function queryShipmentByIntegrationCode(integrationCode: string): Promise<QueryShipmentResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik.' };
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetOrderWithIntegrationCode xmlns="http://tempuri.org/">
      <userName>${escapeXml(creds.username)}</userName>
      <password>${escapeXml(creds.password)}</password>
      <integrationCode>${escapeXml(integrationCode.slice(0, 32))}</integrationCode>
    </GetOrderWithIntegrationCode>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/GetOrderWithIntegrationCode"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(30000),
    });

    const text = await response.text();
    console.log('[ArasKargo] QueryShipment response:', text.slice(0, 1000));

    // Check for a top-level fault / error
    if (text.includes('<faultcode>') || text.includes('<Fault>')) {
      const faultMsg = parseXmlText(text, 'faultstring') || parseXmlText(text, 'Reason');
      return { success: false, found: false, error: faultMsg || 'SOAP hatası alındı' };
    }

    // Response is GetOrderWithIntegrationCodeResult → ArrayOfOrder → Order[]
    // Extract the first <Order> block
    const orderBlockRe = /<(?:\w+:)?Order[^>]*>([\s\S]*?)<\/(?:\w+:)?Order>/i;
    const orderMatch = text.match(orderBlockRe);

    if (!orderMatch) {
      return {
        success: true,
        found: false,
        error: 'Kayıt bulunamadı. Sipariş henüz Aras sistemine işlenmemiş olabilir.',
      };
    }

    const orderBlock = orderMatch[1];

    // TradingWaybillNumber is the key field — Aras populates this with their internal tracking no
    const tradingWaybillNumber = parseXmlText(orderBlock, 'TradingWaybillNumber');
    const foundIntegrationCode = parseXmlText(orderBlock, 'IntegrationCode');
    const unitId = parseXmlText(orderBlock, 'UnitID');

    // Barcode from first PieceDetail
    const pieceDetailMatch = orderBlock.match(/<(?:\w+:)?PieceDetail[^>]*>([\s\S]*?)<\/(?:\w+:)?PieceDetail>/i);
    const barcodeNumber = pieceDetailMatch ? parseXmlText(pieceDetailMatch[1], 'BarcodeNumber') : '';

    // Aras considers order "found" if there's data and TradingWaybillNumber is populated
    const trackingNumber = tradingWaybillNumber || barcodeNumber;

    if (!trackingNumber) {
      return {
        success: true,
        found: false,
        error: 'Sipariş Aras sisteminde bulundu ancak henüz irsaliye/barkod oluşturulmadı. Kargo şubeye fiziksel teslimden sonra tekrar sorgulayın.',
      };
    }

    return {
      success: true,
      found: true,
      trackingNumber,
      barcodeNumber: barcodeNumber || undefined,
      integrationCode: foundIntegrationCode || undefined,
      unitId: unitId || undefined,
    };
  } catch (error: any) {
    console.error('[ArasKargo] QueryShipment error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

// ── GetLabelDummy ─────────────────────────────────────────────────────────
// Returns DummyBarcodeResponse: Images (ArrayOfBase64Binary), ZebraPdf (ArrayOfString),
// ZebraZpl (ArrayOfString), ZebraEpl (ArrayOfString), BarcodeModelLst, TrackingNumber

export interface BarcodeModel {
  SenderAccountName?: string;
  SenderAddress?: string;
  SenderAddress2?: string;
  ReceiverAccountName?: string;
  ReceiverAddress?: string;
  ReceiverAddress2?: string;
  ReceiverAddress3?: string;
  ReceiverPhone?: string;
  ReceiverTown?: string;
  ReceiverCity?: string;
  DeliveryUnitName?: string;
  InvoiceNumber?: string;
  IntegrationCode?: string;
  BarcodeNumber?: string;
  BarcodeDate?: string;
}

export interface LabelDataResult {
  success: boolean;
  images?: string[];         // base64 PNG from ArrayOfBase64Binary
  zebraPdf?: string[];       // base64 PDF strings from ArrayOfString
  zebraZpl?: string[];       // ZPL strings for thermal printers
  barcodeModels?: BarcodeModel[];
  trackingNumber?: string;
  message?: string;
  error?: string;
}

function parseBarcodeModels(xml: string): BarcodeModel[] {
  const models: BarcodeModel[] = [];
  const blockRe = /<(?:\w+:)?BarcodeModel[^>]*>([\s\S]*?)<\/(?:\w+:)?BarcodeModel>/gi;
  let block;
  while ((block = blockRe.exec(xml)) !== null) {
    const b = block[1];
    models.push({
      SenderAccountName: parseXmlText(b, 'SenderAccountName'),
      SenderAddress: parseXmlText(b, 'SenderAddress'),
      SenderAddress2: parseXmlText(b, 'SenderAddress2'),
      ReceiverAccountName: parseXmlText(b, 'ReceiverAccountName'),
      ReceiverAddress: parseXmlText(b, 'ReceiverAddress'),
      ReceiverAddress2: parseXmlText(b, 'ReceiverAddress2'),
      ReceiverAddress3: parseXmlText(b, 'ReceiverAddress3'),
      ReceiverPhone: parseXmlText(b, 'ReceiverPhone'),
      ReceiverTown: parseXmlText(b, 'ReceiverTown'),
      ReceiverCity: parseXmlText(b, 'ReceiverCity'),
      DeliveryUnitName: parseXmlText(b, 'DeliveryUnitName'),
      InvoiceNumber: parseXmlText(b, 'InvoiceNumber'),
      IntegrationCode: parseXmlText(b, 'IntegrationCode'),
      BarcodeNumber: parseXmlText(b, 'BarcodeNumber'),
      BarcodeDate: parseXmlText(b, 'BarcodeDate'),
    });
  }
  return models;
}

export async function getLabelData(integrationCode: string): Promise<LabelDataResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik. Ayarlar > Aras Kargo bölümünden API bilgilerini girin.' };
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetLabelDummy xmlns="http://tempuri.org/">
      <Username>${escapeXml(creds.username)}</Username>
      <Password>${escapeXml(creds.password)}</Password>
      <integrationCode>${escapeXml(integrationCode.slice(0, 32))}</integrationCode>
    </GetLabelDummy>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/GetLabelDummy"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(30000),
    });

    const text = await response.text();
    console.log('[ArasKargo] GetLabelDummy response length:', text.length, '| first 300:', text.slice(0, 300));

    // DummyBarcodeResponse has ResultCode
    const resultCodeMatch = text.match(/<(?:\w+:)?ResultCode[^>]*>(\d+)<\/(?:\w+:)?ResultCode>/i);
    const resultCode = resultCodeMatch ? parseInt(resultCodeMatch[1]) : -999;

    if (resultCode !== 0 && resultCode !== -999) {
      const msg = parseXmlText(text, 'Message');
      return {
        success: false,
        error: msg || `Aras API hata kodu: ${resultCode}. Sipariş önce "API'ye Gönder" ile kaydedilmiş olmalıdır.`,
      };
    }

    // Images → ArrayOfBase64Binary → base64Binary elements
    const images = parseBase64BinaryArray(text, 'Images');

    // ZebraPdf → ArrayOfString → string elements (each is a base64-encoded PDF)
    const zebraPdf = parseStringArray(text, 'ZebraPdf');

    // ZebraZpl → ArrayOfString → string elements (ZPL commands)
    const zebraZpl = parseStringArray(text, 'ZebraZpl');

    const barcodeModels = parseBarcodeModels(text);
    const trackingNumber = parseXmlText(text, 'TrackingNumber');
    const message = parseXmlText(text, 'Message');

    const hasContent = images.length > 0 || zebraPdf.length > 0 || barcodeModels.length > 0;

    if (!hasContent && resultCode === -999) {
      return {
        success: false,
        error: 'Etiket verisi alınamadı. Sipariş önce "API\'ye Gönder" ile Aras sistemine kaydedilmelidir.',
      };
    }

    return {
      success: true,
      images,
      zebraPdf: zebraPdf.length ? zebraPdf : undefined,
      zebraZpl: zebraZpl.length ? zebraZpl : undefined,
      barcodeModels,
      trackingNumber: trackingNumber || undefined,
      message: message || undefined,
    };
  } catch (error: any) {
    console.error('[ArasKargo] GetLabelDummy error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

// ── SetCanceledShipment ───────────────────────────────────────────────────
// Cancels a previously created shipment in Aras. cargoKey = BarcodeNumber.

export interface CancelShipmentResult {
  success: boolean;
  successFlag?: string;
  operationCode?: string;
  cargoKey?: string;
  error?: string;
}

export async function cancelShipment(barcodeNumber: string, reason?: string): Promise<CancelShipmentResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik.' };
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SetCanceledShipment xmlns="http://tempuri.org/">
      <userName>${escapeXml(creds.username)}</userName>
      <password>${escapeXml(creds.password)}</password>
      <language>TR</language>
      <cargoKey>
        <string>${escapeXml(barcodeNumber)}</string>
      </cargoKey>
      <canceledDescription>${escapeXml(reason || 'Siparis iptali')}</canceledDescription>
    </SetCanceledShipment>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/SetCanceledShipment"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(20000),
    });

    const text = await response.text();
    console.log('[ArasKargo] SetCanceledShipment response:', text.slice(0, 400));

    if (text.includes('<faultcode>') || text.includes('<Fault>')) {
      const faultMsg = parseXmlText(text, 'faultstring') || parseXmlText(text, 'Reason');
      return { success: false, error: faultMsg || 'SOAP hatası' };
    }

    const successFlag = parseXmlText(text, 'SuccessFlag');
    const operationCode = parseXmlText(text, 'OperationCode');
    const cargoKey = parseXmlText(text, 'CargoKey');

    // SuccessFlag = '1' means success
    if (successFlag === '1' || successFlag.toLowerCase() === 'true') {
      return { success: true, successFlag, operationCode, cargoKey };
    }

    // If no SuccessFlag in response, check if block even exists
    if (!successFlag && !text.includes('CanceledShipmentInfo')) {
      return { success: false, error: 'Aras API yanıt vermedi veya barkod sistemde bulunamadı.' };
    }

    return {
      success: false,
      error: `İptal başarısız. OperationCode: ${operationCode || '-'}. Kargo şubeye çıkmış olabilir.`,
      operationCode,
    };
  } catch (error: any) {
    console.error('[ArasKargo] SetCanceledShipment error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

// ── GetAddressList ────────────────────────────────────────────────────────
// Returns the list of registered sender addresses (CustomerAddress[]).
// Admin picks one to populate SenderAccountAddressId in settings.

export interface ArasAddress {
  addressId: string;
  adres: string;
  sube: string;
  bolge: string;
}

export interface GetAddressListResult {
  success: boolean;
  addresses?: ArasAddress[];
  error?: string;
}

export async function getAddressList(): Promise<GetAddressListResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik.' };
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetAddressList xmlns="http://tempuri.org/">
      <userName>${escapeXml(creds.username)}</userName>
      <password>${escapeXml(creds.password)}</password>
    </GetAddressList>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/GetAddressList"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    console.log('[ArasKargo] GetAddressList response length:', text.length);

    if (text.includes('<faultcode>') || text.includes('<Fault>')) {
      const faultMsg = parseXmlText(text, 'faultstring') || parseXmlText(text, 'Reason');
      return { success: false, error: faultMsg || 'Kimlik doğrulama hatası. Kullanıcı adı/şifre kontrol edin.' };
    }

    const addresses: ArasAddress[] = [];
    const addrRe = /<(?:\w+:)?CustomerAddress[^>]*>([\s\S]*?)<\/(?:\w+:)?CustomerAddress>/gi;
    let block;
    while ((block = addrRe.exec(text)) !== null) {
      const b = block[1];
      const addressId = parseXmlText(b, 'AddressId') || parseXmlText(b, 'AddressIntegrationCode');
      if (addressId) {
        addresses.push({
          addressId,
          adres: parseXmlText(b, 'Adres'),
          sube: parseXmlText(b, 'Sube'),
          bolge: parseXmlText(b, 'Bolge'),
        });
      }
    }

    if (addresses.length === 0) {
      return { success: false, error: 'Kayıtlı gönderici adresi bulunamadı. Önce Aras müşteri panelinizde adres tanımlayın.' };
    }

    return { success: true, addresses };
  } catch (error: any) {
    console.error('[ArasKargo] GetAddressList error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

// ── GetCargoInfo ──────────────────────────────────────────────────────────
// Returns real cargo delivery status via DataSet (XML diffgram).
// Uses customerCode + integrationCode.

export interface CargoStatusResult {
  success: boolean;
  found?: boolean;
  cargoKey?: string;            // Aras internal key
  status?: string;              // e.g. "Teslim Edildi"
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryBranch?: string;
  waybillNo?: string;
  rawRows?: Record<string, string>[];
  error?: string;
}

export async function getCargoStatus(integrationCode: string): Promise<CargoStatusResult> {
  const creds = await getArasCredentials();

  if (!creds.username || !creds.password) {
    return { success: false, error: 'Aras Kargo API bilgileri eksik.' };
  }
  if (!creds.customerCode) {
    return { success: false, error: 'Müşteri kodu (CustomerCode) ayarlarda girilmemiş. GetCargoInfo için gereklidir.' };
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetCargoInfo xmlns="http://tempuri.org/">
      <username>${escapeXml(creds.username)}</username>
      <password>${escapeXml(creds.password)}</password>
      <customerCode>${escapeXml(creds.customerCode)}</customerCode>
      <integrationCode>${escapeXml(integrationCode.slice(0, 32))}</integrationCode>
    </GetCargoInfo>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(creds.setorderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tempuri.org/GetCargoInfo"',
        'Accept': 'application/soap+xml, text/xml',
      },
      body: soapBody,
      signal: AbortSignal.timeout(20000),
    });

    const text = await response.text();
    console.log('[ArasKargo] GetCargoInfo response length:', text.length, '| first 400:', text.slice(0, 400));

    if (text.includes('<faultcode>') || text.includes('<Fault>')) {
      const faultMsg = parseXmlText(text, 'faultstring') || parseXmlText(text, 'Reason');
      return { success: false, error: faultMsg || 'SOAP hatası' };
    }

    // Response is a DataSet serialized as XML diffgram.
    // Extract rows from NewDataSet or diffgram block.
    // Typical shape: <NewDataSet><Table>...</Table><Table>...</Table></NewDataSet>
    // OR: <diffgr:diffgram><NewDataSet><Table diffgr:id="...">...</Table></NewDataSet></diffgr:diffgram>
    const rowRe = /<(?:\w+:)?(?:Table|IrsaliyeRow|Row|IrsaliyeData)[^>]*(?:diffgr:id[^>]*)?>([\s\S]*?)<\/(?:\w+:)?(?:Table|IrsaliyeRow|Row|IrsaliyeData)>/gi;
    const rawRows: Record<string, string>[] = [];
    let rowMatch;
    while ((rowMatch = rowRe.exec(text)) !== null) {
      const inner = rowMatch[1];
      if (!inner.trim() || inner.includes('<xs:')) continue;
      const row: Record<string, string> = {};
      const fieldRe = /<(\w+)[^>]*>([^<]*)<\/\1>/g;
      let fieldMatch;
      while ((fieldMatch = fieldRe.exec(inner)) !== null) {
        row[fieldMatch[1]] = fieldMatch[2].trim();
      }
      if (Object.keys(row).length > 0) rawRows.push(row);
    }

    if (rawRows.length === 0) {
      return { success: true, found: false, error: 'Kargo bilgisi bulunamadı. Sipariş henüz Aras sisteminde aktif olmayabilir.' };
    }

    // Try to extract meaningful fields from first row (field names may vary)
    const first = rawRows[0];
    const status =
      first['Durum'] || first['KargoDurumu'] || first['StatusCode'] || first['Status'] || '';
    const deliveryDate =
      first['TeslimTarihi'] || first['DeliveryDate'] || first['TeslimEdildiTarih'] || '';
    const deliveryTime =
      first['TeslimSaati'] || first['DeliveryTime'] || first['TeslimEdildiSaat'] || '';
    const deliveryBranch =
      first['TeslimSube'] || first['DeliveryUnitName'] || first['Sube'] || first['SubeAdi'] || '';
    const waybillNo =
      first['IrsaliyeNo'] || first['WaybillNo'] || first['KargoKey'] || first['BarcodeNumber'] || '';
    const cargoKey =
      first['KargoKey'] || first['CargoKey'] || first['IrsaliyeNo'] || '';

    return {
      success: true,
      found: true,
      status,
      deliveryDate,
      deliveryTime,
      deliveryBranch,
      waybillNo,
      cargoKey,
      rawRows,
    };
  } catch (error: any) {
    console.error('[ArasKargo] GetCargoInfo error:', error);
    return { success: false, error: `Bağlantı hatası: ${error.message}` };
  }
}

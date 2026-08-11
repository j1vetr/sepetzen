/**
 * Kargo sağlayıcı sözleşme testleri (mock fetch).
 *
 * Gerçek API'ye istek atmadan, adaptörlerin ShipEntegra ve Geliver
 * dokümantasyonundaki uç noktalara doğru gövde ile gittiğini ve yanıtları
 * doğru eşlediğini doğrular.
 *
 * Çalıştırma:  npx tsx scripts/test-shipping-contract.ts
 */
import { storage } from '../server/storage';
import type { CreateShipmentInput } from '../server/shipping/types';

type Call = { url: string; method: string; body: any; headers: Record<string, string> };

let calls: Call[] = [];
let handler: (call: Call) => { status?: number; json: any } = () => ({ json: {} });

const realFetch = globalThis.fetch;
function installMockFetch() {
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const call: Call = {
      url,
      method: init.method || 'GET',
      body: init.body ? JSON.parse(init.body) : undefined,
      headers: (init.headers || {}) as Record<string, string>,
    };
    calls.push(call);
    const { status = 200, json } = handler(call);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(json),
    } as any;
  }) as any;
}

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

const sampleInput: CreateShipmentInput = {
  orderNumber: 'SPZ-1001',
  recipient: {
    name: 'Ayşe Yılmaz',
    phone: '+90 555 111 22 33',
    email: 'ayse@example.com',
    address: 'Çiçek Sokak No:5, Kadıköy, İstanbul',
    city: 'İstanbul',
    district: 'Kadıköy',
    postalCode: '34710',
    countryCode: 'TR',
  },
  items: [{ title: 'Mermer Vazo', quantity: 2, unitPrice: '250.00', sku: 'SKU-1' }],
  desi: '3',
  totalAmount: '500.00',
  currency: 'TRY',
  isWorldwide: false,
};

async function withSettings(overrides: Record<string, string>, fn: () => Promise<void>) {
  const original = storage.getSiteSettings.bind(storage);
  (storage as any).getSiteSettings = async () => ({ ...overrides });
  try {
    await fn();
  } finally {
    (storage as any).getSiteSettings = original;
  }
}

async function testShipEntegra() {
  console.log('\nShipEntegra sözleşmesi');
  const { shipentegraProvider, clearShipEntegraTokenCache } = await import('../server/shipping/shipentegra');

  await withSettings({
    shipentegra_enabled: 'true',
    shipentegra_client_id: 'cid',
    shipentegra_client_secret: 'csecret',
    shipentegra_sender_name: 'Sepetzen',
    shipentegra_sender_address: 'Merkez Mah. 1. Sokak No:1',
    shipentegra_sender_city: 'Istanbul',
    shipentegra_sender_zip: '34000',
  }, async () => {
    clearShipEntegraTokenCache();
    calls = [];
    handler = (call) => {
      if (call.url.endsWith('/auth/token')) return { json: { data: { accessToken: 'tkn' } } };
      if (call.url.endsWith('/orders/manual')) return { json: { data: { orderId: 987 } } };
      if (call.url.endsWith('/logistics/labels/shipentegra')) {
        return { json: { data: { trackingNumber: 'SE123456789', label: 'https://files.shipentegra.com/l/987.pdf' } } };
      }
      return { json: {} };
    };

    const result = await shipentegraProvider.createShipment(sampleInput);

    const token = calls.find(c => c.url.endsWith('/auth/token'));
    check('token POST /auth/token clientId+clientSecret ile çağrılır',
      token?.method === 'POST' && token?.body?.clientId === 'cid' && token?.body?.clientSecret === 'csecret', token?.body);

    const order = calls.find(c => c.url.endsWith('/orders/manual'));
    check('sipariş POST /orders/manual uç noktasına gider', order?.method === 'POST', order?.url);
    check('sipariş gövdesi dokümandaki alanları taşır',
      !!order?.body && typeof order.body.description === 'string'
        && order.body.description.length >= 5 && order.body.description.length <= 50
        && order.body.shippingAmount >= 0.01
        && Array.isArray(order.body.items) && order.body.items[0].unitPrice >= 0.01
        && !!order.body.addressName
        && order.body.shippingAddress?.country === 'TR'
        && !!order.body.shippingAddress?.postalCode
        && order.body.number === 'SPZ-1001',
      order?.body);

    const label = calls.find(c => c.url.endsWith('/logistics/labels/shipentegra'));
    check('etiket POST /logistics/labels/shipentegra?orderId ile üretilir',
      label?.method === 'POST' && label?.body?.orderId === 987, label?.body);

    check('yanıt takip numarası ve etiketi eşler',
      result.success && result.shipmentId === '987' && result.trackingNumber === 'SE123456789'
        && result.labelUrl === 'https://files.shipentegra.com/l/987.pdf', result);

    // Etiket adımı başarısız olduğunda sipariş kimliği korunur ve
    // sonradan /orders/manual/{id} üzerinden kurtarılabilir.
    clearShipEntegraTokenCache();
    calls = [];
    handler = (call) => {
      if (call.url.endsWith('/auth/token')) return { json: { data: { accessToken: 'tkn' } } };
      if (call.url.endsWith('/orders/manual')) return { json: { data: { orderId: 555 } } };
      if (call.url.includes('/logistics/labels/shipentegra')) return { status: 500, json: { message: 'label service down' } };
      return { json: {} };
    };
    const pending = await shipentegraProvider.createShipment(sampleInput);
    check('etiket hatasında sipariş kimliği kaydedilir (pending)',
      pending.success && pending.pending === true && pending.shipmentId === '555', pending);

    calls = [];
    handler = (call) => {
      if (call.url.endsWith('/auth/token')) return { json: { data: { accessToken: 'tkn' } } };
      if (call.url.includes('/orders/manual/555')) {
        return { json: { data: { orderId: 555, trackingNumber: 'SE555', label: 'https://files.shipentegra.com/l/555.pdf' } } };
      }
      if (call.url.includes('/logistics/shipments/activities')) {
        return { json: { data: [{ status: 'Teslim edildi', statusCode: '5' }] } };
      }
      return { json: {} };
    };
    const tracked = await shipentegraProvider.track({ orderNumber: 'SPZ-1001', shipmentId: '555' });
    check('takip numarası kayıtlı sipariş kimliğinden kurtarılır',
      tracked.success && tracked.found === true && tracked.trackingNumber === 'SE555' && tracked.delivered === true, tracked);

    const recovered = await shipentegraProvider.getLabel({ orderNumber: 'SPZ-1001', shipmentId: '555' });
    check('etiket kayıtlı sipariş kimliğinden kurtarılır',
      recovered.success && recovered.url === 'https://files.shipentegra.com/l/555.pdf', recovered);
  });
}

async function testGeliver() {
  console.log('\nGeliver sözleşmesi');
  const { geliverProvider } = await import('../server/shipping/geliver');

  await withSettings({
    geliver_enabled: 'true',
    geliver_api_token: 'gtoken',
    geliver_service_code: 'GELIVER_STANDART',
  }, async () => {
    calls = [];
    // Geliver tek adımlı satın alma yanıtı: data = Transaction (shipment iç içe).
    handler = (call) => {
      if (call.url.endsWith('/transactions')) {
        return {
          json: {
            result: true,
            data: {
              id: 'tx1',
              shipmentID: 'shp_1',
              shipment: {
                id: 'shp_1',
                trackingNumber: 'GLV999',
                trackingURL: 'https://takip.geliver.io/GLV999',
                labelURL: 'https://cdn.geliver.io/labels/shp_1.pdf',
                providerServiceName: 'Sürat Kargo Standart',
              },
            },
          },
        };
      }
      return { json: { data: [] } };
    };

    const result = await geliverProvider.createShipment(sampleInput);
    const tx = calls.find(c => c.method === 'POST');
    check('gönderi POST /transactions uç noktasına gider (tek adımlı satın alma)',
      tx?.url === 'https://api.geliver.io/api/v1/transactions', tx?.url);
    check('providerServiceCode kök seviyede, test bayrağı shipment içinde',
      tx?.body?.providerServiceCode === 'GELIVER_STANDART' && tx?.body?.shipment?.test === false
        && tx?.body?.providerAccountID === undefined, tx?.body);
    check('ölçü ve ağırlık alanları metin olarak gönderilir',
      ['length', 'width', 'height', 'weight'].every(k => typeof tx?.body?.shipment?.[k] === 'string'), tx?.body?.shipment);
    check('alıcı adresi telefon ve plaka kodu içerir',
      tx?.body?.shipment?.recipientAddress?.phone === '+905551112233'
        && tx?.body?.shipment?.recipientAddress?.cityCode === '34', tx?.body?.shipment?.recipientAddress);
    check('yanıt takip ve etiket alanlarını eşler',
      result.success && result.shipmentId === 'shp_1' && result.trackingNumber === 'GLV999'
        && result.trackingUrl === 'https://takip.geliver.io/GLV999'
        && result.labelUrl === 'https://cdn.geliver.io/labels/shp_1.pdf', result);

    // Takip: GET /shipments/{shipmentID}
    calls = [];
    handler = () => ({ json: { data: { shipment: { id: 'shp_1', trackingNumber: 'GLV999', trackingStatus: { trackingStatusCode: 'DELIVERED' } } } } });
    const tracked = await geliverProvider.track({ orderNumber: 'SPZ-1001', shipmentId: 'shp_1' });
    check('takip GET /shipments/{id} ile yapılır ve teslim durumu eşlenir',
      calls[0]?.url.endsWith('/shipments/shp_1') && tracked.delivered === true
        && tracked.statusText === 'Teslim edildi', { url: calls[0]?.url, tracked });
  });
}

async function testGeliverConnection() {
  console.log('\nGeliver bağlantı doğrulaması');
  const { geliverProvider } = await import('../server/shipping/geliver');

  // Token baş/son boşluklarla kaydedilmiş olsa bile temizlenerek gönderilir.
  await withSettings({ geliver_api_token: '  gtoken\n' }, async () => {
    calls = [];
    handler = () => ({ json: { result: true, data: [] } });
    const ok = await geliverProvider.testConnection();
    check('doğrulama GET /addresses?isRecipientAddress=false&limit=1&page=1 ile yapılır',
      calls[0]?.method === 'GET'
        && calls[0]?.url === 'https://api.geliver.io/api/v1/addresses?isRecipientAddress=false&limit=1&page=1',
      calls[0]?.url);
    check('token boşluklardan arındırılıp Bearer başlığıyla gönderilir',
      calls[0]?.headers?.['Authorization'] === 'Bearer gtoken', calls[0]?.headers);
    check('başarılı yanıt başarı mesajı döndürür', ok.success === true && !!ok.message, ok);

    // 403: Geliver'ın "Bu işlem için yetkiniz yok" yanıtı eyleme dönük mesaja çevrilir,
    // ham yanıt ayrıntı olarak korunur.
    calls = [];
    handler = () => ({ status: 403, json: { message: 'Bu işlem için yetkiniz yok.' } });
    const forbidden = await geliverProvider.testConnection();
    check('403 yanıtı yetki yönergesi içeren Türkçe mesaja eşlenir',
      forbidden.success === false
        && /yetkisi yetersiz/i.test(forbidden.error || '')
        && /tam yetk/i.test(forbidden.error || '')
        && (forbidden.error || '').includes('Bu işlem için yetkiniz yok.'),
      forbidden.error);

    // 401 de aynı yönergeyle eşlenir.
    handler = () => ({ status: 401, json: { message: 'Unauthorized' } });
    const unauthorized = await geliverProvider.testConnection();
    check('401 yanıtı da token yönergesine eşlenir',
      unauthorized.success === false && /Token geçersiz/i.test(unauthorized.error || ''), unauthorized.error);

    // 5xx geçici sorun olarak raporlanır.
    handler = () => ({ status: 502, json: { message: 'Bad Gateway' } });
    const serverErr = await geliverProvider.testConnection();
    check('5xx yanıtı geçici sunucu sorunu olarak raporlanır',
      serverErr.success === false && /geçici bir sorun/i.test(serverErr.error || ''), serverErr.error);

    // Formdan gelen (kaydedilmemiş) token kayıtlı tokenın önüne geçer.
    calls = [];
    handler = () => ({ json: { result: true, data: [] } });
    await geliverProvider.testConnection({ geliver_api_token: ' formtoken ' });
    check('form değerleri kayıtlı tokenın önüne geçer (boşluklar temizlenir)',
      calls[0]?.headers?.['Authorization'] === 'Bearer formtoken', calls[0]?.headers);

    // Maskeli token gönderilirse kayıtlı token kullanılır.
    calls = [];
    await geliverProvider.testConnection({ geliver_api_token: '••••••••' });
    check('maskeli token yok sayılır, kayıtlı token kullanılır',
      calls[0]?.headers?.['Authorization'] === 'Bearer gtoken', calls[0]?.headers);
  });

  // Token hiç yoksa istek atılmadan yönerge döner.
  await withSettings({}, async () => {
    calls = [];
    const missing = await geliverProvider.testConnection();
    check('token yokken istek atılmaz ve yönerge gösterilir',
      missing.success === false && calls.length === 0 && /token girilmemiş/i.test(missing.error || ''), missing.error);
  });
}

async function testProviderSelection() {
  console.log('\nSağlayıcı seçimi');
  const { getProviderForOrder, getProviderStatuses } = await import('../server/shipping/index');

  await withSettings({ shipping_provider: 'geliver' }, async () => {
    const forLegacy = await getProviderForOrder({ shipmentProvider: 'aras' });
    check('eski Aras gönderisi Aras üzerinden sorgulanır', forLegacy.id === 'aras', forLegacy.id);
    const forNew = await getProviderForOrder({ shipmentProvider: null });
    check('sağlayıcısı olmayan sipariş aktif sağlayıcıya düşer', forNew.id === 'geliver', forNew.id);
    const statuses = await getProviderStatuses();
    check('durum yanıtı aktif sağlayıcıyı nesne olarak döndürür',
      statuses.activeId === 'geliver' && statuses.active?.id === 'geliver' && statuses.providers.length === 3, statuses.active);
  });

  await withSettings({}, async () => {
    const fallback = await getProviderForOrder({});
    check('ayar yoksa Aras varsayılan kalır (geriye dönük uyumluluk)', fallback.id === 'aras', fallback.id);
  });
}

(async () => {
  installMockFetch();
  try {
    await testShipEntegra();
    await testGeliver();
    await testGeliverConnection();
    await testProviderSelection();
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log(failures === 0 ? '\nTüm sözleşme testleri geçti.' : `\n${failures} test başarısız.`);
  process.exit(failures === 0 ? 0 : 1);
})();

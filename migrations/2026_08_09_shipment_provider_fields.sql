-- Çoklu kargo entegrasyonu: siparişlere sağlayıcı bağımsız gönderi alanları
-- Tarih: 2026-08-09
--
-- Aras Kargo'nun yanına Geliver ve ShipEntegra eklendiği için, her siparişin
-- hangi sağlayıcı ile gönderildiği ve o sağlayıcıdaki gönderi kimliği/etiketi
-- siparişin üzerinde saklanır. Böylece ayarlardan aktif sağlayıcı değiştirilse
-- bile eski gönderiler kendi sağlayıcısı üzerinden sorgulanmaya devam eder.
--
-- DEPLOY YÖNTEMİ (production):
--   psql "$DATABASE_URL" -f migrations/2026_08_09_shipment_provider_fields.sql
--
-- Yerel/staging için drizzle de kullanılabilir:
--   npm run db:push
--
-- IDEMPOTENT: tüm komutlar IF NOT EXISTS kullanır, güvenli bir şekilde
-- birden fazla kere çalıştırılabilir.
--
-- VERİ KORUMA: Yalnızca yeni kolonlar eklenir (hepsi NULL kabul eder);
-- mevcut sipariş verisine dokunulmaz.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipment_provider text,
  ADD COLUMN IF NOT EXISTS shipment_id text,
  ADD COLUMN IF NOT EXISTS shipment_label_url text;

-- Daha önce Aras Kargo'ya gönderilmiş siparişler için sağlayıcıyı geriye dönük
-- doldur; böylece aktif sağlayıcı değişse bile bu siparişler Aras üzerinden
-- sorgulanır. (Kargo notu bulunan ve sağlayıcısı boş olan siparişler.)
UPDATE orders o
SET shipment_provider = 'aras'
WHERE o.shipment_provider IS NULL
  AND EXISTS (
    SELECT 1 FROM order_notes n
    WHERE n.order_id = o.id
      AND n.content LIKE '%Aras Kargo API%'
  );

-- Ürüne isim yazdırma (ek ücretli kişiselleştirme) alanları.
-- Geliştirme veritabanına 2026-08-18'de uygulandı; üretimde (VPS) manuel çalıştırın.

ALTER TABLE products ADD COLUMN IF NOT EXISTS personalization jsonb;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS personalization_text text;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS personalization_text text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS personalization_fee numeric(10,2);

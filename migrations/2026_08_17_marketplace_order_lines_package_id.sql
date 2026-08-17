-- Trendyol paket id'si: paket statüsü güncelleme ve fatura linki gönderimi için.
ALTER TABLE marketplace_order_lines ADD COLUMN IF NOT EXISTS package_id text;

-- İndirim etiketi için tarih aralığı kolonları
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_badge_start_date TEXT,
  ADD COLUMN IF NOT EXISTS discount_badge_end_date TEXT;

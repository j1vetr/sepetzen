-- Yorumlara görsel/GIF desteği: product_reviews.images jsonb kolonu
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

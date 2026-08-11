-- Alt kategori desteği: categories.parent_id (kendine referanslı, null = ana kategori)
-- Tek seviye derinlik API katmanında zorlanır. Üst kategori silinirse alt
-- kategoriler üst seviyeye taşınır (ON DELETE SET NULL güvenlik ağı; uygulama
-- katmanı silmeden önce ayrıca netleştirir).
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id varchar REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

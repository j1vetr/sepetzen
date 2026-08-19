-- Marka yönetimi tablosu
-- products.brand text alanı korunur (FK eklenmez — geriye dönük uyumluluk)
CREATE TABLE IF NOT EXISTS brands (
  id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  logo_url   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

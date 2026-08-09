-- Blog bölümü: yazı tablosu
-- Tarih: 2026-08-09
--
-- Bu migration blog yazıları için blog_posts tablosunu oluşturur.
-- Vitrindeki /blog liste ve /blog/:slug detay sayfaları, admin panelindeki
-- "Blog" sekmesi ve sitemap kayıtları bu tabloyu kullanır.
--
-- DEPLOY YÖNTEMİ (production):
--   psql "$DATABASE_URL" -f migrations/2026_08_09_blog_posts.sql
--
-- Yerel/staging için drizzle de kullanılabilir:
--   npm run db:push
-- Drizzle interactive prompt başka bir tablo (refresh_tokens) için
-- takılırsa ENTER ile "No, add the constraint without truncating"
-- seçeneğini onaylayın.
--
-- IDEMPOTENT: tüm komutlar IF NOT EXISTS kullanır, güvenli bir şekilde
-- birden fazla kere çalıştırılabilir.
--
-- VERİ KORUMA: Yalnızca yeni tablo eklenir; mevcut tablolara dokunulmaz.

BEGIN;

CREATE TABLE IF NOT EXISTS blog_posts (
  id              varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text      NOT NULL CONSTRAINT blog_posts_slug_unique UNIQUE,
  title           text      NOT NULL,
  excerpt         text      NOT NULL DEFAULT '',
  content         text      NOT NULL DEFAULT '',
  cover_image     text,
  seo_title       text,
  seo_description text,
  is_published    boolean   NOT NULL DEFAULT false,
  published_at    timestamp,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);

-- Slug benzersizliği: aynı adrese iki yazı düşmesin.
-- (Tablo daha önce unique kısıt olmadan oluşturulmuşsa burada eklenir.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND tablename = 'blog_posts' AND indexdef ILIKE '%UNIQUE%(slug)%'
  ) THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Yayınlanmış yazıların vitrin listesi için.
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (is_published, published_at);

COMMIT;

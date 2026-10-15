export const DEFAULT_ADMIN_PATH = 'toov-admin';
export const ADMIN_PATH_SETTING_KEY = 'admin_panel_path';

// Mağaza veya sistem yollarıyla çakışmasın diye ayrılmış ilk yol parçaları.
const RESERVED = new Set([
  'api', 'uploads', 'assets', 'src', 'node_modules', 'admin', 'login', 'giris', 'kayit',
  'magaza', 'tum-urunler', 'kategori', 'marka', 'urun', 'sepet', 'odeme', 'odeme-basarili',
  'odeme-basarisiz', 'siparis-takip', 'hesabim', 'sayfa', 'blog', 'sifremi-unuttum',
  'sifre-sifirla', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'hakkimizda', 'kvkk',
]);

/** Geçerliyse temizlenmiş yolu (başında/sonunda eğik çizgi olmadan) döndürür, değilse null. */
export function normalizeAdminPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(value)) return null;
  if (RESERVED.has(value)) return null;
  return value;
}

export const ADMIN_PATH_ERROR =
  'Panel yolu 3 ile 40 karakter olmalı ve yalnızca küçük harf, rakam ve tire içermelidir. Mağaza sayfalarının adları kullanılamaz.';

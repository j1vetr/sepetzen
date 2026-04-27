import { Link } from 'wouter';
import { Instagram } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';

export function Footer() {
  const { data: allCategories = [] } = useCategories();
  // Hide legacy categories (display_order >= 100); show only stone categories
  const categories = allCategories
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <footer className="bg-[hsl(var(--polen-stone))] text-white py-16 lg:py-20 px-6" data-testid="footer">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16 mb-16">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-8">
              <span
                className="font-display text-3xl tracking-[0.18em] text-white block leading-none"
                data-testid="text-footer-logo"
              >
                POLEN <span className="text-polen-orange">STONE</span>
              </span>
              <span className="text-[10px] tracking-[0.32em] uppercase text-white/45 mt-2 block">
                Doğal Taş & Mermer
              </span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed mb-6">
              Türkiye'nin en zengin doğal taş mirasını, modern mekânlara taşıyoruz.
              Mermer, granit, traverten ve oniks koleksiyonumuzla doğanın ihtişamı evinizde.
            </p>
            <a
              href="https://www.instagram.com/polenstone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/55 hover:text-polen-orange transition-colors text-sm"
              data-testid="link-instagram-footer"
            >
              <Instagram className="w-4 h-4" />
              @polenstone
            </a>
            <div className="mt-6 text-xs text-white/35 space-y-1">
              <p>Polen Stone Doğal Taş & Mermer</p>
              <p>İletişim için bize ulaşın</p>
              <p className="mt-2">
                <a href="tel:+905000000000" className="hover:text-polen-orange transition-colors">0500 000 00 00</a>
              </p>
              <p>
                <a href="mailto:info@polenstone.com.tr" className="hover:text-polen-orange transition-colors">info@polenstone.com.tr</a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40 mb-6">Koleksiyon</h4>
            <ul className="space-y-4 text-sm text-white/65">
              {categories.length > 0 ? (
                categories.slice(0, 5).map(cat => (
                  <li key={cat.id}>
                    <Link href={`/kategori/${cat.slug}`} className="hover:text-polen-orange transition-colors" data-testid={`link-footer-cat-${cat.slug}`}>
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link href="/kategori/mermer" className="hover:text-polen-orange transition-colors">Mermer</Link></li>
                  <li><Link href="/magaza" className="hover:text-polen-orange transition-colors">Tüm Ürünler</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40 mb-6">Destek</h4>
            <ul className="space-y-4 text-sm text-white/65">
              <li><Link href="/teslimat-kosullari" className="hover:text-polen-orange transition-colors">Teslimat Koşulları</Link></li>
              <li><Link href="/iptal-ve-iade" className="hover:text-polen-orange transition-colors">İptal ve İade</Link></li>
              <li><Link href="/mesafeli-satis-sozlesmesi" className="hover:text-polen-orange transition-colors">Mesafeli Satış</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40 mb-6">Kurumsal</h4>
            <ul className="space-y-4 text-sm text-white/65">
              <li><Link href="/hakkimizda" className="hover:text-polen-orange transition-colors">Hakkımızda</Link></li>
              <li><Link href="/kvkk" className="hover:text-polen-orange transition-colors">KVKK</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© 2026 Polen Stone. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-2 text-xs text-white/35">
            <span>Geliştirici & Tasarım:</span>
            <a href="https://toov.com.tr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <img src="https://toov.com.tr/assets/toov_logo-DODYNPrj.png" alt="TOOV" className="h-4" loading="lazy" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

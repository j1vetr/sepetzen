import { Link } from 'wouter';
import { Instagram, MapPin, Phone, Mail } from 'lucide-react';

const kurumsalLinks = [
  { href: '/sayfa/hakkimizda', label: 'Hakkımızda' },
  { href: '/sayfa/iletisim', label: 'İletişim' },
  { href: '/sayfa/kargo-sureci', label: 'Kargo Bilgileri' },
  { href: '/sayfa/iptal-ve-iade-sartlari', label: 'İptal & İade' },
  { href: '/sayfa/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/sayfa/on-bilgilendirme-formu', label: 'Ön Bilgilendirme Formu' },
  { href: '/sayfa/uyelik-sozlesmesi', label: 'Üyelik Sözleşmesi' },
];

const yardimLinks = [
  { href: '/sayfa/kvkk-aydinlatma-metni', label: 'KVKK Aydınlatma Metni' },
  { href: '/sayfa/gizlilik-guvenlik', label: 'Gizlilik & Güvenlik' },
  { href: '/sayfa/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/sayfa/iade-sureci', label: 'İade Formu' },
];

export function Footer() {
  return (
    <footer
      className="relative bg-[#0f1a0e] text-white overflow-hidden"
      data-testid="footer"
    >
      {/* subtle green gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(45,90,39,0.6), transparent 55%), radial-gradient(circle at 90% 100%, rgba(45,90,39,0.4), transparent 50%)',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 pt-14 lg:pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-10">
          {/* ── Sol: Brand ── */}
          <div className="md:col-span-12 lg:col-span-4">
            <Link href="/" className="inline-block mb-5" data-testid="link-footer-logo">
              <span className="font-display text-2xl tracking-widest">
                <span className="text-white">SEPET</span><span className="text-[#4a9a42]">ZEN</span>
              </span>
            </Link>
            <p className="text-white/55 text-[14px] leading-[1.7] max-w-md mb-6">
              Kamp, outdoor, av bıçakları ve bağ & bahçe ürünlerinde Türkiye'nin güvenilir adresi.
              Dalaman, Muğla'dan tüm Türkiye'ye hızlı kargo ile ulaşıyoruz.
            </p>

            <a
              href="https://www.instagram.com/sepetzen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white/75 hover:text-[#4a9a42] transition-colors text-sm font-medium group"
              data-testid="link-instagram-footer"
            >
              <span className="w-9 h-9 rounded-full border border-white/15 group-hover:border-[#4a9a42] flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" strokeWidth={1.75} />
              </span>
              @sepetzen
            </a>
          </div>

          {/* ── Kurumsal ── */}
          <div className="md:col-span-5 lg:col-span-3">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              Kurumsal
            </h4>
            <ul className="space-y-3 text-[14px] text-white/70">
              {kurumsalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 hover:text-[#4a9a42] transition-colors group"
                    data-testid={`link-footer-${link.href.split('/').pop()}`}
                  >
                    <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#4a9a42] transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Yardım ── */}
          <div className="md:col-span-4 lg:col-span-2">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              Yardım
            </h4>
            <ul className="space-y-3 text-[14px] text-white/70">
              {yardimLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 hover:text-[#4a9a42] transition-colors group"
                    data-testid={`link-footer-${link.href.split('/').pop()}`}
                  >
                    <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#4a9a42] transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── İletişim ── */}
          <div className="md:col-span-12 lg:col-span-3">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              İletişim
            </h4>
            <ul className="space-y-4 text-[14px] text-white/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#4a9a42] shrink-0 mt-0.5" strokeWidth={1.75} />
                <span data-testid="text-footer-address" className="leading-[1.65]">
                  Karaçalı Mah. Nergiz Sk. No.8/A<br />
                  Dalaman / Muğla
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#4a9a42] shrink-0" strokeWidth={1.75} />
                <a
                  href="tel:+905366301138"
                  className="hover:text-[#4a9a42] transition-colors"
                  data-testid="link-footer-phone"
                >
                  0536 630 11 38
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#4a9a42] shrink-0" strokeWidth={1.75} />
                <a
                  href="mailto:sepetzen@gmail.com"
                  className="hover:text-[#4a9a42] transition-colors"
                  data-testid="link-footer-email"
                >
                  sepetzen@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Alt çizgi: copyright ── */}
        <div className="mt-12 lg:mt-16 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/40">
            © 2026 Sepetzen. Tüm hakları saklıdır.
          </p>
          <p className="text-[12px] text-white/30">
            Ahmet Uğur Durmaz — Dalaman / Muğla
          </p>
        </div>
      </div>
    </footer>
  );
}

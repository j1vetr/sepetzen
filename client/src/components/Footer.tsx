import { Link } from 'wouter';
import { Instagram, MapPin, Phone, Mail, Youtube } from 'lucide-react';

const kurumsalLinks = [
  { href: '/sayfa/hakkimizda',               label: 'Hakkımızda' },
  { href: '/sayfa/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/sayfa/on-bilgilendirme-formu',   label: 'Ön Bilgilendirme Formu' },
  { href: '/sayfa/uyelik-sozlesmesi',         label: 'Üyelik Sözleşmesi' },
  { href: '/sayfa/kvkk-aydinlatma-metni',    label: 'KVKK Aydınlatma Metni' },
  { href: '/sayfa/gizlilik-guvenlik',        label: 'Gizlilik & Güvenlik' },
  { href: '/sayfa/cerez-politikasi',         label: 'Çerez Politikası' },
];

const yardimLinks = [
  { href: '/sayfa/kargo-sureci',            label: 'Kargo Süreci' },
  { href: '/sayfa/iade-sureci',             label: 'İade Süreci' },
  { href: '/sayfa/iptal-ve-iade-sartlari', label: 'İptal & İade Şartları' },
  { href: '/sayfa/iletisim',                label: 'İletişim' },
];

export function Footer() {
  return (
    <footer
      className="relative bg-[#0f1a0e] text-white overflow-hidden"
      data-testid="footer"
    >
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

          {/* ── Brand & Social ── */}
          <div className="md:col-span-12 lg:col-span-4">
            <Link href="/" className="inline-block mb-5" data-testid="link-footer-logo">
              <img
                src="/uploads/branding/sepetzen-logo-white.png"
                alt="Sepetzen – Kamp, Outdoor, Bıçak ve Bağ Bahçe"
                data-testid="img-footer-logo"
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-white/55 text-[14px] leading-[1.7] max-w-md mb-6">
              Kamp, outdoor, av bıçakları ve bağ & bahçe ürünleri. Dalaman, Muğla'dan tüm Türkiye'ye hızlı ve güvenli teslimat.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="https://www.instagram.com/sepetzen"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/75 hover:text-[#4a9a42] transition-colors group"
                data-testid="link-instagram-footer"
              >
                <span className="w-9 h-9 rounded-full border border-white/15 group-hover:border-[#4a9a42] flex items-center justify-center transition-colors">
                  <Instagram className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <span className="text-[12px]">@sepetzen</span>
              </a>
              <a
                href="https://www.youtube.com/@sepetzen"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/75 hover:text-[#4a9a42] transition-colors group"
                data-testid="link-youtube-footer"
              >
                <span className="w-9 h-9 rounded-full border border-white/15 group-hover:border-[#4a9a42] flex items-center justify-center transition-colors">
                  <Youtube className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <span className="text-[12px]">@sepetzen</span>
              </a>
              <a
                href="https://www.etsy.com/shop/Sepetzen"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/75 hover:text-[#4a9a42] transition-colors group"
                data-testid="link-etsy-footer"
              >
                <span className="w-9 h-9 rounded-full border border-white/15 group-hover:border-[#4a9a42] flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                    <path d="M9.764 21.053c-.52 0-.952-.024-1.297-.073L4.95 21l.024-.423c.097-1.684.146-3.463.146-5.289V8.689c0-1.826-.049-3.605-.146-5.289L4.95 3l3.517.02c.344-.05.776-.073 1.297-.073h7.483c1.201 0 2.14.038 2.816.111l.544.056-.288 2.56-.532-.023a47.76 47.76 0 0 0-1.648-.059H10.15a46.98 46.98 0 0 0-1.056.024v4.22c.337.01.714.017 1.13.017h4.068c.612 0 1.234-.02 1.868-.059l.541-.035-.23 2.546-.524-.02a38.99 38.99 0 0 0-1.655-.07H10.24c-.416 0-.794.007-1.13.017v4.367c.008.29.018.533.03.73.26.018.619.028 1.074.028h7.689c.548 0 1.128-.02 1.74-.059l.536-.033-.287 2.559-.533.058a32.7 32.7 0 0 1-2.84.11H9.764z" />
                  </svg>
                </span>
                <span className="text-[12px]">Etsy</span>
              </a>
            </div>
          </div>

          {/* ── Kurumsal ── */}
          <div className="md:col-span-4 lg:col-span-2">
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
          <div className="md:col-span-4 lg:col-span-3">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              Bize Ulaşın
            </h4>
            <ul className="space-y-4 text-[14px] text-white/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#4a9a42] shrink-0 mt-0.5" strokeWidth={1.75} />
                <span data-testid="text-footer-address" className="leading-[1.65]">
                  Ahmet Uğur Durmaz<br />
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

        {/* ── Güven Rozetleri ── */}
        <div className="mt-10 lg:mt-14 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[12px] text-white/40" data-testid="text-footer-copyright">
            Sepetzen® - Her Hakkı Saklıdır. © 2024-2026
          </p>

          <div className="flex items-center gap-5 flex-wrap justify-center">
            {/* Marka Tescil Rozeti */}
            <a
              href="/uploads/branding/sepetzen-marka-tescil.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 border border-white/10 rounded px-3 py-2 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-colors"
              data-testid="link-marka-tescil"
              title="Tescil Belgesini Görüntüle – No: 2024/093667"
            >
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-white/35">Tescilli Marka</span>
                <span className="text-[12px] font-bold text-white/70 mt-0.5">SEPETZEN <sup className="text-[8px] text-[#4a9a42]">®</sup></span>
                <span className="text-[8.5px] font-mono text-white/30 mt-0.5">No: 2024/093667</span>
              </div>
            </a>

            {/* ETBİS Logosu */}
            <a
              href="https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=717cfbdc-c1e5-4ef4-b67f-e3bffb023aba"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-footer-etbis"
              title="ETBİS – Elektronik Ticaret Bilgi Sistemi"
            >
              <img
                src="/uploads/branding/etbis-logo.png"
                alt="ETBİS – Elektronik Ticaret Bilgi Sistemi"
                data-testid="img-footer-etbis"
                className="h-14 w-auto object-contain opacity-75 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

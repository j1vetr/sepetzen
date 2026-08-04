import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Instagram, Gem, Mountain, Hammer, Leaf, Award, Users, Truck, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

const values = [
  { icon: Mountain, label: 'Doğallık' },
  { icon: Gem, label: 'Zarafet' },
  { icon: Hammer, label: 'Ustalık' },
  { icon: Leaf, label: 'Sürdürülebilirlik' },
];

const stats = [
  { number: '500+', label: 'Tamamlanan Proje' },
  { number: '%100', label: 'Türk Mermeri' },
  { number: '10+', label: 'Yıl Deneyim' },
  { number: '81', label: 'İl Teslimat' },
];

const features = [
  { icon: Award, title: 'Premium Kalite', desc: 'Her bir blok özenle seçilmiş, kusursuz işlenmiş doğal taş' },
  { icon: Users, title: 'Uzman Danışmanlık', desc: 'Mekânınıza en uygun taşı birlikte seçiyoruz' },
  { icon: Truck, title: 'Türkiye Geneli', desc: '81 ile özenli paketleme ve güvenli teslimat' },
  { icon: ShieldCheck, title: 'Garantili Ürün', desc: 'Her ürün test edilir, kalite belgesiyle gönderilir' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title="Hakkımızda"
        description="Polen Stone - Anadolu'nun zengin doğal taş mirasını modern mekânlara taşıyan premium mermer ve doğal taş markası."
      />
      <Header />

      <main className="pt-6 pb-12">
        {/* HERO */}
        <section className="px-4 sm:px-6 py-12 lg:py-16 bg-[#0F0F0F] border-b border-white/8">
          <div className="max-w-6xl mx-auto">
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-white/55 mb-8"
            >
              <Link href="/" data-testid="link-home" className="hover:text-white transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Hakkımızda</span>
            </motion.nav>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-xs tracking-[0.3em] uppercase text-white mb-4 block font-semibold">
                  Türkiye'nin Doğal Taş Mirası
                </span>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-6 text-white leading-tight">
                  POLEN <span className="text-white">STONE</span><br />
                  <span className="text-white/45 text-2xl sm:text-3xl lg:text-4xl">Doğal Taş & Mermer</span>
                </h1>
                <p className="text-lg text-white/65 leading-relaxed mb-8">
                  Anadolu'nun bin yıllık taş kültürünü modern mekânlara taşıyan
                  premium doğal taş markasıyız. Mermer, granit, traverten ve oniks
                  koleksiyonumuzla mekânlarınıza eşsiz bir karakter katıyoruz.
                </p>

                <div className="flex flex-wrap gap-3">
                  {values.map((value, index) => (
                    <motion.div
                      key={value.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-[#141414] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-2 hover:border-white/40 transition-colors"
                      data-testid={`value-${value.label}`}
                    >
                      <value.icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                      <span className="font-medium text-white">{value.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-[#141414] border border-white/8 rounded-2xl p-6 text-center hover:border-white/40 transition-colors"
                    data-testid={`stat-${stat.label}`}
                  >
                    <p className="font-display text-4xl lg:text-5xl tracking-wide text-white mb-2">{stat.number}</p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-16 lg:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="text-xs tracking-[0.3em] uppercase text-white mb-4 block font-semibold">Neden Polen Stone?</span>
              <h2 className="font-display text-3xl sm:text-4xl tracking-wider text-white">FARK YARATAN ÖZELLİKLER</h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-[#141414] border border-white/8 rounded-2xl p-6 hover:border-white/40 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                  data-testid={`feature-${feature.title}`}
                >
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                    <feature.icon className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-xl tracking-wide mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* VISION & MISSION */}
        <section className="py-16 lg:py-24 px-4 sm:px-6 bg-[#0F0F0F] border-y border-white/8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="text-xs tracking-[0.3em] uppercase text-white mb-4 block font-semibold">Hikâyemiz</span>
               <h2 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-4">VİZYON & MİSYON</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#141414] border border-white/8 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                  <Mountain className="w-6 h-6 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-2xl tracking-wide mb-4 text-white">VİZYONUMUZ</h3>
                <p className="text-white/65 leading-relaxed">
                  Anadolu'nun zengin doğal taş kaynaklarını, dünyanın dört bir yanındaki
                  prestijli projelere ulaştırmak. Her mekâna doğanın ihtişamını taşıyarak
                  Türk mermer ve doğal taş kültürünü uluslararası standartlarda temsil etmek.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#141414] border border-white/8 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                  <Hammer className="w-6 h-6 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-2xl tracking-wide mb-4 text-white">MİSYONUMUZ</h3>
                <p className="text-white/65 leading-relaxed">
                  Doğanın milyonlarca yılda ürettiği eşsiz dokuları, ustalıkla işleyip
                  müşterilerimize sunmak. Her projeyi kişiye özel bir hikâye olarak ele
                  alıp, kalite ve estetikten ödün vermeden teslim etmek.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="py-16 lg:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#141414] border border-white/30 rounded-3xl p-8 lg:p-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                  <Instagram className="w-8 h-8 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-2xl tracking-wider mb-4 text-white">BİZİ TAKİP EDİN</h3>
                <p className="text-white/65 mb-6">
                  Yeni gelen taşlar, tamamlanan projeler ve mekân ilhamları için
                  Instagram'da bizi takip edin.
                </p>
                <a
                  href="https://www.instagram.com/polenstone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-black font-bold py-4 px-8 rounded-full hover:bg-white/85 transition-colors"
                  data-testid="link-instagram"
                >
                  <Instagram className="w-5 h-5" />
                  @polenstone
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-[#141414] border border-white/8 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                <h3 className="font-display text-2xl tracking-wider mb-8 text-white">İLETİŞİM BİLGİLERİ</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm text-white/55 mb-1">Adres</p>
                      <p className="font-medium text-white" data-testid="text-address">
                        Yunus Emre, Barbaros Blv. 42 d, 34791 Sancaktepe / İstanbul
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm text-white/55 mb-1">Telefon</p>
                      <a href="tel:+905326956183" className="font-medium text-white hover:text-white transition-colors" data-testid="link-phone">0532 695 61 83</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm text-white/55 mb-1">E-posta</p>
                      <a href="mailto:info@polenstone.com" className="font-medium text-white hover:text-white transition-colors" data-testid="link-email">info@polenstone.com</a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Truck, Package, Clock, MapPin } from 'lucide-react';

const highlights = [
  { icon: Package, label: 'Hazırlık & Kargo', desc: '1-3 iş günü içinde kargoya verilir' },
  { icon: Truck, label: 'Ücretsiz Kargo', desc: '2.500₺ ve üzeri siparişlerde' },
  { icon: Clock, label: 'Teslimat Süresi', desc: 'İstanbul içi 1-2, diğer iller 2-5 iş günü' },
  { icon: MapPin, label: 'Kargo Takibi', desc: 'E-posta ve SMS ile takip numarası' },
];

export default function DeliveryTerms() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title="Teslimat Koşulları - Polen Stone Doğal Taş & Mermer"
        description="Polen Stone Doğal Taş & Mermer teslimat koşulları, kargo süreleri ve ücretsiz kargo bilgileri."
      />
      <Header />

      <main className="pt-6 pb-12">
        <section className="px-4 sm:px-6 py-12 lg:py-16 bg-[#0F0F0F] border-b border-white/8">
          <div className="max-w-4xl mx-auto">
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-white/55 mb-8"
            >
              <Link href="/" data-testid="link-home" className="hover:text-white transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Teslimat Koşulları</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-white mb-4 block font-semibold">
                Kargo & Teslimat
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-6 text-white">
                TESLİMAT<br />
                <span className="text-white/45">KOŞULLARI</span>
              </h1>
              <p className="text-lg text-white/65 max-w-2xl mb-10 leading-relaxed">
                Siparişlerinizi güvenli ve hızlı bir şekilde kapınıza ulaştırıyoruz. Teslimat
                süreleri ve koşullarımız hakkında tüm detayları aşağıda bulabilirsiniz.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-[#141414] border border-white/8 rounded-xl p-5 hover:border-white/40 transition-colors"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold mb-1 text-white">{item.label}</h3>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-wide prose-headings:text-white prose-h2:text-xl prose-h2:border-b prose-h2:border-white/8 prose-h2:pb-3 prose-h2:mb-4 prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white prose-a:text-white hover:prose-a:underline">
                <h2>1) Genel Bilgiler</h2>
                <p>
                  Polen Stone olarak siparişlerinizi güvenli, hızlı ve eksiksiz şekilde teslim etmeyi hedefliyoruz.
                  Web sitemiz üzerinden yapılan tüm alışverişlerde aşağıdaki koşullar geçerlidir.
                </p>

                <h2>2) Sipariş Onayı ve Hazırlık Süreci</h2>
                <ul>
                  <li>Ödeme onaylandıktan sonra siparişiniz hazırlanmaya başlar.</li>
                  <li>Ürünler genellikle <strong>1-3 iş günü</strong> içinde kargoya verilir.</li>
                  <li>Stok durumu ve yoğunluğa bağlı olarak bu süre değişebilir.</li>
                </ul>

                <h2>3) Tahmini Teslimat Süreleri</h2>
                <ul>
                  <li><strong>İstanbul içi:</strong> 1-2 iş günü</li>
                  <li><strong>Büyükşehirler:</strong> 2-3 iş günü</li>
                  <li><strong>Diğer iller:</strong> 2-5 iş günü</li>
                </ul>
                <p>Kargo firmasının yoğunluğu, hava koşulları ve resmi tatiller gibi faktörler teslimat sürelerini etkileyebilir.</p>

                <h2>4) Kargo Takibi</h2>
                <p>
                  Siparişiniz kargoya verildiğinde, <strong>kargo takip numarası</strong> e-posta ve/veya SMS yoluyla
                  tarafınıza iletilir. Bu numara ile kargo firmasının web sitesinden gönderinizi takip edebilirsiniz.
                </p>

                <h2>5) Ücretsiz Kargo</h2>
                <p>
                  <strong>2.500 ₺ ve üzeri</strong> siparişlerde kargo ücretsizdir. Bu tutarın altındaki
                  siparişlerde standart kargo ücreti uygulanır.
                </p>

                <h2>6) Teslimat Esnasında Dikkat Edilecekler</h2>
                <ul>
                  <li>Ürünü teslim alırken paketi mutlaka kontrol edin.</li>
                  <li>Hasar veya eksiklik durumunda kargo görevlisi eşliğinde <strong>tutanak</strong> tutturun.</li>
                  <li>Hasarlı ürünler için 24 saat içinde <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine bilgi verin.</li>
                </ul>

                <h2>7) Adres Değişikliği</h2>
                <p>
                  Siparişiniz henüz kargoya verilmediyse, teslimat adresinizi değiştirmek için
                  <a href="mailto:info@polenstone.com"> info@polenstone.com</a> adresi üzerinden bizimle
                  iletişime geçebilirsiniz.
                </p>

                <h2>8) Alıcı Bulunamadığında</h2>
                <p>
                  Alıcı adreste bulunamadığında, kargo firması genellikle <strong>2-3 teslimat denemesi</strong>
                  yapar. Ulaşılamazsa ürün şubeye bırakılır veya geri döner. Geri dönüş durumunda yeniden gönderim
                  için ek ücret talep edilebilir.
                </p>

                <h2>9) İletişim</h2>
                <p>Kargo ve teslimatla ilgili sorularınız için bizimle iletişime geçebilirsiniz:</p>
                <ul>
                  <li><strong>E-posta:</strong> <a href="mailto:info@polenstone.com">info@polenstone.com</a></li>
                  <li><strong>Telefon:</strong> <a href="tel:+905326956183">0532 695 61 83</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

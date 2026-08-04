import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, RotateCcw, Clock, Package, CheckCircle, XCircle } from 'lucide-react';

const highlights = [
  { icon: RotateCcw, label: '14 Gün Cayma Hakkı', desc: 'Hiçbir gerekçe göstermeden iade' },
  { icon: Clock, label: '7 İş Günü', desc: 'Ücret iadesi süresi' },
  { icon: Package, label: 'Kolay Değişim', desc: 'Renk ve ölçü değişimi' },
];

export default function CancellationPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title="İptal ve İade Politikası - Polen Stone Doğal Taş & Mermer"
        description="Polen Stone Doğal Taş & Mermer ürün iade, değişim ve iptal koşulları."
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
              <span className="text-white">İptal ve İade Politikası</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-white mb-4 block font-semibold">
                İade & Değişim
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-6 text-white">
                İPTAL VE İADE<br />
                <span className="text-white/45">POLİTİKASI</span>
              </h1>
              <p className="text-lg text-white/65 max-w-2xl mb-10 leading-relaxed">
                Müşteri memnuniyeti önceliğimizdir. Kolay iade ve değişim süreçleriyle alışverişlerinizi
                güvence altına alıyoruz.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-[#141414] border border-white/8 rounded-xl p-6 text-center hover:border-white/40 transition-colors"
                  >
                    <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-7 h-7 text-white" strokeWidth={1.75} />
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
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-4"
            >
              <div className="bg-[#141414] border border-white/8 rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white/60" />
                  </div>
                  <h3 className="font-display text-lg tracking-wide text-white">İade Edilebilir</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-white/60 mt-1">•</span>
                    Kullanılmamış, orijinal ambalajında ürünler
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/60 mt-1">•</span>
                    Etiketleri sökülmemiş ürünler
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/60 mt-1">•</span>
                    Fatura ile birlikte gönderilen ürünler
                  </li>
                </ul>
              </div>

              <div className="bg-[#141414] border border-[#F04444]/40 rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#F04444]/10 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-[#F04444]" />
                  </div>
                  <h3 className="font-display text-lg tracking-wide text-white">İade Edilemez</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-[#F04444] mt-1">•</span>
                    Projeye özel ölçüde kesilmiş veya işlenmiş plaka, fayans ve tezgâh ürünleri
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F04444] mt-1">•</span>
                    Yerine monte edilmiş, yapıştırılmış veya işlem görmüş doğal taşlar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F04444] mt-1">•</span>
                    Doğal taşın yapısından kaynaklanan ton, damar ve desen farklılıkları (kusur sayılmaz)
                  </li>
                </ul>
              </div>
            </motion.div>

            <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-wide prose-headings:text-white prose-h2:text-xl prose-h2:border-b prose-h2:border-white/8 prose-h2:pb-3 prose-h2:mb-4 prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white prose-a:text-white hover:prose-a:underline">
                <h2>1) Genel İlkeler</h2>
                <ul>
                  <li>İade/iptal işlemleri 6502 sayılı Kanun ve Mesafeli Satış Sözleşmeleri Yönetmeliği'ne uygun şekilde yürütülür.</li>
                  <li>İşlem için sipariş numaranızı hazır bulundurunuz.</li>
                  <li>Tüm başvurular <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine yazılı olarak yapılmalıdır.</li>
                </ul>

                <h2>2) Sipariş İptali</h2>
                <ul>
                  <li><strong>Kargo çıkışından önce:</strong> Sipariş numaranızla birlikte <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine yazarak iptal talebinde bulunabilirsiniz. Mümkünse aynı gün işleme alınır.</li>
                  <li><strong>Kargo çıkışından sonra:</strong> İptal yapılamaz. Bu durumda <strong>iade</strong> süreci uygulanır.</li>
                </ul>

                <h2>3) Cayma Hakkı (14 Gün)</h2>
                <p>
                  <strong>Ürünü teslim aldığınız tarihten itibaren 14 gün içinde</strong> herhangi bir gerekçe göstermeksizin cayma hakkınızı kullanabilirsiniz.
                </p>
                <ul>
                  <li>Ürün kullanılmamış, orijinal ambalajında, etiketleri tam ve yeniden satılabilir durumda olmalıdır.</li>
                  <li>Fatura, aksesuar, hediye/promosyon ürünleri ve tüm parçalar eksiksiz gönderilmelidir.</li>
                  <li>Cayma hakkı bildirimi <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine yazılı olarak yapılmalıdır.</li>
                </ul>

                <h2>4) İade Süreci</h2>
                <p>İade süreci şu şekilde işler:</p>
                <ol>
                  <li>İade talebinizi <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine iletin ve <strong>sipariş numaranızı</strong> belirtin.</li>
                  <li>Onay sonrası ürünü <strong>orijinal ambalajında</strong>, fatura ve aksesuarlarıyla birlikte paketleyin.</li>
                  <li>Belirtilen adrese kargo ile gönderin.</li>
                  <li>Ürün tarafımıza ulaştığında kontrol edilir.</li>
                  <li>Kontrol sonrası <strong>en geç 7 iş günü</strong> içinde ücret iadesi yapılır.</li>
                </ol>

                <h2>5) Ücret İadesi</h2>
                <ul>
                  <li>Ücret, ödeme yapılan yönteme (kredi kartı, banka kartı, havale) iade edilir.</li>
                  <li>İade, banka işlem sürelerine bağlı olarak hesabınıza 5-10 iş günü içinde yansıyabilir.</li>
                  <li>Kapıda ödeme ile alınan siparişlerde iade, IBAN bilgilerinize yapılır.</li>
                </ul>

                <h2>6) Ürün Değişimi</h2>
                <p>
                  Renk, ton veya ölçü değişikliği için <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresinden bilgi verebilirsiniz. Değişim için ürünün orijinal ambalajında ve işlem görmemiş halde olması, ayrıca iade koşullarını karşılaması gerekir.
                </p>

                <h2>7) Hasarlı veya Hatalı Ürün</h2>
                <p>
                  Teslimat sırasında veya açılışta fark edilen hasar ya da üretim hatasını <strong>24 saat</strong> içinde <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine bildirin. Fotoğraflı belge gönderilmesi süreci hızlandırır.
                </p>

                <h2>8) Kargo Ücreti</h2>
                <ul>
                  <li><strong>Cayma hakkı kullanımında:</strong> Kargo ücreti alıcıya aittir.</li>
                  <li><strong>Hatalı/hasarlı ürün iadesi:</strong> Kargo ücreti tarafımızca karşılanır.</li>
                </ul>

                <h2>9) İletişim</h2>
                <p>İade ve iptal işlemleri için destek ekibimize ulaşabilirsiniz:</p>
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

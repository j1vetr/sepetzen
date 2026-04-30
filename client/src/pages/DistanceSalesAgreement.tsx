import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, Shield, CheckCircle, Clock } from 'lucide-react';

const highlights = [
  { icon: FileText, label: 'Yasal Sözleşme' },
  { icon: Shield, label: '6502 Sayılı Kanun' },
  { icon: CheckCircle, label: 'Güvence' },
  { icon: Clock, label: '14 Gün Cayma' },
];

export default function DistanceSalesAgreement() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Mesafeli Satış Sözleşmesi - Polen Stone Doğal Taş & Mermer"
        description="Polen Stone Doğal Taş & Mermer mesafeli satış sözleşmesi ve alışveriş koşulları."
      />
      <Header />

      <main className="pt-20 lg:pt-6 pb-12">
        <section className="px-4 sm:px-6 py-12 lg:py-16 bg-white border-b border-black/[0.06]">
          <div className="max-w-4xl mx-auto">
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-black/55 mb-8"
            >
              <Link href="/" data-testid="link-home" className="hover:text-polen-orange transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-black">Mesafeli Satış Sözleşmesi</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-polen-orange mb-4 block font-semibold">
                Yasal Bilgiler
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-6 text-black">
                MESAFELİ SATIŞ<br />
                <span className="text-black/45">SÖZLEŞMESİ</span>
              </h1>
              <p className="text-lg text-black/65 max-w-2xl mb-10 leading-relaxed">
                6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
                kapsamında hazırlanmış resmi sözleşme metnidir.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-stone-50 border border-black/[0.08] rounded-xl p-4 text-center hover:border-polen-orange/40 transition-colors"
                  >
                    <div className="w-10 h-10 bg-polen-orange/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <item.icon className="w-5 h-5 text-polen-orange" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-medium text-black">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.08)]">
              <div className="prose prose-zinc max-w-none prose-headings:font-display prose-headings:tracking-wide prose-headings:text-black prose-h2:text-xl prose-h2:border-b prose-h2:border-black/10 prose-h2:pb-3 prose-h2:mb-4 prose-p:text-black/70 prose-li:text-black/70 prose-strong:text-black prose-a:text-polen-orange hover:prose-a:underline">
                <h2>1) Taraflar</h2>
                <p><strong>Satıcı:</strong> Polen Stone Doğal Taş & Mermer</p>
                <p><strong>Adres:</strong> Yunus Emre, Barbaros Blv. 42 d, 34791 Sancaktepe / İstanbul</p>
                <p><strong>Telefon:</strong> <a href="tel:+905326956183">0532 695 61 83</a></p>
                <p><strong>E-posta:</strong> <a href="mailto:info@polenstone.com">info@polenstone.com</a></p>
                <p><strong>Web Sitesi:</strong> <a href="https://www.polenstone.com">www.polenstone.com</a></p>
                <p><strong>Alıcı:</strong> Polenstone.com.tr üzerinden sipariş veren müşteridir. Alıcının adı, soyadı, adresi ve iletişim bilgileri sipariş formunda yer alır.</p>

                <h2>2) Sözleşmenin Konusu</h2>
                <p>
                  Bu sözleşmenin konusu, alıcının <strong>www.polenstone.com</strong> web sitesinden elektronik ortamda sipariş verdiği ürünün satışı, teslimatı, ödemesi ve tarafların 6502 sayılı Kanun ile Mesafeli Satışlar Yönetmeliği hükümleri doğrultusunda hak ve yükümlülüklerinin belirlenmesidir.
                </p>

                <h2>3) Ürün/Hizmet Bilgileri</h2>
                <p>
                  Ürünlerin türü, miktarı, marka/model, renk, satış fiyatı, ödeme şekli ve teslimat bilgileri, alıcı tarafından sistemde onaylanmadan önce görüntülenir. Bu bilgiler sipariş özet ekranında yer alır ve elektronik olarak onaylanır.
                </p>

                <h2>4) Teslimat Şartları</h2>
                <p>
                  Ürünler, alıcının belirttiği teslimat adresine gönderilir. Tüm teslimat detayları <Link href="/teslimat-kosullari">Teslimat Koşulları</Link> sayfasında açıklanmıştır. Teslimat süresi, stok durumu ve kargo firmasının operasyonel yoğunluğuna göre değişebilir.
                </p>

                <h2>5) Ödeme Yöntemi</h2>
                <p>
                  Alıcı, ürünün bedelini kredi kartı, banka kartı, havale/EFT veya sitede sunulan diğer ödeme yöntemleriyle ödeyebilir. Ödeme tamamlanmadan sipariş işleme alınmaz. Promosyon fiyatları ve indirim kodları belirtilen süre ve koşullar için geçerlidir.
                </p>

                <h2>6) Cayma Hakkı</h2>
                <p>
                  <strong>Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde</strong> herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir. Bu hakkın kullanılabilmesi için ürünün kullanılmamış, orijinal ambalajında ve yeniden satılabilir durumda olması gerekir.
                </p>
                <p>
                  Cayma hakkını kullanmak isteyen alıcılar bu süre içinde <a href="mailto:info@polenstone.com">info@polenstone.com</a> adresine yazılı olarak bildirmelidir.
                </p>

                <h2>7) Cayma Hakkının Kullanılamayacağı Durumlar</h2>
                <ul>
                  <li>Alıcının isteği üzerine özel ölçü, kesim, yüzey işlemi veya işleme ile üretilen plaka, fayans ve tezgâh ürünlerinde,</li>
                  <li>Yerine monte edilmiş, yapıştırılmış veya işçilik uygulanmış doğal taş ürünlerinde,</li>
                  <li>Ambalajı açılmış, kullanılmış veya yeniden satılamayacak duruma gelmiş ürünlerde,</li>
                  <li>Doğal taşın yapısından kaynaklanan ton, damar ve desen farklılıkları cayma hakkı gerekçesi olarak kabul edilmez.</li>
                </ul>

                <h2>8) İade Süreci</h2>
                <p>
                  Alıcı cayma hakkını kullandığında, ürünün fatura, kutu, aksesuar ve tüm parçalarıyla birlikte eksiksiz olarak Polen Stone'a iade edilmesi gerekir. Ürün tarafımıza ulaştıktan sonra <strong>en geç 7 iş günü</strong> içinde, alıcının ödeme yaptığı yönteme ücret iadesi yapılır.
                </p>

                <h2>9) Garanti ve Ürün Sorumluluğu</h2>
                <p>
                  Satıcı, satılan doğal taş ürünlerdeki üretim ve işleme kaynaklı hatalardan sorumludur. Kullanıcı hatası (uygun olmayan kimyasal ve aşındırıcı temizleyici kullanımı, hatalı montaj veya derz uygulaması, ağır darbe, yanlış uygulama alanında kullanım vb.) ile doğal taşın yapısından kaynaklanan ton, damar ve desen farklılıkları garanti kapsamı dışındadır. Garanti süreleri ve koşulları ürüne göre değişebilir.
                </p>

                <h2>10) Gizlilik ve Kişisel Verilerin Korunması</h2>
                <p>
                  Alıcının kişisel verileri, <Link href="/kvkk">KVKK Aydınlatma Metni</Link>'nde belirtilen ilkeler doğrultusunda işlenir. Satıcı, müşterilerin kişisel bilgilerini üçüncü kişilerle paylaşmaz; paylaşım yalnızca teslimat ve ödeme süreçlerinde zorunlu olduğu ölçüde gerçekleşebilir.
                </p>

                <h2>11) Mücbir Sebepler</h2>
                <p>
                  Doğal afet, savaş, salgın, grev, kargo firması kaynaklı gecikmeler gibi öngörülemeyen durumlarda taraflar, yükümlülüklerini yerine getirememelerinden dolayı sorumlu tutulamaz.
                </p>

                <h2>12) Uyuşmazlık Çözümü</h2>
                <p>
                  Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nın açıkladığı parasal limitler dahilinde alıcı veya satıcının yerleşim yerindeki <strong>Tüketici Hakem Heyetleri</strong> veya <strong>Tüketici Mahkemeleri</strong> yetkilidir.
                </p>

                <h2>13) Yürürlük</h2>
                <p>
                  Alıcı, <strong>www.polenstone.com</strong> üzerinden sipariş vererek bu sözleşmenin tüm şartlarını elektronik olarak kabul etmiş sayılır. Bu sözleşme, siparişin tamamlanmasıyla yürürlüğe girer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

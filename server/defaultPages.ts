/**
 * Yasal ve bilgi sayfalarinin varsayilan icerikleri.
 *
 * Bu icerikler sunucu acilisinda 'pages' tablosunda EKSIK olan slug'lar icin
 * otomatik olusturulur (bkz. seedDefaultPages, server/index.ts). Mevcut veya
 * admin panelinden duzenlenmis sayfalara ASLA dokunulmaz; bu modul yalnizca
 * temiz kurulumlarin (or. yeni sunucu/veritabani) bos yasal sayfalarla
 * acilmasini engeller.
 *
 * Icerik guncellemeleri admin paneli uzerinden yapilmalidir; buradaki metinler
 * yalnizca ilk kurulum varsayilanidir.
 */

export interface DefaultPage {
  slug: string;
  title: string;
  content: string;
}

export const DEFAULT_PAGES: DefaultPage[] = [
  {
    slug: "iletisim",
    title: "İletişim",
    content: `<h2>Bize Ulaşın</h2>
<p>Sorularınız ve sipariş öncesi bilgi için bizimle iletişime geçebilirsiniz.</p>
<h2>İletişim Bilgileri</h2>
<ul>
<li><strong>Yetkili:</strong> Ahmet Uğur Durmaz</li>
<li><strong>Telefon / WhatsApp:</strong> 0536 630 11 38</li>
<li><strong>E-posta:</strong> sepetzen@gmail.com</li>
<li><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</li>
</ul>
<h2>Çalışma Saatleri</h2>
<p>Pazartesi - Cumartesi: 09:00 - 18:00</p>
<p>Pazar: Kapalı</p>`,
  },
  {
    slug: "hakkimizda",
    title: "Hakkımızda",
    content: `<h2>Sepetzen Kimdir?</h2>
<p>Sepetzen, 2020 yılında Dalaman, Muğla'da kurulmuş bir kamp, outdoor ve bıçak markasıdır. Doğanın içinde zaman geçiren insanların ihtiyaçlarını karşılamak amacıyla yola çıktık.</p>
<p>Ahmet Uğur Durmaz liderliğinde küçük bir ekip tarafından yönetilen Sepetzen; av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri alanlarında faaliyet göstermektedir.</p>
<h2>Vizyonumuz</h2>
<p>Türkiye'nin doğal zenginliklerine duyulan saygıyı, kaliteli ürünlerle buluşturmak. Her bıçak, her ekipman; bir hikayenin parçasıdır.</p>
<h2>Neden Sepetzen?</h2>
<ul>
<li>El seçimi, kalite kontrollü ürünler</li>
<li>Hızlı ve güvenli kargo (belirli tutar üzeri siparişlerde ücretsiz)</li>
<li>Uzman kadro ile kişisel müşteri hizmetleri</li>
<li>Dalaman merkezli, Türkiye geneli hizmet</li>
</ul>
<h2>İletişim</h2>
<p><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>
<p><strong>Telefon:</strong> 0536 630 11 38</p>
<p><strong>E-posta:</strong> sepetzen@gmail.com</p>`,
  },
  {
    slug: "kargo-sureci",
    title: "Kargo Süreci",
    content: `<h2>KARGO VE TESLİMAT</h2>
<h3>1. Sipariş Hazırlama Süresi</h3>
<p>Siparişleriniz, ödeme onayından itibaren 1-3 iş günü içinde özenle hazırlanır ve kargoya teslim edilir. Yoğun kampanya dönemlerinde bu süre kısa bir uzama gösterebilir; böyle bir durumda size bilgi verilir.</p>
<h3>2. Teslimat Süresi</h3>
<p>Kargoya verilen siparişler, bulunduğunuz bölgeye göre genellikle 1-4 iş günü içinde adresinize teslim edilir. Toplam teslimat süresi sipariş onayından itibaren ortalama 3-7 iş günüdür. Mesafeli Sözleşmeler Yönetmeliği uyarınca teslimat süresi her halükarda 30 günü aşamaz.</p>
<h3>3. Kargo Ücreti</h3>
<ul>
<li>Belirli tutar ve üzeri siparişlerde kargo <strong>ücretsizdir</strong>. Güncel ücretsiz kargo tutarı sepet sayfasında görüntülenir.</li>
<li>Bu tutarın altındaki siparişlerde kargo ücreti, ödeme adımından önce sepette açıkça gösterilir.</li>
</ul>
<h3>4. Kargo Firması ve Takip</h3>
<p>Siparişleriniz anlaşmalı kargo firmalarıyla (Yurtiçi Kargo, MNG Kargo, Aras Kargo vb.) gönderilmektedir. Siparişiniz kargoya verildiğinde takip numaranız e-posta ve/veya SMS ile iletilir; ayrıca sipariş takip sayfasından gönderinizin durumunu anlık olarak izleyebilirsiniz.</p>
<h3>5. Teslimat Sırasında Kontrol</h3>
<p>Paketi teslim alırken lütfen dış ambalajı kontrol edin. Hasarlı, ezik veya açılmış paketleri teslim almadan önce kargo görevlisine tutanak tutturmanızı öneririz. Tutanak tutulmayan hasarlı teslimatlarda sorumluluk kabul edilebilmesi için teslimatı takip eden 24 saat içinde bize fotoğraflarla birlikte ulaşmanız gerekir.</p>
<h3>6. Adres Bilgileri</h3>
<p>Teslimatın sorunsuz gerçekleşmesi için adres ve telefon bilgilerinizin eksiksiz ve güncel olduğundan emin olun. Yanlış veya eksik adres bilgisi nedeniyle oluşan ek kargo giderleri alıcıya aittir.</p>
<h3>7. Teslim Alınamayan Gönderiler</h3>
<p>Kargo firması adresinizde sizi bulamazsa haber kağıdı bırakır ve gönderi belirli bir süre şubede bekletilir. Bu süre içinde teslim alınmayan gönderiler tarafımıza iade edilir; yeniden gönderim için bizimle iletişime geçebilirsiniz.</p>
<h3>İletişim</h3>
<p>Kargo süreciyle ilgili her türlü sorunuz için <strong>sepetzen@gmail.com</strong> adresinden veya <strong>0536 630 11 38</strong> numaralı telefondan bize ulaşabilirsiniz.</p>`,
  },
  {
    slug: "iade-sureci",
    title: "İade Süreci",
    content: `<h2>İADE SÜRECİ</h2>
<h3>1. İade Hakkınız</h3>
<p>6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ürünü teslim aldığınız tarihten itibaren <strong>14 gün</strong> içinde hiçbir gerekçe göstermeksizin cayma hakkınızı kullanabilirsiniz. Cayma hakkının detayları ve istisnaları için İptal ve İade Şartları sayfamızı inceleyebilirsiniz.</p>
<h3>2. İade Nasıl Başlatılır?</h3>
<p>İade talebinizi başlatmak için aşağıdaki bilgileri <strong>sepetzen@gmail.com</strong> adresine gönderin:</p>
<table>
<tr><th>Alan</th><th>Bilgi</th></tr>
<tr><td>Ad Soyad</td><td></td></tr>
<tr><td>Sipariş Numarası</td><td></td></tr>
<tr><td>Ürün Adı</td><td></td></tr>
<tr><td>İade Nedeni</td><td></td></tr>
<tr><td>Telefon</td><td></td></tr>
</table>
<p>Talebiniz incelendikten sonra size 1-2 iş günü içinde dönüş yapılır.</p>
<h3>3. Ürünün Gönderilmesi</h3>
<p>İade talebiniz onaylandığında ürünü, faturası ve tüm aksesuar/ambalajı ile birlikte aşağıdaki adrese gönderebilirsiniz:</p>
<p><strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></p>
<p>Ürünün iade sürecinde zarar görmemesi için orijinal ambalajında veya uygun koruyucu ambalajla göndermenizi öneririz.</p>
<h3>4. İade Kontrolü ve Para İadesi</h3>
<p>İade edilen ürün tarafımıza ulaştıktan sonra kontrol edilir. İadenin uygun bulunması halinde ödemeniz, cayma bildiriminizin bize ulaştığı tarihten itibaren en geç <strong>14 gün</strong> içinde, satın alırken kullandığınız ödeme yöntemiyle iade edilir. Bankanıza bağlı olarak tutarın hesabınıza yansıması birkaç iş günü sürebilir.</p>
<h3>5. Değişim</h3>
<p>Ürün değişimi talepleriniz için iade sürecini başlatıp yeni sipariş oluşturabilir veya bizimle iletişime geçerek size en uygun çözümü birlikte belirleyebiliriz.</p>
<h3>İletişim</h3>
<p>İade süreciyle ilgili sorularınız için <strong>sepetzen@gmail.com</strong> adresinden veya <strong>0536 630 11 38</strong> numaralı telefondan bize ulaşabilirsiniz.</p>`,
  },
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi",
    content: `<h2>MESAFELİ SATIŞ SÖZLEŞMESİ</h2>
  <p>Bu Mesafeli Satış Sözleşmesi ("Sözleşme"), aşağıda bilgileri verilen Satıcı ile Alıcı arasında, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde akdedilmiştir.</p>

  <h3>Madde 1 – Taraflar</h3>
  <p><strong>SATICI:</strong></p>
  <ul>
  <li><strong>Ünvan:</strong> Ahmet Uğur Durmaz (Sepetzen)</li>
  <li><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</li>
  <li><strong>Telefon:</strong> 0536 630 11 38</li>
  <li><strong>E-posta:</strong> sepetzen@gmail.com</li>
  <li><strong>Web sitesi:</strong> sepetzen.com</li>
  </ul>
  <p><strong>ALICI:</strong> Sipariş formunda beyan edilen ad, adres ve iletişim bilgilerine sahip kişi.</p>

  <h3>Madde 2 – Sözleşmenin Konusu</h3>
  <p>İşbu Sözleşme, Alıcı'nın Satıcı'ya ait sepetzen.com internet sitesinden elektronik ortamda siparişini yaptığı aşağıda nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini kapsamaktadır.</p>

  <h3>Madde 3 – Sözleşme Konusu Ürün/Ürünler</h3>
  <p>Malın/Ürünün temel özellikleri (türü, miktarı, marka/modeli, rengi, adedi) ve satış fiyatı dahil tüm vergiler dahil toplam satış bedeli sipariş özetinde ve ödeme sayfasında gösterilmektedir.</p>

  <h3>Madde 4 – Genel Hükümler</h3>
  <p>4.1. Alıcı, sepetzen.com internet sitesinde sözleşme konusu ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</p>
  <p>4.2. Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile her bir ürün için Alıcı'nın yerleşim yeri uzaklığına bağlı olarak ön bilgiler içinde açıklanan süre içinde Alıcı veya Alıcı'nın gösterdiği adresteki kişi/kuruluşa teslim edilir.</p>
  <p>4.3. Sözleşme konusu ürün, Alıcı'dan başka bir kişi/kuruluşa teslim edilecek ise, teslim edilecek kişi/kuruluşun teslimatı kabul etmemesinden Satıcı sorumlu tutulamaz.</p>
  <p>4.4. Satıcı, sözleşme konusu ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri ve kullanım kılavuzları ile teslim edilmesinden sorumludur.</p>
  <p>4.5. Sözleşme konusu ürünün teslimatı için işbu Sözleşme'nin imzalı nüshasının Satıcı'ya ulaştırılması şarttır. Herhangi bir nedenle ürün bedeli ödenmez veya banka kayıtlarında iptal edilir ise, Satıcı ürünün teslimi yükümlülüğünden kurtulmuş kabul edilir.</p>

  <h3>Madde 5 – Cayma Hakkı</h3>
  <p>5.1. Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa teslim tarihinden itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>
  <p>5.2. Cayma hakkının kullanılması için bu süre içinde Satıcı'ya e-posta veya telefon ile bildirimde bulunulması ve ürünün aşağıdaki Madde 6 hükümleri çerçevesinde iade edilmesi şarttır.</p>
  <p>5.3. Aşağıdaki hallerde cayma hakkı kullanılamaz:</p>
  <ul>
  <li>Fiyatı finansal piyasalardaki dalgalanmalara bağlı olarak değişen ve Satıcı'nın kontrolünde olmayan mal veya hizmetlere ilişkin sözleşmeler,</li>
  <li>Alıcı'nın istekleri veya açıkça onun kişisel ihtiyaçları doğrultusunda hazırlanan mallara ilişkin sözleşmeler,</li>
  <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek mallara ilişkin sözleşmeler,</li>
  <li>Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış; iadesi sağlık ve hijyen açısından uygun olmayan mallara ilişkin sözleşmeler.</li>
  </ul>

  <h3>Madde 6 – İade Prosedürü</h3>
  <p>6.1. Cayma hakkının kullanıldığına dair bildirimin Satıcı'ya ulaşmasından itibaren Satıcı, tahsil etmiş olduğu tüm ödemeleri 14 (on dört) gün içinde iade etmekle yükümlüdür.</p>
  <p>6.2. Alıcı, cayma hakkını kullanmasından itibaren 10 (on) gün içinde ürünü iade etmekle yükümlüdür.</p>
  <p>6.3. İade kargosunun ücreti Alıcı'ya aittir; ürün orijinal ambalajında, kullanılmamış ve hasarsız olarak iade edilmelidir.</p>

  <h3>Madde 7 – Teslimata İlişkin Hükümler</h3>
  <p>7.1. Ürünler sipariş onayından itibaren 3-7 iş günü içinde kargo ile gönderilir.</p>
  <p>7.2. Belirli tutar ve üzeri siparişlerde kargo ücretsizdir; güncel tutar ve kargo ücreti sipariş esnasında sepette gösterilir.</p>
  <p>7.3. Kargo firmasının kusuru nedeniyle doğan gecikmelerden Satıcı sorumlu değildir.</p>

  <h3>Madde 8 – Uyuşmazlık Çözümü</h3>
  <p>İşbu Sözleşme'den doğan uyuşmazlıklarda, Gümrük ve Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici Hakem Heyetleri, bu değerin üzerindeki uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir. Yetkili Hakem Heyeti ve Tüketici Mahkemesi, Dalaman ilçesinde bulunan heyetler ve mahkemelerdir.</p>

  <h3>Madde 9 – Yürürlük</h3>
  <p>Alıcı, sipariş onay sürecinde elektronik ortamda ön bilgileri onaylamasıyla işbu Sözleşme'nin tüm koşullarını kabul etmiş sayılır. Bu Sözleşme, sipariş onayı anında yürürlüğe girer ve her iki taraf için bağlayıcıdır.</p>`,
  },
  {
    slug: "on-bilgilendirme-formu",
    title: "Ön Bilgilendirme Formu",
    content: `<h2>ÖN BİLGİLENDİRME FORMU</h2>
<p>İşbu Ön Bilgilendirme Formu, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, satışa konu ürünlere ve satış sürecine ilişkin olarak Alıcı'yı sipariş öncesinde bilgilendirmek amacıyla hazırlanmıştır.</p>
<h3>1. Satıcı Bilgileri</h3>
<ul>
<li><strong>Ünvan:</strong> Ahmet Uğur Durmaz (Sepetzen)</li>
<li><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</li>
<li><strong>Telefon:</strong> 0536 630 11 38</li>
<li><strong>E-posta:</strong> sepetzen@gmail.com</li>
<li><strong>Web sitesi:</strong> sepetzen.com</li>
</ul>
<h3>2. Ürün Bilgileri</h3>
<p>Sipariş edilen ürünlerin temel nitelikleri (türü, markası, modeli, adedi), tüm vergiler dahil satış fiyatı ve varsa ek masraflar sipariş özetinde ve ödeme sayfasında açıkça yer almaktadır.</p>
<h3>3. Ödeme Bilgileri</h3>
<p>Ödeme, sitede sunulan yöntemlerle (kredi kartı, banka kartı, havale/EFT vb.) yapılabilir. Vadeli satışlarda taksit ve faiz bilgileri ödeme sayfasında gösterilir. Ödeme altyapısı güvenli ödeme kuruluşları üzerinden sağlanır; kart bilgileri Satıcı tarafından saklanmaz.</p>
<h3>4. Teslimat Bilgileri</h3>
<p>Ürünler, sipariş onayından itibaren ortalama 3-7 iş günü içinde, Alıcı'nın sipariş sırasında bildirdiği adrese anlaşmalı kargo firması aracılığıyla teslim edilir. Teslimat süresi her halükarda 30 günü aşamaz. Belirli tutar üzeri siparişlerde kargo ücretsizdir; güncel tutar ve kargo ücreti sepette gösterilir.</p>
<h3>5. Cayma Hakkı</h3>
<p>Alıcı, ürünü teslim aldığı tarihten itibaren <strong>14 gün</strong> içinde hiçbir gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma bildirimi sepetzen@gmail.com adresine yazılı olarak iletilebilir. Cayma hakkının istisnaları (kişiye özel üretilen ürünler, hijyen açısından iadesi uygun olmayan ürünler vb.) İptal ve İade Şartları sayfasında ayrıntılı olarak açıklanmıştır.</p>
<h3>6. Şikayet ve Başvuru</h3>
<p>Alıcı, şikayet ve itirazlarını yukarıdaki iletişim kanallarından Satıcı'ya iletebilir. Ayrıca, Ticaret Bakanlığınca her yıl belirlenen parasal sınırlar çerçevesinde yerleşim yerindeki Tüketici Hakem Heyetine veya Tüketici Mahkemesine başvurabilir.</p>
<p>Alıcı, siparişi onaylamadan önce işbu Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okuduğunu ve bilgilendirildiğini kabul eder.</p>`,
  },
  {
    slug: "uyelik-sozlesmesi",
    title: "Üyelik Sözleşmesi",
    content: `<h2>ÜYELİK SÖZLEŞMESİ</h2>
  <p>Bu Üyelik Sözleşmesi ("Sözleşme"), sepetzen.com internet sitesini ("Site") işleten Ahmet Uğur Durmaz (bundan böyle "Sepetzen" olarak anılacaktır) ile bu Sözleşme'yi kabul ederek Siteye üye olan kişi ("Üye") arasında akdedilmiştir.</p>

  <h3>Madde 1 – Taraflar ve Konu</h3>
  <p><strong>Sepetzen:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla - sepetzen@gmail.com - 0536 630 11 38</p>
  <p>İşbu Sözleşme; Üye'nin Site'ye üye olma ve Site üzerinden gerçekleştireceği alışveriş işlemlerine ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.</p>

  <h3>Madde 2 – Üyelik Koşulları ve Prosedürü</h3>
  <p>2.1. Site'ye üye olabilmek için 18 (on sekiz) yaşını doldurmuş olmak ve fiil ehliyetine sahip bulunmak zorunludur.</p>
  <p>2.2. Üyelik, üyelik formunun doldurulup onaylanması ve işbu Sözleşme ile Sepetzen Gizlilik Politikası'nın kabul edilmesi ile tamamlanır.</p>
  <p>2.3. Üye, üyelik formunda gerçeğe aykırı, yanıltıcı veya eksik bilgi vermeyeceğini taahhüt eder. Aksi hâlde doğacak her türlü zarardan bizzat sorumludur.</p>
  <p>2.4. Her gerçek kişi yalnızca bir üyelik oluşturabilir; birden fazla üyelik oluşturulduğunun tespiti hâlinde Sepetzen, fazla üyelikleri kapatma hakkını saklı tutar.</p>

  <h3>Madde 3 – Üyenin Hak ve Yükümlülükleri</h3>
  <p>3.1. Üye; kullanıcı adı ve şifresinin gizliliğini korumakla yükümlüdür. Bu bilgilerin üçüncü kişilerle paylaşılması, kaybolması veya çalınması durumunda doğabilecek zararlardan Sepetzen sorumlu değildir.</p>
  <p>3.2. Üye, Site'yi yalnızca hukuka ve ahlaka uygun amaçlarla kullanacağını; Site'nin işleyişini engelleyecek ya da bozacak eylemlerden kaçınacağını kabul ve taahhüt eder.</p>
  <p>3.3. Üye, Site üzerinden gerçekleştirdiği işlemlerden kaynaklanan her türlü yasal sorumluluktan şahsen sorumludur.</p>
  <p>3.4. Üye, Site'deki içerik ve bilgilerin ticari amaçlarla kullanılamayacağını, kopyalanamayacağını, dağıtılamayacağını, başka bir platforma aktarılamayacağını kabul eder.</p>

  <h3>Madde 4 – Sepetzen'in Hak ve Yükümlülükleri</h3>
  <p>4.1. Sepetzen; Site'yi, ürünleri ve ödeme altyapısını yasal düzenlemelere uygun biçimde işletmekle yükümlüdür.</p>
  <p>4.2. Sepetzen, önceden haber vermeksizin Site içeriğinde, ürün yelpazesinde veya fiyatlarında değişiklik yapma hakkını saklı tutar.</p>
  <p>4.3. Sepetzen, teknik gereklilikler, bakım veya güncelleme sebebiyle Site'ye erişimi geçici olarak kısıtlayabilir.</p>

  <h3>Madde 5 – Kişisel Verilerin Korunması</h3>
  <p>5.1. Üye'ye ait kişisel veriler, Sepetzen Gizlilik Politikası ve 6698 sayılı KVKK çerçevesinde işlenir ve korunur.</p>
  <p>5.2. Üye, kişisel verilerinin işlenmesine ilişkin haklarını sepetzen@gmail.com adresine yazılı başvuru yoluyla kullanabilir.</p>

  <h3>Madde 6 – Üyeliğin Sona Ermesi</h3>
  <p>6.1. Üye, dilediği zaman sepetzen@gmail.com adresine yazılı bildirimde bulunarak üyeliğini sonlandırabilir. Üyeliğin sonlandırılması, daha önce verilmiş siparişlere ilişkin hak ve yükümlülükleri ortadan kaldırmaz.</p>
  <p>6.2. Sepetzen, Üye'nin işbu Sözleşme'ye, Site kullanım koşullarına veya yasal düzenlemelere aykırı davranması hâlinde, önceden bildirimde bulunmaksızın üyeliği geçici olarak askıya alma veya kalıcı olarak sonlandırma hakkına sahiptir.</p>

  <h3>Madde 7 – Fikri Mülkiyet</h3>
  <p>7.1. Site üzerindeki tüm içerikler (metin, görsel, logo, tasarım vb.) Sepetzen'e aittir ve telif hakkı yasaları kapsamında korunmaktadır. İzinsiz kullanım yasal yaptırıma tabidir.</p>

  <h3>Madde 8 – Sorumluluğun Sınırlandırılması</h3>
  <p>8.1. Sepetzen, üçüncü taraf bağlantılarından veya Üye'nin kendi kusuru nedeniyle uğradığı zararlardan sorumlu değildir. Ayrıca ürün tanımlarında yanlış ya da eksik bilgi yer alması durumunda, tespit üzerine düzeltme yapma hakkı saklıdır.</p>

  <h3>Madde 9 – Sözleşme Değişiklikleri</h3>
  <p>9.1. Sepetzen, işbu Sözleşme'yi önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler, Site'de yayınlandığı tarihten itibaren geçerli olur. Üye'nin Site'yi kullanmaya devam etmesi, değişiklikleri kabul ettiği anlamına gelir.</p>

  <h3>Madde 10 – Uygulanacak Hukuk ve Yetki</h3>
  <p>10.1. İşbu Sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda Muğla (Dalaman) Mahkemeleri ve İcra Daireleri yetkilidir.</p>

  <h3>Madde 11 – Yürürlük</h3>
  <p>Üye'nin üyelik formunu onaylaması, işbu Sözleşme'nin tamamını okuduğunu, anladığını ve kabul ettiğini gösterir. Sözleşme bu onay anında yürürlüğe girer.</p>`,
  },
  {
    slug: "iptal-ve-iade-sartlari",
    title: "İptal ve İade Şartları",
    content: `<h2>İPTAL VE İADE ŞARTLARI</h2>
  <p>Müşteri memnuniyeti Sepetzen'in önceliğidir. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde iptal ve iade haklarınız aşağıda açıklanmıştır.</p>

  <h3>1. Sipariş İptali</h3>
  <p><strong>1.1. Kargoya Verilmeden Önce:</strong> Siparişiniz henüz kargoya verilmemişse, sepetzen@gmail.com adresine e-posta göndererek veya 0536 630 11 38 numaralı telefondan bize ulaşarak iptal talebinde bulunabilirsiniz. İptal onaylanması hâlinde ödemeniz aynı ödeme yöntemine iade edilir.</p>
  <p><strong>1.2. Kargoya Verildikten Sonra:</strong> Sipariş kargoya verildikten sonra iptal mümkün değildir; bu durumda "İade Süreci" başlığı altındaki prosedürü izlemeniz gerekmektedir.</p>

  <h3>2. Cayma Hakkı</h3>
  <p>6502 sayılı Kanun gereğince, ürünü teslim aldığınız tarihten itibaren <strong>14 (on dört) gün</strong> içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayabilirsiniz.</p>
  <p>Cayma hakkınızı kullanmak için:</p>
  <ol>
  <li>sepetzen@gmail.com adresine "cayma bildirimi" içeren bir e-posta gönderin.</li>
  <li>E-postada sipariş numaranızı, adınızı ve cayma gerekçenizi (zorunlu değildir) belirtin.</li>
  <li>Satıcı, cayma bildirimini aldıktan sonra en geç <strong>14 gün</strong> içinde ödemenizi iade eder.</li>
  <li>Alıcı, cayma bildiriminden itibaren en geç <strong>10 gün</strong> içinde ürünü iade etmelidir.</li>
  </ol>

  <h3>3. İade Edilebilirlik Koşulları</h3>
  <p>Ürünlerin iade edilebilmesi için aşağıdaki koşulların sağlanması gerekir:</p>
  <ul>
  <li>Ürün kullanılmamış ve hasar görmemiş olmalıdır.</li>
  <li>Orijinal ambalajında, tüm aksesuarları ve belgeleri ile birlikte iade edilmelidir.</li>
  <li>Teslim tarihinden itibaren 14 gün içinde cayma bildirimi yapılmış olmalıdır.</li>
  </ul>

  <h3>4. İade Dışı Ürünler</h3>
  <p>Aşağıdaki durumlarda cayma hakkı kullanılamaz:</p>
  <ul>
  <li>Alıcının özel istekleri ve kişisel ihtiyaçları doğrultusunda özel olarak üretilen ürünler,</li>
  <li>Koruyucu ambalajı açılmış, hijyen ve güvenlik açısından iadesi uygun olmayan ürünler,</li>
  <li>Satın alındıktan sonra niteliği bozulan veya son kullanma tarihi geçen ürünler.</li>
  </ul>

  <h3>5. İade Prosedürü</h3>
  <ol>
  <li><strong>Bildirim:</strong> sepetzen@gmail.com adresine sipariş numarası ve iade nedeniyle birlikte e-posta gönderin.</li>
  <li><strong>Onay:</strong> İade talebiniz 1-2 iş günü içinde değerlendirilerek tarafınıza bildirilir.</li>
  <li><strong>Gönderim:</strong> Onay sonrasında ürünü orijinal ambalajında, tüm eksiksiz şekilde aşağıdaki adrese gönderin:<br><strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></li>
  <li><strong>İnceleme:</strong> Ürün tarafımıza ulaştıktan sonra 2-3 iş günü içinde kontrol edilir.</li>
  <li><strong>İade:</strong> İade onaylanırsa ödemeniz 7-10 iş günü içinde orijinal ödeme yönteminize iade edilir.</li>
  </ol>

  <h3>6. İade Kargo Ücreti</h3>
  <p>Cayma hakkı kapsamındaki iadelerde kargo ücreti <strong>alıcıya aittir</strong>. Ürün arızalı/hatalı teslim edilmişse kargo ücretini Sepetzen karşılar.</p>

  <h3>7. Hasarlı veya Hatalı Teslimat</h3>
  <p>Ürünü teslim alırken hasar gördüyseniz veya yanlış ürün gönderildiyse, kargo firmasıyla birlikte tutanak tutarak bize 48 saat içinde bildirin. Bu durumda Sepetzen, ürünün ücretsiz olarak değiştirilmesini veya iadesini sağlar.</p>

  <h3>8. İletişim</h3>
  <p>İptal ve iade talepleriniz için:<br>
  <strong>E-posta:</strong> sepetzen@gmail.com<br>
  <strong>Telefon / WhatsApp:</strong> 0536 630 11 38<br>
  <strong>Çalışma Saatleri:</strong> Pazartesi–Cumartesi 09:00–18:00</p>`,
  },
  {
    slug: "gizlilik-guvenlik",
    title: "Gizlilik ve Güvenlik",
    content: `<h2>GİZLİLİK & GÜVENLİK POLİTİKASI</h2>
  <p>Sepetzen olarak müşterilerimizin gizliliğine saygı duyuyor ve kişisel verilerini korumayı öncelikli bir sorumluluk olarak kabul ediyoruz. Bu politika; sepetzen.com web sitesini ziyaret ettiğinizde ve alışveriş yaptığınızda hangi verilerin toplandığını, nasıl kullanıldığını ve nasıl korunduğunu açıklamaktadır.</p>

  <h3>1. Toplanan Bilgiler</h3>
  <p><strong>a) Doğrudan Sizden Aldığımız Bilgiler:</strong></p>
  <ul>
  <li>Ad, soyad</li>
  <li>E-posta adresi ve telefon numarası</li>
  <li>Fatura ve teslimat adresi</li>
  <li>Sipariş ve ödeme bilgileri (kart bilgileri tarafımızca saklanmaz)</li>
  </ul>
  <p><strong>b) Otomatik Olarak Toplanan Bilgiler:</strong></p>
  <ul>
  <li>IP adresi ve tarayıcı türü</li>
  <li>Ziyaret ettiğiniz sayfalar ve geçirilen süre</li>
  <li>Oturum çerezleri ve tercih verileri</li>
  </ul>

  <h3>2. Verilerin Kullanım Amaçları</h3>
  <ul>
  <li>Sipariş işlemlerinin tamamlanması ve kargo takibi</li>
  <li>Hesabınıza ait bildirim ve güncellemelerin iletilmesi</li>
  <li>Müşteri destek hizmetlerinin sağlanması</li>
  <li>Rıza vermeniz hâlinde e-posta, SMS veya WhatsApp pazarlama iletişimi</li>
  <li>Yasal yükümlülüklerin yerine getirilmesi (vergi, fatura)</li>
  <li>Site güvenliğinin ve performansının korunması</li>
  </ul>

  <h3>3. Verilerin Paylaşımı</h3>
  <p>Kişisel verileriniz üçüncü taraflara satılmaz veya kiralanmaz. Verileriniz yalnızca aşağıdaki durumlarla sınırlı olarak paylaşılabilir:</p>
  <ul>
  <li><strong>Kargo firmaları:</strong> Teslimat amacıyla (isim, adres, telefon)</li>
  <li><strong>Ödeme altyapısı (iyzico):</strong> Ödeme işleminin gerçekleştirilmesi için</li>
  <li><strong>Yetkili kamu kurumları:</strong> Yasal zorunluluk hâlinde</li>
  </ul>

  <h3>4. Verilerin Güvenliği</h3>
  <p>Verilerinizin güvenliği için alınan teknik ve idari tedbirler şunlardır:</p>
  <ul>
  <li><strong>SSL/TLS Şifreleme:</strong> Tüm veri iletimi 256-bit SSL şifrelemesi ile korunmaktadır.</li>
  <li><strong>3D Secure Ödeme:</strong> Kart ödemeleri iyzico altyapısıyla 3D Secure protokolü üzerinden işlenmektedir. Kart bilgileriniz Sepetzen sistemlerinde saklanmamaktadır.</li>
  <li><strong>Erişim Kontrolü:</strong> Kişisel verilere erişim yalnızca yetkili personel ile sınırlıdır.</li>
  <li><strong>Güvenli Altyapı:</strong> Veriler, endüstri standardı güvenlik önlemleriyle korunan sunucularda saklanmaktadır.</li>
  </ul>

  <h3>5. Üçüncü Taraf Bağlantılar</h3>
  <p>Sitemiz, üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin gizlilik uygulamalarından Sepetzen sorumlu değildir ve bu siteleri ziyaret etmeden önce ilgili gizlilik politikalarını incelemenizi öneririz.</p>

  <h3>6. Haklarınız</h3>
  <p>KVKK'nın 11. maddesi kapsamındaki haklarınızı kullanmak için lütfen <a href="/sayfa/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a> sayfasını inceleyiniz. Taleplerinizi sepetzen@gmail.com adresine iletebilirsiniz.</p>

  <h3>7. Politika Değişiklikleri</h3>
  <p>Bu politika zaman zaman güncellenebilir. Güncel versiyona her zaman bu sayfadan ulaşabilirsiniz. Önemli değişiklikler size e-posta yoluyla bildirilir.</p>

  <h3>İletişim</h3>
  <p>Gizlilik ve güvenlikle ilgili sorularınız için:<br>
  <strong>E-posta:</strong> sepetzen@gmail.com<br>
  <strong>Telefon:</strong> 0536 630 11 38<br>
  <strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>`,
  },
  {
    slug: "cerez-politikasi",
    title: "Çerez Politikası",
    content: `<h2>ÇEREZ POLİTİKASI</h2>
  <p>Bu Çerez Politikası, sepetzen.com web sitesinin çerez kullanımını ve kullanıcıların bu çerezler üzerindeki tercihlerini açıklamaktadır. 6698 sayılı KVKK ve ilgili mevzuat kapsamında hazırlanmıştır.</p>

  <h3>1. Çerez Nedir?</h3>
  <p>Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız tarafından cihazınıza kaydedilen küçük metin dosyalarıdır. Çerezler, web sitesinin düzgün çalışması, kullanıcı deneyiminin iyileştirilmesi ve site trafiğinin analiz edilmesi amacıyla kullanılır.</p>

  <h3>2. Kullandığımız Çerez Türleri</h3>

  <h4>a) Zorunlu Çerezler</h4>
  <p>Bu çerezler, web sitesinin temel işlevlerinin çalışması için gereklidir ve devre dışı bırakılamaz.</p>
  <ul>
  <li><strong>Oturum çerezi (session cookie):</strong> Giriş durumunuzu ve sepet içeriğinizi oturum boyunca hatırlar. Tarayıcı kapanınca silinir.</li>
  <li><strong>CSRF koruma çerezi:</strong> Form gönderimlerini güvenli hale getirir.</li>
  <li><strong>Tercih çerezi:</strong> Dil ve görüntü tercihlerinizi hatırlar.</li>
  </ul>

  <h4>b) İşlevsel Çerezler</h4>
  <p>Site deneyiminizi kişiselleştirmek için kullanılır.</p>
  <ul>
  <li><strong>Kimlik doğrulama çerezi:</strong> "Beni hatırla" özelliğini sağlar; oturum açık kalmasına imkân tanır (30 güne kadar).</li>
  <li><strong>Favoriler çerezi:</strong> Favori ürün listenizi hatırlar.</li>
  </ul>

  <h4>c) Analitik Çerezler</h4>
  <p>Siteyi nasıl kullandığınızı anlamak, hataları tespit etmek ve site performansını iyileştirmek amacıyla kullanılır. Bu çerezler kişisel kimlik bilgisi içermez.</p>
  <ul>
  <li><strong>Google Analytics (_ga, _gid, _gat):</strong> Sayfa görüntülemeleri, oturum süresi ve kullanıcı sayısı gibi istatistikleri toplar. Veriler anonim olarak işlenir.</li>
  </ul>

  <h4>d) Pazarlama ve Hedefleme Çerezleri</h4>
  <p>Yalnızca açık rızanızla etkinleştirilir.</p>
  <ul>
  <li><strong>Meta (Facebook) Pixel:</strong> Reklamlarımızın etkinliğini ölçmek ve size ilgili reklamlar göstermek amacıyla kullanılır.</li>
  </ul>

  <h3>3. Çerez Saklama Süreleri</h3>
  <table>
  <thead><tr><th>Çerez Adı</th><th>Tür</th><th>Süre</th></tr></thead>
  <tbody>
  <tr><td>session_id</td><td>Zorunlu</td><td>Oturum sonu</td></tr>
  <tr><td>auth_token</td><td>İşlevsel</td><td>30 gün</td></tr>
  <tr><td>_ga</td><td>Analitik</td><td>2 yıl</td></tr>
  <tr><td>_gid</td><td>Analitik</td><td>24 saat</td></tr>
  <tr><td>fbp (Meta Pixel)</td><td>Pazarlama</td><td>90 gün</td></tr>
  </tbody>
  </table>

  <h3>4. Çerezleri Nasıl Yönetirsiniz?</h3>
  <p>Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezlerin devre dışı bırakılması halinde Site'nin bazı işlevleri düzgün çalışmayabilir.</p>
  <p>Yaygın tarayıcılarda çerez ayarları:</p>
  <ul>
  <li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler</li>
  <li><strong>Mozilla Firefox:</strong> Ayarlar → Gizlilik & Güvenlik → Çerezler</li>
  <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri yönet</li>
  <li><strong>Microsoft Edge:</strong> Ayarlar → Çerezler ve site izinleri</li>
  </ul>
  <p>Google Analytics çerezlerini devre dışı bırakmak için: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-out Eklentisi</a></p>

  <h3>5. Üçüncü Taraf Çerezler</h3>
  <p>Sitemiz; Google, Meta (Facebook) gibi üçüncü taraf hizmet sağlayıcıların çerezlerini kullanabilir. Bu çerezlere ilişkin gizlilik politikaları için ilgili sağlayıcıların web sitelerini inceleyiniz.</p>

  <h3>6. Değişiklikler</h3>
  <p>Bu Çerez Politikası, yasal düzenlemelere veya hizmetlerimizdeki değişikliklere bağlı olarak güncellenebilir. Güncel politikaya bu sayfadan ulaşabilirsiniz.</p>

  <h3>İletişim</h3>
  <p>Çerez kullanımı hakkındaki sorularınız için sepetzen@gmail.com adresine yazabilirsiniz.</p>`,
  },
  {
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK Aydınlatma Metni",
    content: `<h2>KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ</h2>
  <p>6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi gereğince, veri sorumlusu sıfatıyla Ahmet Uğur Durmaz (Sepetzen) olarak kişisel verilerinizin işlenmesi hakkında aşağıdaki bilgileri sizinle paylaşmaktayız.</p>

  <h3>1. Veri Sorumlusunun Kimliği</h3>
  <p>Ahmet Uğur Durmaz (Sepetzen), Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>
  <p>E-posta: sepetzen@gmail.com | Telefon: 0536 630 11 38</p>

  <h3>2. İşlenen Kişisel Veriler</h3>
  <p>Sepetzen, aşağıdaki kişisel veri kategorilerini işlemektedir:</p>
  <ul>
  <li><strong>Kimlik Verileri:</strong> Ad, soyad</li>
  <li><strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası, teslimat adresi</li>
  <li><strong>Sipariş ve İşlem Verileri:</strong> Sipariş geçmişi, satın alınan ürünler, ödeme bilgileri (kart numarası işlenmez; yalnızca ödeme başarı/başarısızlık durumu)</li>
  <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı bilgisi, çerez verileri</li>
  <li><strong>Tercih Verileri:</strong> WhatsApp/SMS iletişim tercihleri</li>
  </ul>

  <h3>3. Kişisel Verilerin İşlenme Amaçları</h3>
  <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
  <ul>
  <li>Sipariş alımı, onayı ve teslim süreçlerinin yürütülmesi</li>
  <li>Kargo ve teslimat işlemlerinin gerçekleştirilmesi</li>
  <li>Müşteri hizmetleri ve şikâyet süreçlerinin yönetimi</li>
  <li>Ödeme işlemlerinin güvenli biçimde gerçekleştirilmesi</li>
  <li>Fatura ve yasal kayıtların tutulması</li>
  <li>Onayınız doğrultusunda pazarlama iletişiminin yapılması (e-posta, SMS, WhatsApp)</li>
  <li>Site güvenliğinin ve teknik altyapının sürdürülmesi</li>
  <li>Yasal yükümlülüklerin yerine getirilmesi</li>
  </ul>

  <h3>4. Hukuki Dayanak</h3>
  <p>Kişisel verileriniz aşağıdaki KVKK'daki hukuki dayanaklar çerçevesinde işlenmektedir:</p>
  <ul>
  <li>KVKK md. 5/2-c: Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (sipariş ve teslimat süreçleri)</li>
  <li>KVKK md. 5/2-ç: Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (fatura, vergi kaydı)</li>
  <li>KVKK md. 5/2-f: Veri sorumlusunun meşru menfaati (site güvenliği, dolandırıcılık önleme)</li>
  <li>KVKK md. 5/1: Açık rıza (pazarlama iletişimi)</li>
  </ul>

  <h3>5. Kişisel Verilerin Aktarımı</h3>
  <p>Verileriniz; yasal zorunluluklar çerçevesinde kargo firmalarına, ödeme altyapı sağlayıcısına (iyzico) ve yetkili kamu kuruluşlarına aktarılabilir. Bu aktarımlar dışında verileriniz üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz.</p>

  <h3>6. Kişisel Veri Saklama Süreleri</h3>
  <ul>
  <li>Sipariş ve fatura verileri: Yasal süre (10 yıl)</li>
  <li>Müşteri hesap bilgileri: Hesap aktif olduğu sürece + 2 yıl</li>
  <li>Pazarlama verileri: Rıza geri alınana kadar</li>
  <li>Teknik/çerez verileri: Çerez türüne göre değişir (bkz. Çerez Politikası)</li>
  </ul>

  <h3>7. İlgili Kişi Hakları (KVKK Madde 11)</h3>
  <p>KVKK'nın 11. maddesi kapsamında aşağıdaki haklarınızı kullanabilirsiniz:</p>
  <ul>
  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
  <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>
  <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
  <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,</li>
  <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
  <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme,</li>
  <li>İşlemenin otomatik sistemler vasıtasıyla gerçekleştirilmesi durumunda ortaya çıkan aleyhte sonuca itiraz etme,</li>
  <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
  </ul>
  <p>Haklarınızı kullanmak için yazılı başvurunuzu <strong>sepetzen@gmail.com</strong> adresine iletebilirsiniz. Başvurularınız, kimliğinizi doğruladıktan sonra en geç 30 gün içinde yanıtlanacaktır.</p>

  <h3>8. Güvenlik</h3>
  <p>Kişisel verileriniz; yetkisiz erişim, kayıp veya ifşaya karşı SSL şifreleme, erişim kontrolü ve güvenli altyapı gibi teknik ve idari tedbirlerle korunmaktadır. Ödeme bilgileriniz, PCI-DSS sertifikalı iyzico altyapısı üzerinden 3D Secure sistemi ile işlenmekte olup Sepetzen tarafından saklanmamaktadır.</p>

  <h3>9. Değişiklikler</h3>
  <p>Bu Aydınlatma Metni, yasal düzenlemelere veya uygulamalarımızdaki değişikliklere bağlı olarak güncellenebilir. Güncel metne her zaman sepetzen.com adresinden ulaşabilirsiniz.</p>`,
  },
];

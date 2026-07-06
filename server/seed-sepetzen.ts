/**
 * Sepetzen – tam veri tohumlaması
 * Çalıştırmak için: npx tsx server/seed-sepetzen.ts
 *
 * Yapar:
 * 1. Mevcut ürün & kategori verilerini temizler (display_order < 100)
 * 2. Sepetzen kategorilerini ekler (6 ana kategori)
 * 3. 7 ürün görselini CDN'den indirip yerel diske kaydeder
 * 4. 7 ürünü DB'ye ekler
 * 5. 11 statik sayfayı DB'ye ekler
 */

import { db } from "./db";
import {
  categories,
  products,
  productVariants,
  productCategories,
  menuItems,
  pages,
} from "@shared/schema";
import { eq, lt, inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import sharp from "sharp";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "client/public/uploads/products");

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { timeout: 30000, headers: { "User-Agent": "Mozilla/5.0 (compatible; Sepetzen/1.0)" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redir = res.headers.location!;
        return download(redir).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject).on("timeout", () => reject(new Error(`Timeout: ${url}`)));
  });
}

async function downloadImage(url: string, filename: string): Promise<string> {
  ensureDir(UPLOAD_DIR);
  const destPath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(destPath)) {
    console.log(`  [skip] already exists: ${filename}`);
    return `/uploads/products/${filename}`;
  }
  try {
    console.log(`  [download] ${url}`);
    const buf = await download(url);
    const webpBuf = await sharp(buf).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    fs.writeFileSync(destPath, webpBuf);
    console.log(`  [saved] ${filename} (${Math.round(webpBuf.length / 1024)}KB)`);
    return `/uploads/products/${filename}`;
  } catch (err) {
    console.warn(`  [warn] Could not download ${url}: ${err}`);
    // NEVER return a remote URL — save placeholder locally so all image paths stay local
    const placeholderLocal = path.join(UPLOAD_DIR, "placeholder.svg");
    if (!fs.existsSync(placeholderLocal)) {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#1a2e19"/><rect x="340" y="340" width="120" height="120" rx="8" fill="none" stroke="#2D5A27" stroke-width="3"/><line x1="340" y1="400" x2="460" y2="400" stroke="#2D5A27" stroke-width="2"/><line x1="400" y1="340" x2="400" y2="460" stroke="#2D5A27" stroke-width="2"/><text x="400" y="520" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#2D5A27" letter-spacing="8">SEPETZEN</text></svg>`;
      fs.writeFileSync(placeholderLocal, svgContent, "utf-8");
    }
    console.log(`  [placeholder] Download failed — using local placeholder image`);
    return `/uploads/products/placeholder.svg`;
  }
}

async function main() {
  console.log("\n🌿 Sepetzen seed başlıyor...\n");

  // ── 1. Eski Polen Stone menu items ve kategorileri temizle ──────────────────
  console.log("1. Eski verileri temizleniyor...");
  try {
    await db.delete(menuItems);
    console.log("   menu_items temizlendi");
  } catch (e) { console.log("   menu_items:", e); }

  // Eski ürünleri ve kategorileri temizle (display_order < 100 olanlar aktif olanlardır)
  // Önce product_categories, sonra products, sonra product_variants, sonra categories
  try {
    const oldCats = await db.select({ id: categories.id }).from(categories).where(lt(categories.displayOrder, 100));
    if (oldCats.length > 0) {
      const oldCatIds = oldCats.map(c => c.id);
      await db.delete(productCategories).where(inArray(productCategories.categoryId, oldCatIds));
    }
    const allProds = await db.select({ id: products.id }).from(products);
    if (allProds.length > 0) {
      const allProdIds = allProds.map(p => p.id);
      await db.delete(productCategories).where(inArray(productCategories.productId, allProdIds));
      await db.delete(productVariants).where(inArray(productVariants.productId, allProdIds));
      await db.delete(products);
    }
    if (oldCats.length > 0) {
      const oldCatIds = oldCats.map(c => c.id);
      await db.delete(categories).where(inArray(categories.id, oldCatIds));
    }
    console.log("   ürünler & kategoriler temizlendi");
  } catch (e) { console.log("   temizleme hatası:", e); }

  // ── 2. Kategoriler ─────────────────────────────────────────────────────────
  console.log("\n2. Kategoriler ekleniyor...");
  const catDefs = [
    { name: "Kamp & Outdoor", slug: "kamp-outdoor", displayOrder: 1 },
    { name: "Av Bıçakları", slug: "av-bicaklari", displayOrder: 2 },
    { name: "Kamp Çakıları", slug: "kamp-cakilari", displayOrder: 3 },
    { name: "Bağ & Bahçe", slug: "bag-bahce", displayOrder: 4 },
    { name: "Outdoor Ekipman", slug: "outdoor-ekipman", displayOrder: 5 },
    { name: "Tüm Ürünler", slug: "tum-urunler", displayOrder: 6 },
  ];

  const insertedCats: Record<string, string> = {};
  for (const c of catDefs) {
    const [cat] = await db.insert(categories).values(c).onConflictDoUpdate({ target: categories.slug, set: { name: c.name } }).returning();
    insertedCats[c.slug] = cat.id;
    console.log(`   + ${c.name}`);
  }

  // ── 3. Ürün görselleri indir ───────────────────────────────────────────────
  console.log("\n3. Ürün görselleri indiriliyor...");
  const productDefs = [
    {
      name: "Sepetzen Av Bıçağı",
      slug: "sepetzen-av-bicagi",
      sku: "SPZ-001",
      basePrice: "850.00",
      description: "<p>El yapımı av bıçağı. Paslanmaz çelik bıçak, ergonomik ahşap sap. Kılıfı ile birlikte gelir. Outdoor ve av aktiviteleriniz için ideal.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-av-b%C4%B1%C3%A7a%C4%9F%C4%B11916-696x600.jpg",
      imgFile: "sepetzen-av-bicagi-1.webp",
      cats: ["av-bicaklari", "tum-urunler"],
      isFeatured: true,
      isNew: false,
    },
    {
      name: "Av & Outdoor Kamp Çakısı",
      slug: "av-outdoor-kamp-cakisi",
      sku: "SPZ-002",
      basePrice: "650.00",
      description: "<p>Çok fonksiyonlu av ve outdoor çakısı. Dayanıklı çelik bıçak, rahat tutuş. Hem kamp hem de outdoor aktivitelerinde kullanım için uygundur.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_av-outdoor-kamp-%C3%A7ak%C4%B1s%C4%B1-696x600.jpg",
      imgFile: "av-outdoor-kamp-cakisi.webp",
      cats: ["kamp-cakilari", "kamp-outdoor", "tum-urunler"],
      isFeatured: true,
      isNew: false,
    },
    {
      name: "Sepetzen Knife 3 Pro",
      slug: "sepetzen-knife-3-pro",
      sku: "SPZ-003",
      basePrice: "1250.00",
      description: "<p>Premium serisi Sepetzen Knife 3 Pro. Yüksek karbonlu çelik bıçak, G10 sap malzemesi. Keskin kenar tutma kapasitesi ile uzun ömürlü kullanım sağlar.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-knife-3--696x600.png",
      imgFile: "sepetzen-knife-3-pro.webp",
      cats: ["av-bicaklari", "tum-urunler"],
      isFeatured: false,
      isNew: true,
    },
    {
      name: "Kamp Çakısı Serisi I",
      slug: "kamp-cakisi-serisi-1",
      sku: "SPZ-004",
      basePrice: "420.00",
      description: "<p>Klasik kamp çakısı serisi. Günlük outdoor aktiviteleri için tasarlanmış, kompakt ve hafif yapısı ile kolayca taşınabilir.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_kamp-%C3%A7ak%C4%B1s%C4%B1-1-696x600.jpg",
      imgFile: "kamp-cakisi-serisi-1.webp",
      cats: ["kamp-cakilari", "tum-urunler"],
      isFeatured: false,
      isNew: false,
    },
    {
      name: "Kamp Çakısı Serisi II",
      slug: "kamp-cakisi-serisi-2",
      sku: "SPZ-005",
      basePrice: "480.00",
      description: "<p>Kamp çakısı serisinin ikinci modeli. Geliştirilmiş bıçak geometrisi, tam tang yapısı ve renkli kompozit sap. Güven veren bir kamp ekipmanı.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_kamp-%C3%A7ak%C4%B1s%C4%B1-696x600.jpg",
      imgFile: "kamp-cakisi-serisi-2.webp",
      cats: ["kamp-cakilari", "tum-urunler"],
      isFeatured: false,
      isNew: false,
    },
    {
      name: "Sepetzen 16 Fonksiyon Çakı",
      slug: "sepetzen-16-fonksiyon-caki",
      sku: "SPZ-006",
      basePrice: "780.00",
      description: "<p>16 farklı fonksiyon sunan çok amaçlı çakı seti. Bıçak, tornavida, makas, testere, açacak ve daha fazlası. Kamp ve outdoor için vazgeçilmez bir alet.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-16--696x600.png",
      imgFile: "sepetzen-16-fonksiyon-caki.webp",
      cats: ["kamp-cakilari", "outdoor-ekipman", "tum-urunler"],
      isFeatured: true,
      isNew: false,
    },
    {
      name: "Sepetzen Av Bıçağı Premium",
      slug: "sepetzen-av-bicagi-premium",
      sku: "SPZ-007",
      basePrice: "1100.00",
      description: "<p>Premium av bıçağı koleksiyonunun gözdesi. Tam tang, Micarta sap, çift kenarlı Böhler çelik bıçak. Deri kılıf dahil. Ciddi av ve outdoor kullanımı için.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-av-b%C4%B1%C3%A7a%C4%9F%C4%B1-1--696x600.jpg",
      imgFile: "sepetzen-av-bicagi-premium.webp",
      cats: ["av-bicaklari", "tum-urunler"],
      isFeatured: true,
      isNew: true,
    },
  ];

  const localImages: Record<string, string> = {};
  for (const p of productDefs) {
    localImages[p.slug] = await downloadImage(p.imgUrl, p.imgFile);
  }

  // ── 4. Ürünler DB'ye ekle ──────────────────────────────────────────────────
  console.log("\n4. Ürünler ekleniyor...");
  for (const pd of productDefs) {
    const [prod] = await db.insert(products).values({
      name: pd.name,
      slug: pd.slug,
      sku: pd.sku,
      description: pd.description,
      basePrice: pd.basePrice,
      images: [localImages[pd.slug]],
      availableSizes: [],
      availableColors: [],
      isActive: true,
      isFeatured: pd.isFeatured,
      isNew: pd.isNew,
    }).onConflictDoUpdate({
      target: products.slug,
      set: {
        name: pd.name,
        basePrice: pd.basePrice,
        images: [localImages[pd.slug]],
        isFeatured: pd.isFeatured,
        isNew: pd.isNew,
      },
    }).returning();

    // Kategori bağlantıları
    for (const catSlug of pd.cats) {
      const catId = insertedCats[catSlug];
      if (!catId) continue;
      await db.insert(productCategories).values({ productId: prod.id, categoryId: catId }).onConflictDoNothing();
    }
    // Primary category
    const primaryCatSlug = pd.cats[0];
    await db.update(products).set({ categoryId: insertedCats[primaryCatSlug] }).where(eq(products.id, prod.id));

    // Varyant (stok için)
    await db.insert(productVariants).values({
      productId: prod.id,
      sku: `${pd.sku}-V1`,
      price: pd.basePrice,
      stock: 50,
      isActive: true,
    }).onConflictDoNothing();

    console.log(`   + ${pd.name} — ${localImages[pd.slug]}`);
  }

  // ── 5. Statik sayfalar ─────────────────────────────────────────────────────
  console.log("\n5. Statik sayfalar ekleniyor...");
  const pageDefs = [
    {
      slug: "hakkimizda",
      title: "Hakkımızda",
      content: `<h2>Sepetzen Kimdir?</h2>
<p>Sepetzen, 2020 yılında Dalaman, Muğla'da kurulmuş bir kamp, outdoor ve bıçak markasıdır. Doğanın içinde zaman geçiren insanların ihtiyaçlarını karşılamak amacıyla yola çıktık.</p>
<p>Ahmet Uğur Durmaz liderliğinde küçük bir ekip tarafından yönetilen Sepetzen; av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri alanlarında faaliyet göstermektedir.</p>
<h2>Vizyonumuz</h2>
<p>Türkiye'nin doğal zenginliklerine duyulan saygıyı, kaliteli ürünlerle buluşturmak. Her bıçak, her ekipman; bir hikâyenin parçasıdır.</p>
<h2>Neden Sepetzen?</h2>
<ul>
<li>El seçimi, kalite kontrollü ürünler</li>
<li>Hızlı ve güvenli kargo (1500 TL üzeri ÜCRETSİZ)</li>
<li>Uzman kadro ile kişisel müşteri hizmetleri</li>
<li>Dalaman merkezli, Türkiye geneli hizmet</li>
</ul>
<h2>İletişim</h2>
<p><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>
<p><strong>Telefon:</strong> 0536 630 11 38</p>
<p><strong>E-posta:</strong> sepetzen@gmail.com</p>`,
    },
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
<p>Pazartesi – Cumartesi: 09:00 – 18:00</p>
<p>Pazar: Kapalı</p>`,
    },
    {
      slug: "mesafeli-satis-sozlesmesi",
      title: "Mesafeli Satış Sözleşmesi",
      content: `<h2>MESAFELİ SATIŞ SÖZLEŞMESİ</h2>
<h3>Madde 1 – Taraflar</h3>
<p><strong>Satıcı:</strong> Ahmet Uğur Durmaz, Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla — sepetzen@gmail.com — 0536 630 11 38</p>
<p><strong>Alıcı:</strong> Sipariş formunda belirtilen kişi.</p>
<h3>Madde 2 – Konu</h3>
<p>Bu sözleşme; alıcının sipariş verdiği ürünlerin satış ve teslim koşullarını belirler.</p>
<h3>Madde 3 – Ürün Bilgileri</h3>
<p>Sipariş edilen ürünlerin adı, miktarı ve fiyatı sipariş özetinde yer almaktadır.</p>
<h3>Madde 4 – Teslimat</h3>
<p>Ürünler, sipariş onayından itibaren 3-7 iş günü içinde kargo ile gönderilir. 1500 TL ve üzeri siparişlerde kargo ücretsizdir.</p>
<h3>Madde 5 – İptal ve İade</h3>
<p>Teslim tarihinden itibaren 14 gün içinde iade hakkı bulunmaktadır. Kullanılmış ürünler iade kapsamı dışındadır.</p>
<h3>Madde 6 – Uyuşmazlık</h3>
<p>Bu sözleşmeden doğacak uyuşmazlıklarda Dalaman Tüketici Hakem Heyeti ve Dalaman Mahkemeleri yetkilidir.</p>`,
    },
    {
      slug: "kvkk-aydinlatma-metni",
      title: "KVKK Aydınlatma Metni",
      content: `<h2>KİŞİSEL VERİLERİN KORUNMASI (KVKK) AYDINLATMA METNİ</h2>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, veri sorumlusu sıfatıyla Ahmet Uğur Durmaz (Sepetzen) olarak kişisel verilerinizi aşağıdaki amaçlarla işlemekteyiz:</p>
<h3>İşlenen Veriler</h3>
<ul>
<li>Ad, soyad, e-posta, telefon numarası</li>
<li>Teslimat adresi bilgileri</li>
<li>Sipariş ve ödeme bilgileri</li>
</ul>
<h3>İşleme Amaçları</h3>
<ul>
<li>Sipariş işlemlerinin gerçekleştirilmesi</li>
<li>Kargo ve teslimat süreçlerinin yönetimi</li>
<li>Yasal yükümlülüklerin yerine getirilmesi</li>
</ul>
<h3>Haklarınız</h3>
<p>KVKK'nın 11. maddesi kapsamında; kişisel verilerinize erişim, düzeltme, silme ve işlemenin kısıtlanmasını talep etme haklarına sahipsiniz. Talepleriniz için: sepetzen@gmail.com</p>`,
    },
    {
      slug: "on-bilgilendirme-formu",
      title: "Ön Bilgilendirme Formu",
      content: `<h2>ÖN BİLGİLENDİRME FORMU</h2>
<h3>Satıcı Bilgileri</h3>
<p>Ahmet Uğur Durmaz – Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla<br>
Telefon: 0536 630 11 38 | E-posta: sepetzen@gmail.com</p>
<h3>Ürün Bilgileri</h3>
<p>Sipariş edilen ürünlerin adı, miktarı, fiyatı ve özellikleri sipariş özetinde yer almaktadır.</p>
<h3>Ödeme ve Teslimat</h3>
<p>Teslimat süresi sipariş onayından itibaren 3-7 iş günüdür. 1500 TL üzeri siparişlerde kargo ücretsizdir.</p>
<h3>Cayma Hakkı</h3>
<p>Teslim tarihinden itibaren 14 gün içinde iade hakkı bulunmaktadır.</p>`,
    },
    {
      slug: "uyelik-sozlesmesi",
      title: "Üyelik Sözleşmesi",
      content: `<h2>ÜYELİK SÖZLEŞMESİ</h2>
<h3>1. Taraflar</h3>
<p>Bu sözleşme; Sepetzen (Ahmet Uğur Durmaz) ile siteye üye olan kullanıcı arasında akdedilmiştir.</p>
<h3>2. Üyelik Koşulları</h3>
<ul>
<li>Üye olmak için 18 yaşını doldurmuş olmak gereklidir.</li>
<li>Gerçek ve doğru bilgi sağlanmalıdır.</li>
<li>Hesap bilgilerinin gizliliğinden üye sorumludur.</li>
</ul>
<h3>3. Üyelik Sonlandırma</h3>
<p>Kullanıcı dilediği zaman üyeliğini sonlandırabilir. Sepetzen, kurallara aykırı davranış halinde üyeliği askıya alabilir.</p>`,
    },
    {
      slug: "iptal-ve-iade-sartlari",
      title: "İptal & İade Politikası",
      content: `<h2>İPTAL VE İADE POLİTİKASI</h2>
<h3>Sipariş İptali</h3>
<p>Kargoya verilmeden önce siparişinizi sepetzen@gmail.com adresine e-posta göndererek iptal edebilirsiniz.</p>
<h3>İade Koşulları</h3>
<ul>
<li>Teslim tarihinden itibaren 14 gün içinde iade hakkı bulunmaktadır.</li>
<li>Ürün kullanılmamış, orijinal ambalajında olmalıdır.</li>
<li>Hijyen ürünleri ve kişiye özel üretimler iade kapsamı dışındadır.</li>
</ul>
<h3>İade Süreci</h3>
<p>İade taleplerini sepetzen@gmail.com adresine bildirin. Ürünü Dalaman adresimize gönderin. İade onayından sonra 7-10 iş günü içinde ödeme iadeniz gerçekleştirilir.</p>`,
    },
    {
      slug: "gizlilik",
      title: "Gizlilik Politikası",
      content: `<h2>GİZLİLİK POLİTİKASI</h2>
<p>Sepetzen olarak gizliliğinize saygı duyuyoruz. Bu politika, web sitemizi ziyaret ettiğinizde toplanan bilgileri ve bu bilgilerin nasıl kullanıldığını açıklamaktadır.</p>
<h3>Toplanan Bilgiler</h3>
<ul>
<li>Üyelik ve sipariş sırasında girdiğiniz ad, e-posta, adres bilgileri</li>
<li>Site kullanım verileri (çerezler aracılığıyla)</li>
</ul>
<h3>Bilgilerin Kullanımı</h3>
<p>Bilgileriniz yalnızca sipariş işlemleri ve sizinle iletişim kurulması amacıyla kullanılmaktadır. Üçüncü taraflarla satılmaz veya paylaşılmaz.</p>
<h3>Güvenlik</h3>
<p>Verileriniz SSL şifrelemesi ile korunmaktadır.</p>`,
    },
    {
      slug: "cerez",
      title: "Çerez Politikası",
      content: `<h2>ÇEREZ POLİTİKASI</h2>
<p>sepetzen.com, deneyiminizi iyileştirmek için çerezler kullanmaktadır.</p>
<h3>Çerez Türleri</h3>
<ul>
<li><strong>Zorunlu Çerezler:</strong> Sepet ve oturum yönetimi için kullanılır.</li>
<li><strong>Analitik Çerezler:</strong> Siteyi nasıl kullandığınızı anlamak için kullanılır (Google Analytics).</li>
</ul>
<h3>Çerezleri Kontrol Etme</h3>
<p>Tarayıcı ayarlarınızdan çerezleri yönetebilir veya reddedebilirsiniz. Ancak bazı çerezlerin devre dışı bırakılması site işlevselliğini olumsuz etkileyebilir.</p>`,
    },
    {
      slug: "kargo-sureci",
      title: "Kargo Bilgileri",
      content: `<h2>KARGO VE TESLİMAT</h2>
<h3>Teslimat Süresi</h3>
<p>Siparişleriniz, onaydan itibaren 1-3 iş günü içinde hazırlanır ve 1-4 iş günü içinde teslim edilir (toplam 3-7 iş günü).</p>
<h3>Kargo Ücreti</h3>
<ul>
<li>1500 TL ve üzeri siparişlerde kargo <strong>ÜCRETSİZ</strong>dir.</li>
<li>1500 TL altı siparişlerde kargo ücreti sepette gösterilir.</li>
</ul>
<h3>Kargo Firması</h3>
<p>Siparişleriniz Yurtiçi Kargo veya MNG Kargo ile gönderilmektedir. Kargo takip numarası siparişiniz yola çıktığında e-posta ile iletilecektir.</p>
<h3>Adres Hataları</h3>
<p>Yanlış adres bilgisi nedeniyle oluşan kargo giderleri alıcıya aittir.</p>`,
    },
    {
      slug: "iade-sureci",
      title: "İade Formu",
      content: `<h2>İADE FORMU</h2>
<p>İade talebiniz için aşağıdaki bilgileri doldurup <strong>sepetzen@gmail.com</strong> adresine gönderin:</p>
<table>
<tr><th>Alan</th><th>Bilgi</th></tr>
<tr><td>Ad Soyad</td><td></td></tr>
<tr><td>Sipariş Numarası</td><td></td></tr>
<tr><td>Ürün Adı</td><td></td></tr>
<tr><td>İade Nedeni</td><td></td></tr>
<tr><td>Telefon</td><td></td></tr>
</table>
<p>Talebiniz incelendikten sonra size 1-2 iş günü içinde dönüş yapılacaktır. İade onaylanırsa ürünü aşağıdaki adrese gönderebilirsiniz:</p>
<p><strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></p>`,
    },
  ];

  for (const p of pageDefs) {
    await db.insert(pages).values({ slug: p.slug, title: p.title, content: p.content, isPublished: true })
      .onConflictDoUpdate({ target: pages.slug, set: { title: p.title, content: p.content, isPublished: true, updatedAt: new Date() } });
    console.log(`   + ${p.title}`);
  }

  // ── 6. Site ayarları güncelle ──────────────────────────────────────────────
  console.log("\n6. Site ayarları güncelleniyor...");
  try {
    const { siteSettings } = await import("@shared/schema");
    const settingUpdates = [
      { key: "site_name", value: "Sepetzen" },
      { key: "contact_email", value: "sepetzen@gmail.com" },
      { key: "contact_phone", value: "0536 630 11 38" },
      { key: "whatsapp_number", value: "905366301138" },
      { key: "announcement_bar", value: "1500 TL üzeri alışverişlerde kargo ÜCRETSİZ! 🚚" },
      { key: "site_address", value: "Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla" },
      { key: "free_shipping_threshold", value: "1500" },
    ];
    for (const s of settingUpdates) {
      await db.insert(siteSettings).values({ key: s.key, value: s.value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: s.value, updatedAt: new Date() } });
    }
    console.log("   site ayarları güncellendi");
  } catch (e) { console.log("   site ayarları:", e); }

  console.log("\n✅ Sepetzen seed tamamlandı!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed hatası:", err);
  process.exit(1);
});

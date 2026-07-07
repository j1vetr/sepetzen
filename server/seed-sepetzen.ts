/**
 * Sepetzen – tam veri tohumlaması
 * Çalıştırmak için: npx tsx server/seed-sepetzen.ts
 *
 * Yapar:
 * 1. Mevcut ürün & kategori verilerini temizler (display_order < 100)
 * 2. Sepetzen 28 kategorisini (7 ana + alt) ekler
 * 3. 7 ürün görselini CDN'den indirip yerel diske kaydeder
 * 4. 7 ürünü DB'ye ekler (tam doğru isimler ve fiyatlar)
 * 5. menu_items hiyerarşisini oluşturur
 * 6. 11 statik sayfayı DB'ye ekler
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

  // ── 1. Eski verileri temizle ────────────────────────────────────────────────
  console.log("1. Eski verileri temizleniyor...");
  try {
    await db.delete(menuItems);
    console.log("   menu_items temizlendi");
  } catch (e) { console.log("   menu_items:", e); }

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

  // ── 2. Tam Sepetzen kategori ağacı (7 ana + 21 alt) ────────────────────────
  console.log("\n2. Kategoriler ekleniyor...");
  const catDefs = [
    // Ana kategoriler
    { name: "Çakılar",                        slug: "cakilar",                     displayOrder: 1  },
    { name: "Kamp Çakıları",                  slug: "kamp-cakilari",               displayOrder: 2  },
    { name: "Outdoor & Kamp Çakıları",        slug: "outdoor-kamp-cakisi",         displayOrder: 3  },
    { name: "Aşı Çakıları",                  slug: "asi-cakisi",                  displayOrder: 4  },
    { name: "İthal Çakılar",                 slug: "ithal-caki",                  displayOrder: 5  },
    { name: "Bıçaklar",                       slug: "bicaklar",                    displayOrder: 6  },
    { name: "Kamp Bıçakları",                 slug: "kamp-bicaklari",              displayOrder: 7  },
    { name: "Mutfak Bıçakları",               slug: "mutfak-bicaklari",            displayOrder: 8  },
    { name: "Şef Bıçakları",                  slug: "sef-bicaklari",               displayOrder: 9  },
    { name: "Kasap Bıçakları",                slug: "kasap-bicaklari",             displayOrder: 10 },
    { name: "Balık Bıçağı",                   slug: "balik-bicagi",                displayOrder: 11 },
    { name: "Bıçaklık",                       slug: "bicaklik",                    displayOrder: 12 },
    { name: "Bağ & Bahçe Aletleri",           slug: "bag-bahce-aletleri",          displayOrder: 13 },
    { name: "Budama & Kesme",                  slug: "budama-kesme",                displayOrder: 14 },
    { name: "Toprak İşleme Aletleri",         slug: "toprak-isleme-aletleri",      displayOrder: 15 },
    { name: "Sulama Sistemleri",               slug: "sulama-sistemleri",           displayOrder: 16 },
    { name: "Koruyucu Ekipmanlar",             slug: "koruyucu-ekipmanlar",         displayOrder: 17 },
    { name: "Pet Shop & Çiftlik Ekipmanları", slug: "pet-shop-ciftlik-ekipmanlari",displayOrder: 18 },
    { name: "Evcil Hayvan Ürünleri",          slug: "evcil-hayvan-urunleri",       displayOrder: 19 },
    { name: "Yular & Halatlar",               slug: "yular-halatlar",              displayOrder: 20 },
    { name: "Zincir & Bağlama",               slug: "zincir-baglama",              displayOrder: 21 },
    { name: "Saraciye Ürünleri",              slug: "saraciye-urunleri",           displayOrder: 22 },
    { name: "Nalbur & Hırdavat",             slug: "nalbur-hirdavat",             displayOrder: 23 },
    { name: "Mangal & Izgara & Ahşap",       slug: "mangal-izgara-ahsap",         displayOrder: 24 },
    { name: "Mangal & Izgaralar",             slug: "mangal-izgaralar",            displayOrder: 25 },
    { name: "Izgara Ekipmanları",             slug: "izgara-ekipmanlari",          displayOrder: 26 },
    { name: "Ahşap Ürünler",                 slug: "ahsap-urunler",               displayOrder: 27 },
    { name: "Tüm Ürünler",                   slug: "tum-urunler",                 displayOrder: 28 },
    { name: "Mangal Aksesuarları",           slug: "mangal-aksesuarlari",         displayOrder: 29 },
    { name: "Kömür & Tutuşturucu",          slug: "komur-tutusturucu",           displayOrder: 30 },
  ];

  const insertedCats: Record<string, string> = {};
  for (const c of catDefs) {
    const [cat] = await db.insert(categories).values(c)
      .onConflictDoUpdate({ target: categories.slug, set: { name: c.name, displayOrder: c.displayOrder } })
      .returning();
    insertedCats[c.slug] = cat.id;
    console.log(`   + ${c.name}`);
  }

  // ── 3. Ürün görselleri indir ───────────────────────────────────────────────
  console.log("\n3. Ürün görselleri indiriliyor...");
  const productDefs = [
    {
      name: "Ahşap Saplı İşlemeli Katlanır Çakı – Kamp, Outdoor ve Günlük Kullanım için Şık Tasarım",
      slug: "ahsap-sapli-islemeli-katlanir-caki",
      sku: "SPZ-001",
      basePrice: "2000.00",
      description: "<p>El işçiliğiyle üretilmiş, özel ahşap saplı katlanır çakı. Kamp, outdoor ve günlük kullanım için ideal şık tasarım. Paslanmaz çelik bıçak, kilit mekanizması ve şık ahşap işleme detaylarıyla öne çıkar.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-av-b%C4%B1%C3%A7a%C4%9F%C4%B11916358380565.jpg",
      imgFile: "spz-001-ahsap-sapli-katlanir-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: true,
      isNew: false,
      discountBadge: "Ücretsiz Kargo",
    },
    {
      name: "El Yapımı Epoksi Saplı Katlanır Çakı – Paslanmaz Çelik Outdoor Tasarım",
      slug: "el-yapimi-epoksi-sapli-katlanir-caki",
      sku: "SPZ-002",
      basePrice: "1199.00",
      description: "<p>Özel epoksi sap, paslanmaz çelik bıçak. Outdoor ve kamp kullanımı için dayanıklı, ergonomik tasarım. El yapımı üretim kalitesiyle uzun ömürlü kullanım sunar.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_av-outdoor-kamp-cak%C4%B1s%C4%B159919490933756.jpg",
      imgFile: "spz-002-epoksi-sapli-katlanir-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: true,
      isNew: false,
      discountBadge: null,
    },
    {
      name: "El Yapımı Oymalı Katlanır Çakı – Keklik Desenli Sert Ahşap Saplı Özel Tasarım",
      slug: "el-yapimi-oymali-katlanir-caki-keklik-desenli",
      sku: "SPZ-003",
      basePrice: "2000.00",
      description: "<p>Keklik motifiyle oyulmuş sert ahşap sap, özel tasarım çakı. El yapımı üretim, kaliteli çelik bıçak. Hem kullanım hem koleksiyon amaçlı idealdir.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-knife-3-49106519989528.png",
      imgFile: "spz-003-oymali-katlanir-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: true,
      isNew: true,
      discountBadge: "Ücretsiz Kargo",
    },
    {
      name: "Epoksi Saplı El Yapımı Çakı Bıçağı",
      slug: "epoksi-sapli-el-yapimi-caki-bicagi",
      sku: "SPZ-004",
      basePrice: "1099.00",
      description: "<p>Epoksi reçine saplı, el yapımı çakı bıçağı. Dayanıklı paslanmaz çelik bıçak, ergonomik tutuş. Kamp ve outdoor için güvenilir bir ekipman.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_kamp-cak%C4%B1s%C4%B1-1-83828220467321.jpg",
      imgFile: "spz-004-epoksi-sapli-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: false,
      isNew: false,
      discountBadge: null,
    },
    {
      name: "Paslanmaz Çelik Katlanır Çakı – Kamp ve Outdoor Kullanım için El Yapımı Tasarım",
      slug: "paslanmaz-celik-katlanir-caki-kamp",
      sku: "SPZ-005",
      basePrice: "1099.00",
      description: "<p>Paslanmaz çelik bıçak, el yapımı üretim. Kamp ve outdoor kullanımı için tasarlanmış katlanır çakı. Kompakt yapısıyla kolayca taşınır.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_kamp-cak%C4%B1s%C4%B159923582323799.jpg",
      imgFile: "spz-005-paslanmaz-celik-katlanir-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: false,
      isNew: false,
      discountBadge: null,
    },
    {
      name: "Oymalı Paslanmaz Çelik Detaylı, Reçine Saplı El Yapımı Katlanır Çakı",
      slug: "oymali-paslanmaz-celik-recine-sapli-katlanir-caki",
      sku: "SPZ-006",
      basePrice: "1299.00",
      description: "<p>Reçine sap üzerine oymalı paslanmaz çelik detaylarla süslenmiş el yapımı katlanır çakı. Koleksiyon kalitesinde tasarım ve outdoor dayanıklılığı bir arada.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-16-43361700228808.png",
      imgFile: "spz-006-oymali-recine-sapli-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: true,
      isNew: false,
      discountBadge: null,
    },
    {
      name: "Premium El Yapımı Katlanır Çakı – Sert Ağaç Saplı Outdoor ve Günlük Kullanım Tasarımı",
      slug: "premium-el-yapimi-katlanir-caki-sert-agac-sapli",
      sku: "SPZ-007",
      basePrice: "1299.00",
      description: "<p>Premium serisi sert ağaç saplı katlanır çakı. El yapımı üretim, yüksek karbonlu çelik bıçak. Outdoor aktiviteleri ve günlük kullanım için mükemmel seçim.</p>",
      imgUrl: "https://sepetzen.com/images/product/product_sepetzen-av-b%C4%B1%C3%A7a%C4%9F%C4%B1-1-59740843786625.jpg",
      imgFile: "spz-007-premium-katlanir-caki.webp",
      cats: ["cakilar", "tum-urunler"],
      isFeatured: true,
      isNew: true,
      discountBadge: null,
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
      discountBadge: pd.discountBadge,
      categoryId: insertedCats[pd.cats[0]],
    }).onConflictDoUpdate({
      target: products.slug,
      set: {
        name: pd.name,
        basePrice: pd.basePrice,
        images: [localImages[pd.slug]],
        isFeatured: pd.isFeatured,
        isNew: pd.isNew,
        discountBadge: pd.discountBadge,
        categoryId: insertedCats[pd.cats[0]],
      },
    }).returning();

    for (const catSlug of pd.cats) {
      const catId = insertedCats[catSlug];
      if (!catId) continue;
      await db.insert(productCategories).values({ productId: prod.id, categoryId: catId }).onConflictDoNothing();
    }

    await db.insert(productVariants).values({
      productId: prod.id,
      sku: `${pd.sku}-V1`,
      price: pd.basePrice,
      stock: 50,
      isActive: true,
    }).onConflictDoNothing();

    console.log(`   + ${pd.name} — ${pd.basePrice} TL`);
  }

  // ── 5. menu_items hiyerarşisi ───────────────────────────────────────────────
  console.log("\n5. Menu items oluşturuluyor...");
  const catId = (slug: string) => insertedCats[slug];

  // 7 kök öğe
  const rootDefs = [
    { title: "Çakılar",              type: "submenu",  slug: "cakilar",                     displayOrder: 10 },
    { title: "Bıçaklar",             type: "submenu",  slug: "bicaklar",                    displayOrder: 20 },
    { title: "Bağ & Bahçe Aletleri", type: "submenu",  slug: "bag-bahce-aletleri",           displayOrder: 30 },
    { title: "Pet Shop & Çiftlik",   type: "submenu",  slug: "pet-shop-ciftlik-ekipmanlari", displayOrder: 40 },
    { title: "Nalbur & Hırdavat",   type: "category", slug: "nalbur-hirdavat",             displayOrder: 50 },
    { title: "Mangal & Izgara & Ahşap", type: "submenu", slug: "mangal-izgara-ahsap",       displayOrder: 60 },
    { title: "Tüm Ürünler",         type: "category", slug: "tum-urunler",                 displayOrder: 70 },
  ] as const;

  const rootIds: Record<string, string> = {};
  for (const r of rootDefs) {
    const [item] = await db.insert(menuItems).values({
      title: r.title,
      type: r.type,
      categoryId: catId(r.slug),
      url: null,
      parentId: null,
      displayOrder: r.displayOrder,
      isActive: true,
      openInNewTab: false,
    }).returning();
    rootIds[r.slug] = item.id;
    console.log(`   + ${r.title}`);
  }

  // Alt menü öğeleri
  const childDefs = [
    // Çakılar altındakiler
    { title: "Kamp Çakıları",           slug: "kamp-cakilari",          parent: "cakilar",                     order: 11 },
    { title: "Outdoor & Kamp Çakıları", slug: "outdoor-kamp-cakisi",    parent: "cakilar",                     order: 12 },
    { title: "Aşı Çakıları",           slug: "asi-cakisi",             parent: "cakilar",                     order: 13 },
    { title: "İthal Çakılar",          slug: "ithal-caki",             parent: "cakilar",                     order: 14 },
    // Bıçaklar altındakiler
    { title: "Kamp Bıçakları",          slug: "kamp-bicaklari",         parent: "bicaklar",                    order: 21 },
    { title: "Mutfak Bıçakları",        slug: "mutfak-bicaklari",       parent: "bicaklar",                    order: 22 },
    { title: "Şef Bıçakları",           slug: "sef-bicaklari",          parent: "bicaklar",                    order: 23 },
    { title: "Kasap Bıçakları",         slug: "kasap-bicaklari",        parent: "bicaklar",                    order: 24 },
    { title: "Balık Bıçağı",           slug: "balik-bicagi",           parent: "bicaklar",                    order: 25 },
    { title: "Bıçaklık",               slug: "bicaklik",               parent: "bicaklar",                    order: 26 },
    // Bağ & Bahçe altındakiler
    { title: "Budama & Kesme",           slug: "budama-kesme",           parent: "bag-bahce-aletleri",          order: 31 },
    { title: "Toprak İşleme Aletleri", slug: "toprak-isleme-aletleri", parent: "bag-bahce-aletleri",          order: 32 },
    { title: "Sulama Sistemleri",        slug: "sulama-sistemleri",      parent: "bag-bahce-aletleri",          order: 33 },
    { title: "Koruyucu Ekipmanlar",      slug: "koruyucu-ekipmanlar",    parent: "bag-bahce-aletleri",          order: 34 },
    // Pet Shop altındakiler
    { title: "Evcil Hayvan Ürünleri",  slug: "evcil-hayvan-urunleri",  parent: "pet-shop-ciftlik-ekipmanlari",order: 41 },
    { title: "Yular & Halatlar",        slug: "yular-halatlar",         parent: "pet-shop-ciftlik-ekipmanlari",order: 42 },
    { title: "Zincir & Bağlama",        slug: "zincir-baglama",         parent: "pet-shop-ciftlik-ekipmanlari",order: 43 },
    { title: "Saraciye Ürünleri",       slug: "saraciye-urunleri",      parent: "pet-shop-ciftlik-ekipmanlari",order: 44 },
    // Mangal & Izgara altındakiler
    { title: "Mangal & Izgaralar",      slug: "mangal-izgaralar",       parent: "mangal-izgara-ahsap",         order: 61 },
    { title: "Izgara Ekipmanları",      slug: "izgara-ekipmanlari",     parent: "mangal-izgara-ahsap",         order: 62 },
    { title: "Ahşap Ürünler",          slug: "ahsap-urunler",          parent: "mangal-izgara-ahsap",         order: 63 },
    { title: "Mangal Aksesuarları",     slug: "mangal-aksesuarlari",    parent: "mangal-izgara-ahsap",         order: 64 },
    { title: "Kömür & Tutuşturucu",   slug: "komur-tutusturucu",      parent: "mangal-izgara-ahsap",         order: 65 },
  ];

  for (const ch of childDefs) {
    await db.insert(menuItems).values({
      title: ch.title,
      type: "category",
      categoryId: catId(ch.slug),
      url: null,
      parentId: rootIds[ch.parent],
      displayOrder: ch.order,
      isActive: true,
      openInNewTab: false,
    });
    console.log(`     └ ${ch.title}`);
  }

  // ── 6. Statik sayfalar ─────────────────────────────────────────────────────
  console.log("\n6. Statik sayfalar ekleniyor...");
  const pageDefs = [
    {
      slug: "hakkimizda",
      title: "Hakkımızda",
      content: `<h2>Sepetzen Kimdir?</h2>
<p>Sepetzen, 2009 yılında Dalaman, Muğla'da temelleri atılmış bir kamp, outdoor, bıçak ve bağ & bahçe markasıdır. Doğanın içinde zaman geçiren insanların ihtiyaçlarını karşılamak amacıyla yola çıktık.</p>
<p>Ahmet Uğur Durmaz liderliğinde yönetilen Sepetzen; av bıçakları, kamp çakıları, outdoor ekipmanları, bağ & bahçe aletleri, pet shop ekipmanları ve mangal ürünleri alanlarında faaliyet göstermektedir.</p>
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
<p><strong>Yetkili:</strong> Ahmet Uğur Durmaz</p>
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
<p>İşbu Sözleşme, Alıcı'nın Satıcı'ya ait sepetzen.com internet sitesinden elektronik ortamda siparişini yaptığı ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini kapsamaktadır.</p>
<h3>Madde 3 – Sözleşme Konusu Ürün</h3>
<p>Malın temel özellikleri, satış fiyatı dahil tüm vergiler dahil toplam satış bedeli sipariş özetinde ve ödeme sayfasında gösterilmektedir.</p>
<h3>Madde 4 – Genel Hükümler</h3>
<p>4.1. Alıcı, sepetzen.com internet sitesinde sözleşme konusu ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</p>
<p>4.2. Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile her bir ürün için Alıcı'nın yerleşim yeri uzaklığına bağlı olarak ön bilgiler içinde açıklanan süre içinde Alıcı'ya teslim edilir.</p>
<p>4.3. Satıcı, sözleşme konusu ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri ve kullanım kılavuzları ile teslim edilmesinden sorumludur.</p>
<p>4.4. Sözleşme konusu ürünün teslimatı için ödemenin tamamlanmış olması şarttır. Herhangi bir nedenle ürün bedeli ödenmez veya banka kayıtlarında iptal edilirse Satıcı ürünün teslimi yükümlülüğünden kurtulmuş kabul edilir.</p>
<h3>Madde 5 – Cayma Hakkı</h3>
<p>5.1. Alıcı, sözleşme konusu ürünün kendisine teslim tarihinden itibaren <strong>14 (on dört) gün</strong> içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>
<p>5.2. Cayma hakkının kullanılması için bu süre içinde Satıcı'ya e-posta veya telefon ile bildirimde bulunulması ve ürünün aşağıdaki Madde 6 hükümleri çerçevesinde iade edilmesi şarttır.</p>
<p>5.3. Aşağıdaki hallerde cayma hakkı kullanılamaz: Alıcı'nın istekleri doğrultusunda özel hazırlanan ürünler; çabuk bozulabilen mallar; ambalajı açılmış, hijyen açısından iadesi uygun olmayan ürünler.</p>
<h3>Madde 6 – İade Prosedürü</h3>
<p>6.1. Cayma hakkının kullanıldığına dair bildirimin Satıcı'ya ulaşmasından itibaren Satıcı, tahsil etmiş olduğu tüm ödemeleri 14 (on dört) gün içinde iade etmekle yükümlüdür.</p>
<p>6.2. Alıcı, cayma hakkını kullanmasından itibaren 10 (on) gün içinde ürünü iade etmekle yükümlüdür. İade kargo ücreti Alıcı'ya aittir.</p>
<h3>Madde 7 – Teslimat</h3>
<p>7.1. Ürünler sipariş onayından itibaren 3-7 iş günü içinde kargo ile gönderilir. 1500 TL ve üzeri siparişlerde kargo ücretsizdir.</p>
<p>7.2. Kargo firmasının kusuru nedeniyle doğan gecikmelerden Satıcı sorumlu değildir.</p>
<h3>Madde 8 – Uyuşmazlık Çözümü</h3>
<p>İşbu Sözleşme'den doğan uyuşmazlıklarda, Gümrük ve Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici Hakem Heyetleri, bu değerin üzerindeki uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir. Yetkili Hakem Heyeti ve Mahkeme, Dalaman ilçesinde bulunan heyetler ve mahkemelerdir.</p>
<h3>Madde 9 – Yürürlük</h3>
<p>Alıcı, sipariş onay sürecinde elektronik ortamda ön bilgileri onaylamasıyla işbu Sözleşme'nin tüm koşullarını kabul etmiş sayılır. Bu Sözleşme sipariş onayı anında yürürlüğe girer.</p>`,
    },
    {
      slug: "kvkk-aydinlatma-metni",
      title: "KVKK Aydınlatma Metni",
      content: `<h2>KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ</h2>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi gereğince, veri sorumlusu sıfatıyla Ahmet Uğur Durmaz (Sepetzen) olarak kişisel verilerinizin işlenmesi hakkında aşağıdaki bilgileri sizinle paylaşmaktayız.</p>
<h3>1. Veri Sorumlusunun Kimliği</h3>
<p>Ahmet Uğur Durmaz (Sepetzen), Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla<br>
E-posta: sepetzen@gmail.com | Telefon: 0536 630 11 38</p>
<h3>2. İşlenen Kişisel Veriler</h3>
<ul>
<li><strong>Kimlik Verileri:</strong> Ad, soyad</li>
<li><strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası, teslimat adresi</li>
<li><strong>Sipariş ve İşlem Verileri:</strong> Sipariş geçmişi, satın alınan ürünler, ödeme başarı/başarısızlık durumu (kart numarası işlenmez)</li>
<li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı bilgisi, çerez verileri</li>
<li><strong>Tercih Verileri:</strong> WhatsApp/SMS iletişim tercihleri</li>
</ul>
<h3>3. Kişisel Verilerin İşlenme Amaçları</h3>
<ul>
<li>Sipariş alımı, onayı ve teslim süreçlerinin yürütülmesi</li>
<li>Kargo ve teslimat işlemlerinin gerçekleştirilmesi</li>
<li>Müşteri hizmetleri ve şikâyet süreçlerinin yönetimi</li>
<li>Ödeme işlemlerinin güvenli biçimde gerçekleştirilmesi</li>
<li>Fatura ve yasal kayıtların tutulması</li>
<li>Onayınız doğrultusunda pazarlama iletişiminin yapılması (e-posta, SMS, WhatsApp)</li>
<li>Site güvenliğinin ve teknik altyapının sürdürülmesi</li>
</ul>
<h3>4. Hukuki Dayanak</h3>
<ul>
<li>KVKK md. 5/2-c: Sözleşmenin kurulması veya ifasıyla doğrudan ilgili veri işleme (sipariş/teslimat)</li>
<li>KVKK md. 5/2-ç: Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (fatura, vergi)</li>
<li>KVKK md. 5/2-f: Veri sorumlusunun meşru menfaati (site güvenliği)</li>
<li>KVKK md. 5/1: Açık rıza (pazarlama iletişimi)</li>
</ul>
<h3>5. Kişisel Verilerin Aktarımı</h3>
<p>Verileriniz; yasal zorunluluklar çerçevesinde kargo firmalarına, ödeme altyapı sağlayıcısına (iyzico) ve yetkili kamu kuruluşlarına aktarılabilir. Bu aktarımlar dışında verileriniz üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz.</p>
<h3>6. Saklama Süreleri</h3>
<ul>
<li>Sipariş ve fatura verileri: 10 yıl (yasal zorunluluk)</li>
<li>Müşteri hesap bilgileri: Hesap aktif olduğu sürece + 2 yıl</li>
<li>Pazarlama verileri: Rıza geri alınana kadar</li>
</ul>
<h3>7. İlgili Kişi Hakları (KVKK Madde 11)</h3>
<ul>
<li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
<li>İşlenmişse buna ilişkin bilgi talep etme</li>
<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
<li>Yurt içinde veya dışında aktarıldığı üçüncü kişileri bilme</li>
<li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
<li>Kanun'un 7. maddesi kapsamında silinmesini veya yok edilmesini isteme</li>
<li>Kanuna aykırı işleme nedeniyle uğranılan zararın giderilmesini talep etme</li>
</ul>
<p>Haklarınızı kullanmak için yazılı başvurunuzu <strong>sepetzen@gmail.com</strong> adresine iletebilirsiniz. Başvurularınız kimlik doğrulamasının ardından en geç 30 gün içinde yanıtlanacaktır.</p>
<h3>8. Güvenlik</h3>
<p>Kişisel verileriniz; SSL şifreleme, erişim kontrolü ve güvenli altyapı gibi teknik ve idari tedbirlerle korunmaktadır. Ödeme bilgileriniz, PCI-DSS sertifikalı iyzico altyapısı üzerinden 3D Secure sistemiyle işlenmekte olup Sepetzen tarafından saklanmamaktadır.</p>`,
    },
    {
      slug: "on-bilgilendirme-formu",
      title: "Ön Bilgilendirme Formu",
      content: `<h2>ÖN BİLGİLENDİRME FORMU</h2>
<p>6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği gereğince aşağıdaki bilgiler satın alma işlemi gerçekleştirilmeden önce alıcıya sunulmaktadır.</p>
<h3>1. Satıcı Bilgileri</h3>
<p>Ahmet Uğur Durmaz (Sepetzen)<br>
Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla<br>
Telefon: 0536 630 11 38 | E-posta: sepetzen@gmail.com | Web: sepetzen.com</p>
<h3>2. Ürün Bilgileri</h3>
<p>Sipariş edilen ürünlerin adı, miktarı, temel nitelikleri, birim fiyatı ve KDV dahil toplam fiyatı sipariş özetinde yer almaktadır.</p>
<h3>3. Ödeme Bilgileri</h3>
<p>Ödeme, kredi/banka kartı (iyzico 3D Secure altyapısı), havale/EFT veya kapıda ödeme yöntemleriyle yapılabilir. Havale/EFT ödemelerinde %3 indirim uygulanır.</p>
<h3>4. Teslimat</h3>
<p>Teslimat süresi sipariş onayından itibaren 3-7 iş günüdür. 1500 TL ve üzeri siparişlerde kargo ücretsizdir. Kargo takip numarası, kargo çıkışında e-posta ile bildirilir.</p>
<h3>5. Cayma Hakkı</h3>
<p>Alıcı, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin sözleşmeden cayma hakkına sahiptir. Cayma bildiriminin sepetzen@gmail.com adresine yapılması yeterlidir.</p>
<h3>6. Cayma Hakkının İstisnaları</h3>
<ul>
<li>Alıcının isteğiyle özel olarak üretilen veya kişiselleştirilen ürünler</li>
<li>Ambalajı açılmış hijyen ürünleri</li>
<li>Kullanılmış veya hasara uğramış ürünler</li>
</ul>
<h3>7. Uyuşmazlık</h3>
<p>Uyuşmazlıklarda Dalaman Tüketici Hakem Heyeti ve Tüketici Mahkemesi yetkilidir. Güncel parasal sınırlar için Gümrük ve Ticaret Bakanlığı tebliğlerini inceleyiniz.</p>
<h3>8. İletişim</h3>
<p>Her türlü soru ve talepleriniz için: sepetzen@gmail.com | 0536 630 11 38</p>`,
    },
    {
      slug: "uyelik-sozlesmesi",
      title: "Üyelik Sözleşmesi",
      content: `<h2>ÜYELİK SÖZLEŞMESİ</h2>
<p>Bu Üyelik Sözleşmesi ("Sözleşme"), sepetzen.com internet sitesini işleten Ahmet Uğur Durmaz (Sepetzen) ile siteye üye olan kişi ("Üye") arasında akdedilmiştir.</p>
<h3>Madde 1 – Taraflar ve Konu</h3>
<p><strong>Sepetzen:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla — sepetzen@gmail.com — 0536 630 11 38</p>
<p>İşbu Sözleşme; Üye'nin Site'ye üye olma ve Site üzerinden gerçekleştireceği alışveriş işlemlerine ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.</p>
<h3>Madde 2 – Üyelik Koşulları</h3>
<p>2.1. Üye olmak için 18 (on sekiz) yaşını doldurmuş olmak ve fiil ehliyetine sahip bulunmak zorunludur.</p>
<p>2.2. Üyelik, formun doldurulup onaylanması ve bu Sözleşme ile Gizlilik Politikası'nın kabul edilmesi ile tamamlanır.</p>
<p>2.3. Üye, üyelik formunda gerçeğe aykırı, yanıltıcı veya eksik bilgi vermeyeceğini taahhüt eder.</p>
<p>2.4. Her gerçek kişi yalnızca bir üyelik oluşturabilir.</p>
<h3>Madde 3 – Üyenin Yükümlülükleri</h3>
<p>3.1. Üye; kullanıcı adı ve şifresinin gizliliğini korumakla yükümlüdür.</p>
<p>3.2. Üye, Site'yi yalnızca hukuka ve ahlaka uygun amaçlarla kullanacağını; Site'nin işleyişini engelleyecek eylemlerden kaçınacağını kabul ve taahhüt eder.</p>
<p>3.3. Üye, Site üzerinden gerçekleştirdiği işlemlerden kaynaklanan her türlü yasal sorumluluktan şahsen sorumludur.</p>
<h3>Madde 4 – Sepetzen'in Hakları</h3>
<p>4.1. Sepetzen, önceden haber vermeksizin Site içeriğinde veya fiyatlarda değişiklik yapma hakkını saklı tutar.</p>
<p>4.2. Sepetzen, teknik gereklilikler veya bakım nedeniyle Site'ye erişimi geçici olarak kısıtlayabilir.</p>
<h3>Madde 5 – Kişisel Verilerin Korunması</h3>
<p>Üye'ye ait kişisel veriler, Sepetzen Gizlilik Politikası ve 6698 sayılı KVKK çerçevesinde işlenir ve korunur. Detaylar için KVKK Aydınlatma Metni'ni inceleyiniz.</p>
<h3>Madde 6 – Üyeliğin Sona Ermesi</h3>
<p>6.1. Üye, sepetzen@gmail.com adresine yazılı bildirimde bulunarak üyeliğini sonlandırabilir.</p>
<p>6.2. Sepetzen, Sözleşme'ye veya yasal düzenlemelere aykırı davranış hâlinde üyeliği askıya alabilir veya kalıcı olarak sonlandırabilir.</p>
<h3>Madde 7 – Fikri Mülkiyet</h3>
<p>Site üzerindeki tüm içerikler (metin, görsel, logo, tasarım) Sepetzen'e aittir ve telif hakkı yasaları kapsamında korunmaktadır. İzinsiz kullanım yasal yaptırıma tabidir.</p>
<h3>Madde 8 – Uygulanacak Hukuk</h3>
<p>İşbu Sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda Muğla (Dalaman) Mahkemeleri ve İcra Daireleri yetkilidir.</p>
<h3>Madde 9 – Yürürlük</h3>
<p>Üye'nin üyelik formunu onaylaması, işbu Sözleşme'yi okuduğunu, anladığını ve kabul ettiğini gösterir. Sözleşme bu onay anında yürürlüğe girer.</p>`,
    },
    {
      slug: "iptal-ve-iade-sartlari",
      title: "İptal ve İade Şartları",
      content: `<h2>İPTAL VE İADE ŞARTLARI</h2>
<p>Müşteri memnuniyeti Sepetzen'in önceliğidir. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde iptal ve iade haklarınız aşağıda açıklanmıştır.</p>
<h3>1. Sipariş İptali</h3>
<p><strong>Kargoya verilmeden önce:</strong> Siparişiniz henüz kargoya verilmemişse sepetzen@gmail.com adresine e-posta göndererek veya 0536 630 11 38 numaralı telefondan bize ulaşarak iptal talebinde bulunabilirsiniz. İptal onaylanması hâlinde ödemeniz aynı ödeme yöntemine iade edilir.</p>
<p><strong>Kargoya verildikten sonra:</strong> Sipariş kargoya verildikten sonra iptal mümkün değildir; bu durumda İade Süreci prosedürünü izlemeniz gerekmektedir.</p>
<h3>2. Cayma Hakkı</h3>
<p>Ürünü teslim aldığınız tarihten itibaren <strong>14 (on dört) gün</strong> içinde herhangi bir gerekçe göstermeksizin sözleşmeden cayabilirsiniz. Cayma hakkınızı kullanmak için sepetzen@gmail.com adresine sipariş numarası ve adınızla e-posta gönderin. Satıcı cayma bildirimini aldıktan sonra en geç 14 gün içinde ödemenizi iade eder. Alıcı, cayma bildiriminden itibaren en geç 10 gün içinde ürünü iade etmelidir.</p>
<h3>3. İade Koşulları</h3>
<ul>
<li>Ürün kullanılmamış ve hasar görmemiş olmalıdır.</li>
<li>Orijinal ambalajında, tüm aksesuarları ve belgeleri ile birlikte iade edilmelidir.</li>
<li>Teslim tarihinden itibaren 14 gün içinde cayma bildirimi yapılmış olmalıdır.</li>
</ul>
<h3>4. İade Dışı Ürünler</h3>
<ul>
<li>Alıcının özel istekleriyle üretilmiş ürünler</li>
<li>Koruyucu ambalajı açılmış, hijyen açısından iadesi uygun olmayan ürünler</li>
<li>Kullanılmış veya hasara uğramış ürünler</li>
</ul>
<h3>5. İade Prosedürü</h3>
<ol>
<li>sepetzen@gmail.com adresine sipariş numarası ve iade nedeniyle e-posta gönderin.</li>
<li>İade talebiniz 1-2 iş günü içinde değerlendirilerek tarafınıza bildirilir.</li>
<li>Onay sonrasında ürünü orijinal ambalajında şu adrese gönderin: <strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></li>
<li>Ürün tarafımıza ulaştıktan sonra 2-3 iş günü içinde kontrol edilir.</li>
<li>İade onaylanırsa ödemeniz 7-10 iş günü içinde orijinal ödeme yönteminize iade edilir.</li>
</ol>
<h3>6. İade Kargo Ücreti</h3>
<p>Cayma hakkı kapsamındaki iadelerde kargo ücreti <strong>alıcıya aittir</strong>. Ürün arızalı veya hatalı teslim edilmişse kargo ücreti Sepetzen tarafından karşılanır.</p>
<h3>7. İletişim</h3>
<p>İptal ve iade talepleriniz için:<br>
<strong>E-posta:</strong> sepetzen@gmail.com | <strong>Telefon/WhatsApp:</strong> 0536 630 11 38<br>
Çalışma saatleri: Pazartesi–Cumartesi 09:00–18:00</p>`,
    },
    {
      slug: "gizlilik-guvenlik",
      title: "Gizlilik & Güvenlik",
      content: `<h2>GİZLİLİK & GÜVENLİK POLİTİKASI</h2>
<p>Sepetzen olarak müşterilerimizin gizliliğine saygı duyuyor ve kişisel verilerini korumayı öncelikli bir sorumluluk olarak kabul ediyoruz. Bu politika; sepetzen.com web sitesini ziyaret ettiğinizde ve alışveriş yaptığınızda hangi verilerin toplandığını, nasıl kullanıldığını ve nasıl korunduğunu açıklamaktadır.</p>
<h3>1. Toplanan Bilgiler</h3>
<p><strong>Doğrudan verdiğiniz bilgiler:</strong></p>
<ul>
<li>Ad, soyad; e-posta adresi ve telefon numarası</li>
<li>Fatura ve teslimat adresi</li>
<li>Sipariş bilgileri (kart bilgileri tarafımızca saklanmaz)</li>
</ul>
<p><strong>Otomatik toplanan bilgiler:</strong></p>
<ul>
<li>IP adresi ve tarayıcı türü</li>
<li>Ziyaret ettiğiniz sayfalar ve geçirilen süre</li>
<li>Çerez verileri</li>
</ul>
<h3>2. Verilerin Kullanım Amaçları</h3>
<ul>
<li>Sipariş işlemlerinin tamamlanması ve kargo takibi</li>
<li>Hesabınıza ait bildirim ve güncellemelerin iletilmesi</li>
<li>Müşteri destek hizmetlerinin sağlanması</li>
<li>Rıza vermeniz hâlinde pazarlama iletişimi (e-posta, SMS, WhatsApp)</li>
<li>Yasal yükümlülüklerin yerine getirilmesi (vergi, fatura)</li>
<li>Site güvenliğinin ve performansının korunması</li>
</ul>
<h3>3. Verilerin Paylaşımı</h3>
<p>Kişisel verileriniz üçüncü taraflara satılmaz veya kiralanmaz. Verileriniz yalnızca şu durumlarla sınırlı paylaşılabilir:</p>
<ul>
<li><strong>Kargo firmaları:</strong> Teslimat amacıyla (isim, adres, telefon)</li>
<li><strong>Ödeme altyapısı (iyzico):</strong> Ödeme işleminin gerçekleştirilmesi için</li>
<li><strong>Yetkili kamu kurumları:</strong> Yasal zorunluluk hâlinde</li>
</ul>
<h3>4. Güvenlik Önlemleri</h3>
<ul>
<li><strong>SSL/TLS Şifreleme:</strong> Tüm veri iletimi 256-bit SSL şifrelemesi ile korunmaktadır.</li>
<li><strong>3D Secure Ödeme:</strong> Kart ödemeleri iyzico altyapısıyla 3D Secure protokolü üzerinden işlenmektedir. Kart bilgileriniz Sepetzen sistemlerinde saklanmamaktadır.</li>
<li><strong>Erişim Kontrolü:</strong> Kişisel verilere erişim yalnızca yetkili personelle sınırlıdır.</li>
</ul>
<h3>5. Haklarınız</h3>
<p>KVKK'nın 11. maddesi kapsamındaki haklarınızı kullanmak için lütfen KVKK Aydınlatma Metni sayfasını inceleyiniz. Taleplerinizi sepetzen@gmail.com adresine iletebilirsiniz.</p>
<h3>6. İletişim</h3>
<p>E-posta: sepetzen@gmail.com | Telefon: 0536 630 11 38<br>
Adres: Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>`,
    },
    {
      slug: "cerez-politikasi",
      title: "Çerez Politikası",
      content: `<h2>ÇEREZ POLİTİKASI</h2>
<p>Bu Çerez Politikası, sepetzen.com web sitesinin çerez kullanımını ve kullanıcıların bu çerezler üzerindeki tercihlerini açıklamaktadır. 6698 sayılı KVKK ve ilgili mevzuat kapsamında hazırlanmıştır.</p>
<h3>1. Çerez Nedir?</h3>
<p>Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız tarafından cihazınıza kaydedilen küçük metin dosyalarıdır. Çerezler, web sitesinin düzgün çalışması, kullanıcı deneyiminin iyileştirilmesi ve site trafiğinin analiz edilmesi amacıyla kullanılır.</p>
<h3>2. Kullandığımız Çerez Türleri</h3>
<p><strong>a) Zorunlu Çerezler</strong> — site işlevleri için gereklidir, devre dışı bırakılamaz:</p>
<ul>
<li><strong>Oturum çerezi (session cookie):</strong> Giriş durumunuzu ve sepet içeriğinizi oturum boyunca hatırlar. Tarayıcı kapanınca silinir.</li>
<li><strong>CSRF koruma çerezi:</strong> Form gönderimlerini güvenli hale getirir.</li>
</ul>
<p><strong>b) İşlevsel Çerezler</strong> — deneyimi kişiselleştirmek için:</p>
<ul>
<li><strong>Kimlik doğrulama çerezi:</strong> "Beni hatırla" özelliğini sağlar (30 güne kadar).</li>
<li><strong>Tercih çerezi:</strong> Dil ve görüntü tercihlerinizi hatırlar.</li>
</ul>
<p><strong>c) Analitik Çerezler</strong> — yalnızca istatistiksel amaçlıdır, kişisel kimlik içermez:</p>
<ul>
<li><strong>Google Analytics (_ga, _gid, _gat):</strong> Sayfa görüntüleme, oturum süresi ve kullanıcı sayısı gibi anonim veriler.</li>
</ul>
<p><strong>d) Pazarlama Çerezleri</strong> — yalnızca açık rızanızla etkinleşir:</p>
<ul>
<li><strong>Meta (Facebook) Pixel:</strong> Reklamların etkinliğini ölçmek ve size ilgili reklamlar göstermek amacıyla kullanılır.</li>
</ul>
<h3>3. Çerez Saklama Süreleri</h3>
<ul>
<li>session_id (Zorunlu): Oturum sonu</li>
<li>auth_token (İşlevsel): 30 gün</li>
<li>_ga (Analitik): 2 yıl</li>
<li>_gid (Analitik): 24 saat</li>
<li>fbp — Meta Pixel (Pazarlama): 90 gün</li>
</ul>
<h3>4. Çerezleri Nasıl Yönetirsiniz?</h3>
<p>Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin devre dışı bırakılması Site'nin bazı işlevlerini etkileyebilir.</p>
<ul>
<li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler</li>
<li><strong>Mozilla Firefox:</strong> Ayarlar → Gizlilik & Güvenlik → Çerezler</li>
<li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri yönet</li>
<li><strong>Microsoft Edge:</strong> Ayarlar → Çerezler ve site izinleri</li>
</ul>
<h3>5. Değişiklikler</h3>
<p>Bu Çerez Politikası, yasal düzenlemelere veya hizmetlerimizdeki değişikliklere bağlı olarak güncellenebilir. Güncel politikaya bu sayfadan ulaşabilirsiniz. Sorularınız için: sepetzen@gmail.com</p>`,
    },
    {
      slug: "kargo-sureci",
      title: "Kargo Süreci",
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
      title: "İade Süreci",
      content: `<h2>İADE SÜRECİ</h2>
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

  // ── 7. Site ayarları güncelle ──────────────────────────────────────────────
  console.log("\n7. Site ayarları güncelleniyor...");
  try {
    const { siteSettings } = await import("@shared/schema");
    const settingUpdates = [
      { key: "site_name", value: "Sepetzen" },
      { key: "contact_email", value: "sepetzen@gmail.com" },
      { key: "contact_phone", value: "0536 630 11 38" },
      { key: "whatsapp_number", value: "905366301138" },
      { key: "announcement_bar", value: "1500 TL ve Üzeri Ücretsiz Kargo! | İlk Siparişinize Sepette %10 İndirim! | Havale/EFT'de %3 İndirim" },
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

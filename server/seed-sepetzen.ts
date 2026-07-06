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
      title: "İptal ve İade Şartları",
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
      slug: "gizlilik-guvenlik",
      title: "Gizlilik & Güvenlik",
      content: `<h2>GİZLİLİK & GÜVENLİK POLİTİKASI</h2>
<p>Sepetzen olarak gizliliğinize saygı duyuyoruz. Bu politika, web sitemizi ziyaret ettiğinizde toplanan bilgileri ve bu bilgilerin nasıl kullanıldığını açıklamaktadır.</p>
<h3>Toplanan Bilgiler</h3>
<ul>
<li>Üyelik ve sipariş sırasında girdiğiniz ad, e-posta, adres bilgileri</li>
<li>Site kullanım verileri (çerezler aracılığıyla)</li>
</ul>
<h3>Bilgilerin Kullanımı</h3>
<p>Bilgileriniz yalnızca sipariş işlemleri ve sizinle iletişim kurulması amacıyla kullanılmaktadır. Üçüncü taraflarla satılmaz veya paylaşılmaz.</p>
<h3>Güvenlik</h3>
<p>Verileriniz SSL şifrelemesi ile korunmaktadır. Ödeme bilgileriniz iyzico güvencesiyle 3D Secure sisteminden geçmektedir.</p>`,
    },
    {
      slug: "cerez-politikasi",
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

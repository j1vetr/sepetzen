/**
 * Trendyol Kategori Teşhis Script'i
 *
 * Trendyol API'dan ilk N sayfa ürünü ham olarak çeker; her ürünün gerçek
 * `categoryId` + `categoryName` bilgisini gösterip kategori bazında dağılımı
 * çıkartır. Site DB'sinde nasıl göründüğüyle karşılaştırma yapmaya yarar.
 *
 * Kullanım (production'da):
 *   cd /var/www/polenstone
 *   set -a && source .env && set +a
 *   npx tsx scripts/check-trendyol-cats.ts          # 2 sayfa (≈100 ürün)
 *   npx tsx scripts/check-trendyol-cats.ts 5        # 5 sayfa (≈250 ürün)
 *   npx tsx scripts/check-trendyol-cats.ts all      # tüm sayfalar (~860 ürün)
 *
 * Gereken env: DATABASE_URL, MARKETPLACE_ENCRYPTION_KEY
 */
import { db } from "../server/db";
import { marketplaces } from "../shared/schema";
import { eq } from "drizzle-orm";
import { createAdapter } from "../server/marketplaces/registry";
import { decryptCredentials } from "../server/marketplaces/crypto";
import "../server/marketplaces/trendyol/adapter";

type CategoryStat = {
  externalId: string;
  externalName: string;
  count: number;
  samples: string[];
};

async function main() {
  const arg = process.argv[2] ?? "2";
  const maxPages = arg === "all" ? Infinity : Math.max(1, Number(arg));

  const [mp] = await db
    .select()
    .from(marketplaces)
    .where(eq(marketplaces.type, "trendyol"))
    .limit(1);

  if (!mp) {
    console.error("HATA: marketplaces tablosunda trendyol kaydı yok.");
    process.exit(1);
  }
  if (!mp.isActive) {
    console.error("UYARI: Trendyol kaydı pasif (isActive=false).");
  }

  console.log(`Trendyol marketplace bulundu: ${mp.name} (${mp.id})`);
  console.log(
    `Sayfa başına ~50 ürün, max ${arg === "all" ? "TÜM" : maxPages} sayfa çekilecek...\n`,
  );

  const credentials = decryptCredentials(mp.encryptedCredentials);
  const adapter = createAdapter(
    "trendyol",
    credentials as any,
    (mp.config ?? {}) as any,
  );

  const stats = new Map<string, CategoryStat>();
  let totalProducts = 0;
  let cursor: any = 0;
  let pagesFetched = 0;

  while (cursor !== null && pagesFetched < maxPages) {
    process.stdout.write(`  → Sayfa ${pagesFetched + 1} çekiliyor... `);
    const page = await adapter.fetchProductsPage(cursor);
    process.stdout.write(`${page.products.length} ürün\n`);
    pagesFetched += 1;
    totalProducts += page.products.length;

    for (const p of page.products) {
      const key = `${p.externalCategoryId}|${p.externalCategoryName ?? "?"}`;
      let s = stats.get(key);
      if (!s) {
        s = {
          externalId: p.externalCategoryId,
          externalName: p.externalCategoryName ?? "(ad yok)",
          count: 0,
          samples: [],
        };
        stats.set(key, s);
      }
      s.count += 1;
      if (s.samples.length < 4) s.samples.push(p.name);
    }

    cursor = page.nextCursor;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Toplam ${totalProducts} ürün incelendi (${pagesFetched} sayfa)`);
  console.log(`Farklı kategori sayısı: ${stats.size}`);
  console.log("=".repeat(70));

  const sorted = Array.from(stats.values()).sort((a, b) => b.count - a.count);

  if (sorted.length === 1) {
    console.log("\n⚠️  TÜM ÜRÜNLER TEK KATEGORİDE — Trendyol payload'ı tek bir");
    console.log("    categoryId döndürüyor. Bu ya mağaza yüklemesinden ya da");
    console.log("    Trendyol API'nın bu endpoint'te leaf categoryId");
    console.log("    döndürmemesinden kaynaklanır.\n");
  } else {
    console.log(
      `\n✅ ${sorted.length} farklı kategori bulundu — Trendyol her ürün için`,
    );
    console.log("   ayrı categoryId döndürüyor. Site tarafında doğru ayırma");
    console.log("   yapılması mümkün.\n");
  }

  console.log("Kategori dağılımı (en çok ürünlüden başlayarak):\n");
  for (const s of sorted) {
    console.log(
      `  [${String(s.count).padStart(4)} ürün]  ${s.externalName}  (id: ${s.externalId})`,
    );
    for (const sample of s.samples) {
      console.log(`            └─ ${sample}`);
    }
    console.log("");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});

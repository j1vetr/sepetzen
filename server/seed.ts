import { db } from "./db";
import { adminUsers, categories, products, productVariants } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("Starting Polen Stone database seed...");

    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      console.log("• Skipping default admin seed in production environment.");
    } else {
      const existingAdmin = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, "admin"))
        .limit(1);

      if (existingAdmin.length === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const [admin] = await db.insert(adminUsers).values({
          username: "admin",
          password: hashedPassword,
        }).returning();
        console.log("✓ Dev admin user created:", admin.username);
      } else {
        console.log("• Admin user already exists, skipping.");
      }
    }

    const stoneCategories = [
      { name: "Mermer", slug: "mermer", displayOrder: 0 },
      { name: "Granit", slug: "granit", displayOrder: 1 },
      { name: "Traverten", slug: "traverten", displayOrder: 2 },
      { name: "Oniks", slug: "oniks", displayOrder: 3 },
    ];

    const createdCategoryIds: Record<string, string> = {};
    for (const cat of stoneCategories) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, cat.slug))
        .limit(1);

      if (existing.length === 0) {
        const [created] = await db.insert(categories).values(cat).returning();
        createdCategoryIds[cat.slug] = created.id;
        console.log(`✓ Category created: ${cat.name}`);
      } else {
        createdCategoryIds[cat.slug] = existing[0].id;
        console.log(`• Category exists: ${cat.name}`);
      }
    }

    const sampleProducts = [
      {
        name: "Carrara Beyaz Mermer",
        slug: "carrara-beyaz-mermer",
        description:
          "Klasik İtalyan ihtişamı. Soğuk gri damarları olan parlak beyaz mermer; banyo ve mutfak tezgâhları için ideal.",
        categoryId: createdCategoryIds["mermer"],
        basePrice: "4500.00",
        images: [],
        isActive: true,
        isFeatured: true,
        isNew: true,
      },
      {
        name: "Afyon Şeker Mermer",
        slug: "afyon-seker-mermer",
        description:
          "Anadolu'nun pürüzsüz beyazı. Homojen krem-beyaz dokusuyla zarif zemin ve duvar uygulamalarında öne çıkar.",
        categoryId: createdCategoryIds["mermer"],
        basePrice: "3800.00",
        images: [],
        isActive: true,
        isFeatured: true,
        isNew: false,
      },
      {
        name: "Absolute Black Granit",
        slug: "absolute-black-granit",
        description:
          "Derin, tek ton siyah granit. Cilalı yüzey ile mat zarafet; mutfak tezgâhı ve dış cephe için dayanıklı seçim.",
        categoryId: createdCategoryIds["granit"],
        basePrice: "2900.00",
        images: [],
        isActive: true,
        isFeatured: true,
        isNew: false,
      },
      {
        name: "Klasik Traverten",
        slug: "klasik-traverten",
        description:
          "Sıcak bej tonları ve karakteristik gözenekli yapısıyla. Honlu yüzey, doğal mekânlar için tercih edilir.",
        categoryId: createdCategoryIds["traverten"],
        basePrice: "1800.00",
        images: [],
        isActive: true,
        isFeatured: false,
        isNew: true,
      },
      {
        name: "Bal Oniks",
        slug: "bal-oniks",
        description:
          "Işık geçirgen, bal renginde lüks oniks. Arkadan aydınlatmalı paneller ve dekoratif duvarlar için eşsiz seçim.",
        categoryId: createdCategoryIds["oniks"],
        basePrice: "8500.00",
        images: [],
        isActive: true,
        isFeatured: true,
        isNew: true,
      },
    ];

    let createdProductCount = 0;
    for (const prod of sampleProducts) {
      if (!prod.categoryId) continue;
      const existing = await db
        .select()
        .from(products)
        .where(eq(products.slug, prod.slug))
        .limit(1);

      if (existing.length === 0) {
        const [created] = await db.insert(products).values(prod).returning();
        await db.insert(productVariants).values([
          {
            productId: created.id,
            size: "30x60",
            color: "Doğal",
            colorHex: "#E8DCC4",
            price: prod.basePrice,
            stock: 50,
            sku: `${prod.slug.toUpperCase().slice(0, 8)}-3060`,
          },
          {
            productId: created.id,
            size: "60x60",
            color: "Doğal",
            colorHex: "#E8DCC4",
            price: prod.basePrice,
            stock: 30,
            sku: `${prod.slug.toUpperCase().slice(0, 8)}-6060`,
          },
        ]);
        createdProductCount++;
        console.log(`✓ Product created: ${prod.name}`);
      } else {
        console.log(`• Product exists: ${prod.name}`);
      }
    }

    console.log(`\n✅ Polen Stone seed completed. ${createdProductCount} new products inserted.`);
    if (!isProduction) {
      console.log("\nDev admin credentials (local only):");
      console.log("  Username: admin");
      console.log("  Password: admin123");
      console.log("\nLogin at: /toov-admin/login");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();

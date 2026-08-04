import { z } from "zod";

// ─── Homepage content stored in site_settings under this key as JSON ─────────
export const HOMEPAGE_CONTENT_KEY = "homepage_content";

export const heroSlideSchema = z.object({
  image: z.string().default(""),
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  desc: z.string().default(""),
  href: z.string().default("/magaza"),
  cta: z.string().default("Koleksiyonu Gör"),
  bg: z.string().default("#0F0F0F"),
  isActive: z.boolean().default(true),
});

export const videoCardSchema = z.object({
  src: z.string().default(""),
  title: z.string().default(""),
  desc: z.string().default(""),
  isActive: z.boolean().default(true),
});

export const trustItemSchema = z.object({
  icon: z.enum(["truck", "shield", "star"]).default("star"),
  title: z.string().default(""),
  desc: z.string().default(""),
  isActive: z.boolean().default(true),
});

export const SECTION_IDS = [
  "videos",
  "featured",
  "categories",
  "newArrivals",
  "trust",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const sectionOrderItemSchema = z.object({
  id: z.enum(SECTION_IDS),
  isActive: z.boolean().default(true),
});

export const homepageContentSchema = z.object({
  heroSlides: z.array(heroSlideSchema).default([]),
  videoSection: z
    .object({
      eyebrow: z.string().default(""),
      title: z.string().default(""),
      desc: z.string().default(""),
    })
    .default({ eyebrow: "", title: "", desc: "" }),
  videoCards: z.array(videoCardSchema).default([]),
  trustItems: z.array(trustItemSchema).default([]),
  sectionOrder: z.array(sectionOrderItemSchema).default([]),
});

export type HeroSlide = z.infer<typeof heroSlideSchema>;
export type VideoCard = z.infer<typeof videoCardSchema>;
export type TrustItem = z.infer<typeof trustItemSchema>;
export type SectionOrderItem = z.infer<typeof sectionOrderItemSchema>;
export type HomepageContent = z.infer<typeof homepageContentSchema>;

export const SECTION_LABELS: Record<SectionId, string> = {
  videos: "Video Bölümü",
  featured: "Öne Çıkan Ürünler",
  categories: "Kategoriler",
  newArrivals: "Yeni Gelenler",
  trust: "Güven Şeridi",
};

// ─── Defaults (used when DB has no/partial content) ──────────────────────────
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  heroSlides: [
    {
      image: "/uploads/products/header_av-cakisi.png",
      eyebrow: "Av & Outdoor",
      title: "Av Bıçakları",
      desc: "El yapımı, yüksek karbonlu çelik - her avcının yanında.",
      href: "/kategori/bicaklar",
      cta: "Koleksiyonu Gör",
      bg: "#0F0F0F",
      isActive: true,
    },
    {
      image: "/uploads/products/header_kamp-bicagi.png",
      eyebrow: "Kamp & Doğa",
      title: "Kamp Çakıları",
      desc: "Kompakt, dayanıklı ve çok fonksiyonlu - doğanın ortasında güvende.",
      href: "/kategori/cakilar",
      cta: "Modelleri İncele",
      bg: "#080808",
      isActive: true,
    },
    {
      image: "/uploads/products/header_bag-bahce.png",
      eyebrow: "Bağ & Bahçe",
      title: "Bahçe Aletleri",
      desc: "Profesyonel budama, kazıma ve bakım aletleri koleksiyonu.",
      href: "/kategori/bag-bahce-aletleri",
      cta: "Ürünlere Bak",
      bg: "#0F0F0F",
      isActive: true,
    },
  ],
  videoSection: {
    eyebrow: "Türkiye Geneli Hızlı Kargo",
    title: "Doğaya Her Zaman Hazır Ol",
    desc: "El yapımı bıçaklardan kamp ekipmanlarına, her macera için doğru ürün, kapında.",
  },
  videoCards: [
    {
      src: "/videos/knife_craftsmanship_hands.mp4",
      title: "El Ustalığı, Saf Çelik",
      desc: "Her bıçak, bir ustanın ömründen bir damladır.",
      isActive: true,
    },
    {
      src: "/videos/outdoor_camping_nature.mp4",
      title: "Doğanın Çağrısına Hazır Ol",
      desc: "Sepetzen ekipmanları, her maceranda yanında.",
      isActive: true,
    },
  ],
  trustItems: [
    {
      icon: "truck",
      title: "1.500 ₺ Üzeri Ücretsiz Kargo",
      desc: "Türkiye genelinde hızlı ve güvenli teslimat.",
      isActive: true,
    },
    {
      icon: "shield",
      title: "Güvenli Ödeme",
      desc: "SSL korumalı, 3D Secure destekli ödeme altyapısı.",
      isActive: true,
    },
    {
      icon: "star",
      title: "Orijinal ve Kaliteli Ürünler",
      desc: "Türk zanaatkâr işçiliğiyle özenle üretilmiş.",
      isActive: true,
    },
  ],
  sectionOrder: [
    { id: "videos", isActive: true },
    { id: "featured", isActive: true },
    { id: "categories", isActive: true },
    { id: "newArrivals", isActive: true },
    { id: "trust", isActive: true },
  ],
};

/**
 * Merge stored (possibly partial/empty) content with defaults.
 * Empty arrays fall back to defaults so the homepage never renders blank.
 */
export function resolveHomepageContent(raw: unknown): HomepageContent {
  const parsed = homepageContentSchema.safeParse(raw ?? {});
  const c = parsed.success ? parsed.data : homepageContentSchema.parse({});
  const d = DEFAULT_HOMEPAGE_CONTENT;

  // Ensure sectionOrder always contains every known section exactly once
  const order = c.sectionOrder.filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
  );
  for (const id of SECTION_IDS) {
    if (!order.some((s) => s.id === id)) {
      const def = d.sectionOrder.find((s) => s.id === id)!;
      order.push({ ...def });
    }
  }

  return {
    heroSlides: c.heroSlides.length ? c.heroSlides : d.heroSlides,
    videoSection: {
      eyebrow: c.videoSection.eyebrow || d.videoSection.eyebrow,
      title: c.videoSection.title || d.videoSection.title,
      desc: c.videoSection.desc || d.videoSection.desc,
    },
    videoCards: c.videoCards.length ? c.videoCards : d.videoCards,
    trustItems: c.trustItems.length ? c.trustItems : d.trustItems,
    sectionOrder: c.sectionOrder.length ? order : d.sectionOrder,
  };
}

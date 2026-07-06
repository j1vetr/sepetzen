import type { Category } from "@shared/schema";

export interface CategoryGroupRule {
  title: string;
  matches: string[];
}

export const CATEGORY_GROUP_RULES: CategoryGroupRule[] = [
  {
    title: "Kamp & Outdoor",
    matches: [
      "kamp",
      "outdoor",
      "trekking",
      "doğa yürüyüşü",
      "doga yuruyusu",
      "yürüyüş",
      "yuruyus",
      "tırmanma",
      "tirmanma",
      "çadır",
      "cadir",
      "uyku tulumu",
      "baz kamp",
      "kamp malzemesi",
      "doğa",
      "doga",
    ],
  },
  {
    title: "Av Bıçakları",
    matches: [
      "av bıçağı",
      "av bicagi",
      "avcılık bıçak",
      "avcilik bicak",
      "av çakısı",
      "av cakisi",
      "avcı",
      "avci",
      "av ekipman",
    ],
  },
  {
    title: "Kamp Çakıları",
    matches: [
      "kamp çakısı",
      "kamp cakisi",
      "çakı",
      "caki",
      "katlanır",
      "katlanir",
      "multitool",
      "çok fonksiyon",
      "cok fonksiyon",
      "kamp bıçak",
      "kamp bicak",
    ],
  },
  {
    title: "Bağ & Bahçe Aletleri",
    matches: [
      "bağ",
      "bag",
      "budama",
      "budama makası",
      "bahçe aleti",
      "bahce aleti",
      "çapa",
      "capa",
      "tırmık",
      "tirmik",
      "sulama",
      "hortum",
      "bahçe bıçağı",
      "bahce bicagi",
      "meyve toplama",
    ],
  },
  {
    title: "Outdoor Ekipman",
    matches: [
      "el feneri",
      "fener",
      "çakmak",
      "cakmak",
      "ateşleme",
      "ateslenme",
      "kompas",
      "pusula",
      "dürbün",
      "durbun",
      "survival",
      "hayatta kalma",
      "yürüyüş bastonu",
      "yuruyus bastonu",
      "ekipman",
    ],
  },
  {
    title: "Mutfak Bıçakları",
    matches: [
      "mutfak bıçağı",
      "mutfak bicagi",
      "şef bıçağı",
      "sef bicagi",
      "santoku",
      "mutfak kesici",
    ],
  },
];

export const FALLBACK_GROUP_TITLE = "Diğer Ürünler";

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .trim();
}

/**
 * Bir kategoriyi en uygun ana gruba ata.
 * Eşleşme yoksa FALLBACK_GROUP_TITLE döner.
 */
export function classifyCategory(categoryName: string): string {
  const name = normalize(categoryName);
  if (!name) return FALLBACK_GROUP_TITLE;

  let bestGroup = FALLBACK_GROUP_TITLE;
  let bestScore = 0;

  for (const rule of CATEGORY_GROUP_RULES) {
    for (const keyword of rule.matches) {
      const k = normalize(keyword);
      if (!k) continue;
      if (name.includes(k)) {
        // Daha uzun keyword = daha spesifik eşleşme → öncelikli
        if (k.length > bestScore) {
          bestScore = k.length;
          bestGroup = rule.title;
        }
      }
    }
  }

  return bestGroup;
}

export interface GroupingPlan {
  groups: Array<{
    title: string;
    categories: Array<{ id: string; name: string; slug: string }>;
  }>;
  totalCategories: number;
  unmatchedCount: number;
}

/**
 * Tüm kategorileri kuralları uygulayarak gruplara böler.
 * Boş gruplar dönen plana DAHİL EDİLMEZ.
 */
export function buildGroupingPlan(categories: Category[]): GroupingPlan {
  const buckets = new Map<string, Array<{ id: string; name: string; slug: string }>>();

  // Ana grup sırasını koru (kuralların sırası), fallback en sona
  const orderedTitles = [
    ...CATEGORY_GROUP_RULES.map((r) => r.title),
    FALLBACK_GROUP_TITLE,
  ];
  for (const title of orderedTitles) buckets.set(title, []);

  let unmatchedCount = 0;
  for (const cat of categories) {
    const groupTitle = classifyCategory(cat.name);
    if (groupTitle === FALLBACK_GROUP_TITLE) unmatchedCount++;
    buckets.get(groupTitle)!.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    });
  }

  // Her grubun içinde alfabetik sırala
  Array.from(buckets.values()).forEach((list) => {
    list.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "tr"));
  });

  // Boş olmayan grupları sırada döndür
  const groups = orderedTitles
    .map((title) => ({
      title,
      categories: buckets.get(title) ?? [],
    }))
    .filter((g) => g.categories.length > 0);

  return {
    groups,
    totalCategories: categories.length,
    unmatchedCount,
  };
}

/**
 * Otomatik üretilen menu_items'ı işaretlemek için displayOrder aralığı.
 * Kullanıcının manuel eklediği öğeleri korumak için bu aralıkta olanlar
 * regenerate sırasında silinir.
 */
export const AUTO_GROUP_DISPLAY_ORDER_BASE = 1000;
export const AUTO_GROUP_DISPLAY_ORDER_MAX = 99999;

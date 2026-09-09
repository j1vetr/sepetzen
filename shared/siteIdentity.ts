import { z } from "zod";

// ── Site identity / contact info managed from the admin panel ──────────────
// Stored as JSON under the `site_identity` key in site_settings.
// Defaults below mirror the previously hardcoded values so existing
// installations render identically until an admin edits them.

export const SITE_IDENTITY_KEY = "site_identity";

export const footerLinkSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
});

export const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "youtube", "etsy", "facebook", "twitter", "tiktok", "other"]),
  url: z.string().min(1),
  label: z.string().min(1),
});

export const mobileNavItemSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
  icon: z.enum(["home", "store", "cart", "user", "heart", "search", "phone", "grid"]),
});

export const topBannerSchema = z.object({
  enabled: z.boolean().default(false),
  imageUrl: z.string().default(''),
  linkUrl: z.string().default(''),
});

export const popupBannerSchema = z.object({
  enabled: z.boolean().default(false),
  imageUrl: z.string().default(''),
  linkUrl: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
  showAfterSeconds: z.number().int().min(0).default(3),
  showOnce: z.boolean().default(true),
});

export const siteIdentitySchema = z.object({
  logoUrl: z.string().min(1),
  faviconUrl: z.string().min(1),
  tickerEnabled: z.boolean().default(true),
  tickerSpeed: z.number().int().min(5).max(120).default(28),
  tickerTextColor: z.string().default('#ffffff'),
  topBanner: topBannerSchema.default({}),
  popupBanner: popupBannerSchema.default({}),
  announcements: z.array(z.string().min(1)).min(1),
  phone: z.string().min(1),
  phoneHref: z.string().min(1),
  whatsappOrderEnabled: z.boolean().default(true),
  workingHours: z.string().default("Hf. 09:00 - 18:00"),
  email: z.string().min(1),
  addressLines: z.array(z.string().min(1)).min(1),
  copyright: z.string().min(1),
  socialLinks: z.array(socialLinkSchema),
  kurumsalLinks: z.array(footerLinkSchema),
  yardimLinks: z.array(footerLinkSchema),
  mobileNavItems: z.array(mobileNavItemSchema).min(1).max(5),
});

export type FooterLink = z.infer<typeof footerLinkSchema>;
export type SocialLink = z.infer<typeof socialLinkSchema>;
export type MobileNavItem = z.infer<typeof mobileNavItemSchema>;
export type TopBanner = z.infer<typeof topBannerSchema>;
export type PopupBanner = z.infer<typeof popupBannerSchema>;
export type SiteIdentity = z.infer<typeof siteIdentitySchema>;

export const DEFAULT_SITE_IDENTITY: SiteIdentity = {
  logoUrl: "/uploads/branding/sepetzen-logo-white.png",
  faviconUrl: "/favicon.png",
  tickerEnabled: true,
  tickerSpeed: 28,
  tickerTextColor: "#ffffff",
  topBanner: { enabled: false, imageUrl: "", linkUrl: "" },
  popupBanner: { enabled: false, imageUrl: "", linkUrl: "", title: "", body: "", showAfterSeconds: 3, showOnce: true },
  announcements: [
    "1500 TL ve Üzeri Ücretsiz Kargo!",
    "İlk Siparişinize Sepette %10 İndirim!",
    "Havale/EFT'de %3 İndirim",
    "14 Gün İçinde Kolay İade",
    "Aynı Gün Kargoda",
    "SSL ile Güvenli Ödeme",
  ],
  phone: "0536 630 11 38",
  phoneHref: "+905366301138",
  whatsappOrderEnabled: true,
  workingHours: "Hf. 09:00 - 18:00",
  email: "sepetzen@gmail.com",
  addressLines: [
    "Ahmet Uğur Durmaz",
    "Karaçalı Mah. Nergiz Sk. No.8/A",
    "Dalaman / Muğla",
  ],
  copyright: "Sepetzen® - Her Hakkı Saklıdır. © 2024-2026",
  socialLinks: [
    { platform: "instagram", url: "https://www.instagram.com/sepetzen", label: "@sepetzen" },
    { platform: "youtube", url: "https://www.youtube.com/@sepetzen", label: "@sepetzen" },
    { platform: "etsy", url: "https://www.etsy.com/shop/Sepetzen", label: "Etsy" },
  ],
  kurumsalLinks: [
    { href: "/sayfa/hakkimizda", label: "Hakkımızda" },
    { href: "/sayfa/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
    { href: "/sayfa/on-bilgilendirme-formu", label: "Ön Bilgilendirme Formu" },
    { href: "/sayfa/uyelik-sozlesmesi", label: "Üyelik Sözleşmesi" },
    { href: "/sayfa/kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
    { href: "/sayfa/gizlilik-guvenlik", label: "Gizlilik & Güvenlik" },
    { href: "/sayfa/cerez-politikasi", label: "Çerez Politikası" },
  ],
  yardimLinks: [
    { href: "/sayfa/kargo-sureci", label: "Kargo Süreci" },
    { href: "/sayfa/iade-sureci", label: "İade Süreci" },
    { href: "/sayfa/iptal-ve-iade-sartlari", label: "İptal & İade Şartları" },
    { href: "/sayfa/iletisim", label: "İletişim" },
  ],
  mobileNavItems: [
    { href: "/", label: "Ana Sayfa", icon: "home" },
    { href: "/magaza", label: "Mağaza", icon: "store" },
    { href: "/sepet", label: "Sepet", icon: "cart" },
    { href: "/hesabim", label: "Hesabım", icon: "user" },
  ],
};

/** Merge a possibly-partial stored value onto the defaults. */
export function mergeSiteIdentity(raw: unknown): SiteIdentity {
  if (!raw || typeof raw !== "object") return DEFAULT_SITE_IDENTITY;
  const merged = { ...DEFAULT_SITE_IDENTITY, ...(raw as Record<string, unknown>) };
  const parsed = siteIdentitySchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SITE_IDENTITY;
}

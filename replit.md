# Sepetzen E-Commerce Platform

## Overview
Sepetzen is a full-stack Turkish e-commerce platform specializing in Kamp (Camping), Outdoor, Bıçak (Knives), and Bağ & Bahçe (Garden) products. Customers browse hunting knives, camp folding knives, outdoor gear, and garden tools; administrators manage products, categories, and orders. The brand identity centers on outdoor craftsmanship and nature, with a dark forest-green accent color. Contact person: Ahmet Uğur Durmaz — 0536 630 11 38 — sepetzen@gmail.com — Karaçalı Mah. Nergiz Sk. No.8/A Dalaman/Muğla.

## User Preferences
Preferred communication style: Simple, everyday language.

## Date & Time Formatting
All user-visible date/time rendering for orders (admin panel, customer profile, order tracking, emails, WhatsApp messages) uses helpers in `shared/dateFormat.ts` (`formatTRDate`, `formatTRDateTime`, `formatTRDateNumeric`, `formatTRDateShort`, `formatTRTime`, `formatTRDateTimeNumeric`). Helpers always render in `Europe/Istanbul` timezone with `tr-TR` locale via `Intl.DateTimeFormat`, so the production server's UTC clock does not bleed into the UI. Do not call `toLocaleString('tr-TR')` or `date-fns/format` directly on order timestamps — use the helpers.

## Brand & Theme
- **Brand**: Sepetzen — Kamp, Outdoor, Bıçak & Bağ Bahçe
- **Contact**: sepetzen@gmail.com · **Phone**: 0536 630 11 38 · **Instagram**: @sepetzen
- **Address**: Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla
- **Logo**: Text wordmark "SEPETZEN" (dark white "SEPET" + forest green "ZEN") with "OUTDOOR GEAR" subtitle
- **Color tokens** (in `client/src/index.css`):
  - `--sepetzen-green` — dark forest green `#2D5A27` (primary accent)
  - `--sepetzen-light` — lighter forest green `#4a9a42`
  - Legacy `--polen-orange` kept as alias for backward compatibility
- **Free shipping threshold**: 1500 TL (shown in announcement bar and cart)
- **Bank transfer discount**: 3% (Havale/EFT)
- **Typography**: Display font with green accent for wordmark and CTAs.

## System Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack React Query, Tailwind CSS with shadcn/ui (New York style), Framer Motion, Vite.
- **Backend**: Node.js + Express, TypeScript, JWT auth (HttpOnly cookies + refresh token rotation), bcrypt, esbuild.
- **Database**: PostgreSQL with Drizzle ORM and Drizzle Kit.
- **UI/UX**: Component-based, reusable UI elements. Admin panel at `/toov-admin`.

### Navigation
- Header navigation reads from the `menu_items` table (`/api/menu`). When at least one root item exists, the desktop nav renders each root menu item directly as a top-level entry (submenus open as their own dropdown, category/link items render as plain links), and the mobile drawer renders each root as a top-level accordion row. The legacy single "Kategoriler" mega-dropdown is no longer used. When `menu_items` is empty, Header falls back to a single "Kategoriler" dropdown built from `categories` with `displayOrder < 100`.
- **Home page** (`client/src/pages/Home.tsx`): Awwwards/FWA-grade product-led experience. Hero wordmark "SEPETZEN / OUTDOOR GEAR"; statement marquee: El Yapımı Bıçaklar, Outdoor Ekipmanları, Kamp Çakıları, Bahçe Aletleri, Doğal Malzeme, Türk Ustalığı. Pinned horizontal showcase, bento product mosaic, image-driven category bento (8 menu roots), final CTA. Smooth scroll via **Lenis**; custom **mix-blend-difference cursor** for desktop.
- Categories: Çakılar, Bıçaklar, Bağ & Bahçe Aletleri, Kamp & Outdoor Ekipmanları, Pet Shop & Çiftlik, Nalbur & Hırdavat, Mangal & Izgara & Ahşap (30 categories total, seeded in `server/seed-sepetzen.ts`).

### Key Features
- **Authentication**: JWT-based for customers and admins, with refresh token rotation and HttpOnly cookies.
- **Multi-Category Product Support**: Products can be assigned to multiple categories.
- **Stock Management**: Automatic stock reduction on orders, adjustments, and restoration on cancellation.
- **AI Product Description Generation**: OpenAI GPT-4o for product copy with HTML formatting.
- **Payment System**: iyzico Checkout Form (3DS) integration for credit card payments with success/failure callbacks. Production-only; API keys are stored in `site_settings` and managed through the admin panel.
- **Coupon System**: Percentage/fixed discounts, usage limits, validity periods.
- **Shipping**: Domestic (free ≥ 1500 TL) and international shipping with server-side validation.
- **Email Notifications**: Database-configurable SMTP using Sepetzen-branded templates (green #2D5A27 palette, sepetzen@gmail.com sender).
- **WhatsApp Notifications (wpileti)**: Auto-sent on order received / processing / shipped / delivered / cancelled. Per-event admin on/off toggles in `SettingsTab.tsx`.
- **B2B Dealer & Quote System**: Dealer companies and quote workflow with stock deduction on acceptance.
- **Meta Pixel + CAPI Integration**: Server- and client-side e-commerce event tracking for Facebook advertising.
- **Meta / Google Product Feed**: `/feed/meta-catalog.xml` — RSS 2.0 + Google `g:` namespace, served from `server/feeds.ts`.
- **AI Chatbot**: Conversational AI tuned to the Sepetzen catalog using product embeddings for semantic search.

### Product Detail Page
- `client/src/pages/ProductDetail.tsx`: Awwwards-style redesign. No size/color variant selectors (each variant is its own product).
- Product images: 6 real photos per product downloaded from sepetzen.com (stored in `client/public/uploads/products/` as `p622_1.jpg` … `p628_6.webp`).
- Product descriptions: icon-based HTML (📐 Teknik Özellikler, 🔩 Materyal, 🎯 Kullanım Alanları, 🎁 Hediye) stored as HTML in `products.description` and rendered via `dangerouslySetInnerHTML` with prose classes.
- Mobile sticky purchase bar, lightbox, embla carousel, reviews, breadcrumbs.

### Footer Structure
- **KURUMSAL**: Hakkımızda, Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, Üyelik Sözleşmesi, KVKK Aydınlatma Metni, Gizlilik & Güvenlik, Çerez Politikası
- **YARDIM**: Kargo Süreci, İade Süreci, İptal & İade Şartları, İletişim
- **Bize Ulaşın**: address, phone, email contact block
- Social: Instagram @sepetzen, YouTube @sepetzen, Etsy

### Static Pages
11 pages stored in `pages` table (slug → content HTML), rendered at `/sayfa/:slug`:
hakkimizda, mesafeli-satis-sozlesmesi, on-bilgilendirme-formu, uyelik-sozlesmesi, iptal-ve-iade-sartlari, gizlilik-guvenlik, cerez-politikasi, kvkk-aydinlatma-metni, kargo-sureci, iade-sureci, iletisim.

### Bank Transfer
- `shared/bankInfo.ts`: `BANK_TRANSFER_DISCOUNT_RATE = 0.03` (3%), accountHolder = 'Ahmet Uğur Durmaz', bankName = 'Ziraat Bankası'. IBAN placeholder — owner must set real IBAN.

## External Dependencies

### Third-Party Services & APIs
- **OpenAI**: AI product descriptions and chatbot.
- **iyzico**: Payment gateway (Checkout Form / 3D Secure).
- **Facebook (Meta Pixel/CAPI)**: Advertising and event tracking.
- **Google Merchant Center**: Product feed submission.

### Libraries & Frameworks
- **shadcn/ui + Radix UI**: UI primitives.
- **TanStack React Query**: Data fetching and caching.
- **Framer Motion**: Animations.
- **Lucide React**: Icons.
- **Sharp**: Image optimization.

## Marketplace Sync (multi-marketplace adapter framework)
- **One-way pull**: marketplace → site catalog (categories, products, images, stock, price). No order/push.
- **Adapter pattern**: `MarketplaceAdapter` interface (`server/marketplaces/types.ts`) + registry (`server/marketplaces/registry.ts`).
- **Trendyol adapter** (`server/marketplaces/trendyol/adapter.ts`) is the only live implementation.
- **Sync engine** (`server/marketplaces/sync/engine.ts`): delta and full sync modes.
- **Credentials encryption**: `MARKETPLACE_ENCRYPTION_KEY` Replit Secret (32-byte hex/base64) drives AES-256-GCM at rest. **Mandatory** — server fail-fasts at startup if missing.
- **Tables**: `marketplaces`, `marketplace_categories`, `marketplace_products`, `marketplace_sync_runs`.
- **Admin UI**: `client/src/pages/admin/MarketplacesTab.tsx`.

## Future Work
- Replace text wordmark with user-supplied logo asset.
- Add real IBAN to bank transfer settings in admin panel.
- Seed more product categories with Sepetzen catalog items.
- Implement N11 / Hepsiburada / Amazon adapters when needed.

# Polen Stone E-Commerce Platform

## Overview
Polen Stone (Polen Stone Doğal Taş & Mermer) is a full-stack e-commerce platform for natural stone and marble products in the Turkish market. Customers browse marble, granite, travertine, and onyx categories, request samples, and place orders; administrators manage products, categories, and orders. The brand identity centers on Turkish stone craftsmanship, with a warm cream/stone palette and a terracotta-orange accent.

## User Preferences
Preferred communication style: Simple, everyday language.

## Brand & Theme
- **Brand**: Polen Stone Doğal Taş & Mermer
- **Domain**: polenstone.com · **Email**: info@polenstone.com · **Instagram**: @polenstone
- **Logo**: Text wordmark "POLEN STONE" (orange "STONE"). User will upload a custom logo asset later.
- **Color tokens** (in `client/src/index.css`):
  - `--polen-orange` — terracotta accent
  - `--polen-stone` — deep stone gray
  - `--polen-cream` — warm off-white background
- **Typography**: Existing display font kept; orange accent reserved for stroke headlines and brand wordmark.

## System Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack React Query, Tailwind CSS with shadcn/ui (New York style), Framer Motion, Vite.
- **Backend**: Node.js + Express, TypeScript, JWT auth (HttpOnly cookies + refresh token rotation), bcrypt, esbuild.
- **Database**: PostgreSQL with Drizzle ORM and Drizzle Kit.
- **UI/UX**: Component-based, reusable UI elements. Admin panel at `/toov-admin`.

### Navigation
- Header navigation reads from the `menu_items` table (`/api/menu`). When at least one root item exists, the desktop nav renders **each root menu item directly as a top-level entry** (submenus open as their own dropdown, category/link items render as plain links), and the mobile drawer renders each root as a top-level accordion row. The legacy single "Kategoriler" mega-dropdown is no longer used. Static "Mağaza" and "Hakkımızda" links have been removed from the header. When `menu_items` is empty, Header falls back to a single "Kategoriler" dropdown built from `categories` with `displayOrder < 100`.
- **Home page** was rebuilt from scratch as an Awwwards/FWA-grade product-led experience (`client/src/pages/Home.tsx`). Scenes (in order): cinematic hero (background video with parallax + reveal-animated POLEN/STONE wordmark), product marquee strip, **pinned horizontal product showcase** (sticky section that translates horizontally driven by scroll progress, 5–7 hand-picked products), **bento product mosaic** (asymmetric 9-tile grid with hover scale + plus-icon affordance), **image-driven category bento** (8 menu roots; each tile's background image is a stable seeded-random pick from the products that belong to that root or any of its child categories — no new endpoint, derived client-side from `useProducts({})` + `/api/menu`), statement marquee strip, footer-preceding final CTA. Section headings are intentionally minimal: only an eyebrow tag (e.g. `— 04 / Seçmece`) per scene plus a single oversized H2 in the final CTA. Smooth scroll uses **Lenis** (`client/src/components/SmoothScroll.tsx`); a custom **mix-blend-difference cursor** (`client/src/components/CustomCursor.tsx`) is mounted globally for desktops with fine pointers. Both respect `prefers-reduced-motion`. Framer-motion `useScroll` targets are gated through a `useMounted` hook to avoid the "ref is defined but not hydrated" hydration error under Suspense lazy-loading.
- **Auto-grouping tool** (`server/menu-grouping.ts` + admin button in `MenuTab.tsx`): admins can press "Kategorileri Otomatik Gruplandır" to (re)build the menu in one click. It applies a fixed set of Turkish keyword rules (8 main groups: Banyo / Mutfak & Sofra / Lavabo & Hamam / Dekorasyon / Saksı & Bahçe / Duvar & Cephe / Sehpa & Mobilya / Şömine & Mangal) and dumps anything unmatched into "Diğer Doğal Taş". The endpoint `POST /api/admin/menu-items/regenerate-from-categories` deletes only auto-generated rows (those with `displayOrder` in [1000, 99999]) and recreates parents + children, so manually-added menu items (`displayOrder < 1000`) are preserved across regenerations. Preview-only counterpart: `GET /api/admin/menu-items/grouping-preview`.
- Categories table contains a primary "Mermer" category (display_order 0). Legacy fitness categories are retained at `display_order` 100+ for safe rollback but are not surfaced in the UI.

### Key Features
- **Authentication**: JWT-based for customers and admins, with refresh token rotation and HttpOnly cookies.
- **Multi-Category Product Support**: Products can be assigned to multiple categories.
- **Stock Management**: Automatic stock reduction on orders, adjustments, and restoration on cancellation.
- **AI Product Description Generation**: OpenAI GPT-4o for stone-context product copy with HTML formatting.
- **Payment System**: iyzico Checkout Form (3DS) integration for credit card payments with success/failure callbacks. Production-only; API keys are stored in `site_settings` and managed through the admin panel (no environment variables).
- **Coupon System**: Percentage/fixed discounts, usage limits, validity periods.
- **Shipping**: Domestic and international shipping with server-side validation. Sample request flow surfaced on the homepage.
- **Email Notifications**: Database-configurable SMTP using Polen Stone-branded templates.
- **WhatsApp Notifications (wpileti)**: Auto-sent on order received / processing / shipped / delivered / cancelled. Per-event admin on/off toggles in `SettingsTab.tsx`. Customer KVKK opt-out in profile (`/hesabim` → Profil Bilgileri → İletişim Tercihleri) backed by `users.whatsapp_opt_in` (default true); `whatsappService.sendEventToCustomer` looks up the user by `order.customerEmail` and skips if opted out. Guest checkouts have no row and stay opted in.
- **B2B Dealer & Quote System**: Dealer companies and quote workflow with stock deduction on acceptance.
- **Meta Pixel + CAPI Integration**: Server- and client-side e-commerce event tracking for Facebook advertising.
- **Meta / Google Product Feed**: `/feed/meta-catalog.xml` — RSS 2.0 + Google `g:` namespace, served from `server/feeds.ts` (`buildMetaCatalogXml`). Streams active products with images, prices in TRY, brand=Polen Stone. Cache-Control 1h. Use as scheduled feed URL in Meta Commerce Manager (Instagram/Facebook Shop) and Google Merchant Center.
- **AI Chatbot (Polen Stone Asistanı)**: Conversational AI tuned to the natural-stone domain (mermer/granit/traverten/oniks, sıcak/soğuk tonlar, damarlı/düz desenler) using product embeddings for semantic search.

## External Dependencies

### Database
- **PostgreSQL**: Main data store.

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
- **Adapter pattern**: `MarketplaceAdapter` interface (`server/marketplaces/types.ts`) + registry (`server/marketplaces/registry.ts`). New marketplaces (N11, Hepsiburada, Amazon) plug in by adding one adapter file and a `registerAdapter` call — sync engine, scheduler, routes and admin UI are marketplace-agnostic.
- **Trendyol adapter** (`server/marketplaces/trendyol/adapter.ts`) is the only live implementation today — Basic auth, rate-limited (600/min), retry with backoff, sandbox toggle.
- **Sync engine** (`server/marketplaces/sync/engine.ts`): two modes — `delta` (price + stock only) and `full` (categories + products + images + variants). Per-item try/catch, soft-delete missing products (`isActive=false`), auto-create unmapped categories with Turkish-normalized slug, image dedupe by sha256 hash, sharp-optimized into `client/public/uploads/products/`. Lock via `marketplace_sync_runs.status='running'`.
  - **Category-tree snapshot (1h TTL)**: `runFullSync` calls `loadOrRefreshCategoryTree()` to bulk-upsert the marketplace's full category tree (with computed `fullPath`) into `marketplace_categories` whenever `marketplaces.category_tree_fetched_at` is null or older than 1 hour. Per-product category resolution prefers the snapshot **leaf** name over the product payload's `categoryName` (Trendyol often returns a parent there), then falls back to existing mappings, then to "Genel". `runDeltaSync` never touches the tree. Admin can force a refresh on the next full sync via `POST /api/admin/marketplaces/:id/refresh-category-cache` (just nulls the timestamp).
  - **Stale auto-mapping self-heal**: When a category resolution comes from the tree snapshot (`cameFromTree=true`) and the existing `marketplace_categories` row's `name` differs from the snapshot leaf, `ensureSiteCategory()` checks whether the linked site category looks auto-created (its name equals the old mapping's `name` — admin overrides usually have different names). If yes, the mapping is rebuilt against the correct leaf-named site category; otherwise the admin override is preserved and only `name`/`fullPath` metadata is refreshed. This recovers catalogs that previously collapsed into a single wrong leaf (e.g. all products pinned to "Saksı") on the next full sync without manual intervention.
  - **Live progress + retry telemetry**: `marketplace_sync_runs.stats` jsonb carries `currentProductName`, `currentPage`, `processedTotal`, `expectedTotal`, `retriedRequests`, `recoveredRequests`, `imagesFailed`, `categoriesCachedFromTree`. `imagesFailed` is incremented in the `syncImages` worker catch path (download/optimize errors don't kill the sync — the product just persists with whatever images succeeded). Engine flushes every 10 products (mid-page). HTTP retries are counted via `MarketplaceHttpClient.setMetrics({onRetry, onRecover})` wired through `attachHttpMetrics()`. Run history table renders an `↻N ✓M` chip in the errors column for completed runs that hit retries.
  - **In-run image URL dedupe**: `runFullSync` builds a process-local `Map<sourceUrl, downloaded>` shared across `syncImages` calls. Same image URL appearing on multiple products triggers a single `downloadImage` call; subsequent products read from the cache. Cache lives only for the current run (no persistence across syncs — that's a follow-up).
  - **Grouped error report**: `marketplace_sync_runs.error_summary` jsonb groups errors as `http4xx | http5xx | network | parse | other` (each `{count, samples[≤5]}`) plus `imagesFailed`. Admin card shows colored chips with sample tooltips; falls back to first-error preview if the summary is missing (legacy runs).
- **Scheduler** (`server/scheduler.ts`): node-cron — delta hourly (minute 5), full daily at 03:00. Disabled in `NODE_ENV=test`. Set `MARKETPLACE_DEV_CRON=1` for 2-minute delta in dev.
- **Credentials encryption**: `MARKETPLACE_ENCRYPTION_KEY` Replit Secret (32-byte hex/base64) drives AES-256-GCM at rest in `marketplaces.encrypted_credentials`. **Mandatory in all environments** — server fail-fasts at startup via `assertEncryptionKeyConfigured()` if missing. There is **no file-based fallback** (the previous `.local/marketplace_key` path was removed because (a) the key would not survive container moves/redeploys and silently break decryption, and (b) random keys on disk are a different leakage class than secrets). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- **Tables**: `marketplaces`, `marketplace_categories`, `marketplace_products`, `marketplace_sync_runs`. No changes to existing `products` / `categories`.
- **Admin UI**: `client/src/pages/admin/MarketplacesTab.tsx` — add/edit/delete marketplaces, test connection, manual sync (delta/full), 20-run history, category mapping editor. Sidebar item under "Entegrasyonlar".
- **Admin API**: `GET/POST/PUT/DELETE /api/admin/marketplaces`, `POST /test-connection`, `POST /sync-now`, `GET /sync-runs`, `GET/PUT /category-mappings/:id`. All `requireAdmin`-protected; secrets masked in responses (last 4 chars only).

## Product Detail Page
- `client/src/pages/ProductDetail.tsx` is the awward-style redesign. Beden/renk/ölçü-rehberi UI is intentionally removed — every variant in the catalog is its own product, so showing selectors creates dead controls and visual noise. `handleAddToCart` passes `quantity` and the first active variant id (legacy variants only); `addToCart(productId, variantId?, quantity?)` from `useCart`.
- Layout: 2-column on `lg+` with the right info panel `lg:sticky lg:top-28`. Desktop hero uses cursor-zoom-in + `transform-origin` follow-the-mouse zoom (1× → 1.6×) and opens a fullscreen lightbox on click; lightbox supports keyboard ←/→/Esc on desktop and embla swipe on mobile. Mobile hero is an embla carousel with dot indicator. All `motion`/CSS transforms respect `useReducedMotion()`.
- Mobile sticky purchase bar: `IntersectionObserver` watches a sentinel div placed right after the desktop CTA; when the sentinel scrolls out of view a fixed bottom bar slides in (price + Sepete Ekle) on `<lg` only.
- `QuickViewModal` (`client/src/components/QuickViewModal.tsx`) follows the same rule: no size/color selectors, single-click add-to-cart with quantity.
- Reviews section, share menu, favorite toggle, breadcrumbs, "Beğenebileceğiniz Ürünler" (ProductCard grid), and `SEO` Product schema are preserved.

## Future Work
- Replace text wordmark with user-supplied logo asset.
- Seed Granit / Traverten / Oniks categories with imagery and content once available.
- Implement N11 / Hepsiburada / Amazon adapters when needed (add files + `registerAdapter` call).

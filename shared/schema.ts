import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, uniqueIndex, index, type AnyPgColumn, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { INVOICE_TYPES, type BillingAddress } from "./billing";

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  // İki adımlı doğrulama (TOTP / Google Authenticator)
  totpSecret: text("totp_secret"), // AES-256-GCM şifreli secret (kurulum sırasında pending olarak da yazılır)
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpBackupCodes: text("totp_backup_codes"), // JSON dizisi: bcrypt hash'li tek kullanımlık yedek kodlar
  totpLastUsedStep: integer("totp_last_used_step"), // replay koruması: kabul edilen son TOTP zaman adımı
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Admin girişi ve 2FA hız limiti sayaçları — DB'de tutularak sunucu
 * yeniden başlatmalarında ve çok-instance dağıtımda sıfırlanmaz.
 *
 * Sabit pencere: pencere başından itibaren MAX_FAILURES hata → kilit.
 * Başarılı girişte satır silinir (sayaç sıfırlanır).
 */
export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  failureCount: integer("failure_count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  username: true,
  password: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  postalCode: text("postal_code"),
  country: text("country").default("Türkiye"),
  whatsappOptIn: boolean("whatsapp_opt_in").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const adminUpdateUserSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin").max(255),
  firstName: z.string().trim().max(100).nullable(),
  lastName: z.string().trim().max(100).nullable(),
  phone: z.string().trim().max(30).nullable(),
  address: z.string().trim().max(1000).nullable(),
  city: z.string().trim().max(100).nullable(),
  district: z.string().trim().max(100).nullable(),
  postalCode: z.string().trim().max(20).nullable(),
  country: z.string().trim().max(100).nullable(),
  whatsappOptIn: z.boolean(),
});

export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;

// NOTE: user_sessions table is managed by connect-pg-simple middleware, not Drizzle
// Do NOT add it to schema - it will cause permission errors on db:push

// User Addresses
export const userAddresses = pgTable("user_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(), // "Ev", "İş", etc.
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  postalCode: text("postal_code"),
  country: text("country").default("Türkiye").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  // Fatura bilgileri (Bireysel / Kurumsal) — bkz. shared/billing.ts
  invoiceType: text("invoice_type").default("individual").notNull(),
  tcknNumber: text("tckn_number"),
  companyName: text("company_name"),
  taxOffice: text("tax_office"),
  taxNumber: text("tax_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceType: z.enum(INVOICE_TYPES).optional(),
});

export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  image: text("image"),
  displayOrder: integer("display_order").default(0).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  contentHtml: text("content_html"),
  // Üst kategori (null = ana kategori). Tek seviye derinlik desteklenir:
  // alt kategorinin altına kategori eklenemez (API katmanında doğrulanır).
  parentId: varchar("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sku: text("sku"),
  categoryId: varchar("category_id").references(() => categories.id),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  availableSizes: jsonb("available_sizes").$type<string[]>().default([]).notNull(),
  availableColors: jsonb("available_colors").$type<{name: string, hex: string | null}[]>().default([]).notNull(),
  specs: jsonb("specs").$type<{
    urunCinsi?: string;
    tamUzunluk?: string;
    namluUzunlugu?: string;
    etKalinligi?: string;
    agirlik?: string;
    celikCinsi?: string;
    sapCinsi?: string;
  }>().default({}).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  discountBadge: text("discount_badge"),
  brand: text("brand"),
  // Ürün detay sekme içerikleri (null = site geneli varsayılan gösterilir)
  tabDelivery: jsonb("tab_delivery").$type<Array<{title: string; rows: Array<{key: string; value: string}>}>>(),
  tabFaq: jsonb("tab_faq").$type<Array<{q: string; a: string}>>(),
  tabInstallmentNote: text("tab_installment_note"),
  // Ek ücretli kişiselleştirme (isim yazdırma vb.). null = kapalı.
  // fee decimal string olarak tutulur ("150.00"); sunucu ödeme anında
  // ürünün güncel yapılandırmasından ücreti kendisi hesaplar.
  personalization: jsonb("personalization").$type<{
    enabled: boolean;
    fee?: string;
    label?: string;
    maxChars?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // drizzle-zod, jsonb `$type` alanlarının içini `unknown` olarak çıkarır;
  // bu da insert tipinin drizzle'ın beklediği tiple uyuşmamasına yol açar.
  // Alan şeması burada açıkça bildirilerek tip kesinliği sağlanır.
  images: z.array(z.string()).optional(),
  availableSizes: z.array(z.string()).optional(),
  availableColors: z.array(z.object({ name: z.string(), hex: z.string().nullable() })).optional(),
  specs: z.object({
    urunCinsi: z.string().optional(),
    tamUzunluk: z.string().optional(),
    namluUzunlugu: z.string().optional(),
    etKalinligi: z.string().optional(),
    agirlik: z.string().optional(),
    celikCinsi: z.string().optional(),
    sapCinsi: z.string().optional(),
  }).optional(),
  tabDelivery: z.array(z.object({
    title: z.string(),
    rows: z.array(z.object({ key: z.string(), value: z.string() })),
  })).nullable().optional(),
  tabFaq: z.array(z.object({ q: z.string(), a: z.string() })).nullable().optional(),
  tabInstallmentNote: z.string().nullable().optional(),
  personalization: z.object({
    enabled: z.boolean(),
    // Ücret: negatif olmayan, en fazla 2 ondalıklı parasal değer.
    // Serbest metin kabul edilmez; geçersiz değer kayıt anında reddedilir.
    fee: z.string().regex(/^\d{1,8}([.,]\d{1,2})?$/, 'Kişiselleştirme ücreti geçersiz; örn: 150 veya 150.50')
      .transform((v) => v.replace(',', '.'))
      .optional(),
    label: z.string().max(100).optional(),
    maxChars: z.number().int().positive().max(200).optional(),
  }).nullable().optional(),
});

/** Ürün kişiselleştirme ayarının tek başına doğrulanması için (örn. PATCH). */
export const personalizationConfigSchema = insertProductSchema.shape.personalization;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  productCategories: many(productCategories),
}));

// Many-to-many relationship table for products and categories
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
});

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  productCategories: many(productCategories),
}));

export type ProductCategory = typeof productCategories.$inferSelect;

export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  sku: text("sku").unique(),
  size: text("size"),
  color: text("color"),
  colorHex: text("color_hex"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
});

export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  // Müşterinin girdiği kişiselleştirme yazısı (ürün ayarı açıksa).
  personalizationText: text("personalization_text"),
  // Ürünün o anki kişiselleştirme ücreti — sepete eklenirken/güncellenirken
  // sunucu tarafından hesaplanıp yazılır; ürün ayarı sonradan değişse de
  // sepet satırı bu değeri kullanır.
  personalizationFee: decimal("personalization_fee", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    address: string;
    city: string;
    district: string;
    postalCode: string;
    country?: string;
  }>().notNull(),
  billingAddress: jsonb("billing_address").$type<BillingAddress>(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  couponCode: text("coupon_code"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending").notNull(),
  notes: text("notes"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  shippingCarrier: text("shipping_carrier"),
  shipmentProvider: text("shipment_provider"),
  shipmentId: text("shipment_id"),
  shipmentLabelUrl: text("shipment_label_url"),
  invoiceUrl: text("invoice_url"),
  processingAt: timestamp("processing_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // jsonb `$type` alanı — bkz. insertProductSchema.specs açıklaması.
  shippingAddress: z.object({
    address: z.string(),
    city: z.string(),
    district: z.string(),
    postalCode: z.string(),
    country: z.string().optional(),
  }),
  billingAddress: z.object({
    address: z.string(),
    city: z.string(),
    district: z.string(),
    postalCode: z.string(),
    country: z.string().optional(),
    invoiceType: z.enum(INVOICE_TYPES).optional(),
    tcknNumber: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    taxOffice: z.string().nullable().optional(),
    taxNumber: z.string().nullable().optional(),
  }).nullable().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  variantDetails: text("variant_details"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  // Kişiselleştirme anlık görüntüsü: sipariş anındaki yazı ve birim ek ücret.
  // price alanı ücret DAHİL birim fiyattır; fee yalnızca gösterim içindir.
  personalizationText: text("personalization_text"),
  personalizationFee: decimal("personalization_fee", { precision: 10, scale: 2 }),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// WooCommerce Integration
export const woocommerceSettings = pgTable("woocommerce_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteUrl: text("site_url").notNull(),
  consumerKey: text("consumer_key").notNull(),
  consumerSecret: text("consumer_secret").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWoocommerceSettingsSchema = createInsertSchema(woocommerceSettings).omit({
  id: true,
  lastSync: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWoocommerceSettings = z.infer<typeof insertWoocommerceSettingsSchema>;
export type WoocommerceSettings = typeof woocommerceSettings.$inferSelect;

export const woocommerceSyncLogs = pgTable("woocommerce_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  productsImported: integer("products_imported").default(0).notNull(),
  categoriesImported: integer("categories_imported").default(0).notNull(),
  imagesDownloaded: integer("images_downloaded").default(0).notNull(),
  errors: jsonb("errors").$type<string[]>().default([]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type WoocommerceSyncLog = typeof woocommerceSyncLogs.$inferSelect;

// Favorites/Wishlist
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Product Reviews — üye + misafir destekli, admin onayından geçer
export const productReviews = pgTable("product_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  // Üye yorumu için doldurulur. Misafir yorumlarında null kalır.
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Misafir yorumlarında doldurulur. Üye yorumunda null kalır.
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  rating: integer("rating").notNull(), // 1-5
  title: text("title"),
  content: text("content"),
  // Yorum görselleri (JPG/PNG/WebP/GIF) — /uploads/reviews/ altındaki yollar
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({
  id: true,
  isApproved: true,
  rejectionReason: true,
  approvedAt: true,
  approvedBy: true,
  createdAt: true,
}).extend({
  // createInsertSchema jsonb $type bilgisini kaybettiği için yeniden tanımlanır
  images: z.array(z.string()).optional(),
});

export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;
export type ProductReview = typeof productReviews.$inferSelect;

// Coupons / Discount Codes
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull(), // 'percentage' | 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  perUserLimit: integer("per_user_limit").default(1),
  freeShipping: boolean("free_shipping").default(false).notNull(),
  appliesToShipping: boolean("applies_to_shipping").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  // Influencer tracking fields
  isInfluencerCode: boolean("is_influencer_code").default(false).notNull(),
  influencerName: text("influencer_name"),
  influencerInstagram: text("influencer_instagram"),
  commissionType: text("commission_type"), // 'per_use' | 'percentage' | 'fixed_total'
  commissionValue: decimal("commission_value", { precision: 10, scale: 2 }),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default("0"),
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// Coupon Redemptions
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;

// Influencer Payment History
export const influencerPayments = pgTable("influencer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
});

export const insertInfluencerPaymentSchema = createInsertSchema(influencerPayments).omit({ id: true, paidAt: true });
export type InsertInfluencerPayment = z.infer<typeof insertInfluencerPaymentSchema>;
export type InfluencerPayment = typeof influencerPayments.$inferSelect;

// Order Notes / History
export const orderNotes = pgTable("order_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  authorId: varchar("author_id"),
  authorType: text("author_type").default("admin").notNull(), // 'admin' | 'system' | 'customer'
  noteType: text("note_type").default("general").notNull(), // 'general' | 'status_change' | 'shipping' | 'payment' | 'customer_service'
  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderNoteSchema = createInsertSchema(orderNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertOrderNote = z.infer<typeof insertOrderNoteSchema>;
export type OrderNote = typeof orderNotes.$inferSelect;

// Stock Adjustments Log
export const stockAdjustments = pgTable("stock_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "cascade" }).notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  adjustmentType: text("adjustment_type").notNull(), // 'manual' | 'sale' | 'return' | 'restock' | 'correction'
  reason: text("reason"),
  authorId: varchar("author_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StockAdjustment = typeof stockAdjustments.$inferSelect;

// Low Stock Alerts Configuration
export const lowStockAlerts = pgTable("low_stock_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "cascade" }).notNull().unique(),
  threshold: integer("threshold").default(5).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LowStockAlert = typeof lowStockAlerts.$inferSelect;

// Marketing Campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  campaignType: text("campaign_type").notNull(), // 'email' | 'discount' | 'banner'
  status: text("status").default("draft").notNull(), // 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  targetAudience: jsonb("target_audience").$type<{
    type: 'all' | 'segment';
    filters?: { field: string; operator: string; value: any }[];
  }>(),
  couponId: varchar("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  emailSubject: text("email_subject"),
  emailContent: text("email_content"),
  sentCount: integer("sent_count").default(0).notNull(),
  openCount: integer("open_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  sentCount: true,
  openCount: true,
  clickCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // jsonb `$type` alanı — bkz. insertProductSchema.specs açıklaması.
  targetAudience: z.object({
    type: z.enum(['all', 'segment']),
    // `value` her tipte olabildiği için filtre dizisi tip düzeyinde bildirilir.
    filters: z.custom<Array<{ field: string; operator: string; value: any }>>().optional(),
  }).nullable().optional(),
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Email Jobs for bulk email tracking
export const emailJobs = pgTable("email_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  status: text("status").default("pending").notNull(), // 'pending' | 'sent' | 'failed' | 'bounced'
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailJob = typeof emailJobs.$inferSelect;

// Site Settings (SMTP, Admin Email, etc.)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Refresh Tokens for JWT Authentication
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  adminUserId: varchar("admin_user_id").references(() => adminUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;

// Review Request Tracking
export const reviewRequests = pgTable("review_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReviewRequest = typeof reviewRequests.$inferSelect;

// Pending Payments (iyzico Checkout Form)
export const pendingPayments = pgTable("pending_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantOid: text("merchant_oid").notNull().unique(),
  sessionId: text("session_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    address: string;
    city: string;
    district: string;
    postalCode: string;
    country?: string;
  }>().notNull(),
  billingAddress: jsonb("billing_address").$type<BillingAddress>(),
  cartItems: jsonb("cart_items").$type<Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    productName: string;
    variantDetails: string | null;
    price: string;
    personalizationText?: string | null;
    personalizationFee?: string | null;
  }>>().notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  couponCode: text("coupon_code"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(),
  // Provider-agnostic payment token (was `paytr_token` pre-migration to iyzico).
  // The column was renamed in-place via direct SQL — no historical PayTR token
  // backfill is required since pending_payments are short-lived (24h expiry).
  paymentToken: text("payment_token"),
  iyzicoPaymentId: text("iyzico_payment_id"),
  createAccount: boolean("create_account").default(false),
  accountPasswordHash: text("account_password_hash"),
  clientIp: text("client_ip"),
  clientUserAgent: text("client_user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type PendingPayment = typeof pendingPayments.$inferSelect;

// Dealers (Bayiler)
export const dealers = pgTable("dealers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  contactPerson: text("contact_person").notNull(),
  address: text("address"),
  status: text("status").default("active").notNull(), // 'active' | 'inactive'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealerSchema = createInsertSchema(dealers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Dealer = typeof dealers.$inferSelect;

// Quotes (Teklifler)
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull().unique(),
  dealerId: varchar("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("draft").notNull(), // 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  validUntil: timestamp("valid_until"),
  paymentTerms: text("payment_terms"), // 'cash' | 'net15' | 'net30' | 'net45' | 'net60'
  notes: text("notes"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
  discountTotal: decimal("discount_total", { precision: 10, scale: 2 }).default("0").notNull(),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).default("0").notNull(),
  includesVat: boolean("includes_vat").default(true).notNull(),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Quote Items (Teklif Kalemleri)
export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  productImage: text("product_image"),
  variantDetails: text("variant_details"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

// Size Charts (Beden Tabloları)
export const sizeCharts = pgTable("size_charts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull().unique(),
  columns: jsonb("columns").$type<string[]>().default([]).notNull(), // ["Beden", "Göğüs (cm)", "Boy (cm)", "Omuz (cm)"]
  rows: jsonb("rows").$type<string[][]>().default([]).notNull(), // [["S", "96-100", "70-72", "44-46"], ["M", "100-104", "72-74", "46-48"]]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSizeChartSchema = createInsertSchema(sizeCharts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // jsonb `$type` alanları — bkz. insertProductSchema.specs açıklaması.
  columns: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});

export type InsertSizeChart = z.infer<typeof insertSizeChartSchema>;
export type SizeChart = typeof sizeCharts.$inferSelect;

// Menu Items (Menü Öğeleri)
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"), // mega menü sol panel açıklaması (submenu kökleri için)
  bgImage: text("bg_image"), // mega menü sol panel arka plan görseli (submenu kökleri için)
  measurementGifUrl: text("measurement_gif_url"), // mega menü sol panelde gösterilen esnek ölçü / boyut rehberi GIF'i
  type: text("type").notNull(), // "category", "link", "submenu"
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  url: text("url"), // for type "link"
  parentId: varchar("parent_id"), // for submenu items (self-reference)
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// ============================================================================
// MARKETPLACES — Çoklu pazaryeri (Trendyol / N11 / Hepsiburada ...) çatısı
// Tek yön: pazaryeri → site (read-only katalog senkronu)
// ============================================================================

export const marketplaces = pgTable("marketplaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'trendyol' | 'n11' | 'hepsiburada' | 'amazon'
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // AES-256-GCM encrypted JSON of credentials (supplier id, api key, api secret, ...)
  // Format: base64(iv:cipher:tag). MARKETPLACE_ENCRYPTION_KEY required.
  encryptedCredentials: text("encrypted_credentials").notNull(),
  // Adapter-specific non-secret config (e.g. { sandbox: false, rateLimit: 600 })
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  lastFullSyncAt: timestamp("last_full_sync_at"),
  lastDeltaSyncAt: timestamp("last_delta_sync_at"),
  /** Pazaryeri kategori ağacının en son DB'ye snapshot edildiği zaman (cache yaşı). */
  categoryTreeFetchedAt: timestamp("category_tree_fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMarketplaceSchema = createInsertSchema(marketplaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastFullSyncAt: true,
  lastDeltaSyncAt: true,
});
export type InsertMarketplace = z.infer<typeof insertMarketplaceSchema>;
export type Marketplace = typeof marketplaces.$inferSelect;

export const marketplaceCategories = pgTable("marketplace_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceId: varchar("marketplace_id")
    .references(() => marketplaces.id, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(), // pazaryeri kategori ID'si
  name: text("name").notNull(),
  parentExternalId: text("parent_external_id"),
  /** Atalardan leaf'e kategori yolu — örn "Ev & Yaşam > Bahçe > Saksılar". Snapshot'tan üretilir. */
  fullPath: text("full_path"),
  // Eşlenen Polen Stone kategorisi (NULL = otomatik üretildi / eşlenmedi)
  siteCategoryId: varchar("site_category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqExternal: uniqueIndex("uniq_mp_cat_external").on(t.marketplaceId, t.externalId),
}));

export const insertMarketplaceCategorySchema = createInsertSchema(marketplaceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceCategory = z.infer<typeof insertMarketplaceCategorySchema>;
export type MarketplaceCategory = typeof marketplaceCategories.$inferSelect;

export const marketplaceProducts = pgTable("marketplace_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceId: varchar("marketplace_id")
    .references(() => marketplaces.id, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(), // Trendyol contentId / barcode
  externalProductCode: text("external_product_code"),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }),
  // sha256 hash listesi — yeniden indirmeyi önlemek için
  imageHashes: jsonb("image_hashes").$type<string[]>().default([]).notNull(),
  // İçerik diff hash'i (name + description + basePrice + stock) — değişmediyse skip
  contentHash: text("content_hash"),
  /**
   * Senkron yönü:
   *   'pull' — pazaryeri yönetir, site'a çekilir (varsayılan, eski davranış)
   *   'push' — site yönetir, değişiklikler pazaryerine gönderilir.
   * Pull motoru 'push' satırlarına ASLA dokunmaz; push motoru 'pull'
   * satırlarına asla göndermez. (loop/çakışma koruması)
   */
  syncDirection: text("sync_direction").default("pull").notNull(),
  /** Push ürünlerde zorunlu — Trendyol barkodu (aynı zamanda externalId olarak kullanılır). */
  barcode: text("barcode"),
  stockCode: text("stock_code"),
  /** Push yaşam döngüsü: null | 'sent' | 'approved' | 'rejected' | 'error' */
  pushStatus: text("push_status"),
  pushError: text("push_error"),
  lastBatchRequestId: text("last_batch_request_id"),
  /** Push sihirbazında seçilen Trendyol leaf kategori / marka. */
  tyCategoryId: text("ty_category_id"),
  tyBrandId: text("ty_brand_id"),
  tyBrandName: text("ty_brand_name"),
  /** Kategoriye özel zorunlu özellik cevapları: { [attributeId]: attributeValueId|customValue } */
  pushAttributes: jsonb("push_attributes").$type<Record<string, unknown>>().default({}).notNull(),
  /** KDV, kargo süresi vb. push meta: { vatRate, dimensionalWeight, deliveryDuration, listPrice } */
  pushMeta: jsonb("push_meta").$type<Record<string, unknown>>().default({}).notNull(),
  lastPushHash: text("last_push_hash"),
  lastPushedAt: timestamp("last_pushed_at"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqExternal: uniqueIndex("uniq_mp_prod_external").on(t.marketplaceId, t.externalId),
}));

export const insertMarketplaceProductSchema = createInsertSchema(marketplaceProducts).omit({
  id: true,
  createdAt: true,
  lastSyncedAt: true,
}).extend({
  // jsonb `$type` alanları — bkz. insertProductSchema.specs açıklaması.
  imageHashes: z.array(z.string()).optional(),
  pushAttributes: z.record(z.unknown()).optional(),
  pushMeta: z.record(z.unknown()).optional(),
});
export type InsertMarketplaceProduct = z.infer<typeof insertMarketplaceProductSchema>;
export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect;

export const marketplaceSyncRuns = pgTable("marketplace_sync_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceId: varchar("marketplace_id")
    .references(() => marketplaces.id, { onDelete: "cascade" })
    .notNull(),
  mode: text("mode").notNull(), // 'delta' | 'full'
  status: text("status").default("running").notNull(), // 'running' | 'completed' | 'failed' | 'partial'
  trigger: text("trigger").default("manual").notNull(), // 'manual' | 'cron'
  stats: jsonb("stats")
    .$type<{
      categoriesAdded?: number;
      categoriesUpdated?: number;
      productsAdded?: number;
      productsUpdated?: number;
      productsDeactivated?: number;
      productsReactivated?: number;
      variantsUpdated?: number;
      variantsUnmatched?: number;
      imagesDownloaded?: number;
      imagesSkipped?: number;
      imagesFailed?: number;
      pagesProcessed?: number;
      /** Live progress: how many products have been processed so far. */
      processedTotal?: number;
      /** Live progress: total products expected (from adapter or estimate). */
      expectedTotal?: number;
      /** Live progress: ad of the currently processing product (UI marquee). */
      currentProductName?: string;
      /** Live progress: shu an okunmakta olan sayfa indeksi (0-based). */
      currentPage?: number;
      /** HTTP retried request sayısı (rate-limit / 5xx / network). */
      retriedRequests?: number;
      /** Recover edilen istek sayısı (retry sonunda 2xx). */
      recoveredRequests?: number;
      /** Bu sync sırasında kategori ağacı snapshot'ı kullanıldıysa eşleşen leaf sayısı. */
      categoriesCachedFromTree?: number;
    }>()
    .default({})
    .notNull(),
  errors: jsonb("errors")
    .$type<Array<{ context: string; message: string }>>()
    .default([])
    .notNull(),
  /**
   * Hata raporu — completeSyncRun aşamasında doldurulur. Gruplar:
   *   - http4xx: client-side (auth/validation) hatalar
   *   - http5xx: upstream/gateway hataları
   *   - network: AbortError, ENOTFOUND, ECONNRESET, timeout
   *   - parse: JSON / SyntaxError
   *   - other: kategorize edilemeyen
   * Her grup en fazla 5 örnek mesaj tutar (UI sample list için).
   */
  errorSummary: jsonb("error_summary")
    .$type<{
      http4xx?: { count: number; samples: string[] };
      http5xx?: { count: number; samples: string[] };
      network?: { count: number; samples: string[] };
      parse?: { count: number; samples: string[] };
      other?: { count: number; samples: string[] };
      imagesFailed?: number;
    }>()
    .default({})
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  // Marketplace başına sadece bir 'running' run — race-safe lock
  uniqRunning: uniqueIndex("uniq_mp_running_per_marketplace")
    .on(t.marketplaceId)
    .where(sql`status = 'running'`),
  startedIdx: index("idx_mp_runs_mp").on(t.marketplaceId, t.startedAt),
}));

// ============================================================================
// MARKETPLACE PUSH QUEUE — site → pazaryeri outbox (stok/fiyat + ürün gönderimi)
// ============================================================================

export const marketplacePushQueue = pgTable("marketplace_push_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceId: varchar("marketplace_id")
    .references(() => marketplaces.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  /** 'stock_price' | 'create' | 'update' */
  kind: text("kind").notNull(),
  /** create/update için hazırlanmış Trendyol item payload'ı; stock_price'ta boş. */
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  /** 'pending' → 'sent' (batchRequestId alındı) → 'confirmed' | 'failed' */
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at").defaultNow().notNull(),
  batchRequestId: text("batch_request_id"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  // Aynı ürün+pazaryeri+tür için tek pending satır (dedupe)
  uniqPending: uniqueIndex("uniq_mp_push_pending")
    .on(t.marketplaceId, t.productId, t.kind)
    .where(sql`status = 'pending'`),
  statusIdx: index("idx_mp_push_status").on(t.marketplaceId, t.status, t.nextAttemptAt),
}));

export const insertMarketplacePushQueueSchema = createInsertSchema(marketplacePushQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplacePushQueueItem = z.infer<typeof insertMarketplacePushQueueSchema>;
export type MarketplacePushQueueItem = typeof marketplacePushQueue.$inferSelect;

// ============================================================================
// MARKETPLACE ORDER LINES — pazaryeri siparişlerinden stok düşümü (idempotent)
// ============================================================================

/**
 * Pazaryerinden çekilen sipariş satırları. Amaç: Trendyol'da satılan
 * push-yönlü ürünlerin site stoğunu bir kez (idempotent) düşürmek.
 * uniq (marketplaceId, orderNumber, lineId) — aynı satır iki kez işlenmez.
 */
export const marketplaceOrderLines = pgTable("marketplace_order_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceId: varchar("marketplace_id")
    .references(() => marketplaces.id, { onDelete: "cascade" })
    .notNull(),
  /** Pazaryeri sipariş numarası (Trendyol orderNumber). */
  orderNumber: text("order_number").notNull(),
  /** Sipariş satırı id'si (Trendyol line id). */
  lineId: text("line_id").notNull(),
  /** Pazaryeri paket id'si (statü güncelleme / fatura gönderimi için). */
  packageId: text("package_id"),
  barcode: text("barcode"),
  quantity: integer("quantity").default(0).notNull(),
  /** Pazaryerindeki son bilinen satır durumu (Created/Shipped/Cancelled...). */
  status: text("status"),
  /** Eşleşen site ürünü (push bağlantısı üzerinden). Eşleşmediyse null. */
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),
  /** Stok düşümü uygulandı mı? (eşleşmeyen/iptal satırlarda false kalır) */
  stockApplied: boolean("stock_applied").default(false).notNull(),
  /** İptal/iade sonrası stok geri eklendi mi? */
  stockRestored: boolean("stock_restored").default(false).notNull(),
  /** İnsan-okur işlem notu (eşleşmedi, stok 0'a kilitlendi vb.). */
  note: text("note"),
  /** Satır birim fiyatı (pazaryerinden gelen). */
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  /** Satır toplam tutarı (birim fiyat x adet). */
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  /** Pazaryerindeki ürün adı (site eşleşmesi olmasa da görünür). */
  productTitle: text("product_title"),
  /** Müşteri adı (paket seviyesinden). */
  customerName: text("customer_name"),
  /** Kargo firması adı. */
  cargoProvider: text("cargo_provider"),
  /** Kargo takip numarası. */
  cargoTracking: text("cargo_tracking"),
  orderedAt: timestamp("ordered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqLine: uniqueIndex("uniq_mp_order_line").on(t.marketplaceId, t.orderNumber, t.lineId),
  mpIdx: index("idx_mp_order_lines_mp").on(t.marketplaceId, t.createdAt),
}));

export const insertMarketplaceOrderLineSchema = createInsertSchema(marketplaceOrderLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceOrderLine = z.infer<typeof insertMarketplaceOrderLineSchema>;
export type MarketplaceOrderLine = typeof marketplaceOrderLines.$inferSelect;

export const insertMarketplaceSyncRunSchema = createInsertSchema(marketplaceSyncRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
}).extend({
  // jsonb `$type` alanı — bkz. insertProductSchema.specs açıklaması.
  stats: z.object({
    categoriesAdded: z.number().optional(),
    categoriesUpdated: z.number().optional(),
    productsAdded: z.number().optional(),
    productsUpdated: z.number().optional(),
    productsDeactivated: z.number().optional(),
    productsReactivated: z.number().optional(),
    variantsUpdated: z.number().optional(),
    variantsUnmatched: z.number().optional(),
    imagesDownloaded: z.number().optional(),
    imagesSkipped: z.number().optional(),
    imagesFailed: z.number().optional(),
    pagesProcessed: z.number().optional(),
    processedTotal: z.number().optional(),
    expectedTotal: z.number().optional(),
    currentProductName: z.string().optional(),
    currentPage: z.number().optional(),
    retriedRequests: z.number().optional(),
    recoveredRequests: z.number().optional(),
    categoriesCachedFromTree: z.number().optional(),
  }).optional(),
  errors: z.array(z.object({ context: z.string(), message: z.string() })).optional(),
  errorSummary: z.object({
    http4xx: z.object({ count: z.number(), samples: z.array(z.string()) }).optional(),
    http5xx: z.object({ count: z.number(), samples: z.array(z.string()) }).optional(),
    network: z.object({ count: z.number(), samples: z.array(z.string()) }).optional(),
    parse: z.object({ count: z.number(), samples: z.array(z.string()) }).optional(),
    other: z.object({ count: z.number(), samples: z.array(z.string()) }).optional(),
    imagesFailed: z.number().optional(),
  }).optional(),
});
export type InsertMarketplaceSyncRun = z.infer<typeof insertMarketplaceSyncRunSchema>;
export type MarketplaceSyncRun = typeof marketplaceSyncRuns.$inferSelect;

// ============================================================================
// PAGES — Statik içerik sayfaları (Hakkımızda, KVKK, Kargo, vb.)
// ============================================================================

export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pages.$inferSelect;

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  coverImage: text("cover_image"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertBrand = z.infer<typeof insertBrandSchema>;

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
});

export type Brand = typeof brands.$inferSelect;

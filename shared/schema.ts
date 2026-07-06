import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  password: text("password").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  image: text("image"),
  displayOrder: integer("display_order").default(0).notNull(),
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
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  discountBadge: text("discount_badge"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
  cartItems: jsonb("cart_items").$type<Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    productName: string;
    variantDetails: string | null;
    price: string;
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
});

export type InsertSizeChart = z.infer<typeof insertSizeChartSchema>;
export type SizeChart = typeof sizeCharts.$inferSelect;

// Menu Items (Menü Öğeleri)
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
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
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqExternal: uniqueIndex("uniq_mp_prod_external").on(t.marketplaceId, t.externalId),
}));

export const insertMarketplaceProductSchema = createInsertSchema(marketplaceProducts).omit({
  id: true,
  createdAt: true,
  lastSyncedAt: true,
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

export const insertMarketplaceSyncRunSchema = createInsertSchema(marketplaceSyncRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
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

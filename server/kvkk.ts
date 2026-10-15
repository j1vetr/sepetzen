import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  userAddresses,
  orders,
  orderItems,
  favorites,
  productReviews,
  returnRequests,
  dataDeletionRequests,
  type DataDeletionRequest,
} from "@shared/schema";

/** Müşterinin sistemde tutulan kişisel verileri (şifre ve iç kimlikler hariç). */
export async function collectUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const [addresses, userOrders, favs, reviews, returns] = await Promise.all([
    db.select().from(userAddresses).where(eq(userAddresses.userId, userId)),
    db.select().from(orders).where(eq(orders.customerEmail, user.email)).orderBy(desc(orders.createdAt)),
    db.select().from(favorites).where(eq(favorites.userId, userId)),
    db.select().from(productReviews).where(eq(productReviews.userId, userId)),
    db.select().from(returnRequests).where(eq(returnRequests.customerId, userId)),
  ]);

  const orderIds = userOrders.map((o) => o.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      city: user.city,
      district: user.district,
      postalCode: user.postalCode,
      country: user.country,
      whatsappOptIn: user.whatsappOptIn,
      googleAccountLinked: !!user.googleId,
      createdAt: user.createdAt,
    },
    addresses: addresses.map(({ id, userId: _u, ...rest }) => rest),
    orders: userOrders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      shippingCost: o.shippingCost,
      discountAmount: o.discountAmount,
      total: o.total,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      shippingAddress: o.shippingAddress,
      billingAddress: o.billingAddress,
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i: any) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          variantDetails: i.variantDetails ?? null,
        })),
    })),
    favorites: favs.map((f) => ({ productId: f.productId, createdAt: f.createdAt })),
    reviews: reviews.map((r) => ({
      productId: r.productId,
      rating: r.rating,
      title: r.title,
      content: r.content,
      createdAt: r.createdAt,
    })),
    returnRequests: returns.map((r) => ({
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

export async function getLatestDeletionRequest(userId: string): Promise<DataDeletionRequest | null> {
  const [row] = await db
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.userId, userId))
    .orderBy(desc(dataDeletionRequests.createdAt))
    .limit(1);
  return row ?? null;
}

/** Bekleyen talebi varsa yenisini açmaz, mevcut olanı döndürür. */
export async function createDeletionRequest(userId: string, note: string | null) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("Kullanıcı bulunamadı");
  const [pending] = await db
    .select()
    .from(dataDeletionRequests)
    .where(and(eq(dataDeletionRequests.userId, userId), eq(dataDeletionRequests.status, "pending")))
    .limit(1);
  if (pending) return { request: pending, created: false };
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const [request] = await db
    .insert(dataDeletionRequests)
    .values({ userId, email: user.email, fullName, note })
    .returning();
  return { request, created: true };
}

export async function listDeletionRequests() {
  return db.select().from(dataDeletionRequests).orderBy(desc(dataDeletionRequests.createdAt));
}

export async function resolveDeletionRequest(
  id: string,
  status: "pending" | "completed" | "rejected",
  adminNote: string | null,
) {
  const [row] = await db
    .update(dataDeletionRequests)
    .set({ status, adminNote, resolvedAt: status === "pending" ? null : new Date() })
    .where(eq(dataDeletionRequests.id, id))
    .returning();
  return row ?? null;
}

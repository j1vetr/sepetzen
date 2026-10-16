import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, walletTransactions, type WalletTransaction } from "../shared/schema";
import { storage } from "./storage";

// Kart ile bakiye yüklemelerinin merchantOid ön eki. Ödeme sağlayıcı
// callback'leri bu ön ekle bakiye yüklemesini sipariş ödemesinden ayırır.
export const WALLET_TOPUP_PREFIX = "WLT";

export interface WalletConfig {
  enabled: boolean;
  minTopup: number;
  maxTopup: number;
}

const toMoney = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// Bakiye ayarları site_settings'ten okunur: wallet_enabled, wallet_min_topup, wallet_max_topup.
export async function getWalletConfig(): Promise<WalletConfig> {
  const [enabled, min, max] = await Promise.all([
    storage.getSiteSetting("wallet_enabled"),
    storage.getSiteSetting("wallet_min_topup"),
    storage.getSiteSetting("wallet_max_topup"),
  ]);
  const minParsed = parseFloat(min || "");
  const maxParsed = parseFloat(max || "");
  const minTopup = Number.isFinite(minParsed) && minParsed > 0 ? minParsed : 50;
  const maxTopup = Number.isFinite(maxParsed) && maxParsed >= minTopup ? maxParsed : 10000;
  return { enabled: enabled !== "0", minTopup, maxTopup };
}

export async function getWalletBalance(userId: string): Promise<number> {
  const [row] = await db.select({ b: users.walletBalance }).from(users).where(eq(users.id, userId));
  return row ? parseFloat(row.b) : 0;
}

export async function getUserWalletTransactions(userId: string, limit = 50): Promise<WalletTransaction[]> {
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
}

/** Onay bekleyen (havale) veya ödeme sayfasındaki (kart) bir yükleme kaydı açar. */
export async function createPendingTopup(opts: {
  userId: string;
  type: "topup_card" | "topup_bank";
  amount: number;
  reference: string;
  note?: string | null;
}): Promise<WalletTransaction> {
  const [row] = await db
    .insert(walletTransactions)
    .values({
      userId: opts.userId,
      type: opts.type,
      status: "pending",
      amount: toMoney(opts.amount),
      reference: opts.reference,
      note: opts.note ?? null,
    })
    .returning();
  return row;
}

/**
 * Bekleyen yüklemeyi tamamlar ve bakiyeye ekler. Tek transaction içinde ve
 * koşullu UPDATE ile çalışır; aynı kayıt iki kez gelse bakiye bir kez artar.
 * Zaten işlenmişse (veya yoksa) null döner.
 */
export async function completePendingTopup(
  reference: string,
  expectedType?: "topup_card" | "topup_bank",
): Promise<{ transaction: WalletTransaction; balance: number } | null> {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(walletTransactions)
      .set({ status: "completed", completedAt: new Date() })
      .where(
        and(
          eq(walletTransactions.reference, reference),
          eq(walletTransactions.status, "pending"),
          expectedType ? eq(walletTransactions.type, expectedType) : sql`true`,
        ),
      )
      .returning();
    if (!claimed) return null;
    const [user] = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${claimed.amount}` })
      .where(eq(users.id, claimed.userId))
      .returning({ b: users.walletBalance });
    const [updated] = await tx
      .update(walletTransactions)
      .set({ balanceAfter: user.b })
      .where(eq(walletTransactions.id, claimed.id))
      .returning();
    return { transaction: updated, balance: parseFloat(user.b) };
  });
}

/** Bekleyen yüklemeyi reddeder/başarısız işaretler. Bakiye değişmez. */
export async function closePendingTopup(
  reference: string,
  status: "rejected" | "failed",
  note?: string | null,
): Promise<WalletTransaction | null> {
  const [row] = await db
    .update(walletTransactions)
    .set({
      status,
      completedAt: new Date(),
      ...(note ? { note } : {}),
    })
    .where(and(eq(walletTransactions.reference, reference), eq(walletTransactions.status, "pending")))
    .returning();
  return row ?? null;
}

export async function getTransactionByReference(reference: string): Promise<WalletTransaction | undefined> {
  const [row] = await db.select().from(walletTransactions).where(eq(walletTransactions.reference, reference));
  return row;
}

export class InsufficientWalletBalanceError extends Error {
  constructor() {
    super("Bakiyeniz bu sipariş için yeterli değil");
  }
}

/**
 * Sipariş tutarını bakiyeden düşer. Bakiye yetersizse hiçbir şey değişmez ve
 * InsufficientWalletBalanceError fırlatır. `reference` sipariş başına benzersizdir,
 * aynı sipariş için ikinci düşüm unique kısıt ile engellenir.
 */
export async function debitWalletForOrder(userId: string, amount: number, orderNumber: string): Promise<number> {
  const amt = toMoney(amount);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} - ${amt}` })
      .where(and(eq(users.id, userId), sql`${users.walletBalance} >= ${amt}`))
      .returning({ b: users.walletBalance });
    if (!user) throw new InsufficientWalletBalanceError();
    await tx.insert(walletTransactions).values({
      userId,
      type: "order_payment",
      status: "completed",
      amount: `-${amt}`,
      balanceAfter: user.b,
      reference: `order:${orderNumber}`,
      note: `Sipariş ${orderNumber}`,
      completedAt: new Date(),
    });
    return parseFloat(user.b);
  });
}

/**
 * Bakiye ile ödenmiş bir siparişin tutarını (varsayılan tamamı) bakiyeye iade eder.
 * Sipariş başına bir kez çalışır (reference benzersiz). Bakiye ile ödenmemişse
 * veya daha önce iade edilmişse null döner.
 */
export async function refundWalletOrder(
  orderNumber: string,
  note = "Sipariş iptali iadesi",
): Promise<{ amount: number; balance: number } | null> {
  const paid = await getTransactionByReference(`order:${orderNumber}`);
  if (!paid || paid.status !== "completed") return null;
  const amount = Math.abs(parseFloat(paid.amount));
  if (!(amount > 0)) return null;
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(walletTransactions)
      .values({
        userId: paid.userId,
        type: "order_refund",
        status: "completed",
        amount: toMoney(amount),
        reference: `refund:${orderNumber}`,
        orderId: paid.orderId,
        note: `${note} (${orderNumber})`,
        completedAt: new Date(),
      })
      .onConflictDoNothing({ target: walletTransactions.reference })
      .returning();
    if (!inserted) return null;
    const [user] = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${toMoney(amount)}` })
      .where(eq(users.id, paid.userId))
      .returning({ b: users.walletBalance });
    await tx.update(walletTransactions).set({ balanceAfter: user.b }).where(eq(walletTransactions.id, inserted.id));
    return { amount, balance: parseFloat(user.b) };
  });
}

/** Siparişe bağlı bakiye hareketine sipariş kimliğini yazar (iade/raporlama için). */
export async function attachOrderToWalletPayment(orderNumber: string, orderId: string): Promise<void> {
  await db
    .update(walletTransactions)
    .set({ orderId })
    .where(eq(walletTransactions.reference, `order:${orderNumber}`));
}

/** Admin manuel düzeltme: pozitif ekler, negatif düşer (bakiye eksiye düşemez). */
export async function adminAdjustWallet(
  userId: string,
  amount: number,
  note: string,
): Promise<{ balance: number; transaction: WalletTransaction }> {
  const amt = toMoney(amount);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${amt}` })
      .where(
        and(
          eq(users.id, userId),
          amount < 0 ? sql`${users.walletBalance} + ${amt} >= 0` : sql`true`,
        ),
      )
      .returning({ b: users.walletBalance });
    if (!user) throw new Error(amount < 0 ? "Düşülecek tutar bakiyeden fazla" : "Kullanıcı bulunamadı");
    const [row] = await tx
      .insert(walletTransactions)
      .values({
        userId,
        type: "admin_adjust",
        status: "completed",
        amount: amt,
        balanceAfter: user.b,
        note,
        completedAt: new Date(),
      })
      .returning();
    return { balance: parseFloat(user.b), transaction: row };
  });
}

export interface AdminWalletRow extends WalletTransaction {
  userEmail: string | null;
  userName: string | null;
}

export async function listWalletTransactionsForAdmin(filter: {
  status?: string;
  type?: string;
  limit?: number;
}): Promise<AdminWalletRow[]> {
  const conditions = [] as ReturnType<typeof eq>[];
  if (filter.status) conditions.push(eq(walletTransactions.status, filter.status));
  if (filter.type) conditions.push(eq(walletTransactions.type, filter.type));
  const rows = await db
    .select({
      tx: walletTransactions,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(walletTransactions)
    .leftJoin(users, eq(users.id, walletTransactions.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(walletTransactions.createdAt))
    .limit(Math.min(filter.limit ?? 200, 500));
  return rows.map((r) => ({
    ...r.tx,
    userEmail: r.email,
    userName: [r.firstName, r.lastName].filter(Boolean).join(" ") || null,
  }));
}

export async function getWalletTotals(): Promise<{ totalBalance: number; pendingBankCount: number; pendingBankAmount: number }> {
  const [bal] = await db.select({ s: sql<string>`COALESCE(SUM(${users.walletBalance}), 0)` }).from(users);
  const [pend] = await db
    .select({
      c: sql<number>`count(*)::int`,
      s: sql<string>`COALESCE(SUM(${walletTransactions.amount}), 0)`,
    })
    .from(walletTransactions)
    .where(and(eq(walletTransactions.type, "topup_bank"), eq(walletTransactions.status, "pending")));
  return {
    totalBalance: parseFloat(bal?.s ?? "0"),
    pendingBankCount: pend?.c ?? 0,
    pendingBankAmount: parseFloat(pend?.s ?? "0"),
  };
}

export async function getTransactionById(id: string): Promise<WalletTransaction | undefined> {
  const [row] = await db.select().from(walletTransactions).where(eq(walletTransactions.id, id));
  return row;
}

export async function searchUsersWithBalance(q: string, limit = 10) {
  const term = `%${q.trim().toLowerCase()}%`;
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      walletBalance: users.walletBalance,
    })
    .from(users)
    .where(sql`lower(${users.email}) like ${term} or lower(coalesce(${users.firstName},'') || ' ' || coalesce(${users.lastName},'')) like ${term}`)
    .limit(limit);
}

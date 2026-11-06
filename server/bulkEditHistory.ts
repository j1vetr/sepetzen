import { db } from "./storage";
import { sql, eq, inArray } from "drizzle-orm";
import { products, productVariants } from "@shared/schema";

/**
 * Toplu fiyat ve etiket işlemlerinden önce etkilenen ürünlerin eski değerleri kaydedilir.
 * Böylece admin "Geri al" ile işlemi tek tıkla eski haline döndürebilir.
 */

export interface BulkSnapshotProduct {
  id: string;
  basePrice: string;
  discountBadge: string | null;
  variants: { id: string; price: string }[];
}

let ensured = false;
export async function ensureBulkEditHistoryTable(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    create table if not exists bulk_edit_history (
      id serial primary key,
      kind text not null,
      summary text not null,
      product_count integer not null default 0,
      data jsonb not null,
      created_at timestamp not null default now(),
      reverted_at timestamp
    )
  `);
  ensured = true;
}

export async function captureSnapshot(productIds: string[]): Promise<BulkSnapshotProduct[]> {
  if (productIds.length === 0) return [];
  const prods = await db
    .select({ id: products.id, basePrice: products.basePrice, discountBadge: products.discountBadge })
    .from(products)
    .where(inArray(products.id, productIds));
  const vars = await db
    .select({ id: productVariants.id, productId: productVariants.productId, price: productVariants.price })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds));
  const byProduct = new Map<string, { id: string; price: string }[]>();
  for (const v of vars) {
    const list = byProduct.get(v.productId) ?? [];
    list.push({ id: v.id, price: v.price });
    byProduct.set(v.productId, list);
  }
  return prods.map((p) => ({
    id: p.id,
    basePrice: p.basePrice,
    discountBadge: p.discountBadge ?? null,
    variants: byProduct.get(p.id) ?? [],
  }));
}

export async function saveSnapshot(kind: "price" | "badge", summary: string, data: BulkSnapshotProduct[]): Promise<number> {
  await ensureBulkEditHistoryTable();
  const res = await db.execute(sql`
    insert into bulk_edit_history (kind, summary, product_count, data)
    values (${kind}, ${summary}, ${data.length}, ${JSON.stringify(data)}::jsonb)
    returning id
  `);
  // Eski kayıtları temizle: en yeni 30 işlem tutulur
  await db.execute(sql`
    delete from bulk_edit_history where id not in (select id from bulk_edit_history order by id desc limit 30)
  `);
  return Number((res.rows[0] as any).id);
}

export async function listHistory() {
  await ensureBulkEditHistoryTable();
  const res = await db.execute(sql`
    select id, kind, summary, product_count, created_at, reverted_at
    from bulk_edit_history order by id desc limit 15
  `);
  return res.rows as any[];
}

export async function undoHistory(id: number, kind?: "price" | "badge"): Promise<{ restored: number } | { error: string; status: number }> {
  await ensureBulkEditHistoryTable();
  // Atomik talep: aynı kayıt iki kez geri alınamaz
  const claimed = await db.execute(sql`
    update bulk_edit_history set reverted_at = now()
    where id = ${id} and reverted_at is null
    returning kind, data
  `);
  const row = claimed.rows[0] as any;
  if (!row) return { error: "Kayıt bulunamadı veya zaten geri alınmış", status: 404 };
  const data = row.data as BulkSnapshotProduct[];
  try {
    await db.transaction(async (tx) => {
      for (const p of data) {
        const set: Record<string, unknown> = {};
        if (row.kind === "price") set.basePrice = p.basePrice;
        set.discountBadge = p.discountBadge;
        await tx.update(products).set(set).where(eq(products.id, p.id));
        if (row.kind === "price") {
          for (const v of p.variants) {
            await tx.update(productVariants).set({ price: v.price }).where(eq(productVariants.id, v.id));
          }
        }
      }
    });
  } catch (err) {
    await db.execute(sql`update bulk_edit_history set reverted_at = null where id = ${id}`);
    throw err;
  }
  return { restored: data.length };
}

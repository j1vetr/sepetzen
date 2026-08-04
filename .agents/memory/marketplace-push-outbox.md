---
name: Marketplace push outbox & sync direction
description: Rules for the site→Trendyol push path and pull/push identity guard
---

- Marketplace links have `syncDirection`: 'pull' (Trendyol is source) or 'push' (site is source). Pull sync must never touch push rows.
- **Identity trap:** push rows start with `externalId = barcode`, but Trendyol later assigns a `contentId`. Full sync migrates push-link externalId to contentId by matching barcodes — keep this guard if reworking sync.
- **Why:** without barcode matching, pull sync treats pushed products as new → duplicate products / clobbered stock.
- Stock/price changes enqueue to `marketplace_push_queue` via an **awaited** `notifyPushOutbox` inside storage (durable; failure surfaces to caller). Do not revert to fire-and-forget.
- Queue processing is scoped: `processPushQueue(marketplaceId?)` — admin manual triggers must pass the marketplace id.
- Trendyol V1 product endpoints are dead after Aug 10 2026 — only V2. Product *listing* moved to `/product/sellers/{id}/products/approved` (+ `/unapproved`, different schema); old `/products` GET returns 426 UPGRADE_REQUIRED. Empty catalog returns 404 `product.not.found` → treat as empty page.
- **Batch poll trap:** batch-requests response has `items: []` while still processing — empty items with `itemCount > 0` means IN_PROGRESS, never "done". Treating it as done caused premature `approved` (caught in live test).
- Price-and-inventory batches ARE queryable via the product `batch-requests/{id}` endpoint (verified live).
- Reverse direction (Trendyol order → site stock decrement) runs via a 10-min cron: order lines recorded idempotently (uniq marketplace+orderNumber+lineId), decrement only for push links, cancel/return restores once. Stock change goes through `updateProductVariant` so the outbox propagates it — do not bypass storage when adjusting stock.
- `npm run db:push` can prompt interactively (table rename / constraint truncate) and hang in non-TTY shells — if a new table matches, create it via SQL matching drizzle schema exactly, then push is a no-op. Pre-existing drift: refresh_tokens unique constraint prompt.

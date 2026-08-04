---
name: Marketplace push outbox & sync direction
description: Rules for the site→Trendyol push path and pull/push identity guard
---

- Marketplace links have `syncDirection`: 'pull' (Trendyol is source) or 'push' (site is source). Pull sync must never touch push rows.
- **Identity trap:** push rows start with `externalId = barcode`, but Trendyol later assigns a `contentId`. Full sync migrates push-link externalId to contentId by matching barcodes — keep this guard if reworking sync.
- **Why:** without barcode matching, pull sync treats pushed products as new → duplicate products / clobbered stock.
- Stock/price changes enqueue to `marketplace_push_queue` via an **awaited** `notifyPushOutbox` inside storage (durable; failure surfaces to caller). Do not revert to fire-and-forget.
- Queue processing is scoped: `processPushQueue(marketplaceId?)` — admin manual triggers must pass the marketplace id.
- Trendyol V1 product endpoints are dead after Aug 10 2026 — only V2 (`/product/sellers/{id}/products`, `/inventory/.../price-and-inventory`).

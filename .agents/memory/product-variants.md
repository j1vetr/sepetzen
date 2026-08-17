---
name: Product variant invariants
description: Durable rules for variant deletion safety and variant pricing in checkout
---

# Product variant invariants

**Rule 1 — never hard-delete a variant that has history.** Any flow that removes variants must first check for order, cart, or stock-history references: referenced variants get retired (deactivated, ID preserved), only unreferenced ones may be deleted; and product+variant+category writes belong in one transaction so a failed save leaves nothing half-applied.
**Why:** foreign keys cascade variant deletion into customer carts and stock history and orphan order lines — a "delete variant" click can silently destroy live customer data.
**How to apply:** route every new admin removal/bulk flow through the existing reference-aware reconcile/retire storage methods; never call the raw variant delete directly.

**Rule 2 — variant price is the price everywhere.** Multiple server checkout paths compute line prices independently; each must price from the resolved cart variant (falling back to the product base price only when the variant has none). The client already displays variant prices, so any server path using base price charges a different amount than shown.
**How to apply:** when adding or touching a checkout/quote path, price from the cart's variant and grep the other checkout paths for base-price drift.

---
name: Returns and refunds
description: Safety rule for recording marketplace payment refunds and allocating order-level discounts to returned products.
---

Refunds are manually confirmed after completion in the provider's own panel. Do not add an automatic iyzico refund call until the checkout flow stores an immutable mapping from every order item to its payment transaction ID.

**Why:** iyzico refunds address individual payment transactions, not a generic order-level payment. Using a single transaction ID for a multi-item or discounted order can refund the wrong line or an invalid amount.

**How to apply:** Keep provider result references in the return ledger. If automatic refunds are added later, first persist item-level transaction mappings and use idempotent, reconcilable refund attempts.

Product-only return refunds use the order's paid merchandise share, distributed proportionally across its order lines. Shipping is not automatically refundable.

**Why:** an order-level discount, including one that applies to shipping, must be allocated between merchandise and shipping before a partial product return is recorded.

**How to apply:** Every order-creation path must persist each line's net refundable amount. Return handling must use that snapshot rather than the catalog or undiscounted line price.
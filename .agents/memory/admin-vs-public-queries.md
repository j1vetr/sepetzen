---
name: Admin ops must not use public storefront queries
description: Why admin maintenance endpoints must use getAllProducts, and the safe variant-sync model (report + confirmed atomic delete)
---

# Admin ops must not use public storefront queries

**Rule:** Admin maintenance endpoints must use `storage.getAllProducts()` (all products). The public `storage.getProducts()` filters to isActive AND in-stock, and `getProductBySlug` hides products whose total stock is 0.

**Why:** The old variant-sync button used the public query and deleted variants, which zeroed stock and made products vanish from the storefront (they still existed in DB). Products with NO defined sizes carry their stock on a single size-less variant — deleting "unmatched" variants for them destroys the product's stock.

**How to apply:**
- Bulk/maintenance admin endpoints: always the all-products query; never delete data as a side effect of a "check/sync" action.
- Destructive steps must be a separate, admin-confirmed endpoint. Validate + delete in ONE conditional SQL statement (e.g. `DELETE ... USING products WHERE NOT (available_sizes @> to_jsonb(v.size)) AND (allowStocked OR stock = 0) RETURNING ...`) so re-validation and deletion are atomic — no TOCTOU window. Return deletedIds/skippedIds so the UI only removes what was truly deleted.
- Variants of products with empty `available_sizes` are never "extra" candidates.

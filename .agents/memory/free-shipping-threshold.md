---
name: Free shipping threshold
description: The free-shipping limit is an admin-editable site setting, and every place that decides "is shipping free?" must read the same value.
---

# Free shipping threshold is one configurable value, not a constant

The limit lives in the `site_settings` table under a single key and is edited from the admin
Kargo (shipping) settings screen. The storefront reads it through a small public settings
endpoint; the server reads it directly from settings inside each order/payment calculation.

**Why:** The limit used to be a hardcoded number duplicated across the storefront and several
server payment paths, and separate copies had drifted to *different* numbers. That let a
customer see a "free shipping" promise on a product and then be charged shipping at checkout —
the worst possible mismatch, and one that only shows up in production data, not in typecheck.

**How to apply:**
- Never introduce a new literal for the limit. If a component or route needs it, read the
  shared setting (client hook / server settings lookup) instead.
- Anything that *promises* free shipping to the shopper (badges, announcement bar, cart
  progress meters, emails) and anything that *charges* shipping must resolve to the same
  number, or the promise becomes a lie.
- There are multiple independent server-side order-total calculations. Changing the rule in
  one of them is always a bug; grep for the setting key and update every calculation together.
- Keep a sane fallback when the setting is missing or unparseable, and treat non-positive or
  non-numeric values as "not configured" rather than as a zero threshold (zero would make
  every product show the badge).

## Related storefront gotcha

Products carry a free-text promotional badge field that store owners fill in by hand. Some
catalog rows literally contain the text "Ücretsiz Kargo" in that field, which renders as the
loud promo badge *in addition to* the real threshold-driven badge. That is catalog data, not a
code bug — fix it in the admin product form, not by special-casing the string in components.

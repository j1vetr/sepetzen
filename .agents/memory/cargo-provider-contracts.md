---
name: Cargo provider API contracts (Aras / Geliver / ShipEntegra)
description: Where the authoritative request/response contracts live and the traps in each carrier API
---

Do not write carrier adapters from general knowledge — the public doc sites are
thin and the real contracts live in the vendors' own SDKs:

- **ShipEntegra:** official n8n community node (`se-public-repos/n8n-nodes-shipentegra`)
  is the authoritative endpoint list. Base `https://publicapi.shipentegra.com/v1`.
  Auth is `POST /auth/token` with `clientId`/`clientSecret` → `data.accessToken`,
  then `Authorization: Bearer`. Manual orders are `POST /orders/manual` (**not**
  `/orders`), read back via `GET /orders/manual/{orderId}`; labels are
  `POST /logistics/labels/shipentegra` keyed by `orderId`; tracking is
  `GET /logistics/shipments/activities?trackingNumber=`; connection test is
  `GET /users/carriers`. `description` must be 5–50 chars and `unitPrice`/
  `shippingAmount` must be ≥ 0.01, otherwise creation is rejected.
- **Geliver:** official Go SDK (`GeliverApp/geliver-go`) is authoritative. One-step
  purchase is `POST /transactions` with `providerServiceCode` / `providerAccountID`
  at the **root** and everything else nested under `shipment` — including `test`.
  Dimensions and weight must be **strings**. Response is a Transaction with the
  shipment nested under `shipment`; track/cancel by `shipment.id` via `/shipments/{id}`.

**Why:** an adapter that posts to a plausible-but-wrong path fails only against the
live API, long after the code looks finished.

**How to apply:** pin these contracts with mock-fetch contract tests that assert the
URL, the body shape, and the response mapping. That is the only cheap way to keep
them honest without live carrier credentials.

Provider selection is per order, not global: an order stores which provider shipped
it, and lookups must resolve through that stored value so switching the active
provider never orphans older shipments.

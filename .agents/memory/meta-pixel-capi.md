---
name: Meta Pixel and CAPI design
description: Decisions behind the Meta Pixel + Conversions API integration, to keep browser and server events consistent
---
Purchase is sent only from the server (event_id `purchase_<orderNumber>`); the browser Pixel Purchase on the card success page reuses that id so Meta dedups. Other events are fired by the browser and relayed to CAPI with the same id.

**Why:** the user may close the tab after paying, and bank transfer orders are confirmed by an admin much later, so only the server can reliably report them.

**How to apply:** new order creation paths must store `tracking_context` (fbp, fbc, ip, user agent) on the order and call the shared purchase sender. Content id defaults to product SKU to match the Meta catalog feed id. Event log is in memory only (resets on restart). `tracking_context` columns are also created at boot, so a missed db:push does not break checkout.

---
name: Analytics revenue scope
description: Why marketplace line totals are not shown beside core order KPIs.
---

Core sales KPIs, time series, payment breakdowns, and exports must use the same `orders`-based net-sales population. Marketplace line totals must not appear in a shared channel comparison until their order identity and cancellation/refund semantics are reconciled with that population.

**Why:** Marketplace data is line-level and uses a different status vocabulary, so combining it with order-level metrics creates totals that look comparable but cannot be reconciled.

**How to apply:** Keep marketplace operational reporting separate. Before adding it to any core revenue view, establish one shared source, lifecycle filter, and gross/net calculation for both channels.
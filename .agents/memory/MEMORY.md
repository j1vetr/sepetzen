# Memory Index

- [Admin vs public queries](admin-vs-public-queries.md) — admin maintenance must use all-products query; sync actions never delete; deletions via separate confirmed endpoint with atomic conditional SQL.

- [Marketplace push outbox](marketplace-push-outbox.md) — push/pull sync direction rules, barcode→contentId identity guard, durable awaited outbox; Trendyol V2-only.

- [DB schema drift & drizzle push](db-schema-drift.md) — 42703 "column does not exist" 500s mean the DB is behind schema.ts; db:push stalls on unique-constraint prompts, add them via SQL and rerun.

- [Payment providers](payment-providers.md) — iyzico + PayTR live-only, keys in site_settings not env, provider toggles, shared finalizer, PayTR OK-ack only on terminal state.

- [Cargo provider contracts](cargo-provider-contracts.md) — carrier endpoints come from vendor SDKs, not doc sites; ShipEntegra `/orders/manual`, Geliver `/transactions` root-level service code.

- [drizzle-zod jsonb types](drizzle-zod-jsonb-types.md) — jsonb `$type` is lost by createInsertSchema; re-declare the field with `.extend()` or insert calls fail typecheck elsewhere.

- [Free shipping threshold](free-shipping-threshold.md) — one admin-editable setting; every badge, cart meter and server shipping calculation must read it, never a local literal.

- [Overlay z-index stack](overlay-z-index-stack.md) — shared sheet/dialog primitives default *below* the sticky header; fix stacking order on the primitive, not with per-page padding.

- [Monochrome rebrand & dark theme](monochrome-rebrand.md) — storefront is full dark monochrome; admin stays light; legacy polen/sepetzen tokens render near-black (invisible on dark) — never use them in storefront.

# Memory Index

- [Marketplace push outbox](marketplace-push-outbox.md) — push/pull sync direction rules, barcode→contentId identity guard, durable awaited outbox; Trendyol V2-only.

- [DB schema drift & drizzle push](db-schema-drift.md) — 42703 "column does not exist" 500s mean the DB is behind schema.ts; db:push stalls on unique-constraint prompts, add them via SQL and rerun.

- [Monochrome rebrand & dark theme](monochrome-rebrand.md) — storefront is full dark monochrome; admin stays light; legacy polen/sepetzen tokens render near-black (invisible on dark) — never use them in storefront.

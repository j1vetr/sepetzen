---
name: DB schema drift & drizzle push prompts
description: Dev/prod Postgres can drift behind shared/schema.ts; how to unstick interactive db:push
---
Both dev and production DBs have drifted behind `shared/schema.ts` before (missing `seo_title`, `content_html`, etc. → categories/menu 500s with code 42703 errorMissingColumn).

**Why:** schema columns were added without running `db:push` everywhere; errors surface as generic "Failed to fetch" 500s.

**How to apply:** on 42703 errors, run `npm run db:push -- --force`. It stops on interactive prompts when adding unique constraints to non-empty tables (no non-interactive flag). Workaround: add the constraint manually via `ALTER TABLE <t> ADD CONSTRAINT <name> UNIQUE (<col>);` then rerun push; loop until "Changes applied". Never choose truncate.

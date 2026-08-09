---
name: drizzle-zod jsonb $type inference
description: Why createInsertSchema breaks type checking on jsonb columns and how to keep npm run check clean
---

`createInsertSchema()` (drizzle-zod) does not carry a jsonb column's `.$type<...>()`
into the zod schema — nested properties infer as `unknown`, and arrays infer as a
structurally-widened array. The resulting `z.infer<>` insert type is then NOT
assignable to what `db.insert(table).values(...)` expects, producing a wall of
"No overload matches this call" errors far from the actual cause.

**Rule:** whenever a table gains a `jsonb(...).$type<T>()` column, re-declare that
field explicitly with `.extend({ ... })` on its insert schema.

**Why:** without it the project fails type checking in files that merely *call*
storage methods, so the error location never points at the schema. Fixing it at
the schema keeps one source of truth and avoids casts scattered across storage.

**How to apply:** mirror the `$type` shape in zod. For fields whose value is
genuinely `any` (e.g. a filter `value`), `z.any()` makes the key optional in the
inferred type and still mismatches — use `z.custom<T>()` for the whole array/object
instead. Keep the runtime validation at least as permissive as before so existing
payloads keep parsing.

Related: conditional query building (`let q = db.select()...` then `q = q.orderBy(...)`)
needs `.$dynamic()` or it fails the same way.

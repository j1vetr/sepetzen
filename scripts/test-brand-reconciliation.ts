import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function main() {
  const comparisonResult = await db.execute(sql`
    WITH brands(name) AS (
      VALUES
        ('Sepetzen'::text),
        ('ACME_Pro'::text),
        ('100% Outdoor'::text)
    ),
    product_brands(brand) AS (
      VALUES
        ('sepetzen'::text),
        ('ACME_Pro'::text),
        ('ACMExPro'::text),
        ('100% outdoor'::text),
        ('100X outdoor'::text)
    )
    SELECT
      p.brand,
      EXISTS (
        SELECT 1
        FROM brands AS b
        WHERE LOWER(p.brand) = LOWER(b.name)
          AND p.brand IS DISTINCT FROM b.name
      ) AS should_update
    FROM product_brands AS p
    ORDER BY p.brand
  `);
  const updatesByBrand = new Map(
    comparisonResult.rows.map((row) => {
      const item = row as { brand: string; should_update: boolean };
      return [item.brand, item.should_update];
    }),
  );

  assert.equal(updatesByBrand.get("sepetzen"), true, "case-only variants should be reconciled");
  assert.equal(updatesByBrand.get("ACME_Pro"), false, "already-standard literal names should stay unchanged");
  assert.equal(updatesByBrand.get("ACMExPro"), false, "_ in a brand name must not act as a wildcard");
  assert.equal(updatesByBrand.get("100% outdoor"), true, "% in a brand name must remain a literal character");
  assert.equal(updatesByBrand.get("100X outdoor"), false, "% in a brand name must not match other text");

  const conflictsResult = await db.execute(sql`
    WITH brands(name) AS (
      VALUES ('Sepetzen'::text), ('sepetzen'::text), ('ACME_Pro'::text)
    )
    SELECT LOWER(name) AS normalized_name
    FROM brands
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  `);
  assert.deepEqual(
    conflictsResult.rows.map((row) => (row as { normalized_name: string }).normalized_name),
    ["sepetzen"],
    "conflicting canonical brand names must block reconciliation",
  );

  console.log("Brand reconciliation SQL checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
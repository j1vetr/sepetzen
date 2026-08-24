-- Sipariş iade ve geri ödeme operasyon merkezi
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS refundable_amount numeric(10, 2) NOT NULL DEFAULT 0;

WITH allocations AS (
  SELECT
    item.id,
    item.order_id,
    ROUND(
      (item.price * item.quantity / NULLIF(order_row.subtotal + order_row.shipping_cost, 0))
      * order_row.total,
      2
    ) AS calculated_amount,
    ROUND(
      (order_row.subtotal / NULLIF(order_row.subtotal + order_row.shipping_cost, 0))
      * order_row.total,
      2
    ) AS merchandise_pool,
    ROW_NUMBER() OVER (PARTITION BY item.order_id ORDER BY item.id DESC) AS reverse_line_number,
    SUM(ROUND(
      (item.price * item.quantity / NULLIF(order_row.subtotal + order_row.shipping_cost, 0))
      * order_row.total,
      2
    )) OVER (PARTITION BY item.order_id) AS allocated_total
  FROM order_items AS item
  JOIN orders AS order_row ON order_row.id = item.order_id
  WHERE order_row.subtotal > 0
)
UPDATE order_items AS item
SET refundable_amount = CASE
  WHEN allocations.reverse_line_number = 1
    THEN allocations.merchandise_pool - (allocations.allocated_total - allocations.calculated_amount)
  ELSE allocations.calculated_amount
END
FROM allocations
WHERE item.id = allocations.id
  AND item.refundable_amount = 0;

CREATE TABLE IF NOT EXISTS return_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id varchar REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by varchar,
  reviewed_at timestamp,
  received_at timestamp,
  refund_amount numeric(10, 2) NOT NULL DEFAULT 0,
  refund_provider text,
  refund_reference text,
  refund_failure_reason text,
  refunded_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_requests_order_id_idx ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS return_requests_status_idx ON return_requests(status);

CREATE TABLE IF NOT EXISTS return_request_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id varchar NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id varchar NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id varchar REFERENCES products(id) ON DELETE SET NULL,
  variant_id varchar REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_details text,
  requested_quantity integer NOT NULL,
  approved_quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  unit_price numeric(10, 2) NOT NULL,
  unit_refund_amount numeric(10, 4) NOT NULL,
  refund_amount numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_request_items_request_id_idx ON return_request_items(return_request_id);
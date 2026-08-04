---
name: Payment provider settings pattern
description: How card payment providers (iyzico, PayTR) are configured and toggled in this store
---

# Payment providers (iyzico + PayTR, both LIVE only)

- Credentials live in the `site_settings` key-value table, not env vars: `iyzico_api_key`/`iyzico_secret_key` (env fallback exists), `paytr_merchant_id`/`paytr_merchant_key`/`paytr_merchant_salt` (DB only, no env fallback).
- Provider on/off toggles: `payment_iyzico_enabled` / `payment_paytr_enabled` ('1'/'0', default enabled). Public flags via GET `/api/payment/methods`; admin manages via `/api/admin/payment-methods` and per-provider credential routes.
- Both callbacks share `finalizePaidPendingPayment()` (order creation, stock, coupons, emails) and claim via `claimPendingPaymentForProcessing` for idempotency.
- PayTR contract: callback must answer plain-text `OK` only once the payment is terminal; answering OK while another handler holds the claim risks losing paid orders (PayTR stops retrying). Amounts are in kuruş (TL ×100). Bildirim URL must be registered in the PayTR merchant panel.
- **Why:** review found the OK-on-claimed-by-other path could strand payments; keep non-OK (409) so PayTR retries.
- **How to apply:** any new payment provider should follow the same pattern: DB-stored keys, enable toggle, shared finalizer, OK/ack only on terminal state.
- Prod note: credentials seeded in dev DB must also be seeded on the prod VPS DB when deploying.

## Havale (bank transfer)
- Bank info + discount now admin-configurable via site_settings keys `bank_transfer_enabled/bank_name/account_holder/iban/discount_rate`; public endpoint `/api/payment/bank-transfer/info`; client falls back to shared/bankInfo defaults.
- Havale coupon math must mirror card flow, including `appliesToShipping` base (subtotal+shipping) — it drifted once and undercharged.

## PayTR iframe links are single-use
- Leaving and re-entering the PayTR tab must fetch a fresh token, otherwise PayTR shows "üzgünüz link kayboldu". Checkout clears the iframe URL on tab exit in a dedicated effect (do not merge with the init effect — early returns there blocked iyzico re-init).

## Google OAuth UX contract
- Callback redirects `/?google_login=success` or `/?google_error=<code>`; GoogleAuthNotice in App.tsx shows Turkish toasts (delayed ~100ms — firing during initial mount is lost by the toast store). Auth cookies sameSite is always lax (strict broke OAuth returns).

---
name: Invoice providers
description: How e-invoice providers (BirFatura, Parasut) are wired and what is unverified
---
Active provider is the `invoice_provider` site setting; `server/invoiceService.ts` dispatches issue/cancel. Credentials live in site_settings (masked in GET, kept on masked save), BirFatura falls back to env secrets.
Orders store `e_invoice_provider` + `e_invoice_external_id` (Parasut sales invoice id) so cancel goes to the provider that issued it.

**Why:** the user wants to switch between BirFatura and Parasut from admin without redeploying.

**How to apply:** new order columns must be added to prod DB via SQL (db:push drift). Parasut flow (contact, sales invoice, e_archive or e_invoice by inbox lookup, trackable job polling, DELETE sales_invoices/:id/cancel) follows the public swagger but was never run against a live account. The e-archive shipment block sends only title and date. Parasut PDF links expire in 1 hour so they are not stored.

---
name: Monochrome rebrand & dark theme
description: Sepetzen palette rules — dark monochrome storefront, allowed accents, legacy token pitfalls
---

# Sepetzen palette

- Storefront is now FULL DARK monochrome (Aug 2026): page bg #0A0A0A, cards #141414 (elevated #1A1A1A), borders white/8–12, text white opacity scale, inputs bg-white/5. High-emphasis CTAs are inverted (bg-white text-black). Destructive is only #F04444; WhatsApp #25D366 is the sole brand-color exception.
- Admin pages (pages/admin, Admin*, WholesaleTab) intentionally remain light — do NOT flip :root shadcn tokens; they'd break admin.
- Legacy tokens `polen-orange`/`polen-cream`/`sepetzen-green` alias to near-black HSL values — on the dark storefront they render invisible. **Why:** the old "accent" was near-black for light backgrounds. **How to apply:** never use these tokens in storefront files; replace with white/opacity classes. They may still be valid in admin.
- Legacy green hexes may live in DB product-description HTML; ProductDetail's neutralizeLegacyColors() now maps them to LIGHT colors (#D4D4D4 body / #FAFAFA emphasis) for the dark background.
- Logo: use /uploads/branding/sepetzen-logo-white.png on dark surfaces (sepetzen-logo-dark.png vanishes).
- Mobile header is sticky/in-flow (h-16), NOT fixed — pages must not add fixed-header padding compensations (pt-20 etc.).

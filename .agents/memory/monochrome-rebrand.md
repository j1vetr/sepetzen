---
name: Monochrome rebrand
description: Sitewide palette rules after the Aug 2026 rebrand to black/white/gray
---

Palette is strictly monochromatic: page bg #000000/#FFFFFF, dark surfaces #080808/#0F0F0F/#1F1F1F, borders #262626 (dark) / #E6E6E6 (light), text #FAFAFA / #0D0D0D, primary button #141414, muted #737373. Only accent color allowed: destructive red #F04444. Fonts: Bebas Neue (display), Space Grotesk (UI), Inter (body).

**Why:** User explicitly replaced the old green palette ("sadece bu renkler olacak").

**How to apply:**
- CSS tokens in `client/src/index.css` are all grayscale now; the legacy `sepetzen-green`/`polen-*` token names still exist but resolve to grayscale — don't reintroduce green values.
- DB product descriptions still contain inline `color:#2D5A27` styles; `neutralizeLegacyColors()` in ProductDetail.tsx remaps them at render time. Any new place rendering raw description HTML must do the same (or the DB rows should be cleaned).
- When mechanically swapping dark greens → dark grays, watch for contrast collapse (white-on-white hovers, active states on dark navs).
- The logo image asset still contains green artwork.

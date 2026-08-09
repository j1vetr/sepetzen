---
name: Storefront overlay z-index stack
description: Layer ordering rule for the dark storefront — sticky header vs mega menu vs Radix sheets/dialogs vs the header's own mobile drawer.
---

Storefront overlays must be ordered so that any modal surface paints above the sticky header, and the header's own navigation drawer stays on top of everything else.

Working order (low → high): sticky site header < mega-menu panel < shared Radix sheet/dialog primitives < header mobile navigation drawer + fullscreen media viewers.

**Why:** the shared shadcn sheet/dialog primitives ship with the library default layer, which is *below* the storefront's sticky header layer. Any drawer opened from a page (filters, panels) then renders with the header drawn over its title and close button, and the backdrop fails to dim the header — it reads as a broken double-header, not as a modal.

**How to apply:** when a drawer, sheet, or dialog looks visually tangled with the top navigation, check the layer values before touching padding, safe-area insets, or transforms — crowding at the top edge is usually a symptom of the stacking order, not spacing. Fix it once on the shared primitive rather than per page, so every sheet in the app inherits the correct order, and re-check that the header's own drawer and fullscreen viewers still sit above it.

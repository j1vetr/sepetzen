---
name: Admin white-screen debugging
description: How to diagnose prod white screens on the self-hosted VPS and the SectionCard icon-prop convention
---

**Rule 1 — verify "stale prod build" claims by hash, not assumption.** The live VPS serves the same Vite asset hashes as a fresh local `npm run build` when it is up to date. Compare `curl -s https://sepetzen.com/ | grep assets/index-` against the local `dist/public/assets` filename before blaming an old deployment.
**Why:** a persistent admin white screen was misattributed to a stale prod build; the hash comparison proved prod was current and the bug was real in the codebase.

**Rule 2 — reproduce admin render crashes with an unauthenticated screenshot.** Auth-gated admin pages render at least one frame before the 401 redirect effect runs, so a headless screenshot of the page without login exercises the same render path and surfaces the full (non-minified) React error in dev workflow logs. No admin session needed.
**Why:** minified React error #130 on prod gave no component name; the unauthenticated dev screenshot exposed "Check the render method of SectionCard" immediately.

**Rule 3 — icon-style props expect a COMPONENT, never a JSX literal.** Section/card primitives in the admin editor render `<Icon className=... />`. Passing `icon={<svg .../>}` (an element) instead of `icon={SomeIcon}` throws "Element type is invalid ... got: <svg />" and whites out the whole page because there is no error boundary.
**How to apply:** when adding sections/cards, pass the component reference; wrap bespoke SVGs in a tiny function component. Until an error boundary exists (proposed as a follow-up task), any single render error blanks the entire admin page.

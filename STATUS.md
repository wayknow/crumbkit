# CrumbKit — Project Status

> Last updated: 2026-07-30

---

## Current State: Published ✅

**v1.0.0 published 2026-07-20. v1.0.1 published 2026-07-29.**
[CWS Listing](https://chromewebstore.google.com/detail/crumbkit/ggnfjnagciaomejccfjceniohpdkcbjl)

### v1.0.1 (2026-07-29) — Design System Alignment

- **Design system** added to CLAUDE.md — visual specs, component specs, animation, accessibility
- **UI audit** against design system completed and all issues fixed:
  - P0: `:focus-visible` outlines on all interactive elements, popup width 480→400px
  - P1: Dark theme colors (`#0F0F0F`/`#1A1A1A`/`#242424`), 4px spacing base, border-radius tokens, primary `#3B82F6`, inline styles → `hidden` attr
  - P2: Font stack `system-ui`, `prefers-color-scheme` & `prefers-reduced-motion` media queries
- **Cross-promotion** added to options page (ClearJSON + SnapMark referral links)
- **`tabs` permission** removed from manifest (proactive fix from CookieClear feedback)

**This is a fresh project** — new name ("CrumbKit"), new extension ID, no CWS history.
The codebase is derived from CookieClear but has been fully rebranded.

The previous project (CookieClear) was blocked by CWS under the Spam/Store Ranking policy
for keyword spam — a competitor name appeared in the store listing and marquee promo tile.
The appeal on the old item is still pending, but this new project starts clean.

**Key difference from CookieClear:**
- Name: "CrumbKit" — "crumb" hints at browser cookies, "kit" = developer toolkit
- All branding, URLs, storage keys, and export headers use CrumbKit
- No competitor names, no "replacement" wording — positioned purely on its own merits
- Clean CWS submission from day one

### What's New (2026-07-17)

- **GitHub repo live:** [github.com/wayknow/crumbkit](https://github.com/wayknow/crumbkit)
- **CWS submission submitted** with rewritten store listing emphasizing purpose and value proposition
- **Permission justifications** documented for all 4 permissions + host_permissions
- **Data usage declaration** completed for privacy tab

### What's New (2026-07-29)

- **Design system alignment:** all UI updated to match design token spec (colors, spacing, radii, shadows)
- **Accessibility:** focus-visible outlines on all interactive elements, prefers-reduced-motion support
- **Cross-promotion:** ClearJSON + SnapMark links in both popup footer and options page

### What's Built

| Module | Status | Notes |
|--------|:------:|-------|
| Manifest V3 | ✅ | 3 permissions (cookies, storage, activeTab), popup + options + service worker |
| Cookie CRUD | ✅ | View, add, edit, delete individual and bulk |
| Import | ✅ | JSON and Netscape format parsing |
| Export | ✅ | JSON, Netscape (curl/wget), cURL command |
| Cookie Classification | ✅ | 6 categories, name pattern + domain matching |
| Privacy Score | ✅ | 0-100 with color gauge, tracker breakdown |
| Domain Whitelist | ✅ | Preserve cookies from trusted domains on bulk delete |
| Undo | ✅ | 50-action stack, Ctrl+Z, delete/add/edit reversal |
| Dark/Light Mode | ✅ | System preference detection + manual toggle |
| Search/Filter | ✅ | Real-time client-side filtering |
| Settings Page | ✅ | Theme selector, whitelist management |
| Tracking Database | ✅ | 101 tracking domains from Disconnect.me (bundled, offline) |
| Icons | ✅ | 16/48/128px |
| Store Assets | ✅ | 3 promo tiles + 3 screenshots, all CrumbKit-branded |

### Test Coverage

```
76 tests, 0 failures (8.2s)
  50 unit tests: export, import, undo, classify, privacy scoring
  26 e2e tests:  extension loading, popup rendering, options page,
                  manifest validation, resource accessibility, CDP cookies
```

Run: `npm test`

---

## Before CWS Submission

- [x] Full rebrand from CookieClear → CrumbKit
- [x] Store listing copy clean (no competitor names, no "replacement" wording)
- [x] Promo tiles regenerated with CrumbKit branding
- [x] Screenshots regenerated
- [x] `crumbkit-v1.0.0.zip` packaged
- [x] All 76 tests passing
- [x] Create GitHub repo `wayknow/crumbkit` and push
- [x] Create website page `wayknow.tech/crumbkit.html`
- [x] Submit to CWS as new item

---

## CWS Submission Record

| Field | Detail |
|-------|--------|
| **Date submitted** | 2026-07-17 |
| **Version** | 1.0.0 |
| **Store listing** | `docs/store-listing.md` — rewritten to emphasize purpose & value prop |
| **Single purpose** | View, edit, import, and export browser cookies with privacy scoring and classification — all local, zero network requests |
| **Permissions** | `cookies`, `storage`, `activeTab` + `<all_urls>` — all justified（2026-07-20: `tabs` 已移除，等审核结果再上传更新包）|
| **Data usage** | No collection, no transmission, no third-party sharing |
| **Status** | ✅ Published 2026-07-20（https://chromewebstore.google.com/detail/crumbkit/ggnfjnagciaomejccfjceniohpdkcbjl）|

### v1.0.1 Update

| Field | Detail |
|-------|--------|
| **Date submitted** | 2026-07-29 |
| **Version** | 1.0.1 |
| **Changes** | Design system alignment (colors, spacing, radii, focus-visible, prefers-color-scheme), cross-promo in options, inline styles removed, `tabs` permission removed |
| **Permissions** | `cookies`, `storage`, `activeTab` + `<all_urls>` |
| **Status** | ✅ Published 2026-07-29 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-17 | **CWS first submission** | Submitted with rewritten store listing, all permissions justified, data usage declared. |
| 2026-07-17 | **Create CrumbKit as a new project** | CookieClear CWS item is blocked with appeal pending. New brand, new item ID, clean submission. Codebase is proven (76 tests passing, all features working). |
| 2026-07-06 | **Free only, no Pro tier** | Market research: no validated paid demand in cookie editor category. Role is acquisition for ClearJSON/SnapMark. |
| 2026-07-06 | **Vanilla JS, no framework** | Extension size < 85KB achieved. No build step needed. |
| 2026-07-06 | **MIT License** | Trust foundation — open source code is auditable by anyone. |
| 2026-07-06 | **Bundled tracking list** | Offline classification. Zero network requests — verifiable by anyone. |
| 2026-07-20 | **Proactively remove `tabs` permission** | CookieClear appeal response flagged unused `tabs` permission. Applied same fix to CrumbKit preemptively — `activeTab` already covers the single `chrome.tabs.query` call. Updated .zip ready if needed.|
| 2026-07-20 | **Published on CWS!** | v1.0.0 approved and published same day. [CWS link](https://chromewebstore.google.com/detail/crumbkit/ggnfjnagciaomejccfjceniohpdkcbjl). CookieClear → CrumbKit rebrand complete. |
| 2026-07-29 | **Design system added to CLAUDE.md** | Comprehensive visual spec (colors, spacing, radii, animation, accessibility, component specs). All future UI work must follow this system. |
| 2026-07-29 | **UI audited and aligned to design system** | Full audit found 13 issues across P0/P1/P2. All fixed: focus-visible outlines, 4px spacing base, dark theme colors, border-radius tokens, system-ui font stack, prefers-color-scheme/reduced-motion. |
| 2026-07-30 | **v1.0.1 approved on CWS** | Review passed. Design system alignment, accessibility fixes, and cross-promo now live. |
| 2026-07-29 | **Stayed free (rejected paid pivot)** | Evaluated 30-day trial + $5 lifetime model vs competitors (CookieJar $4.99/mo, Cookie Editor $3/mo). Decided to keep free — cookie editor market has no validated paid demand, and CrumbKit's role is acquisition for ClearJSON/SnapMark. |

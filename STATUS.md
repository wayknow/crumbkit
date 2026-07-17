# CrumbKit — Project Status

> Last updated: 2026-07-17

---

## Current State: CWS Review Pending ⏳

**v1.0.0 submitted to Chrome Web Store on 2026-07-17.** Awaiting review.

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

### What's Built

| Module | Status | Notes |
|--------|:------:|-------|
| Manifest V3 | ✅ | 4 permissions, popup + options + service worker |
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
- [ ] Create website page `wayknow.tech/crumbkit.html`
- [x] Submit to CWS as new item

---

## CWS Submission Record

| Field | Detail |
|-------|--------|
| **Date submitted** | 2026-07-17 |
| **Version** | 1.0.0 |
| **Store listing** | `docs/store-listing.md` — rewritten to emphasize purpose & value prop |
| **Single purpose** | View, edit, import, and export browser cookies with privacy scoring and classification — all local, zero network requests |
| **Permissions** | `cookies`, `storage`, `activeTab`, `tabs` + `<all_urls>` — all justified |
| **Data usage** | No collection, no transmission, no third-party sharing |
| **Status** | Awaiting review ⏳ |

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

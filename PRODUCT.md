# CrumbKit — Product Specification

> A privacy-first browser cookie editor. Open source, zero tracking, no ads.
>
> Safe, modern, and completely free — built for Manifest V3.

> **Note (2026-07-07):** CWS rejected first submission for keyword spam (competitor names in metadata).
> All competitor references have been removed from store listing, README, and website.
> This document retains competitive research for internal reference only.

---

## Product Name

**CrumbKit** — "Clear" stands for transparency (no tracking) and clarity (clear cookie management).

Shares the "Clear" brand prefix with ClearJSON, forming a recognizable product family.

---

## Market Context

### What Happened

In July 2024, **EditThisCookie** — 3M+ users, 11,000+ reviews — was removed from the Chrome Web Store for failing to migrate from Manifest V2 to V3. The developer had abandoned it (last GitHub update 2020).

A malicious copycat called "EditThisCookie®" filled the vacuum, tricking 50,000+ users into installing an extension with obfuscated code that steals Facebook credentials and injects ad scripts.

### Competitive Landscape

| Alternative | Type | Model | Issues |
|-------------|------|-------|--------|
| EditThisCookie (fork) | Open-source fork | Free | Single maintainer, uncertain sustainability |
| Cookie-Editor (Moustachauve) | Open source | Free | 2M users, last updated Feb 2024 — unmaintained |
| Cookie Editor (cookieeditor.org) | Commercial | $3/mo Standard | Intrusive ads in free tier, broken export/import |
| CookieJar | Commercial | $4.99/mo sub | Subscription, Pro paywalls |
| Awesome Cookie Manager | Free | Free | Still MV2, risk of removal, buggy |

**Position: No one is making a privacy-committed, open-source, free cookie editor that just works.**

---

## Product Positioning

> "The cookie manager you can trust. Classic experience, zero tracking, always free."

Three pillars:

1. **Familiar** — Classic EditThisCookie interaction pattern, no learning curve
2. **Trustworthy** — MIT open source, auditable code, zero network requests
3. **Modern** — MV3 native, dark mode, privacy scoring, cookie classification

### vs Competitors

| | EditThisCookie | CookieJar | Cookie-Editor | **CrumbKit** |
|---|:--:|:--:|:--:|:--:|
| MV3 compatible | ❌ Removed | ✅ | ✅ | ✅ |
| Open source | ✅ Original | ❌ | ✅ | ✅ MIT |
| Business model | Free | $4.99/mo sub | Free (with ads) | **Free** |
| Privacy score | ❌ | ✅ | ❌ | ✅ |
| Zero network requests | ✅ | ✅ | ✅ | ✅ |
| Cookie classification | ❌ | ✅ Pro | ❌ | ✅ |
| Dark mode | ❌ | ✅ | ✅ | ✅ |
| Domain whitelist | ❌ | ❌ | ❌ | ✅ |
| Undo support | ❌ | ❌ | ❌ | ✅ |
| Reliable import/export | ❌ | ✅ | ❌ Broken | ✅ |

---

## Target Users

| User | Use Case |
|------|----------|
| Web developers | Debug sessions by switching cookie values, testing auth states |
| QA testers | Import/export test cookie sets |
| Backend developers | Inspect Set-Cookie response headers |
| Security researchers | Audit site cookie configurations, tracker counts |

---

## Features

### Current (v1.1.0)

```
✅ View all cookies for the current site (name, value, domain, path, expiry)
✅ Compact table view with column headers
✅ Create / edit / delete individual cookies
✅ Multi-select with batch delete
✅ Batch delete all cookies (respects domain whitelist)
✅ One-click copy cookie value to clipboard
✅ Real-time search and filter
✅ Export to JSON, Netscape (curl/wget), and cURL formats
✅ Import from JSON and Netscape formats
✅ Cookie Profiles — save and restore cookie sets
✅ Cookie auto-classification (Essential / Functional / Analytics / Advertising / Social)
✅ Privacy score (0-100) with color-coded gauge
✅ Domain whitelist (preserve important cookies on bulk delete)
✅ Undo support (Ctrl+Z, up to 50 actions)
✅ Dark / light mode
✅ Side panel support
✅ Zero network requests, fully local processing
✅ MIT open source
```

### Future (user-feedback driven)

```
☐ "Suggest a Feature" button to collect real user demand
☐ Scheduled auto-cleanup rules
☐ CSV / Puppeteer script export
☐ Set-Cookie request interceptor
☐ Bulk edit operations
```

### Won't Do

- ❌ No data collection
- ❌ No cookie uploads to any server
- ❌ No account registration
- ❌ No ads
- ❌ No tracking
- ❌ No closed-source pivot

---

## Technical Architecture

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Vanilla JS (ES2020+) | Extension size < 85KB |
| Cookie API | `chrome.cookies` | Native API, stable since 2016 |
| Storage | `chrome.storage.local` | Settings, whitelist, preferences |
| Tracking list | Disconnect.me (bundled) | Offline classification, no network |
| License | MIT | Trust foundation |

### Project Structure

```
crumbkit/
├── manifest.json
├── src/
│   ├── popup/            # Extension popup (cookie list + operations)
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/          # Settings page (whitelist, theme)
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── utils/
│   │   ├── cookies.js    # chrome.cookies CRUD wrapper
│   │   ├── export.js     # JSON / Netscape / cURL export
│   │   ├── import.js     # JSON / Netscape import
│   │   ├── classify.js   # Cookie classification engine
│   │   ├── undo.js       # Undo/redo stack
│   │   └── storage.js    # chrome.storage.local wrapper
│   └── background/
│       └── service-worker.js
├── data/
│   └── tracking-domains.json  # 101 tracking domains
├── test/
│   └── test.mjs          # 76-test suite (unit + e2e)
├── icons/
├── PRODUCT.md
├── STATUS.md
├── README.md
└── LICENSE
```

### Core Data Flow

```
User clicks extension icon → Popup opens
  → chrome.tabs.query() gets current tab URL
  → chrome.cookies.getAll({ url }) gets cookies
  → classify.js categorizes each cookie
  → Privacy score calculated
  → List rendered with search filter

User actions:
  Search → client-side filter
  Add    → chrome.cookies.set() → refresh
  Edit   → chrome.cookies.set() → refresh
  Delete → chrome.cookies.remove() → undo.push() → refresh
  Bulk   → iterate + skip whitelist → refresh
  Export → export.js formats → file download
  Import → import.js parses → chrome.cookies.set() per cookie
  Undo   → undo.pop() → reverse operation → refresh
```

---

## Pricing

CrumbKit is **completely free**. No Pro tier, no subscription, no ads.

It serves as a **free acquisition channel** for the Clear product family (ClearJSON, SnapMark). The strategy is:

- CrumbKit → top of funnel (free, mass appeal)
- ClearJSON → monetization ($29-39 lifetime)
- SnapMark → monetization ($39 lifetime)

Cross-promotion between products drives conversions to paid tools.

### Rationale

The cookie editor market has no validated paid demand. EditThisCookie had 3M free users for a decade. Cookie-Editor has 2M free users. The competitors that charge (CookieJar, Cookie Editor) have unknown conversion rates and no public revenue data. Making CrumbKit free is the safe, strategic choice: it maximizes user acquisition for cross-promotion.

---

## Product Family

| | SnapMark | ClearJSON | **CrumbKit** |
|---|:--:|:--:|:--:|
| Category | Screenshot + annotation | JSON viewer | Cookie editor |
| Positioning | Privacy screenshot tool | Trustworthy JSON tool | Trustworthy cookie tool |
| Story | Competitors have fatal flaws | Market leader betrayed 2M users | Market leader removed, copycat scammed 50K |
| Pricing | $39 lifetime | $29-39 lifetime | **Free** |
| Role | Revenue | Revenue | **Acquisition** |

---

## Promotion Strategy

> ⚠️ CWS does not allow competitor names in store listing metadata (title, description, keywords).
> Promotion using competitor names must happen off-store: Reddit, HN, social media, blog posts.

### Off-Store Channels
- Reddit/HN posts about cookie editor safety and privacy
- Blog posts comparing cookie editor features
- Reply in relevant GitHub issues and forums

### Search Keywords (CWS-approved)
| Keyword | Intent |
|---------|--------|
| "cookie editor Chrome" | General discovery |
| "manifest v3 cookie editor" | MV3-aware users |
| "open source cookie editor" | Open source seekers |
| "free cookie editor" | Price-sensitive users |
| "cookie privacy score" | Privacy-conscious users |

### Cross-promotion
CrumbKit promotes ClearJSON and SnapMark within the extension. Three products cover three high-frequency developer needs, cross-promoting each other.

---

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Users accustomed to free alternatives | Low | CrumbKit IS free, with features competitors charge for |
| Chrome improves native cookie management | Low | Chrome hasn't changed its cookie UI in 10 years |
| chrome.cookies API changes | Very low | API unchanged since 2016 |
| Competition intensifies | Medium | Open source + privacy + free + feature-rich = defensible |

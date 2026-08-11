# Chrome Web Store Listing — CrumbKit

## Store Listing Metadata

| Field | Value |
|-------|-------|
| **Category** | Developer Tools |
| **Language** | English (United States) |
| **Pricing** | Free |

---

## Title (max 75 chars)

CrumbKit — Privacy-first cookie editor. Open source, zero tracking.

---

## Short Description (max 132 chars)

Free, open-source cookie editor. View, edit, import & export cookies. Privacy score, dark mode, zero tracking.

---

## Detailed Description

> ⚠️ This is the exact text used in the CWS dashboard (v1.2.0). Copy verbatim — do not reword.

```
CrumbKit puts you back in control of your browser cookies. Whether you're debugging a login flow, inspecting what trackers a site drops on you, or exporting cookies to share across tools — CrumbKit gives you the full picture and the tools to act on it.


🎯 WHAT YOU CAN DO WITH CRUMBKIT

Debug authentication & sessions
Stuck on a login bug? View and edit session tokens, switch auth states, and test different user scenarios — all in seconds.

Audit privacy & tracking
Every site you visit leaves crumbs. CrumbKit classifies every cookie into five categories — Essential, Functional, Analytics, Advertising, Social — and gives the site a privacy score from 0 to 100. You'll know instantly if a site is harmless or watching your every move.

Export & import cookie sets
Share cookies between browsers, save test fixtures, or pipe them into curl and wget. Export in six formats — including JSON, Netscape, and cURL — and import from JSON or Netscape with one click.

Clean up with confidence
Bulk-delete cookies but keep the ones you actually need. Set up a domain whitelist so login cookies for your bank, email, and tools survive cleanup. Or bulk-edit domain, path, Secure, HttpOnly, and SameSite across selected cookies in one go. Set up scheduled auto-cleanup rules to purge tracking cookies by domain, category, or age — on an hourly, daily, or weekly schedule. Every delete is undoable (Ctrl+Z, up to 50 actions).

Monitor & add cookies in real-time
The Set-Cookie interceptor watches network responses and shows you every cookie a site tries to set — letting you inspect and add them with one click. No more guessing what's happening under the hood.

CHIPS partitioned cookies, fully supported
Chrome is phasing out third-party cookies in favor of partitioned cookies (CHIPS). CrumbKit shows partitioned cookies with a clear badge, preserves their partition data across every export format, and restores them correctly on import.

Search, edit, create — fast
Real-time search across all cookies on the current tab. Compact table view shows name, value, and domain at a glance. Create or edit cookies right from the popup. No page reloads, no digging through Chrome settings.


✅ WHY INSTALL CRUMBKIT (AND NOT SOMETHING ELSE)

🔒 Actually private. Verifiably.
CrumbKit makes zero network requests — period. Open Chrome DevTools and see for yourself. No analytics, no telemetry, no "error reporting," no phoning home. The most popular cookie editor was pulled from the store; its replacement was caught stealing credentials. With CrumbKit, the code is MIT open source — you don't have to trust us, you can read every line.

💰 Completely free. No catch.
No Pro tier, no subscription, no ads, no "premium features" locked behind a paywall. Everything is free, forever. We make other developer tools — CrumbKit is our gift to the community.

⚡ Fast, clean, modern.
Built from scratch for Manifest V3. Vanilla JavaScript — no bloated frameworks. Dark mode and light mode, system-aware. Under 85KB total.

🛡️ Privacy scoring built in.
CrumbKit doesn't just show you cookies — it tells you what they're doing. Powered by an offline classification engine with 101 known tracking domains. Color-coded scores make it obvious which sites respect your privacy and which don't.

🧠 Undo & whitelist — because mistakes happen.
Deleted the wrong cookie? Ctrl+Z. Accidentally wiped all cookies? Not if they were on your whitelist. These aren't luxury features — they're the safety net every cookie tool should have but none do.

💾 Cookie Profiles — save & restore
Testing different environments? Save your current cookies as a named profile, then restore them with one click. Perfect for developers who constantly switch between dev, staging, and production sessions.


👥 BUILT FOR

• Web developers — Debug sessions, switch auth states, test cookie behavior
• QA engineers — Import/export test cookie sets, reproduce bugs across environments
• Backend developers — Inspect Set-Cookie headers, verify cookie attributes
• Security researchers — Audit tracker counts, analyze cookie configurations
• Privacy-conscious users — See who's tracking you, clean up with a click


🏷️ AT A GLANCE

✅ View, create, edit, delete cookies
✅ Compact table view with column headers
✅ Multi-select with batch delete + bulk edit
✅ Batch delete with domain whitelist
✅ One-click copy cookie value
✅ Export: 6 formats — JSON, Netscape, cURL and more
✅ Import: JSON, Netscape
✅ Cookie classification (5 categories)
✅ Privacy score 0–100 per site
✅ Cookie profiles — save & restore sets
✅ Scheduled auto-cleanup rules
✅ Set-Cookie request interceptor
✅ CHIPS partitioned cookie support
✅ Side panel support
✅ Undo (Ctrl+Z, up to 50 actions)
✅ Dark/light mode
✅ Zero network requests
✅ MIT open source — github.com/wayknow/crumbkit
✅ Under 85KB, no frameworks, no bloat
```

---

## Release Notes (v1.2.0)

> ⚠️ No format enumeration — keyword spam risk. Copy verbatim.

```
• Added Set-Cookie HTTP header export — now supporting 6 export formats in total
• CHIPS partitioned cookie support — view, export, and import partitioned cookies
• Set-Cookie interceptor: monitor response headers in real time, add cookies with one click
• Scheduled auto-cleanup rules — purge cookies by domain, category, or age
• Bulk edit: change attributes across selected cookies at once
• Suggest a Feature link in options page
```

---

## Promotional Tile Text

### Small Tile (440×280)

CrumbKit
Free, open-source cookie editor
Zero tracking · Privacy score · Dark mode

### Large Tile (920×680)

CrumbKit
The privacy-first cookie editor for Chrome
Free · Open source · Zero tracking · MV3 native

### Marquee (1400×560)

CrumbKit — Privacy-first cookie editor
Free · Open source · Zero tracking · MV3 native

---

## SEO Keywords (comma-separated)

cookie editor, cookie manager, cookie export, cookie import, privacy score, developer tools

---

## Promotional Tiles

| Tile | File | Size |
|------|------|------|
| Small | `promo/small-tile.png` | 440×280 |
| Large | `promo/large-tile.png` | 920×680 |
| Marquee | `promo/marquee-tile.png` | 1400×560 |

---

## Screenshots

| # | File | Description |
|---|------|-------------|
| 1 | `screenshots/01-popup-list.png` | Popup UI showing cookie list, privacy score, and classification |
| 2 | `screenshots/02-edit-export.png` | Cookie edit form and export format dropdown |
| 3 | `screenshots/03-options-whitelist.png` | Settings page with domain whitelist management |

> All screenshots are 1280×800 as required by CWS.

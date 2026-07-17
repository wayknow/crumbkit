# CrumbKit

> A privacy-first cookie editor for Chrome. Open source, zero tracking, no ads.

CrumbKit is a Manifest V3 Chrome extension that lets you view, edit, import, export, and manage browser cookies. All processing happens locally on your device — zero network requests, zero tracking.

## Why CrumbKit

- **Reliable import/export** — JSON, Netscape, and cURL formats with robust parsing
- **Zero tracking** — no analytics, no telemetry, no external requests. All data stays on your device.
- **No ads** — clean, distraction-free interface
- **MIT licensed** — fully open source, auditable code
- **Fast UI** — no animations, no bloat, modern MV3 architecture

## Features

- View all cookies for the current site with name, value, domain, path, expiry
- Create, edit, and delete individual cookies
- Search and filter cookies in real-time
- Batch delete all cookies (with domain whitelist protection)
- Export to JSON, Netscape (curl/wget), and cURL formats
- Import from JSON and Netscape formats
- Undo support for accidental deletions
- Privacy score for every site you visit
- Dark/light mode toggle
- Domain whitelist to protect important cookies

## Installation (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/wayknow/crumbkit.git
   cd crumbkit
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the `crumbkit` folder

5. Pin CrumbKit to your toolbar for quick access

## Usage

1. Navigate to any website
2. Click the CrumbKit icon in your toolbar
3. View, edit, or delete cookies for that site
4. Use the export dropdown to save cookies in your preferred format
5. Import cookies from a file to restore sessions or transfer between environments

## Tech Stack

- Vanilla JavaScript (ES2020+)
- Chrome Extensions Manifest V3
- `chrome.cookies` API
- `chrome.storage.local` for settings and whitelist
- Zero dependencies, zero build tools

## Project Structure

```
crumbkit/
├── manifest.json                 # MV3 manifest
├── src/
│   ├── popup/                    # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/                  # Settings page
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── utils/                    # Core modules
│   │   ├── cookies.js            # chrome.cookies wrapper
│   │   ├── export.js             # JSON / Netscape / cURL export
│   │   ├── import.js             # JSON / Netscape import
│   │   ├── classify.js           # Cookie classification & privacy score
│   │   ├── undo.js               # Undo/redo stack
│   │   └── storage.js            # chrome.storage.local wrapper
│   └── background/
│       └── service-worker.js
├── data/
│   └── tracking-domains.json     # Disconnect.me tracker list
├── icons/
└── LICENSE
```

## Privacy

CrumbKit never:
- Collects any data
- Makes any network requests
- Uses any analytics or telemetry
- Injects any ads or tracking
- Shares your cookies with anyone

All processing happens locally on your device. You can verify this by inspecting the source code or monitoring the Network tab in Chrome DevTools while using the extension.

## License

MIT — see [LICENSE](LICENSE)

## Related Projects

- [ClearJSON](https://github.com/wayknow/clearjson) — A trustworthy JSON viewer
- [SnapMark](https://github.com/wayknow/snapmark) — Privacy-first screenshot & annotation tool

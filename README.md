# Simple Job Apply Extension

React + Vite MV3 extension that analyzes job postings, highlights your keywords, and builds a cover letter from saved paragraphs.

## Features
- Sidebar UI (Chrome Side Panel + Firefox Sidebar)
- Paragraph groups with drag-and-drop reordering
- Per-paragraph sidebar toggles: no line break, auto-include, included
- Keyword chips with add/remove and match highlighting
- Job posting editor: paste or fetch from current page; single font
- Cover letter editor: concatenated paragraphs with respect to flags
- Save/Load state as JSON; auto-persist to extension storage

## Develop

See below for special Firefox build instructions.

Install and build:

```sh
npm install
npm run build
```

The build output is in `dist/`, and all extension files from `public/` are copied there.

## Load in Chrome
1. Open `chrome://extensions`.
2. Enable “Developer mode”.
3. Click “Load unpacked” and select the `dist/` folder.
4. Pin the extension; click the toolbar icon to open the Side Panel.

## Load in Firefox (Developer Edition recommended)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click “Load Temporary Add-on…”.
3. Select any file inside `dist/` (e.g., `manifest.json`).
4. Click the toolbar icon to toggle the sidebar.

## How to use
- Add paragraph groups and enter text in the rich text area.
- Add keywords on the paragraph chip bar (click outside chips to add).
- Paste a job posting or click “Analyze current page”.
- Click “Analyze” to highlight keywords and auto-mark paragraphs as Included.
- Click “Update Cover Letter” (or “Regenerate” in the Cover Letter panel) to rebuild the output.
- Save/Load state with JSON buttons in the top bar.

## Notes
- Colors are unique per paragraph so you can track matches clearly.
- Job posting editor uses a single font/size by design; it renders highlights after analysis.
- Data is auto-saved to `chrome.storage.local` (or `localStorage` in dev) and can be exported/imported as JSON.

## Firefox build, temporary load, and signing

### System requirements
- macOS (10.15+ recommended) (Windows / Linux should also work, but I didn't test it)
- Node.js (LTS 18+ or 20+)
- npm (bundled with Node) or pnpm/yarn
- web-ext CLI (Mozilla tooling)
- Git

### Recommended tools
- VS Code
- web-ext (npm i -g web-ext)
- zip (macOS has it preinstalled)
- Firefox Add-ons Developer account (for signing)

Install tools
```sh
brew install --cask firefox-developer-edition
brew install node
npm install -g web-ext
```

In VS Code, simply run
```sh
Dev: Firefox Extension (Watch)
```

Or to build a Firefox artifact (zip/xpi) and overwrite any previous artifact:
```sh
npm install
npm run build:firefox
```

This produces an artifact in `web-ext-artifacts/` (e.g. `simple_job_apply-0.1.0.xpi`)

Temporary install in Firefox (dev/test):
1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…**.
3. Select the `dist/manifest.json` file or the `.zip`/`.xpi` artifact.

### Signing (required for AMO publishing)
- To sign via Mozilla (programmatic): set the following environment variables with your AMO API credentials (from your Developer Hub account):
	- `AMO_JWT_ISSUER` (API key / issuer)
	- `AMO_JWT_SECRET` (API secret)
- Then run the sign script which calls `web-ext sign` and places signed artifacts in `web-ext-artifacts/`:

```sh
# set env vars (example, do not hardcode in scripts)
export AMO_JWT_ISSUER=your_issuer_here
export AMO_JWT_SECRET=your_secret_here

npm run sign:firefox
```

Note: `web-ext sign` requires a Mozilla Add-ons developer account and valid API credentials. The signed XPI returned from AMO can be distributed or uploaded to addons.mozilla.org.

### Create packaged .zip of source code with
```sh
npm run package_src
```
adds a zip file to web-ext-articats/source_code/

## CC Attribution Icon
Creator: IconMarket  
License: https://creativecommons.org/licenses/by/4.0/  
Icon: https://icon-icons.com/icon/profession-professions-job-suit-businessman-jobs/255749  
Icon pack: https://icon-icons.com/pack/Avatar/4019  

## Chrome packaging (.crx)

This project includes a convenience script to build and package a signed Chrome CRX artifact.

- Run:

```sh
npm run build:chrome
```

- What it does:
	- regenerates icons from `src/icons/icon.ico` into `public/icons/`;
	- runs `vite build` to produce `dist/`;
	- attempts to use `crx3` (via `npx crx3`) to produce a .crx using your `dist.pem` key; if `crx3` is not available it falls back to Chrome/Chromium's `--pack-extension` CLI.

- Requirements:
	- A private key file at the repository root named `dist.pem` (this repo already contains one). The key is used to sign the CRX.
	- A local Chrome or Chromium binary (script will auto-detect common install paths). If Chrome is not detected, set the environment variable `CHROME_PATH` to the browser binary and re-run the command:

```sh
CHROME_PATH="/path/to/chrome" npm run build:chrome
```

- Output:
	- The generated CRX will be placed in `chrome-artifacts/simple_job_apply-<version>.crx`.

If you prefer not to rely on a local Chrome binary, `crx3` (installed via `npm install --save-dev crx3`) is used when available to produce the CRX without invoking Chrome directly.

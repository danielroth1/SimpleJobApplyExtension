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

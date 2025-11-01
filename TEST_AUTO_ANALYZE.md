# Testing Guide

## Quick Start

1. **Launch Firefox with debugger:**
   - Press F5 or select "Launch Firefox (web-ext)" from Run and Debug
   - This automatically:
     - Starts Vite in watch mode with Firefox manifest
     - Launches Firefox with the extension loaded
     - Keeps your profile changes between runs

2. **Open the sidebar:**
   - Click the extension icon in Firefox toolbar
   - The sidebar should open on the left side
   - If you see a new tab instead, check the console logs

3. **Test drag-and-drop:**
   - Add some paragraphs with keywords
   - Click and drag the ⠿ handle
   - Items should smoothly reorder with dnd-kit animations

## Testing Auto-Analyze on URL Change

### Setup
1. Make sure "Auto-analyze pages" is checked in settings (⚙)
2. Navigate to LinkedIn: https://www.linkedin.com/jobs/

### What should happen
1. Navigate to a job posting
2. After ~1 second, the content script detects the URL change
3. Background script checks your settings
4. If auto-analyze is enabled and it's a LinkedIn URL, sends message to sidebar
5. Sidebar receives message and automatically analyzes the page
6. Keywords get highlighted on the LinkedIn page
7. Job posting appears in the "Job Posting" tab

### Debugging the message flow

**Content Script Console** (F12 on LinkedIn page):
```
[ContentScript] URL changed to: https://www.linkedin.com/jobs/view/...
```

**Background Script Console** (about:debugging → This Firefox → Inspect):
```
[Background-FF] Initializing...
[Background-FF] Message listener registered
[Background-FF] Received message: {type: 'URL_CHANGED', url: '...'} from https://...
[Background-FF] URL_CHANGED detected: https://www.linkedin.com/jobs/view/...
[Background-FF] autoAnalyze setting: true
[Background-FF] Sending AUTO_ANALYZE_CURRENT_PAGE
[Background-FF] Message sent successfully
```

**Sidebar Console** (Right-click in sidebar → Inspect Element):
```
[AppStateContext] Message listener registered
[AppStateContext] Received message: {type: 'AUTO_ANALYZE_CURRENT_PAGE', url: '...'}
[AppStateContext] AUTO_ANALYZE_CURRENT_PAGE received. autoAnalyze: true url: https://...
[AppStateContext] Triggering analyzeCurrentPage
```

### Common Issues

**Sidebar opens in new tab instead:**
- Firefox MV2 uses `sidebar_action` (should work now with manifest-firefox.json)
- Check Firefox version - older versions may not support sidebar API

**No console logs in background:**
- Go to `about:debugging` → This Firefox
- Find "Simple Job Apply" and click "Inspect"
- Background script console opens

**Content script not injected:**
- Check if content script appears in Debugger tab
- Try refreshing the LinkedIn page
- Check console for errors

**Messages not reaching sidebar:**
- Make sure sidebar is open when navigating
- Check if sidebar console shows the listener being registered
- Verify storage has autoAnalyze: true via `browser.storage.local.get('appState')`

**Breakpoints not working:**
- Source maps are enabled in vite.config.ts
- Firefox profile keeps debugging settings
- Try setting breakpoint in Sources/Debugger panel after page loads

### Manual Testing

Test the flow manually from the sidebar console:
```javascript
// Check storage
browser.storage.local.get('appState').then(console.log)

// Manually trigger analyze
// (in sidebar console)
chrome.runtime.sendMessage({type: 'AUTO_ANALYZE_CURRENT_PAGE', url: window.location.href})
```

Test from background console:
```javascript
// Send test message
browser.runtime.sendMessage({type: 'AUTO_ANALYZE_CURRENT_PAGE', url: 'https://www.linkedin.com/jobs/test'})
```

## Development Workflow

1. Make code changes in `src/`
2. Vite automatically rebuilds to `dist/` (watch mode from preLaunchTask)
3. web-ext detects changes and reloads the extension in Firefox
4. No manual restart needed! 🎉

**If hot reload doesn't work:**
- Check that Vite watch task is running (see Terminal panel)
- Verify dist/ files are updating (check timestamps)
- Try clicking "Reload" button in about:debugging

## Browser Differences

**Firefox (MV2):**
- Uses `manifest-firefox.json` (copied during build)
- Uses `browser` API (with promises)
- Background script is a persistent script
- Opens in sidebar via `sidebar_action`

**Chrome (MV3):**
- Uses `manifest.json`
- Uses `chrome` API (with callbacks/promises)
- Background is a service worker
- Opens in side panel via `sidePanel` API


// Legacy background script for Firefox / web-ext when service workers are disabled.
// Provides equivalent behavior to background.js (best-effort).

try {
  if (typeof browser !== 'undefined' || typeof chrome !== 'undefined') {
    const runtime = typeof browser !== 'undefined' ? browser : chrome
    runtime.runtime && runtime.runtime.onInstalled && runtime.runtime.onInstalled.addListener(() => {
      try { runtime.sidePanel && runtime.sidePanel.setOptions && runtime.sidePanel.setOptions({ path: 'index.html' }) } catch(e) {}
    })

    // Fallback: respond to action clicks by opening a new tab to index.html
    runtime.action && runtime.action.onClicked && runtime.action.onClicked.addListener(async (tab) => {
      try {
        const url = runtime.runtime?.getURL ? runtime.runtime.getURL('index.html') : 'index.html'
        if (tab && tab.id) {
          // try opening in a new tab
          runtime.tabs && runtime.tabs.create && runtime.tabs.create({ url })
        }
      } catch (e) {
        // no-op
      }
    })
  }
} catch (e) {
  // ignore
}

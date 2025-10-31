// MV3 background service worker
// Chrome sidePanel open on action click
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.action) {
  chrome.runtime.onInstalled.addListener(() => {
    try { chrome.sidePanel.setOptions({ path: 'index.html' }) } catch {}
  })
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      if (tab && tab.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: tab.windowId })
      }
    } catch (e) {
      // no-op
    }
  })
}

// MV3 background service worker
// Chrome sidePanel open on action click
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.action) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed')
    try { chrome.sidePanel.setOptions({ path: 'index.html' }) } catch {}
  })
  chrome.action.onClicked.addListener(async (tab) => {
    console.log('[Background] Action clicked')
    try {
      if (tab && tab.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: tab.windowId })
        console.log('[Background] Side panel opened')
      }
    } catch (e) {
      console.error('[Background] Failed to open side panel:', e)
    }
  })
}

// Listen for URL changes from content scripts and trigger auto-analyze
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  // Simple debounce per-tab
  const debouncePerTab = new Map()
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Background] Received message:', msg, 'from', sender.tab?.url)
    
    if (msg && msg.type === 'URL_CHANGED') {
      const url = msg.url || ''
      console.log('[Background] URL_CHANGED detected:', url)
      
      // Only care about LinkedIn job pages
      if (!/linkedin\.com/i.test(url)) {
        console.log('[Background] Not a LinkedIn URL, ignoring')
        return false
      }

      const tabId = sender.tab?.id || 'global'
      const now = Date.now()
      const last = debouncePerTab.get(tabId) || 0
      if (now - last < 1500) {
        console.log('[Background] Debounced (too soon)')
        return false
      }
      debouncePerTab.set(tabId, now)

      // Check user setting from storage and broadcast to extension views
      try {
        chrome.storage?.local?.get('appState', (data) => {
          const autoAnalyze = !!data?.appState?.autoAnalyze
          console.log('[Background] autoAnalyze setting:', autoAnalyze)
          
          if (!autoAnalyze) return
          
          console.log('[Background] Sending AUTO_ANALYZE_CURRENT_PAGE')
          // Broadcast to all extension contexts (side panel, popup, etc)
          chrome.runtime.sendMessage({ 
            type: 'AUTO_ANALYZE_CURRENT_PAGE', 
            url 
          }).catch((err) => {
            // Side panel might not be open - that's OK
            console.log('[Background] Message send error (side panel may not be open):', err.message)
          })
        })
      } catch (e) {
        console.error('[Background] Error in message handler:', e)
      }
    }
    
    // Return false to indicate we're not sending an async response
    return false
  })
  
  console.log('[Background] Message listener registered')
}

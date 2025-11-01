// Firefox MV2 background script
// Uses browser API with callbacks/promises

const runtime = typeof browser !== 'undefined' ? browser : chrome
console.log('[Background-FF] Initializing...')

// Open sidebar on action click
if (runtime.browserAction && runtime.browserAction.onClicked) {
  runtime.browserAction.onClicked.addListener(async (tab) => {
    console.log('[Background-FF] Browser action clicked')
    try {
      if (runtime.sidebarAction && runtime.sidebarAction.open) {
        await runtime.sidebarAction.open()
        console.log('[Background-FF] Sidebar opened')
      }
    } catch (e) {
      console.error('[Background-FF] Failed to open sidebar:', e)
    }
  })
}

// Listen for URL changes from content scripts
if (runtime.runtime?.onMessage) {
  const debouncePerTab = new Map()
  
  runtime.runtime.onMessage.addListener((msg, sender) => {
    console.log('[Background-FF] Received message:', msg, 'from', sender.tab?.url)
    
    if (msg && msg.type === 'URL_CHANGED') {
      const url = msg.url || ''
      console.log('[Background-FF] URL_CHANGED detected:', url)
      
      if (!/linkedin\.com/i.test(url)) {
        console.log('[Background-FF] Not a LinkedIn URL, ignoring')
        return false
      }

      const tabId = sender.tab?.id || 'global'
      const now = Date.now()
      const last = debouncePerTab.get(tabId) || 0
      if (now - last < 1500) {
        console.log('[Background-FF] Debounced (too soon)')
        return false
      }
      debouncePerTab.set(tabId, now)

      // Check storage and broadcast
      runtime.storage.local.get('appState').then((data) => {
        const autoAnalyze = !!data?.appState?.autoAnalyze
        console.log('[Background-FF] autoAnalyze setting:', autoAnalyze)
        
        if (!autoAnalyze) return
        
        console.log('[Background-FF] Sending AUTO_ANALYZE_CURRENT_PAGE')
        runtime.runtime.sendMessage({ 
          type: 'AUTO_ANALYZE_CURRENT_PAGE', 
          url 
        }).then(() => {
          console.log('[Background-FF] Message sent successfully')
        }).catch((err) => {
          console.log('[Background-FF] Message send error:', err.message)
        })
      }).catch(err => {
        console.error('[Background-FF] Storage get error:', err)
      })
    }
    
    return false
  })
  
  console.log('[Background-FF] Message listener registered')
}

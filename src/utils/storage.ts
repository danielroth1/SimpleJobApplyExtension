import type { AppState } from '@/state/types'

const EXT_PROTOCOLS = ['chrome-extension:', 'moz-extension:']

export async function saveStateToStorage(state: AppState) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ appState: state })
      return
    }
  } catch {}
  try {
    localStorage.setItem('appState', JSON.stringify(state))
  } catch {}
}

export async function loadStateFromStorage(): Promise<AppState | null> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get('appState')
      return (data?.appState as AppState) || null
    }
  } catch {}
  try {
    const s = localStorage.getItem('appState')
    return s ? (JSON.parse(s) as AppState) : null
  } catch {}
  return null
}

export async function downloadJson(obj: any, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file: File): Promise<any | null> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => {
      try { resolve(JSON.parse(String(reader.result))) } catch { resolve(null) }
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

export async function readClipboardText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText()
    return text || null
  } catch { return null }
}

export async function getPageText(): Promise<string | null> {
  const isExt = EXT_PROTOCOLS.includes(window.location.protocol)
  if (!isExt) {
    // Dev fallback
    return document.body?.innerText || ''
  }
  
  try {
    // Support both chrome and browser APIs
    const api = typeof (window as any).browser !== 'undefined' ? (window as any).browser : chrome
    const [tab] = await api.tabs.query({ active: true, currentWindow: true })
    console.log('[getPageText] Active tab:', tab?.url)
    
    if (!tab?.id) {
      console.error('[getPageText] No active tab found')
      return null
    }
    
    // Retry mechanism: content script might not be ready yet
    let lastError: any = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[getPageText] Retry attempt ${attempt + 1}/3 after ${attempt * 500}ms delay`)
          await new Promise(resolve => setTimeout(resolve, attempt * 500))
        }
        
        console.log('[getPageText] Sending SIMPLE_GET_PAGE_TEXT to tab', tab.id)
        const resp = await api.tabs.sendMessage(tab.id, { type: 'SIMPLE_GET_PAGE_TEXT' })
        console.log('[getPageText] Response:', resp)
        return resp?.text || null
      } catch (e) {
        lastError = e
        console.warn(`[getPageText] Attempt ${attempt + 1} failed:`, e)
      }
    }
    
    console.error('[getPageText] All retry attempts failed:', lastError)
    return null
  } catch (e) {
    console.error('[getPageText] Error:', e)
    return null
  }
}

// Site-specific content extraction rules
const SITE_RULES: Record<string, { selector: string }> = {
  'linkedin.com': { selector: 'article.jobs-description__container' },
  // Add more site-specific rules here as needed
}

function getSiteRule(url: string): { selector: string } | null {
  for (const [domain, rule] of Object.entries(SITE_RULES)) {
    if (url.includes(domain)) {
      return rule
    }
  }
  return null
}

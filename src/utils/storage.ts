import type { AppState, SiteRule } from '@/state/types'

const EXT_PROTOCOLS = ['chrome-extension:', 'moz-extension:']

// Settings that persist across save/load operations (user preferences)
export type AppSettings = {
  darkMode: boolean
  highlightInCoverLetter: boolean
  autoAnalyze: boolean
  debugMode: boolean
  forceUniqueColors: boolean
  prefillNewJobs: boolean
}

function getStorageApi(): any | null {
  // Prefer the standard "browser" namespace used by Firefox and polyfilled in some dev setups
  if (typeof (window as any).browser !== 'undefined' && (window as any).browser.storage?.local) return (window as any).browser
  if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage?.local) return (window as any).chrome
  return null
}

async function storageGet(api: any, key: string): Promise<any> {
  if (!api) return null
  // If API returns a promise from .get, await it. Otherwise wrap callback version.
  try {
    const maybePromise = api.storage.local.get(key)
    // If it looks like a promise, await and return
    if (maybePromise && typeof maybePromise.then === 'function') {
      const data = await maybePromise
      return data
    }
  } catch (e) {
    // Fall through to callback style
  }

  return await new Promise(resolve => {
    try {
      api.storage.local.get(key, (result: any) => resolve(result))
    } catch (e) {
      resolve(null)
    }
  })
}

async function storageSet(api: any, obj: Record<string, any>): Promise<void> {
  if (!api) return
  try {
    const maybePromise = api.storage.local.set(obj)
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise
      return
    }
  } catch (e) {
    // callback style next
  }

  return await new Promise(resolve => {
    try {
      api.storage.local.set(obj, () => resolve())
    } catch (e) {
      resolve()
    }
  })
}

export async function saveStateToStorage(state: AppState) {
  const api = getStorageApi()
  if (api) {
    try { await storageSet(api, { appState: state }); return } catch {}
  }
  try { localStorage.setItem('appState', JSON.stringify(state)) } catch {}
}

export async function loadStateFromStorage(): Promise<AppState | null> {
  const api = getStorageApi()
  if (api) {
    try {
      const data = await storageGet(api, 'appState')
      return (data?.appState as AppState) || null
    } catch {}
  }
  try {
    const s = localStorage.getItem('appState')
    return s ? (JSON.parse(s) as AppState) : null
  } catch {}
  return null
}

// Save settings separately (persist across extension restarts)
export async function saveSettings(settings: AppSettings) {
  const api = getStorageApi()
  if (api) {
    try { await storageSet(api, { appSettings: settings }); return } catch {}
  }
  try { localStorage.setItem('appSettings', JSON.stringify(settings)) } catch {}
}

// Load settings separately
export async function loadSettings(): Promise<AppSettings | null> {
  const api = getStorageApi()
  if (api) {
    try {
      const data = await storageGet(api, 'appSettings')
      return (data?.appSettings as AppSettings) || null
    } catch {}
  }
  try {
    const s = localStorage.getItem('appSettings')
    return s ? (JSON.parse(s) as AppSettings) : null
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

export async function downloadFile(data: string, filename: string, mime = 'text/html') {
  const blob = new Blob([data], { type: mime })
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

export async function getPageText(siteRules?: any[]): Promise<string | null> {
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
        const resp = await api.tabs.sendMessage(tab.id, { type: 'SIMPLE_GET_PAGE_TEXT', siteRules })
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

export async function getPageHtml(): Promise<string | null> {
  const isExt = EXT_PROTOCOLS.includes(window.location.protocol)
  if (!isExt) {
    // Dev fallback
    return document.documentElement?.outerHTML || document.documentElement?.innerHTML || ''
  }

  try {
    const api = typeof (window as any).browser !== 'undefined' ? (window as any).browser : chrome
    const [tab] = await api.tabs.query({ active: true, currentWindow: true })
    console.log('[getPageHtml] Active tab:', tab?.url)

    if (!tab?.id) {
      console.error('[getPageHtml] No active tab found')
      return null
    }

    let lastError: any = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[getPageHtml] Retry attempt ${attempt + 1}/3 after ${attempt * 500}ms delay`)
          await new Promise(resolve => setTimeout(resolve, attempt * 500))
        }

        console.log('[getPageHtml] Sending SIMPLE_GET_PAGE_HTML to tab', tab.id)
        const resp = await api.tabs.sendMessage(tab.id, { type: 'SIMPLE_GET_PAGE_HTML' })
        console.log('[getPageHtml] Response:', resp)
        return resp?.html || null
      } catch (e) {
        lastError = e
        console.warn(`[getPageHtml] Attempt ${attempt + 1} failed:`, e)
      }
    }

    console.error('[getPageHtml] All retry attempts failed:', lastError)
    return null
  } catch (e) {
    console.error('[getPageHtml] Error:', e)
    return null
  }
}

// Site rules storage
export async function saveSiteRules(rules: SiteRule[]) {
  const api = getStorageApi()
  if (api) {
    try { await storageSet(api, { siteRules: rules }); return } catch {}
  }
  try { localStorage.setItem('siteRules', JSON.stringify(rules)) } catch {}
}

export async function loadSiteRules(): Promise<SiteRule[] | null> {
  const api = getStorageApi()
  if (api) {
    try {
      const data = await storageGet(api, 'siteRules')
      return (data?.siteRules as SiteRule[]) || null
    } catch {}
  }
  try {
    const s = localStorage.getItem('siteRules')
    return s ? (JSON.parse(s) as SiteRule[]) : null
  } catch {}
  return null
}


import type { AppState } from '@/state/types'

const EXT_PROTOCOLS = ['chrome-extension:', 'moz-extension:']

// Settings that persist across save/load operations (user preferences)
export type AppSettings = {
  darkMode: boolean
  highlightInCoverLetter: boolean
  autoAnalyze: boolean
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

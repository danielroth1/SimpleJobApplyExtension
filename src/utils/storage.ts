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
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id) return null
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'SIMPLE_GET_PAGE_TEXT' })
    return resp?.text || null
  } catch (e) {
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

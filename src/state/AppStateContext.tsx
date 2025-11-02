import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppActions, AppState, Paragraph } from './types'
import { cloneState, generateCoverLetterHTML, highlightJobPosting, hslForIndex } from './logic'
import { loadStateFromStorage, saveStateToStorage, downloadJson, readJsonFile, getPageText, readClipboardText, saveSettings, loadSettings, type AppSettings } from '@/utils/storage'

const AppStateContext = createContext<{ state: AppState, actions: AppActions } | null>(null)

function uuid(): string { return Math.random().toString(36).slice(2) }

// Detect system theme preference
function getSystemThemePreference(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

const defaultState: AppState = {
  paragraphs: [
    { id: uuid(), html: '<p>Dear Hiring Manager,</p>', keywords: ['React', 'TypeScript'], noLineBreak: false, autoInclude: false, included: false, collapsed: true }
  ],
  jobPostingRaw: '',
  jobPostingHTML: '',
  coverLetterHTML: '<p></p>',
  jobEditorHidden: false,
  darkMode: getSystemThemePreference(),
  highlightInCoverLetter: true,
  autoAnalyze: true,
}

function normalizeLoadedState(s: Partial<AppState> | null): AppState {
  if (!s) return defaultState
  // Normalize paragraphs to ensure collapsed field exists (default to true)
  const paragraphs = Array.isArray(s.paragraphs) 
    ? s.paragraphs.map(p => ({ ...p, collapsed: p.collapsed ?? true }))
    : defaultState.paragraphs
  return {
    paragraphs,
    jobPostingRaw: s.jobPostingRaw ?? defaultState.jobPostingRaw,
    jobPostingHTML: s.jobPostingHTML ?? defaultState.jobPostingHTML,
    coverLetterHTML: s.coverLetterHTML ?? defaultState.coverLetterHTML,
    jobEditorHidden: s.jobEditorHidden ?? defaultState.jobEditorHidden,
    darkMode: s.darkMode ?? defaultState.darkMode,
    highlightInCoverLetter: s.highlightInCoverLetter ?? defaultState.highlightInCoverLetter,
    autoAnalyze: s.autoAnalyze ?? defaultState.autoAnalyze,
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState)

  // Load from storage on init (both state and settings)
  useEffect(() => {
    Promise.all([loadStateFromStorage(), loadSettings()]).then(([s, settings]) => {
      const normalizedState = normalizeLoadedState(s)
      if (settings) {
        // Merge loaded settings into state
        normalizedState.darkMode = settings.darkMode
        normalizedState.highlightInCoverLetter = settings.highlightInCoverLetter
        normalizedState.autoAnalyze = settings.autoAnalyze
      }
      setState(normalizedState)
    })
  }, [])

  // Auto-persist on changes (debounced) - only persist state, not settings
  useEffect(() => {
    const t = setTimeout(() => { saveStateToStorage(state) }, 300)
    return () => clearTimeout(t)
  }, [state])

  // Save settings separately whenever they change
  useEffect(() => {
    const settings: AppSettings = {
      darkMode: state.darkMode,
      highlightInCoverLetter: state.highlightInCoverLetter,
      autoAnalyze: state.autoAnalyze,
    }
    const t = setTimeout(() => { saveSettings(settings) }, 300)
    return () => clearTimeout(t)
  }, [state.darkMode, state.highlightInCoverLetter, state.autoAnalyze])

  

  const addParagraph = useCallback(() => {
    setState(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, { id: uuid(), html: '<p></p>', keywords: [], noLineBreak: false, autoInclude: false, included: false, collapsed: true }]
    }))
  }, [])

  const updateParagraph = useCallback((paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => {
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      const resolvedPatch = typeof patch === 'function' ? (patch as (prev: Paragraph) => Partial<Paragraph>)(p) : patch
      Object.assign(p, resolvedPatch)
      return next
    })
  }, [])

  const deleteParagraph = useCallback((paragraphId: string) => {
    setState(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter(p => p.id !== paragraphId)
    }))
  }, [])

  const addKeyword = useCallback((paragraphId: string, keyword: string) => {
    updateParagraph(paragraphId, (prev: Paragraph) => ({ keywords: Array.from(new Set([...(prev.keywords || []), keyword])) }))
  }, [updateParagraph])

  const removeKeyword = useCallback((paragraphId: string, keyword: string) => {
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      p.keywords = p.keywords.filter(k => k !== keyword)
      return next
    })
  }, [])

  const reorderParagraphs = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const next = cloneState(prev)
      const [moved] = next.paragraphs.splice(fromIndex, 1)
      next.paragraphs.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const setJobPostingRaw = useCallback((raw: string) => {
    setState(prev => ({ ...prev, jobPostingRaw: raw }))
  }, [])

  const highlightPageKeywords = useCallback(async () => {
    // Send message to content script to highlight keywords on the page
    try {
  const api = (window as any).browser ?? (window as any).chrome
      const [tab] = await api.tabs.query({ active: true, currentWindow: true })
      console.log('[highlightPageKeywords] Active tab:', tab?.url)
      
      if (!tab?.id) {
        console.error('[highlightPageKeywords] No active tab found')
        return
      }
      
      // Build keyword color map
      const keywordColorMap: Record<string, string> = {}
      state.paragraphs.forEach((p, idx) => {
        const color = hslForIndex(idx, state.darkMode)
        p.keywords.forEach(kw => {
          keywordColorMap[kw.toLowerCase()] = color
        })
      })
      
      console.log('[highlightPageKeywords] Sending SIMPLE_HIGHLIGHT_KEYWORDS to tab', tab.id)
      await api.tabs.sendMessage(tab.id, { 
        type: 'SIMPLE_HIGHLIGHT_KEYWORDS', 
        keywords: keywordColorMap 
      })
      console.log('[highlightPageKeywords] Message sent successfully')
    } catch (e) {
      console.error('[highlightPageKeywords] Failed to highlight keywords on page:', e)
    }
  }, [state.paragraphs, state.darkMode])

  const analyzeNow = useCallback(() => {
    setState(prev => {
      const next = cloneState(prev)
      const { html, matched } = highlightJobPosting(next.jobPostingRaw, next.paragraphs, next.darkMode)
      next.jobPostingHTML = html
      // Update included flags and matched keywords
      next.paragraphs.forEach(p => {
        const mset = matched.get(p.id) || new Set<string>()
        const paragraphMatched = p.keywords.filter(k => mset.has(k))
        p.lastMatchedKeywords = paragraphMatched
        if (paragraphMatched.length > 0) {
          p.included = true
        }
        if (p.autoInclude) p.included = true
      })
      // Generate cover letter automatically after analysis
      next.coverLetterHTML = generateCoverLetterHTML(next.paragraphs, next.highlightInCoverLetter, next.darkMode)
      return next
    })
    // Also highlight on the actual page after state update
    setTimeout(() => highlightPageKeywords(), 100)
  }, [highlightPageKeywords])

  const generateCoverLetter = useCallback(() => {
    setState(prev => ({ ...prev, coverLetterHTML: generateCoverLetterHTML(prev.paragraphs, prev.highlightInCoverLetter, prev.darkMode) }))
  }, [])

  const saveToFile = useCallback(async () => { 
    // Only save content, not settings
    const dataToSave = {
      paragraphs: state.paragraphs,
      jobPostingRaw: state.jobPostingRaw,
      jobPostingHTML: state.jobPostingHTML,
      coverLetterHTML: state.coverLetterHTML,
      jobEditorHidden: state.jobEditorHidden,
    }
    await downloadJson(dataToSave, `simple-job-apply-state.json`) 
  }, [state])

  const loadFromFile = useCallback(async (file: File) => {
    const data = await readJsonFile(file)
    if (data) {
      // Preserve current settings, only load content
      setState(prev => ({
        ...prev,
        paragraphs: data.paragraphs ?? prev.paragraphs,
        jobPostingRaw: data.jobPostingRaw ?? prev.jobPostingRaw,
        jobPostingHTML: data.jobPostingHTML ?? prev.jobPostingHTML,
        coverLetterHTML: data.coverLetterHTML ?? prev.coverLetterHTML,
        jobEditorHidden: data.jobEditorHidden ?? prev.jobEditorHidden,
      }))
    }
  }, [])

  const pasteFromClipboard = useCallback(async () => {
    const text = await readClipboardText()
    if (text) {
      setJobPostingRaw(text)
      // Defer analyze after state update flush
      setTimeout(() => analyzeNow(), 0)
    }
  }, [setJobPostingRaw, analyzeNow])

  const analyzeCurrentPage = useCallback(async () => {
    const text = await getPageText()
    if (text) {
      setJobPostingRaw(text)
      setTimeout(() => analyzeNow(), 0)
    }
  }, [setJobPostingRaw, analyzeNow])

  // Listen for background-triggered auto-analyze messages (after analyzeCurrentPage is defined)
  useEffect(() => {
  const api = (window as any).browser ?? (window as any).chrome
  if (typeof api === 'undefined' || !api.runtime?.onMessage) return
    
    const handler = (msg: any) => {
      console.log('[AppStateContext] Received message:', msg)
      if (msg?.type === 'AUTO_ANALYZE_CURRENT_PAGE') {
        const url: string = msg.url || ''
        console.log('[AppStateContext] AUTO_ANALYZE_CURRENT_PAGE received. autoAnalyze:', state.autoAnalyze, 'url:', url)
        if (!state.autoAnalyze) {
          console.log('[AppStateContext] Auto-analyze is disabled, skipping')
          return
        }
        if (!/linkedin\.com/i.test(url)) {
          console.log('[AppStateContext] Not a LinkedIn URL, skipping')
          return
        }
        console.log('[AppStateContext] Triggering analyzeCurrentPage')
        analyzeCurrentPage()
      }
    }
    api.runtime.onMessage.addListener(handler)
    console.log('[AppStateContext] Message listener registered')
    return () => {
      try { api.runtime.onMessage.removeListener(handler) } catch {}
    }
  }, [state.autoAnalyze, analyzeCurrentPage])

  const toggleDarkMode = useCallback(() => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }))
  }, [])

  const toggleHighlightInCoverLetter = useCallback(() => {
    setState(prev => ({ ...prev, highlightInCoverLetter: !prev.highlightInCoverLetter }))
  }, [])

  const toggleAutoAnalyze = useCallback(() => {
    setState(prev => ({ ...prev, autoAnalyze: !prev.autoAnalyze }))
  }, [])

  const debugPageState = useCallback(async () => {
    const api = (window as any).browser ?? (window as any).chrome
    if (!api?.tabs?.query) {
      console.error('Cannot debug: tabs API not available')
      return
    }
    
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        console.error('No active tab found')
        return
      }
      
      console.log('🔍 Sending DEBUG_PAGE_STATE message to tab:', tab.id)
      api.tabs.sendMessage(tab.id, { type: 'DEBUG_PAGE_STATE' })
    } catch (e) {
      console.error('Debug error:', e)
    }
  }, [])

  const value = useMemo(() => ({
    state,
    actions: {
      addParagraph,
      updateParagraph,
      deleteParagraph,
      addKeyword,
      removeKeyword,
      reorderParagraphs,
      setJobPostingRaw,
      analyzeNow,
      generateCoverLetter,
      saveToFile,
      loadFromFile,
      pasteFromClipboard,
      analyzeCurrentPage,
      toggleDarkMode,
      toggleHighlightInCoverLetter,
      toggleAutoAnalyze,
      highlightPageKeywords,
      debugPageState,
    }
  }), [state, addParagraph, updateParagraph, deleteParagraph, addKeyword, removeKeyword, reorderParagraphs, setJobPostingRaw, analyzeNow, generateCoverLetter, saveToFile, loadFromFile, pasteFromClipboard, analyzeCurrentPage, toggleDarkMode, toggleHighlightInCoverLetter, toggleAutoAnalyze, highlightPageKeywords, debugPageState])

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

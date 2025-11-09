import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppActions, AppState, Paragraph, KeywordWithOptions, SiteRule, Job, PDFItem } from './types'
import { cloneState, generateCoverLetterHTML, highlightJobPosting, hslForIndex, getNextAvailableColorIndex } from './logic'
import { loadStateFromStorage, saveStateToStorage, downloadJson, readJsonFile, getPageText, getPageHtml, downloadFile, readClipboardText, saveSettings, loadSettings, type AppSettings, saveSiteRules, loadSiteRules } from '@/utils/storage'

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
    { id: uuid(), html: '<p>Dear Hiring Manager,</p>', keywords: [], noLineBreak: false, autoInclude: false, included: false, collapsed: true, color: undefined }
  ],
  jobs: [],
  pdfItems: [],
  jobPostingRaw: '',
  jobPostingHTML: '',
  coverLetterHTML: '<p></p>',
  jobEditorHidden: false,
  darkMode: getSystemThemePreference(),
  highlightInCoverLetter: true,
  autoAnalyze: true,
  debugMode: false,
  siteRules: [
    { domain: 'linkedin.com', selector: 'article.jobs-description__container', description: 'LinkedIn job postings' },
    { domain: 'indeed.com', selector: '[data-test-id="job-description"]', description: 'Indeed job postings' },
  ],
  forceUniqueColors: true,
}

function normalizeLoadedState(s: Partial<AppState> | null): AppState {
  if (!s) return defaultState
  // Normalize paragraphs to ensure collapsed field exists (default to true)
  // Also migrate old string[] keywords to KeywordWithOptions[]
  const paragraphs = Array.isArray(s.paragraphs) 
    ? s.paragraphs.map(p => {
        const keywords = p.keywords.map(kw => {
          if (typeof kw === 'string') {
            return { text: kw, matchWholeWord: false, matchCase: false }
          }
          return kw
        })
        return { ...p, collapsed: p.collapsed ?? true, keywords, color: p.color }
      })
    : defaultState.paragraphs
  return {
    paragraphs,
    jobs: Array.isArray(s.jobs) ? s.jobs : defaultState.jobs,
    pdfItems: Array.isArray(s.pdfItems) ? s.pdfItems : defaultState.pdfItems,
    jobPostingRaw: s.jobPostingRaw ?? defaultState.jobPostingRaw,
    jobPostingHTML: s.jobPostingHTML ?? defaultState.jobPostingHTML,
    coverLetterHTML: s.coverLetterHTML ?? defaultState.coverLetterHTML,
    jobEditorHidden: s.jobEditorHidden ?? defaultState.jobEditorHidden,
    darkMode: s.darkMode ?? defaultState.darkMode,
    highlightInCoverLetter: s.highlightInCoverLetter ?? defaultState.highlightInCoverLetter,
    autoAnalyze: s.autoAnalyze ?? defaultState.autoAnalyze,
    debugMode: s.debugMode ?? defaultState.debugMode,
    siteRules: s.siteRules ?? defaultState.siteRules,
    forceUniqueColors: s.forceUniqueColors ?? defaultState.forceUniqueColors,
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState)

  // Load from storage on init (both state and settings)
  useEffect(() => {
  Promise.all([loadStateFromStorage(), loadSettings(), loadSiteRules()]).then(([s, settings, rules]) => {
      const normalizedState = normalizeLoadedState(s)
      if (settings) {
        // Merge loaded settings into state
        normalizedState.darkMode = settings.darkMode
        normalizedState.highlightInCoverLetter = settings.highlightInCoverLetter
        normalizedState.autoAnalyze = settings.autoAnalyze
        normalizedState.debugMode = settings.debugMode
        normalizedState.forceUniqueColors = settings.forceUniqueColors ?? normalizedState.forceUniqueColors
      }
      if (rules) {
        normalizedState.siteRules = rules
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
      debugMode: state.debugMode,
      forceUniqueColors: state.forceUniqueColors,
    }
    const t = setTimeout(() => { saveSettings(settings) }, 300)
    return () => clearTimeout(t)
  }, [state.darkMode, state.highlightInCoverLetter, state.autoAnalyze, state.debugMode])

  // Save site rules whenever they change
  useEffect(() => {
    const t = setTimeout(() => { saveSiteRules(state.siteRules) }, 300)
    return () => clearTimeout(t)
  }, [state.siteRules])

  

  const addParagraph = useCallback(() => {
    setState(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, { id: uuid(), html: '<p></p>', keywords: [], noLineBreak: false, autoInclude: false, included: false, collapsed: false, color: undefined }]
    }))
  }, [])

  const addParagraphAt = useCallback((index: number) => {
    setState(prev => {
      const next = cloneState(prev)
      next.paragraphs.splice(index, 0, { id: uuid(), html: '<p></p>', keywords: [], noLineBreak: false, autoInclude: false, included: false, collapsed: false, color: undefined })
      return next
    })
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
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      
      const existingTexts = new Set(p.keywords.map(k => k.text))
      if (existingTexts.has(keyword)) return prev
      
      p.keywords = [...p.keywords, { text: keyword, matchWholeWord: false, matchCase: false }]
      
      // Auto-assign a color if none set and this is the first keyword
      if (!p.color && p.keywords.length === 1) {
        const nextIdx = getNextAvailableColorIndex(next.paragraphs, next.darkMode)
        p.color = hslForIndex(nextIdx, next.darkMode)
      }
      
      return next
    })
  }, [])
  const moveKeyword = useCallback((paragraphId: string, fromIndex: number, toIndex: number) => {
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      if (fromIndex < 0 || fromIndex >= p.keywords.length || toIndex < 0 || toIndex >= p.keywords.length) return prev
      const [moved] = p.keywords.splice(fromIndex, 1)
      p.keywords.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const transferKeyword = useCallback((fromParagraphId: string, fromIndex: number, toParagraphId: string, toIndex?: number) => {
    setState(prev => {
      if (fromParagraphId === toParagraphId) return prev
      const next = cloneState(prev)
      const fromP = next.paragraphs.find(p => p.id === fromParagraphId)
      const toP = next.paragraphs.find(p => p.id === toParagraphId)
      if (!fromP || !toP) return prev
      if (fromIndex < 0 || fromIndex >= fromP.keywords.length) return prev
      const [moved] = fromP.keywords.splice(fromIndex, 1)
      const insertIdx = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= toP.keywords.length ? toIndex : toP.keywords.length
      // Prevent duplicates in target paragraph
      if (!toP.keywords.some(k => k.text === moved.text)) {
        toP.keywords.splice(insertIdx, 0, moved)
      }
      // Auto-assign color for target if needed
      if (!toP.color && toP.keywords.length === 1) {
        const nextIdx = getNextAvailableColorIndex(next.paragraphs, next.darkMode)
        toP.color = hslForIndex(nextIdx, next.darkMode)
      }
      return next
    })
  }, [])

  const setParagraphColor = useCallback((paragraphId: string, color?: string) => {
    setState(prev => {
      const next = cloneState(prev)
      const target = next.paragraphs.find(p => p.id === paragraphId)
      if (!target) return prev
      if (!color) { target.color = undefined; }
      else if (next.forceUniqueColors) {
        const other = next.paragraphs.find(p => p.id !== paragraphId && p.color === color)
        if (other) {
          // Swap colors
          const temp = other.color
          other.color = target.color
          target.color = temp || color
        } else {
          target.color = color
        }
      } else {
        target.color = color
      }
      // Regenerate cover letter to reflect color changes
      next.coverLetterHTML = generateCoverLetterHTML(next.paragraphs, next.highlightInCoverLetter, next.darkMode)
      return next
    })
  }, [])

  const toggleForceUniqueColors = useCallback(() => {
    setState(prev => ({ ...prev, forceUniqueColors: !prev.forceUniqueColors }))
  }, [])

  const updateKeyword = useCallback((paragraphId: string, oldText: string, updates: Partial<KeywordWithOptions>) => {
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      const kw = p.keywords.find(k => k.text === oldText)
      if (!kw) return prev
      Object.assign(kw, updates)
      return next
    })
  }, [])

  const removeKeyword = useCallback((paragraphId: string, keyword: string) => {
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      p.keywords = p.keywords.filter(k => k.text !== keyword)
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
      
      // Build keyword color map - only include matched keywords
      const keywordColorMap: Record<string, string> = {}
      state.paragraphs.forEach((p, idx) => {
        const color = p.color || hslForIndex(idx, state.darkMode)
        // Only include keywords that actually matched
        const matchedKeywords = p.lastMatchedKeywords || []
        p.keywords.forEach(kw => {
          if (matchedKeywords.includes(kw.text)) {
            // Store the keyword with its match options
            const key = JSON.stringify({ text: kw.text, matchWholeWord: kw.matchWholeWord, matchCase: kw.matchCase })
            keywordColorMap[key] = color
          }
        })
      })
      
      console.log('[highlightPageKeywords] Sending SIMPLE_HIGHLIGHT_KEYWORDS to tab', tab.id)
      await api.tabs.sendMessage(tab.id, { 
        type: 'SIMPLE_HIGHLIGHT_KEYWORDS', 
        keywords: keywordColorMap,
        siteRules: state.siteRules,
      })
      console.log('[highlightPageKeywords] Message sent successfully')
    } catch (e) {
      console.error('[highlightPageKeywords] Failed to highlight keywords on page:', e)
    }
  }, [state.paragraphs, state.darkMode, state.siteRules])

  const analyzeNow = useCallback(() => {
    setState(prev => {
      const next = cloneState(prev)
      const { html, matched } = highlightJobPosting(next.jobPostingRaw, next.paragraphs, next.darkMode)
      next.jobPostingHTML = html
      // Update included flags and matched keywords
      next.paragraphs.forEach(p => {
        const mset = matched.get(p.id) || new Set<string>()
        const paragraphMatched = p.keywords.filter(k => mset.has(k.text)).map(k => k.text)
        p.lastMatchedKeywords = paragraphMatched
        p.included = paragraphMatched.length > 0;
        if (p.autoInclude) p.included = true
      })
      // Generate cover letter automatically after analysis
      next.coverLetterHTML = generateCoverLetterHTML(next.paragraphs, next.highlightInCoverLetter, next.darkMode)
      
      // Immediately send highlight message with the updated state
      setTimeout(() => {
        const api = (window as any).browser ?? (window as any).chrome
        api.tabs.query({ active: true, currentWindow: true }).then(([tab]: any) => {
          if (!tab?.id) return
          
          // Build keyword color map with the UPDATED paragraphs
          const keywordColorMap: Record<string, string> = {}
          next.paragraphs.forEach((p, idx) => {
            const color = p.color || hslForIndex(idx, next.darkMode)
            const matchedKeywords = p.lastMatchedKeywords || []
            p.keywords.forEach(kw => {
              if (matchedKeywords.includes(kw.text)) {
                const key = JSON.stringify({ text: kw.text, matchWholeWord: kw.matchWholeWord, matchCase: kw.matchCase })
                keywordColorMap[key] = color
              }
            })
          })
          
          console.log('[analyzeNow] Sending SIMPLE_HIGHLIGHT_KEYWORDS with updated keywords')
          api.tabs.sendMessage(tab.id, { 
            type: 'SIMPLE_HIGHLIGHT_KEYWORDS', 
            keywords: keywordColorMap,
            siteRules: next.siteRules,
          }).catch((e: any) => console.error('Failed to send highlight message:', e))
        })
      }, 100)
      
      return next
    })
  }, [])

  const generateCoverLetter = useCallback(() => {
    setState(prev => ({ ...prev, coverLetterHTML: generateCoverLetterHTML(prev.paragraphs, prev.highlightInCoverLetter, prev.darkMode) }))
  }, [])

  // Job actions
  const addJob = useCallback(() => {
    const newJob: Job = {
      id: uuid(),
      title: 'New Job',
      company: '',
      location: '',
      officeLocation: 'hybrid',
      description: '',
      link: '',
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setState(prev => ({ ...prev, jobs: [...prev.jobs, newJob] }))
  }, [])

  const updateJob = useCallback((jobId: string, patch: Partial<Job>) => {
    setState(prev => {
      const next = cloneState(prev)
      const job = next.jobs.find(j => j.id === jobId)
      if (!job) return prev
      Object.assign(job, patch, { updatedAt: Date.now() })
      return next
    })
  }, [])

  const deleteJob = useCallback((jobId: string) => {
    setState(prev => ({
      ...prev,
      jobs: prev.jobs.filter(j => j.id !== jobId)
    }))
  }, [])

  const reorderJobs = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const next = cloneState(prev)
      const [moved] = next.jobs.splice(fromIndex, 1)
      next.jobs.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  // PDF actions
  const addPdfItem = useCallback((fileName: string, dataUrl: string) => {
    const newPdf: PDFItem = {
      id: uuid(),
      fileName,
      dataUrl,
    }
    setState(prev => ({ ...prev, pdfItems: [...prev.pdfItems, newPdf] }))
  }, [])

  const updatePdfItem = useCallback((pdfId: string, fileName: string, dataUrl: string) => {
    setState(prev => {
      const next = cloneState(prev)
      const pdf = next.pdfItems.find(p => p.id === pdfId)
      if (!pdf) return prev
      pdf.fileName = fileName
      pdf.dataUrl = dataUrl
      return next
    })
  }, [])

  const deletePdfItem = useCallback((pdfId: string) => {
    setState(prev => ({
      ...prev,
      pdfItems: prev.pdfItems.filter(p => p.id !== pdfId)
    }))
  }, [])

  const reorderPdfItems = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const next = cloneState(prev)
      const [moved] = next.pdfItems.splice(fromIndex, 1)
      next.pdfItems.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const saveToFile = useCallback(async () => { 
    // Save all content including jobs and PDFs
    const dataToSave = {
      paragraphs: state.paragraphs,
      jobs: state.jobs,
      pdfItems: state.pdfItems,
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
      // Preserve current settings, load content including jobs and PDFs
      setState(prev => ({
        ...prev,
        paragraphs: data.paragraphs ?? prev.paragraphs,
        jobs: data.jobs ?? prev.jobs,
        pdfItems: data.pdfItems ?? prev.pdfItems,
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
    const text = await getPageText(state.siteRules)
    if (text) {
      setJobPostingRaw(text)
      setTimeout(() => analyzeNow(), 0)
    }
  }, [setJobPostingRaw, analyzeNow, state.siteRules])

  const downloadCurrentPageHtml = useCallback(async () => {
    try {
      const html = await getPageHtml()
      if (!html) {
        console.error('[downloadCurrentPageHtml] Failed to retrieve page HTML')
        return
      }
      const filename = `page-${Date.now()}.html`
      await downloadFile(html, filename, 'text/html')
      console.log('[downloadCurrentPageHtml] Download triggered:', filename)
    } catch (e) {
      console.error('[downloadCurrentPageHtml] Error:', e)
    }
  }, [])

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

  const toggleDebugMode = useCallback(() => {
    setState(prev => ({ ...prev, debugMode: !prev.debugMode }))
  }, [])

  const addSiteRule = useCallback((rule: SiteRule) => {
    setState(prev => {
      const exists = prev.siteRules.some(r => r.domain === rule.domain)
      if (exists) return prev
      return { ...prev, siteRules: [...prev.siteRules, rule] }
    })
  }, [])

  const updateSiteRule = useCallback((domain: string, updates: Partial<SiteRule>) => {
    setState(prev => {
      const next = cloneState(prev)
      const rule = next.siteRules.find(r => r.domain === domain)
      if (!rule) return prev
      Object.assign(rule, updates)
      return next
    })
  }, [])

  const removeSiteRule = useCallback((domain: string) => {
    setState(prev => ({
      ...prev,
      siteRules: prev.siteRules.filter(r => r.domain !== domain)
    }))
  }, [])

  const loadSiteRulesFromFile = useCallback(async (file: File) => {
    const data = await readJsonFile(file)
    if (data && Array.isArray(data)) {
      // Validate and merge rules
      setState(prev => {
        const validRules = data.filter((r: any) => 
          r && typeof r === 'object' && typeof r.domain === 'string' && typeof r.selector === 'string'
        ) as SiteRule[]
        
        const merged = [...prev.siteRules]
        validRules.forEach(newRule => {
          const existingIdx = merged.findIndex(r => r.domain === newRule.domain)
          if (existingIdx >= 0) {
            // Rule exists - could show dialog here, for now just replace
            merged[existingIdx] = newRule
          } else {
            merged.push(newRule)
          }
        })
        
        return { ...prev, siteRules: merged }
      })
    }
  }, [])

  const saveSiteRulesToFile = useCallback(async () => {
    await downloadJson(state.siteRules, `site-rules.json`)
  }, [state.siteRules])

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
      api.tabs.sendMessage(tab.id, { type: 'DEBUG_PAGE_STATE', siteRules: state.siteRules })
    } catch (e) {
      console.error('Debug error:', e)
    }
  }, [state.siteRules])

  const value = useMemo(() => ({
    state,
    actions: {
      addParagraph,
      addParagraphAt,
      updateParagraph,
      deleteParagraph,
      addKeyword,
      updateKeyword,
      removeKeyword,
      moveKeyword,
      transferKeyword,
      setParagraphColor,
      reorderParagraphs,
      addJob,
      updateJob,
      deleteJob,
      reorderJobs,
      addPdfItem,
      updatePdfItem,
      deletePdfItem,
      reorderPdfItems,
      setJobPostingRaw,
      analyzeNow,
      generateCoverLetter,
      saveToFile,
      downloadCurrentPageHtml,
      loadFromFile,
      pasteFromClipboard,
      analyzeCurrentPage,
      toggleDarkMode,
      toggleHighlightInCoverLetter,
      toggleAutoAnalyze,
      toggleDebugMode,
      toggleForceUniqueColors,
      highlightPageKeywords,
      debugPageState,
      addSiteRule,
      updateSiteRule,
      removeSiteRule,
      loadSiteRulesFromFile,
      saveSiteRulesToFile,
    }
  }), [state, addParagraph, addParagraphAt, updateParagraph, deleteParagraph, addKeyword, updateKeyword, removeKeyword, moveKeyword, transferKeyword, setParagraphColor, reorderParagraphs, addJob, updateJob, deleteJob, reorderJobs, addPdfItem, updatePdfItem, deletePdfItem, reorderPdfItems, setJobPostingRaw, analyzeNow, generateCoverLetter, saveToFile, loadFromFile, pasteFromClipboard, analyzeCurrentPage, toggleDarkMode, toggleHighlightInCoverLetter, toggleAutoAnalyze, toggleDebugMode, toggleForceUniqueColors, highlightPageKeywords, debugPageState, addSiteRule, updateSiteRule, removeSiteRule, loadSiteRulesFromFile, saveSiteRulesToFile])

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  }, [state.darkMode, state.highlightInCoverLetter, state.autoAnalyze, state.debugMode, state.forceUniqueColors])

  // Save site rules whenever they change
  useEffect(() => {
    const t = setTimeout(() => { saveSiteRules(state.siteRules) }, 300)
    return () => clearTimeout(t)
  }, [state.siteRules])

  // Reassign colors when forceUniqueColors is enabled
  useEffect(() => {
    
    if (state.forceUniqueColors) {
      // Use setTimeout to avoid immediate state update during render
      const timer = setTimeout(() => {
        reassignParagraphColors();
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [state.forceUniqueColors, state.paragraphs.length])

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

  // Add a keyword to a paragraph without auto-assigning colors.
  // Declared after reassignParagraphColors to avoid use-before-declaration.
  const addKeywordRef = useRef<(paragraphId: string, keyword: string) => void>()
  const addKeyword = useCallback((paragraphId: string, keyword: string) => {
    if (addKeywordRef.current) addKeywordRef.current(paragraphId, keyword)
  }, [])

  // Reorder a keyword inside a paragraph
  const moveKeywordRef = useRef<(paragraphId: string, fromIndex: number, toIndex: number) => void>()
  const moveKeyword = useCallback((paragraphId: string, fromIndex: number, toIndex: number) => {
    if (moveKeywordRef.current) moveKeywordRef.current(paragraphId, fromIndex, toIndex)
  }, [])

  // Reassign paragraph colors to ensure uniqueness when forceUniqueColors is enabled.
  // Ensures paragraphs without keywords never retain a color.
  const reassignParagraphColors = useCallback(() => {
    setState(prev => {
      if (!prev.forceUniqueColors) return prev
      const next = cloneState(prev)

      // Gather user-picked colors (only paragraphs with keywords)
      const userPickedColors = new Set<string>()
      next.paragraphs.forEach(p => {
        if (p.userPickedColor && p.color) {
          userPickedColors.add(p.color)
        }
      })

      // Normalize colors according to keyword presence
      next.paragraphs.forEach(p => {
        if (!p.userPickedColor) {
          p.color = undefined
        }
      })

      // Assign colors to non user-picked paragraphs that have keywords
      let colorIndex = 0
      const totalColors = 360 / 47
      next.paragraphs.forEach(p => {
        if (p.keywords.length > 0 && !p.userPickedColor) {
          let attempts = 0
          let assigned: string | undefined
          while (attempts < totalColors && !assigned) {
            const candidate = hslForIndex(colorIndex, next.darkMode)
            const inUse = userPickedColors.has(candidate) || next.paragraphs.some(o => o.id !== p.id && o.color === candidate)
            if (!inUse) {
              assigned = candidate
            } else {
              colorIndex++
                if (!prev.forceUniqueColors) return prev
      
            }
          }
          p.color = assigned || hslForIndex(colorIndex, next.darkMode)
          colorIndex++
        }
      })

      next.coverLetterHTML = generateCoverLetterHTML(next.paragraphs, next.highlightInCoverLetter, next.darkMode)
      return next
    })
  }, [])

  // Initialize the actual implementations after dependencies are declared
  useEffect(() => {
    addKeywordRef.current = (paragraphId: string, keyword: string) => {
      let needsReassign = false
      setState(prev => {
        const next = cloneState(prev)
        const p = next.paragraphs.find(p => p.id === paragraphId)
        if (!p) return prev
        const existingTexts = new Set(p.keywords.map(k => k.text))
        if (existingTexts.has(keyword)) return prev
        const wasEmpty = p.keywords.length === 0
        p.keywords = [...p.keywords, { text: keyword, matchWholeWord: false, matchCase: false }]
        if (wasEmpty && p.keywords.length === 1) needsReassign = true
        return next
      })
      if (needsReassign) setTimeout(() => { try { reassignParagraphColors() } catch {} }, 0)
    }
    moveKeywordRef.current = (paragraphId: string, fromIndex: number, toIndex: number) => {
      setState(prev => {
        const next = cloneState(prev)
        const p = next.paragraphs.find(p => p.id === paragraphId)
        if (!p) return prev
        if (fromIndex < 0 || fromIndex >= p.keywords.length || toIndex < 0 || toIndex >= p.keywords.length) return prev
        const [moved] = p.keywords.splice(fromIndex, 1)
        p.keywords.splice(toIndex, 0, moved)
        return next
      })
    }
  }, [reassignParagraphColors])
  

  const transferKeyword = useCallback((fromParagraphId: string, fromIndex: number, toParagraphId: string, toIndex?: number) => {
    let needsReassign = false
    setState(prev => {
      if (fromParagraphId === toParagraphId) return prev
      const next = cloneState(prev)
      const fromP = next.paragraphs.find(p => p.id === fromParagraphId)
      const toP = next.paragraphs.find(p => p.id === toParagraphId)
      if (!fromP || !toP) return prev
      if (fromIndex < 0 || fromIndex >= fromP.keywords.length) return prev
      const [moved] = fromP.keywords.splice(fromIndex, 1)
      const insertIdx = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= toP.keywords.length ? toIndex : toP.keywords.length
      const toWasEmpty = toP.keywords.length === 0
      if (!toP.keywords.some(k => k.text === moved.text)) {
        toP.keywords.splice(insertIdx, 0, moved)
      }
      // Do not auto-assign any color; only user picks assign colors
      if (toWasEmpty && toP.keywords.length === 1) {
        needsReassign = true
      }
      if (fromP.keywords.length === 0 && !fromP.userPickedColor) {
        // Clear color if source lost its last keyword
        fromP.color = undefined
        needsReassign = true
      }
      return next
    })
    if (needsReassign) {
      setTimeout(() => {
        try { reassignParagraphColors() } catch {}
      }, 0)
    }
  }, [reassignParagraphColors])
  

  const setParagraphColor = useCallback((paragraphId: string, color?: string, userPicked: boolean = false) => {
    setState(prev => {
      const next = cloneState(prev)
      const target = next.paragraphs.find(p => p.id === paragraphId)
      if (!target) return prev

      if (!color) {
        target.color = undefined
        target.userPickedColor = false
      } else {
        // Apply the picked color and flag to the target paragraph
        const colorPrev = target.color
        target.color = color
        target.userPickedColor = userPicked

        // If uniqueness is enforced and this was a user-picked color,
        // resolve any conflicts by reassigning a new unused color to the other paragraph(s)
        if (userPicked && next.forceUniqueColors) {
          // Build a set of currently used colors (after applying target)
          const usedColors = new Set<string>()
          next.paragraphs.forEach(p => { if (p.color) usedColors.add(p.color) })

          // Find all conflicting paragraphs using the same color (excluding the target)
          const conflicts = next.paragraphs.filter(p => p.id !== target.id && p.color === color)

          // Helper to get the next unused color
          const pickNextUnusedColor = (): string => {
            let idx = 0
            while (idx < 1000) { // safe upper bound
              const candidate = hslForIndex(idx, next.darkMode)
              if (!usedColors.has(candidate)) {
                usedColors.add(candidate)
                return candidate
              }
              idx++
            }
            // Fallback (should not normally hit)
            return hslForIndex(0, next.darkMode)
          }

          // Reassign a fresh unused color to each conflicting paragraph
          if (conflicts.length == 1) {
            conflicts[0].color = colorPrev || pickNextUnusedColor()
          }
          else {
            conflicts.forEach(conflict => {
              conflict.userPickedColor = false
              conflict.color = pickNextUnusedColor()
            })
          }
        }
      }

      // Regenerate cover letter to reflect color changes
      next.coverLetterHTML = generateCoverLetterHTML(next.paragraphs, next.highlightInCoverLetter, next.darkMode)
      return next
    })

    // If the user picked a color, run a full reassignment shortly after
    // so non-user-picked paragraphs get unique colors as needed.
    if (userPicked) {
      setTimeout(() => {
        try { reassignParagraphColors() } catch {}
      }, 0)
    }
  }, [reassignParagraphColors])

  const toggleForceUniqueColors = useCallback(() => {
    setState(prev => {
      const next = { ...prev, forceUniqueColors: !prev.forceUniqueColors }
      return next
    })
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
    let needsReassign = false
    setState(prev => {
      const next = cloneState(prev)
      const p = next.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      p.keywords = p.keywords.filter(k => k.text !== keyword)
      if (p.keywords.length === 0 && !p.userPickedColor) {
        p.color = undefined
        needsReassign = true
      }
      return next
    })
    if (needsReassign) {
      setTimeout(() => {
        try { reassignParagraphColors() } catch {}
      }, 0)
    }
  }, [reassignParagraphColors])

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
      title: '',
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

  const addJobAndGetId = useCallback((): string => {
    const newJob: Job = {
      id: uuid(),
      title: '',
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
    return newJob.id
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

  const saveToFile = useCallback(async (filename?: string) => { 
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
    await downloadJson(dataToSave, filename || `simple-job-apply-state.json`) 
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

  const saveSiteRulesToFile = useCallback(async (filename?: string) => {
    await downloadJson(state.siteRules, filename || `site-rules.json`)
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
      reassignParagraphColors,
      reorderParagraphs,
      addJob,
  updateJob,
      deleteJob,
      reorderJobs,
  addJobAndGetId,
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
  }), [state, addParagraph, addParagraphAt, updateParagraph, deleteParagraph, addKeyword, updateKeyword, removeKeyword, moveKeyword, transferKeyword, setParagraphColor, reassignParagraphColors, reorderParagraphs, addJob, updateJob, deleteJob, reorderJobs, addPdfItem, updatePdfItem, deletePdfItem, reorderPdfItems, setJobPostingRaw, analyzeNow, generateCoverLetter, saveToFile, loadFromFile, pasteFromClipboard, analyzeCurrentPage, toggleDarkMode, toggleHighlightInCoverLetter, toggleAutoAnalyze, toggleDebugMode, toggleForceUniqueColors, highlightPageKeywords, debugPageState, addSiteRule, updateSiteRule, removeSiteRule, loadSiteRulesFromFile, saveSiteRulesToFile])

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

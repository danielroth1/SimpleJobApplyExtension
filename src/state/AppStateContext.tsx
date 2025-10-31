import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppActions, AppState, Paragraph, ParagraphGroup } from './types'
import { cloneState, generateCoverLetterHTML, highlightJobPosting } from './logic'
import { loadStateFromStorage, saveStateToStorage, downloadJson, readJsonFile, getPageText, readClipboardText } from '@/utils/storage'

const AppStateContext = createContext<{ state: AppState, actions: AppActions } | null>(null)

function uuid(): string { return Math.random().toString(36).slice(2) }

const defaultState: AppState = {
  groups: [
    {
      id: uuid(),
      paragraphs: [
        { id: uuid(), html: '<p>Dear Hiring Manager,</p>', keywords: ['React', 'TypeScript'], noLineBreak: false, autoInclude: false, included: false }
      ]
    }
  ],
  jobPostingRaw: '',
  jobPostingHTML: '',
  coverLetterHTML: '<p></p>',
  jobEditorHidden: false,
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState)

  // Load from storage on init
  useEffect(() => {
    loadStateFromStorage().then(s => {
      if (s) setState(s)
    })
  }, [])

  // Auto-persist on changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => { saveStateToStorage(state) }, 300)
    return () => clearTimeout(t)
  }, [state])

  const addGroup = useCallback(() => {
    setState(prev => ({
      ...prev,
      groups: [...prev.groups, { id: uuid(), paragraphs: [{ id: uuid(), html: '<p></p>', keywords: [], noLineBreak: false, autoInclude: false, included: false }] }]
    }))
  }, [])

  const updateParagraph = useCallback((groupId: string, paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => {
    setState(prev => {
      const next = cloneState(prev)
      const g = next.groups.find(g => g.id === groupId)
      if (!g) return prev
      const p = g.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      const resolvedPatch = typeof patch === 'function' ? (patch as (prev: Paragraph) => Partial<Paragraph>)(p) : patch
      Object.assign(p, resolvedPatch)
      return next
    })
  }, [])

  const addKeyword = useCallback((groupId: string, paragraphId: string, keyword: string) => {
    updateParagraph(groupId, paragraphId, (prev: Paragraph) => ({ keywords: Array.from(new Set([...(prev.keywords || []), keyword])) }))
  }, [updateParagraph])

  const removeKeyword = useCallback((groupId: string, paragraphId: string, keyword: string) => {
    setState(prev => {
      const next = cloneState(prev)
      const g = next.groups.find(g => g.id === groupId)
      if (!g) return prev
      const p = g.paragraphs.find(p => p.id === paragraphId)
      if (!p) return prev
      p.keywords = p.keywords.filter(k => k !== keyword)
      return next
    })
  }, [])

  const reorderGroups = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const next = cloneState(prev)
      const [moved] = next.groups.splice(fromIndex, 1)
      next.groups.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const setJobPostingRaw = useCallback((raw: string) => {
    setState(prev => ({ ...prev, jobPostingRaw: raw }))
  }, [])

  const analyzeNow = useCallback(() => {
    setState(prev => {
      const next = cloneState(prev)
      const { html, matched } = highlightJobPosting(next.jobPostingRaw, next.groups)
      next.jobPostingHTML = html
      // Update included flags and matched keywords
      next.groups.forEach((g) => {
        g.paragraphs.forEach(p => {
          const mset = matched.get(p.id) || new Set<string>()
          const paragraphMatched = p.keywords.filter(k => mset.has(k))
          p.lastMatchedKeywords = paragraphMatched
          if (paragraphMatched.length > 0) {
            p.included = true
          }
          if (p.autoInclude) p.included = true
        })
      })
      // Generate cover letter automatically after analysis
      next.coverLetterHTML = generateCoverLetterHTML(next.groups)
      return next
    })
  }, [])

  const generateCoverLetter = useCallback(() => {
    setState(prev => ({ ...prev, coverLetterHTML: generateCoverLetterHTML(prev.groups) }))
  }, [])

  const setJobEditorHidden = useCallback((hidden: boolean) => setState(prev => ({ ...prev, jobEditorHidden: hidden })), [])

  const saveToFile = useCallback(async () => { await downloadJson(state, `simple-job-apply-state.json`) }, [state])

  const loadFromFile = useCallback(async (file: File) => {
    const data = await readJsonFile(file)
    if (data) setState(data as AppState)
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

  const value = useMemo(() => ({
    state,
    actions: {
      addGroup,
      updateParagraph,
      addKeyword,
      removeKeyword,
      reorderGroups,
      setJobPostingRaw,
      analyzeNow,
      generateCoverLetter,
      setJobEditorHidden,
      saveToFile,
      loadFromFile,
      pasteFromClipboard,
      analyzeCurrentPage,
    }
  }), [state, addGroup, updateParagraph, addKeyword, removeKeyword, reorderGroups, setJobPostingRaw, analyzeNow, generateCoverLetter, setJobEditorHidden, saveToFile, loadFromFile, pasteFromClipboard, analyzeCurrentPage])

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

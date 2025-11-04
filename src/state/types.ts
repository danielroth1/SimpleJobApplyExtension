export type KeywordWithOptions = {
  text: string
  matchWholeWord: boolean
  matchCase: boolean
}

export type Paragraph = {
  id: string
  html: string
  keywords: KeywordWithOptions[]
  noLineBreak: boolean
  autoInclude: boolean
  included: boolean
  collapsed: boolean
  lastMatchedKeywords?: string[]
}

export type SiteRule = {
  domain: string
  selector: string
  description?: string
}

export type AppState = {
  paragraphs: Paragraph[]
  jobPostingRaw: string
  jobPostingHTML: string
  coverLetterHTML: string
  jobEditorHidden: boolean
  darkMode: boolean
  highlightInCoverLetter: boolean
  autoAnalyze: boolean
  debugMode: boolean
  siteRules: SiteRule[]
}

export type AppActions = {
  addParagraph: () => void
  updateParagraph: (paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => void
  deleteParagraph: (paragraphId: string) => void
  addKeyword: (paragraphId: string, keyword: string) => void
  updateKeyword: (paragraphId: string, oldText: string, updates: Partial<KeywordWithOptions>) => void
  removeKeyword: (paragraphId: string, keyword: string) => void
  reorderParagraphs: (fromIndex: number, toIndex: number) => void
  setJobPostingRaw: (raw: string) => void
  analyzeNow: () => void
  generateCoverLetter: () => void
  saveToFile: () => Promise<void>
  loadFromFile: (file: File) => Promise<void>
  pasteFromClipboard: () => Promise<void>
  analyzeCurrentPage: () => Promise<void>
  downloadCurrentPageHtml: () => Promise<void>
  toggleDarkMode: () => void
  toggleHighlightInCoverLetter: () => void
  toggleAutoAnalyze: () => void
  toggleDebugMode: () => void
  highlightPageKeywords: () => Promise<void>
  debugPageState: () => Promise<void>
  addSiteRule: (rule: SiteRule) => void
  updateSiteRule: (domain: string, updates: Partial<SiteRule>) => void
  removeSiteRule: (domain: string) => void
  loadSiteRulesFromFile: (file: File) => Promise<void>
  saveSiteRulesToFile: () => Promise<void>
}

export type Paragraph = {
  id: string
  html: string
  keywords: string[]
  noLineBreak: boolean
  autoInclude: boolean
  included: boolean
  collapsed: boolean
  lastMatchedKeywords?: string[]
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
}

export type AppActions = {
  addParagraph: () => void
  updateParagraph: (paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => void
  deleteParagraph: (paragraphId: string) => void
  addKeyword: (paragraphId: string, keyword: string) => void
  removeKeyword: (paragraphId: string, keyword: string) => void
  reorderParagraphs: (fromIndex: number, toIndex: number) => void
  setJobPostingRaw: (raw: string) => void
  analyzeNow: () => void
  generateCoverLetter: () => void
  saveToFile: () => Promise<void>
  loadFromFile: (file: File) => Promise<void>
  pasteFromClipboard: () => Promise<void>
  analyzeCurrentPage: () => Promise<void>
  toggleDarkMode: () => void
  toggleHighlightInCoverLetter: () => void
  toggleAutoAnalyze: () => void
  highlightPageKeywords: () => Promise<void>
  debugPageState: () => Promise<void>
}

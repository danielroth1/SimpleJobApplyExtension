export type Paragraph = {
  id: string
  html: string
  keywords: string[]
  noLineBreak: boolean
  autoInclude: boolean
  included: boolean
  lastMatchedKeywords?: string[]
}

export type AppState = {
  paragraphs: Paragraph[]
  jobPostingRaw: string
  jobPostingHTML: string
  coverLetterHTML: string
  jobEditorHidden: boolean
  darkMode: boolean
}

export type AppActions = {
  addParagraph: () => void
  updateParagraph: (paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => void
  addKeyword: (paragraphId: string, keyword: string) => void
  removeKeyword: (paragraphId: string, keyword: string) => void
  reorderParagraphs: (fromIndex: number, toIndex: number) => void
  setJobPostingRaw: (raw: string) => void
  analyzeNow: () => void
  generateCoverLetter: () => void
  setJobEditorHidden: (hidden: boolean) => void
  saveToFile: () => Promise<void>
  loadFromFile: (file: File) => Promise<void>
  pasteFromClipboard: () => Promise<void>
  analyzeCurrentPage: () => Promise<void>
  toggleDarkMode: () => void
}

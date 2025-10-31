export type Paragraph = {
  id: string
  html: string
  keywords: string[]
  noLineBreak: boolean
  autoInclude: boolean
  included: boolean
  lastMatchedKeywords?: string[]
}

export type ParagraphGroup = {
  id: string
  paragraphs: Paragraph[]
}

export type AppState = {
  groups: ParagraphGroup[]
  jobPostingRaw: string
  jobPostingHTML: string
  coverLetterHTML: string
  jobEditorHidden: boolean
}

export type AppActions = {
  addGroup: () => void
  updateParagraph: (groupId: string, paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => void
  addKeyword: (groupId: string, paragraphId: string, keyword: string) => void
  removeKeyword: (groupId: string, paragraphId: string, keyword: string) => void
  reorderGroups: (fromIndex: number, toIndex: number) => void
  setJobPostingRaw: (raw: string) => void
  analyzeNow: () => void
  generateCoverLetter: () => void
  setJobEditorHidden: (hidden: boolean) => void
  saveToFile: () => Promise<void>
  loadFromFile: (file: File) => Promise<void>
  pasteFromClipboard: () => Promise<void>
  analyzeCurrentPage: () => Promise<void>
}
